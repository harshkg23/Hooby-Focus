import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/mongodb";
import type { SavedLearningPath } from "@/lib/types/learning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UserPathStateDoc {
  userId: string;
  paths: SavedLearningPath[];
  activePathId: string | null;
  updatedAt: Date;
}

function normalizeIncomingPaths(value: unknown): SavedLearningPath[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is SavedLearningPath => {
    if (!x || typeof x !== "object") return false;
    const p = x as Partial<SavedLearningPath>;
    return (
      typeof p.pathId === "string" &&
      !!p.plan &&
      typeof p.plan === "object" &&
      !!p.progress &&
      typeof p.progress === "object"
    );
  });
}

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 500 });
    }

    const doc = await db.collection<UserPathStateDoc>("user_path_states").findOne({
      userId: session.id,
    });
    if (!doc) {
      return NextResponse.json({ paths: [], activePathId: null });
    }
    return NextResponse.json({
      paths: doc.paths ?? [],
      activePathId: doc.activePathId ?? null,
    });
  } catch (e) {
    console.error("[user-paths/get]", e);
    return NextResponse.json({ error: "Failed to load saved paths." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 500 });
    }

    const body = (await req.json()) as {
      paths?: unknown;
      activePathId?: unknown;
    };
    const paths = normalizeIncomingPaths(body.paths);
    const activePathIdRaw = typeof body.activePathId === "string" ? body.activePathId : null;
    const activePathId =
      activePathIdRaw && paths.some((p) => p.pathId === activePathIdRaw)
        ? activePathIdRaw
        : paths[0]?.pathId ?? null;

    await db.collection<UserPathStateDoc>("user_path_states").updateOne(
      { userId: session.id },
      {
        $set: {
          userId: session.id,
          paths,
          activePathId,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[user-paths/put]", e);
    return NextResponse.json({ error: "Failed to save paths." }, { status: 500 });
  }
}
