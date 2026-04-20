import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { getGeminiApiKey } from "@/lib/env";
import type { LearningPlan, SkillLevel, Technique, TechniqueContentPayload } from "@/lib/types/learning";
import { randomUUID } from "crypto";

/** If set, only this model id is used (must support generateContent). */
function getGeminiModelOverride(): string | undefined {
  const m = process.env.GEMINI_MODEL?.trim();
  return m || undefined;
}

/**
 * Preference order when merging with ListModels — unknown/new ids are appended after.
 * Avoids hardcoding version suffixes like `-002` that 404 on some API versions.
 */
const PREFERRED_MODEL_ORDER = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-1.5-pro-latest",
] as const;

const STATIC_FALLBACK_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"] as const;

let cachedModelIds: string[] | null = null;
let cacheExpires = 0;
const MODEL_LIST_CACHE_MS = 30 * 60 * 1000;

async function fetchModelIdsFromApi(): Promise<string[] | null> {
  const key = getGeminiApiKey();
  if (!key) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    console.warn("[gemini] ListModels failed HTTP", res.status);
    return null;
  }

  const data = (await res.json()) as {
    models?: Array<{
      name: string;
      supportedGenerationMethods?: string[];
    }>;
  };

  const ids =
    data.models
      ?.filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, "")) ?? [];

  if (ids.length === 0) return null;

  const set = new Set(ids);
  const ordered: string[] = [];
  for (const p of PREFERRED_MODEL_ORDER) {
    if (set.has(p)) ordered.push(p);
  }
  for (const id of ids) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

async function getModelIdsToTry(): Promise<string[]> {
  const override = getGeminiModelOverride();
  if (override) {
    return [override];
  }

  const now = Date.now();
  if (cachedModelIds && now < cacheExpires) {
    return cachedModelIds;
  }

  const discovered = await fetchModelIdsFromApi();
  if (discovered?.length) {
    cachedModelIds = discovered;
    cacheExpires = now + MODEL_LIST_CACHE_MS;
    console.info("[gemini] Using models from ListModels:", discovered.slice(0, 5).join(", "), "…");
    return cachedModelIds;
  }

  console.warn("[gemini] ListModels unavailable; using static fallbacks");
  return [...STATIC_FALLBACK_MODELS];
}

function getGenAI() {
  const key = getGeminiApiKey();
  if (!key) throw new Error("Missing Gemini API key. Set GEMINI_API_KEY or Gemini_API_KEY.");
  return new GoogleGenerativeAI(key);
}

const techniqueSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    summary: { type: SchemaType.STRING },
    cardHint: { type: SchemaType.STRING },
    youtubeQueryTerms: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    order: { type: SchemaType.NUMBER },
  },
  required: ["title", "summary", "cardHint", "youtubeQueryTerms", "order"],
};

const planSchema = {
  type: SchemaType.OBJECT,
  properties: {
    focusLine: { type: SchemaType.STRING },
    techniques: {
      type: SchemaType.ARRAY,
      items: techniqueSchema,
    },
  },
  required: ["focusLine", "techniques"],
};

const readSchema = {
  type: SchemaType.OBJECT,
  properties: {
    definition: { type: SchemaType.STRING },
    steps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    mistakes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    tips: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    narrationScript: { type: SchemaType.STRING },
  },
  required: ["definition", "steps", "mistakes", "tips", "narrationScript"],
};

