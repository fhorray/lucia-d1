import type { User, Session } from "lucia";

export type Bindings = {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  RESEND_API_KEY: string;
  JWT_SECRET_KEY: string;
};

export type Variables = {
  user: User | null;
  session: Session | null;
};
