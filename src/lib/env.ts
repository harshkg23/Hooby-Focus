/**
 * Server-only environment. Never import this in client components.
 */
export function getYoutubeApiKey(): string | undefined {
  return process.env.YOUTUBE_API_KEY;
}

export function getGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.Gemini_API_KEY ||
    process.env.GOOGLE_AI_API_KEY
  );
}

export function getMongoUrl(): string | undefined {
  return process.env.MONGODB_URL || process.env.MONGODB_URI;
}

/** Server-only: HS256 secret for auth cookies */
export function getJwtSecret(): string | undefined {
  return process.env.JWT_SECRET;
}