function slugId(title: string, order: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "technique"}-${order}`;
}

/** Try structured JSON → plain JSON MIME → next model. */
async function generateJsonWithSchema(
  prompt: string,
  responseSchema: typeof planSchema | typeof readSchema
): Promise<string> {
  const genAI = getGenAI();
  const modelNames = await getModelIdsToTry();
  let lastErr: unknown;

  for (const modelName of modelNames) {
    const modelStructured = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });
    try {
      const result = await modelStructured.generateContent(prompt);
      const text = result.response.text();
      if (text) return text;
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[gemini] ${modelName} (JSON+schema) failed:`, msg.slice(0, 200));
    }

    const modelJsonOnly = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    try {
      const result = await modelJsonOnly.generateContent(prompt);
      const text = result.response.text();
      if (text) return text;
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[gemini] ${modelName} (JSON only) failed:`, msg.slice(0, 200));
    }
  }

  const message =
    lastErr instanceof Error
      ? lastErr.message
      : "All Gemini models failed. Set GEMINI_MODEL to a model id from AI Studio, or check API key / billing.";
  throw new Error(message);
}

export async function generateLearningPlan(params: {
  hobby: string;
  level: SkillLevel;
  goal: string | null;
}): Promise<Omit<LearningPlan, "planId" | "createdAt">> {
  const prompt = `You are an expert coach helping someone learn "${params.hobby}" at ${params.level} level.
${params.goal ? `Their stated goal: ${params.goal}` : "No specific goal was given—infer a sensible short-term focus."}

Return ONLY valid JSON matching the schema. Rules:
- Produce between 5 and 8 techniques, inclusive. Rank from foundational to more advanced within this window.
- Each technique must be concrete and actionable—not vague advice.
- youtubeQueryTerms: 2 to 4 short search phrases that would find beginner-friendly, high-quality instructional videos for that technique. No channel names or URLs.
- focusLine: one motivating sentence describing this curated path (max 160 chars).
- cardHint: max 120 chars for the technique card subtitle.
- summary: 1–2 sentences explaining why this technique matters now.

Do not include markdown, commentary, or extra keys.`;

  const text = await generateJsonWithSchema(prompt, planSchema);
  const parsed = JSON.parse(text) as {
    focusLine: string;
    techniques: Array<{
      title: string;
      summary: string;
      cardHint: string;
      youtubeQueryTerms: string[];
      order: number;
    }>;
  };

  const techniques: Technique[] = parsed.techniques.slice(0, 8).map((t, i) => ({
    id: slugId(t.title, t.order ?? i + 1),
    title: t.title.trim(),
    summary: t.summary.trim(),
    cardHint: t.cardHint.trim(),
    youtubeQueryTerms: t.youtubeQueryTerms.map((q) => q.trim()).filter(Boolean).slice(0, 4),
    order: typeof t.order === "number" ? t.order : i + 1,
  }));

  if (techniques.length < 5) {
    throw new Error("Plan too short—try again or adjust hobby/level.");
  }

  return {
    hobby: params.hobby.trim(),
    level: params.level,
    goal: params.goal?.trim() || null,
    focusLine: parsed.focusLine.trim(),
    techniques,
  };
}

export async function generateTechniqueContent(params: {
  hobby: string;
  level: SkillLevel;
  techniqueTitle: string;
  techniqueSummary: string;
}): Promise<TechniqueContentPayload> {
  const prompt = `Learner hobby: ${params.hobby}. Level: ${params.level}.
Technique: ${params.techniqueTitle}
Context: ${params.techniqueSummary}

Produce concise learning content. Steps: 4–6 items. Mistakes: 3–4. Tips: 3–4.
narrationScript: a single short paragraph (80–180 words) suitable for text-to-speech, summarizing the technique in a warm, clear tone—no lists, no markdown.

Return JSON only.`;

  const text = await generateJsonWithSchema(prompt, readSchema);
  const raw = JSON.parse(text) as {
    definition: string;
    steps: string[];
    mistakes: string[];
    tips: string[];
    narrationScript: string;
  };
  return {
    read: {
      definition: raw.definition?.trim() ?? "",
      steps: Array.isArray(raw.steps) ? raw.steps.map((s) => s.trim()) : [],
      mistakes: Array.isArray(raw.mistakes) ? raw.mistakes.map((s) => s.trim()) : [],
      tips: Array.isArray(raw.tips) ? raw.tips.map((s) => s.trim()) : [],
    },
    narrationScript: raw.narrationScript?.trim() || raw.definition || "",
  };
}

/** Wrap plan with ids */
export function finalizePlan(
  partial: Omit<LearningPlan, "planId" | "createdAt">
): LearningPlan {
  return {
    ...partial,
    planId: randomUUID(),
    createdAt: new Date().toISOString(),
  };
}
