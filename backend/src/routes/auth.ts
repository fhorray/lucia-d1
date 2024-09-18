import { z } from "zod";
import { Hono } from "hono";
import { Scrypt } from "lucia";
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
import { serializeCookie, parseCookies } from "oslo/cookie";
import { getCookie } from "hono/cookie";
import { users } from "../db/schemas";
import { eq } from "drizzle-orm";

const authRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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

authRouter.post(
  "/register",
  zValidator(
    "json",
    z.object({
      email: z.string().min(1).email(),
      password: z.string().min(1).max(255),
      name: z.string().min(1).max(255),
    })
  ),
  async (c) => {
    const { email, password, name } = c.req.valid("json");

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

// GOOGLE
authRouter.get("/google", async (c) => {
  const google = createGoogle(c);
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const url: URL = await google.createAuthorizationURL(state, codeVerifier, {
    scopes: ["profile", "email"],
  });

  // set code verifies

  // set header
  c.header(
    "Set-Cookie",
    [
      serializeCookie("state", state, {
        httpOnly: true,
        secure: false,
        maxAge: 60 * 10, // 10 minutes
        path: "/",
      }),
      serializeCookie("code_verifier", codeVerifier, {
        httpOnly: true,
        secure: false,
        maxAge: 60 * 10, // 10 minutes
        path: "/",
      }),
    ].join("; ")
  );

  return c.redirect(url.toString());
});

authRouter.get("/callback/google", async (c) => {
  const google = createGoogle(c);
  const lucia = createLucia(c.env.DB);
  const db = drizzle(c.env.DB);

  const cookies = parseCookies(c.req.header("Cookie") ?? "");
  const stateCookie = cookies.get("state") ?? null;
  const codeVerifier = cookies.get("code_verifier");

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

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleUserResult.id.toString()))
      .get();

    if (existingUser) {
      const session = await lucia.createSession(existingUser.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/",
          "Set-Cookie": sessionCookie.serialize(),
        },
      });
    }

    const userId = generateIdFromEntropySize(10);
    await db.insert(users).values({
      id: userId as string,
      name: googleUserResult.name as string,
      googleId: String(googleUserResult.id),
      email: googleUserResult.email,
    });

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": sessionCookie.serialize(),
      },
    });
  } catch (e) {
    console.log(e);
    if (e instanceof OAuth2RequestError) {
      return new Response(null, { status: 400 });
    }
    return new Response(null, { status: 500 });
  }
});

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

authRouter.get("/validate", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ session: false });
  }

  return c.json({ session: true });
});

export default authRouter;
