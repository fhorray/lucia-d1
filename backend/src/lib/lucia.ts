import { D1Adapter } from "@lucia-auth/adapter-sqlite";
import { DrizzleD1Database } from "drizzle-orm/d1";
import { Lucia } from "lucia";
import { SelectUser } from "../db/schemas";
import { Google } from "arctic";
import { Context } from "hono";

export const createGoogle = (c: Context) => {
  return new Google(
    c.env.GOOGLE_CLIENT_ID,
    c.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3001/v1/auth/callback/google"
  );
};

export const createLucia = (D1: D1Database) => {
  const adapter = new D1Adapter(D1, {
    user: "users",
    session: "sessions",
  });

  return new Lucia(adapter, {
    sessionCookie: {
      attributes: {
        secure: false,
      },
    },
    getUserAttributes: (att) => {
      return {
        email: att.email,
        name: att.name,
        nickname: att.nickname,
      };
    },
  });
};

declare module "lucia" {
  interface Register {
    Lucia: ReturnType<typeof createLucia>;
    DatabaseUserAttributes: SelectUser;
  }
}

export interface GoogleUserResult {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
}
