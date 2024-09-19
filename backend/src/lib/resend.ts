import { Context } from "hono";
import { Resend } from "resend";

export const createResend = (c: Context) => {
  return new Resend(c.env.RESEND_API_KEY);
};
