import { SignJWT, jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/env";

export interface TokenPayload {
  sub: string;
  email: string;
}

function getSecretKey() {
  const s = getJwtSecret();
  if (!s || s.length < 16) {
    throw new Error("JWT_SECRET is missing or too short (min 16 characters).");
  }
  return new TextEncoder().encode(s);
}

export async function signAuthToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifyAuthToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecretKey());
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email : "";
  if (!sub || !email) throw new Error("Invalid token payload");
  return { sub, email };
}
