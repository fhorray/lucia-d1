import { Context } from "hono";
import * as jose from "jose";

export const createJWT = async (
  c: Context,
  expiration: number = 15,
  data: Record<string, unknown>
) => {
  const secret = new TextEncoder().encode(c.env.JWT_SECRET_KEY);

  const token = await new jose.SignJWT({ data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expiration}m`)
    .sign(secret);

  return token;
};

export const verifyJWT = async (
  c: Context,
  token: string
): Promise<boolean> => {
  const secret = new TextEncoder().encode(c.env.JWT_SECRET_KEY);

  try {
    await jose.jwtVerify(token, secret);

    return true;
  } catch (error) {
    return false;
  }
};
