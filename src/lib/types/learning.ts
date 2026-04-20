export type SkillLevel = "beginner" | "intermediate" | "advanced";

export type TechniqueStatus = "active" | "complete" | "skipped" | "revisit";

export interface Technique {
  id: string;
  title: string;
  summary: string;
  /** Short explanation shown on the card */
  cardHint: string;
  /** 2–4 search phrases for YouTube (beginner-friendly) */
  youtubeQueryTerms: string[];
  order: number;
}

export interface LearningPlan {
  planId: string;
  hobby: string;
  level: SkillLevel;
  goal: string | null;
  focusLine: string;
  techniques: Technique[];
  createdAt: string;
}

export interface TechniqueReadContent {
  definition: string;
  steps: string[];
  mistakes: string[];
  tips: string[];
}

export interface TechniqueContentPayload {
  read: TechniqueReadContent;
  /** Short plain text for optional TTS “summary” mode */
  narrationScript: string;
}

export interface YouTubeVideoItem {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
}

export interface ProgressEntry {
  status: TechniqueStatus;
  updatedAt: string;
}

export type ProgressMap = Record<string, ProgressEntry>;

/** One saved learning path (user may have several). pathId === plan.planId */
export interface SavedLearningPath {
  pathId: string;
  plan: LearningPlan;
  progress: ProgressMap;
}
