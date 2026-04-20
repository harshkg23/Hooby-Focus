import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { findUserById } from "@/services/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    const doc = await findUserById(session.id);
    if (!doc) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({
      user: {
        id: doc._id.toString(),
        email: doc.email,
        name: doc.name,
      },
    });
  } catch (e) {
    console.error("[auth/me]", e);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
