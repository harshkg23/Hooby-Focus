"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  LearningPlan,
  ProgressMap,
  SavedLearningPath,
  TechniqueStatus,
} from "@/lib/types/learning";

const STORAGE_KEY = "hobby-focus-session-v1";

function emptyProgressForPlan(plan: LearningPlan): ProgressMap {
  const next: ProgressMap = {};
  for (const t of plan.techniques) {
    next[t.id] = {
      status: "active",
      updatedAt: new Date().toISOString(),
    };
  }
  return next;
}

/** Migrate single-plan localStorage to multi-path shape */
function migrateLegacyStorage(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    const st = parsed.state;
    if (!st || st.paths) return raw;
    const plan = st.plan as LearningPlan | null | undefined;
    const progress = (st.progress as ProgressMap) || {};
    const boundUserId = (st.boundUserId as string | null) ?? null;
    if (plan) {
      parsed.state = {
        paths: [{ pathId: plan.planId, plan, progress }],
        activePathId: plan.planId,
        boundUserId,
      };
      return JSON.stringify(parsed);
    }
    parsed.state = {
      paths: [],
      activePathId: null,
      boundUserId,
    };
    return JSON.stringify(parsed);
  } catch {
    return raw;
  }
}

const migratedStorage: Storage = {
  get length() {
    return localStorage.length;
  },
  clear: () => localStorage.clear(),
  getItem: (key: string) => migrateLegacyStorage(localStorage.getItem(key)),
  key: (i: number) => localStorage.key(i),
  removeItem: (key: string) => localStorage.removeItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
};

interface SessionState {
  paths: SavedLearningPath[];
  activePathId: string | null;
  boundUserId: string | null;
  addPath: (plan: LearningPlan) => void;
  hydrateFromServer: (paths: SavedLearningPath[], activePathId: string | null) => void;
  setActivePath: (pathId: string) => void;
  setTechniqueStatus: (techniqueId: string, status: TechniqueStatus) => void;
  removePath: (pathId: string) => void;
  syncForUser: (userId: string) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      paths: [],
      activePathId: null,
      boundUserId: null,

      addPath: (plan) =>
        set((state) => {
          const progress = emptyProgressForPlan(plan);
          const entry: SavedLearningPath = {
            pathId: plan.planId,
            plan,
            progress,
          };
          const exists = state.paths.some((p) => p.pathId === plan.planId);
          const paths = exists
            ? state.paths.map((p) => (p.pathId === plan.planId ? entry : p))
            : [...state.paths, entry];
          return {
            paths,
            activePathId: plan.planId,
            boundUserId: state.boundUserId,
          };
        }),

      hydrateFromServer: (paths, activePathId) =>
        set((state) => ({
          paths,
          activePathId:
            activePathId && paths.some((p) => p.pathId === activePathId)
              ? activePathId
              : paths[0]?.pathId ?? null,
          boundUserId: state.boundUserId,
        })),

      setActivePath: (pathId) => set({ activePathId: pathId }),

      setTechniqueStatus: (techniqueId, status) =>
        set((state) => {
          const id = state.activePathId;
          if (!id) return state;
          return {
            paths: state.paths.map((p) =>
              p.pathId === id
                ? {
                    ...p,
                    progress: {
                      ...p.progress,
                      [techniqueId]: {
                        status,
                        updatedAt: new Date().toISOString(),
                      },
                    },
                  }
                : p
            ),
          };
        }),

      removePath: (pathId) =>
        set((state) => {
          const paths = state.paths.filter((p) => p.pathId !== pathId);
          let activePathId = state.activePathId;
          if (activePathId === pathId) {
            activePathId = paths[0]?.pathId ?? null;
          }
          return { paths, activePathId };
        }),

      syncForUser: (userId) =>
        set((state) => {
          if (state.boundUserId && state.boundUserId !== userId) {
            return { paths: [], activePathId: null, boundUserId: userId };
          }
          return { boundUserId: userId };
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => migratedStorage),
      partialize: (s) => ({
        paths: s.paths,
        activePathId: s.activePathId,
        boundUserId: s.boundUserId,
      }),
    }
  )
);

/** Active path for dashboard (derived). */
export function selectActivePath(state: SessionState): SavedLearningPath | null {
  const id = state.activePathId;
  if (!id) return null;
  return state.paths.find((p) => p.pathId === id) ?? null;
}

export function getSessionStorageKey(): string {
  return STORAGE_KEY;
}
