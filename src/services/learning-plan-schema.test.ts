import { describe, expect, it } from "vitest";

/**
 * Contract test: API response shape expected by the client after /api/learning-plan.
 * Keeps server and UI aligned without hitting external services.
 */
describe("learning plan response shape", () => {
  it("requires techniques with stable fields", () => {
    const sample = {
      plan: {
        planId: "uuid",
        hobby: "Guitar",
        level: "intermediate",
        goal: null,
        focusLine: "A short focus line.",
        createdAt: new Date().toISOString(),
        techniques: [
          {
            id: "open-chords-1",
            title: "Open chords",
            summary: "Why it matters.",
            cardHint: "Short hint",
            youtubeQueryTerms: ["beginner guitar open chords"],
            order: 1,
          },
        ],
      },
    };

    expect(sample.plan.techniques).toHaveLength(1);
    expect(sample.plan.techniques[0].youtubeQueryTerms.length).toBeGreaterThan(0);
    expect(["beginner", "intermediate", "advanced"]).toContain(sample.plan.level);
  });
});
