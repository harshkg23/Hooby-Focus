import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/auth/constants";
import { verifyAuthToken } from "@/lib/auth/jwt";

export async function getSessionUser(): Promise<{ id: string; email: string } | null> {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) return null;
  try {
    const p = await verifyAuthToken(token);
    return { id: p.sub, email: p.email };
  } catch {
    return null;
  }
}
