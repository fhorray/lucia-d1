import { z } from "zod";
import { Hono } from "hono";
import { generateId, Scrypt } from "lucia";
import { drizzle } from "drizzle-orm/d1";
import { zValidator } from "@hono/zod-validator";

import { Bindings, Variables } from "../bindings";
import { GoogleUserResult, createGoogle, createLucia } from "../lib/lucia";
import { getUser, insertUser } from "../functions/users";
import {
  generateCodeVerifier,
  generateState,
  OAuth2RequestError,
} from "arctic";

import { generateIdFromEntropySize } from "lucia";
import { parseCookies } from "oslo/cookie";
import { setCookie } from "hono/cookie";
import { users, verificationTokens } from "../db/schemas";
import { eq } from "drizzle-orm";
import { createResend } from "../lib/resend";
import * as jose from "jose";
import { createJWT, verifyJWT } from "../functions/jose";
import MagicLink from "../emails/magic-link";

import ReactDOMServer from "react-dom/server";
import { render } from "@react-email/components";

const authRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// LOGIN
authRouter.post(
  "/login",
  zValidator(
    "json",
    z.object({
      email: z.string().min(1).email(),
      password: z.string().min(1).max(255),
    })
  ),
  async (c) => {
    const { email, password } = c.req.valid("json");
    const db = drizzle(c.env.DB);

    // fucntion to get user
    const user = await getUser(db, email);
    if (!user) {
      return c.json({ error: "Invalid email or password." }, 400);
    }

    const validPassword = await new Scrypt().verify(
      user.password as string,
      password
    );
    if (!validPassword) {
      return c.json({ error: "Invalid email or password." }, 400);
    }

    const lucia = createLucia(c.env.DB);
    const session = await lucia.createSession(user.id, {});
    const cookie = lucia.createSessionCookie(session.id);

    c.header("Set-Cookie", cookie.serialize(), { append: true });

    return c.json({ message: "success" });
  }
);

// EMAIL & PASSWORD REGISTER
authRouter.post(
  "/register",
  zValidator(
    "json",
    z.object({
      email: z.string().min(1).email(),
      password: z.string().min(1).max(255),
      name: z.string().min(1).max(255),
      nickname: z.string().min(1).max(255),
    })
  ),
  async (c) => {
    const { email, password, name, nickname } = c.req.valid("json");

    const db = drizzle(c.env.DB);

    const existingUser = await getUser(db, email);
    if (existingUser) {
      return c.json({ error: "User with that email already exists." }, 400);
    }

    const passwordHash = await new Scrypt().hash(password);

    const user = await insertUser(db, {
      email,
      password: passwordHash,
      name,
      nickname,
    });
    if (!user) {
      return c.json({ error: "An error occurred during sign up." }, 500);
    }

    const lucia = createLucia(c.env.DB);
    const session = await lucia.createSession(user.id, {});
    const cookie = lucia.createSessionCookie(session.id);

    c.header("Set-Cookie", cookie.serialize(), { append: true });

    return c.json({ message: "success", data: user }, 201);
  }
);

// MAGIC LINK
authRouter.post(
  "/magic",
  zValidator(
    "json",
    z.object({
      email: z.string().min(1).email(),
    })
  ),
  async (c) => {
    const resend = createResend(c);

    const { email } = c.req.valid("json");

    const db = drizzle(c.env.DB);
    const user = await getUser(db, email);

    if (!user) {
      return c.json({ error: "An error occurred during sign up." }, 500);
    }

    // generate token to insert inside db
    const expiration = 15;
    const expirationDate = new Date(Date.now() + expiration * 60 * 1000);
    const token = await createJWT(c, expiration, { email });
    const [tokenDb] = await db
      .insert(verificationTokens)
      .values({
        expires: expirationDate,
        identifier: generateId(10),
        token: token,
      })
      .returning();

    console.log("TOKEN GERADO: ", token);
    const url = `http://localhost:3001/v1/auth/magic/callback?token=${tokenDb.identifier}&email=${user.email}`;

    // send email with token
    const { data, error } = await resend.emails.send({
      from: "Psycopoint <no-reply@psycohub.com>",
      to: [email],
      subject: "Faça login",
      // html: `<strong>Clique aqui para fazer login:</strong> <a href="${url}" target="_blank"><button>FAZER LOGIN</button></a>`,
      react: MagicLink({ linkUrl: url, loginCode: "123" }),
    });

    return c.json({}, 200);
  }
);

