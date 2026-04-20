import { NextResponse } from "next/server";
import { finalizePlan, generateLearningPlan } from "@/services/gemini";
import type { LearningPlan, SkillLevel } from "@/lib/types/learning";
import { getCachedJson, setCachedJson } from "@/services/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEVELS: SkillLevel[] = ["beginner", "intermediate", "advanced"];

function isLevel(x: unknown): x is SkillLevel {
  return typeof x === "string" && LEVELS.includes(x as SkillLevel);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      hobby?: string;
      level?: string;
      goal?: string | null;
    };
    const hobby = typeof body.hobby === "string" ? body.hobby.trim() : "";
    if (!hobby || hobby.length > 80) {
      return NextResponse.json({ error: "Enter a hobby (max 80 characters)." }, { status: 400 });
    }
    if (!isLevel(body.level)) {
      return NextResponse.json({ error: "Invalid level." }, { status: 400 });
    }
    const goal =
      typeof body.goal === "string" && body.goal.trim()
        ? body.goal.trim().slice(0, 240)
        : null;

    const cacheKey = ["plan", hobby.toLowerCase(), body.level, goal ?? ""];
    const cached = await getCachedJson<LearningPlan>("learning_plan", cacheKey);
    if (cached) {
      return NextResponse.json({ plan: cached });
    }

    const partial = await generateLearningPlan({
      hobby,
      level: body.level,
      goal,
    });
    const plan = finalizePlan(partial);
    await setCachedJson("learning_plan", cacheKey, plan);
    return NextResponse.json({ plan });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to generate plan.";
    console.error("[learning-plan]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
