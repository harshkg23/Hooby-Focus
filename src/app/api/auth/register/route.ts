import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_COOKIE_OPTIONS } from "@/lib/auth/constants";
import { signAuthToken } from "@/lib/auth/jwt";
import { createUser } from "@/services/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }
    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Enter your name (2+ characters)." }, { status: 400 });
    }

    const user = await createUser({ email, password, name });
    const token = await signAuthToken({
      sub: user._id.toString(),
      email: user.email,
    });

    const res = NextResponse.json({
      user: { id: user._id.toString(), email: user.email, name: user.name },
    });
    res.cookies.set(AUTH_COOKIE, token, AUTH_COOKIE_OPTIONS);
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Registration failed.";
    const status = message.includes("already exists") ? 409 : 500;
    console.error("[auth/register]", e);
    return NextResponse.json({ error: message }, { status });
  }
}