authRouter.get(
  "/magic/callback",
  zValidator(
    "query",
    z.object({
      token: z.string(),
      email: z.string(),
    })
  ),
  async (c) => {
    const lucia = createLucia(c.env.DB);
    const db = drizzle(c.env.DB);

    const { token, email } = c.req.valid("query");

    // get token inside db to validate it
    const [tokenDb] = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.identifier, token));

    if (!tokenDb || tokenDb.expires < new Date()) {
      return c.json({ error: "Invalid or expired token" });
    }

    const user = await getUser(db, email);
    if (!user) {
      return c.json({ error: "An error occurred during sign up." }, 500);
    }

    const verify = await verifyJWT(c, tokenDb?.token);
    if (!verify) {
      console.log("Error trying loging with magic link!");
      return c.redirect("http://localhost:3000/magic-link");
    }

    const session = await lucia.createSession(user.id, {});
    const cookie = lucia.createSessionCookie(session.id);

    c.header("Set-Cookie", cookie.serialize(), { append: true });

    // delete token inside db.
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, token));

    return c.redirect("http://localhost:3000");
  }
);

// GOOGLE AUTH
authRouter.get("/google", async (c) => {
  const google = createGoogle(c);
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const url: URL = await google.createAuthorizationURL(state, codeVerifier, {
    scopes: ["profile", "email"],
  });

  // set header
  setCookie(c, "google_oauth_state", state, {
    httpOnly: false, // set to true in production
    secure: false,
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  setCookie(c, "google_code_verifier", codeVerifier, {
    httpOnly: false, // set to true in production
    secure: false,
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return c.redirect(`${url.toString()}&prompt=select_account`);
});

authRouter.get("/callback/google", async (c) => {
  const google = createGoogle(c);
  const lucia = createLucia(c.env.DB);
  const db = drizzle(c.env.DB);

  const cookies = parseCookies(c.req.header("Cookie") ?? "");

  const stateCookie = cookies.get("google_oauth_state") ?? null;
  const codeVerifier = cookies.get("google_code_verifier");

  const url = new URL(c.req.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");

  // verify state
  if (!state || !stateCookie || !code || stateCookie !== state) {
    return new Response(null, { status: 400 });
  }

  try {
    const tokens = await google.validateAuthorizationCode(
      code,
      codeVerifier as string
    );
    const googleUserResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );
    const googleUserResult =
      (await googleUserResponse.json()) as GoogleUserResult;

    console.log(googleUserResult);

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleUserResult.sub))
      .get();

    if (existingUser) {
      const session = await lucia.createSession(existingUser.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);

      c.header("Set-Cookie", sessionCookie.serialize(), {
        append: true,
      });
      return c.redirect("http://localhost:3000", 302);
    }

    const userId = generateIdFromEntropySize(10);
    await db.insert(users).values({
      id: userId as string,
      name: googleUserResult.name as string,
      googleId: String(googleUserResult.sub),
      email: googleUserResult.email,
    });

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    c.header("Set-Cookie", sessionCookie.serialize(), {
      append: true,
    });
    return c.redirect("http://localhost:3000", 302);
  } catch (e) {
    console.log(e);
    if (e instanceof OAuth2RequestError) {
      return new Response(null, { status: 400 });
    }
    return new Response(null, { status: 500 });
  }
});

// LOGOUT
authRouter.post("/logout", async (c) => {
  const lucia = createLucia(c.env.DB);
  const session = c.get("session");
  if (session) {
    await lucia.invalidateSession(session.id);
  }

  const cookie = lucia.createBlankSessionCookie();

  c.header("Set-Cookie", cookie.serialize(), { append: true });

  return c.json({ message: "success" });
});

// VALIDATE SESSION
authRouter.get("/validate", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ session: false });
  }

  return c.json({ session: true });
});

export default authRouter;
