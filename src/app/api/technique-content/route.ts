import { NextResponse } from "next/server";
import { generateTechniqueContent } from "@/services/gemini";
import type { SkillLevel } from "@/lib/types/learning";
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
      techniqueTitle?: string;
      techniqueSummary?: string;
    };
    const hobby = typeof body.hobby === "string" ? body.hobby.trim() : "";
    const techniqueTitle =
      typeof body.techniqueTitle === "string" ? body.techniqueTitle.trim() : "";
    const techniqueSummary =
      typeof body.techniqueSummary === "string" ? body.techniqueSummary.trim() : "";
    if (!hobby || !techniqueTitle) {
      return NextResponse.json({ error: "Missing hobby or technique." }, { status: 400 });
    }
    if (!isLevel(body.level)) {
      return NextResponse.json({ error: "Invalid level." }, { status: 400 });
    }

    const cacheParts = [
      "read",
      hobby.toLowerCase(),
      body.level,
      techniqueTitle.toLowerCase(),
      techniqueSummary.slice(0, 120),
    ];
    const cached = await getCachedJson<Awaited<ReturnType<typeof generateTechniqueContent>>>(
      "technique_content",
      cacheParts
    );
    if (cached) {
      return NextResponse.json({ content: cached });
    }

    const content = await generateTechniqueContent({
      hobby,
      level: body.level,
      techniqueTitle,
      techniqueSummary,
    });
    await setCachedJson("technique_content", cacheParts, content);
    return NextResponse.json({ content });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load content.";
    console.error("[technique-content]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
