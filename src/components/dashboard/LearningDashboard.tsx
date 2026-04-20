"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlanForm } from "@/components/PlanForm";
import { PathsSidebar } from "@/components/dashboard/PathsSidebar";
import { ProgressHeader } from "@/components/ProgressHeader";
import { TechniqueCard } from "@/components/TechniqueCard";
import { TechniqueLearnSheet } from "@/components/TechniqueLearnSheet";
import type {
  LearningPlan,
  SkillLevel,
  Technique,
  TechniqueStatus,
} from "@/lib/types/learning";
import { selectActivePath, useSessionStore } from "@/store/sessionStore";
import { computePlanProgressPercent } from "@/utils/progress";

const LEVEL_ORDER: SkillLevel[] = ["beginner", "intermediate", "advanced"];

export function LearningDashboard() {
  const paths = useSessionStore((s) => s.paths);
  const activePathId = useSessionStore((s) => s.activePathId);
  const activePath = useSessionStore(selectActivePath);
  const addPath = useSessionStore((s) => s.addPath);
  const hydrateFromServer = useSessionStore((s) => s.hydrateFromServer);
  const setActivePath = useSessionStore((s) => s.setActivePath);
  const setTechniqueStatus = useSessionStore((s) => s.setTechniqueStatus);
  const removePath = useSessionStore((s) => s.removePath);
  const syncForUser = useSessionStore((s) => s.syncForUser);

  const plan = activePath?.plan ?? null;
  const progress = activePath?.progress ?? {};

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetTechnique, setSheetTechnique] = useState<Technique | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [serverSyncReady, setServerSyncReady] = useState(false);
  const [showNewPathForm, setShowNewPathForm] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const lastSavedSignature = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = (await res.json()) as { user?: { id: string } };
        if (cancelled || !data.user?.id) return;
        syncForUser(data.user.id);
        setUserId(data.user.id);

        const pathRes = await fetch("/api/user-paths");
        const pathData = (await pathRes.json()) as {
          paths?: Array<{
            pathId: string;
            plan: LearningPlan;
            progress: Record<string, { status: TechniqueStatus; updatedAt: string }>;
          }>;
          activePathId?: string | null;
        };
        if (!cancelled && pathRes.ok && Array.isArray(pathData.paths) && pathData.paths.length > 0) {
          hydrateFromServer(pathData.paths, pathData.activePathId ?? null);
        }
        if (!cancelled) setServerSyncReady(true);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncForUser, hydrateFromServer]);

  const pushUserPathsToServer = useCallback(
    async (
      payload: {
        paths: typeof paths;
        activePathId: string | null;
      },
      signature: string
    ) => {
      setSaveState("saving");
      setSaveError(null);
      try {
        const res = await fetch("/api/user-paths", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Failed to sync your data.");
        }
        lastSavedSignature.current = signature;
        setSaveState("saved");
        window.setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1500);
      } catch (e) {
        setSaveState("error");
        setSaveError(e instanceof Error ? e.message : "Failed to sync your data.");
      }
    },
    []
  );

  useEffect(() => {
    if (!authReady || !serverSyncReady || !userId) return;
    const signature = JSON.stringify({
      activePathId,
      paths,
    });
    if (signature === lastSavedSignature.current) return;
    const timeout = window.setTimeout(() => {
      void pushUserPathsToServer({ paths, activePathId }, signature);
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [authReady, serverSyncReady, userId, paths, activePathId, pushUserPathsToServer]);

  useEffect(() => {
    if (paths.length > 0 && !activePathId) {
      setActivePath(paths[0].pathId);
    }
  }, [paths, activePathId, setActivePath]);

  const sortedTechniques = useMemo(() => {
    if (!plan) return [];
    return [...plan.techniques].sort((a, b) => a.order - b.order);
  }, [plan]);

  const progressPct = useMemo(() => {
    if (!plan) return 0;
    return computePlanProgressPercent(plan, progress);
  }, [plan, progress]);

  const nextLevel = useMemo<SkillLevel | null>(() => {
    if (!plan) return null;
    const idx = LEVEL_ORDER.indexOf(plan.level);
    if (idx === -1 || idx >= LEVEL_ORDER.length - 1) return null;
    return LEVEL_ORDER[idx + 1];
  }, [plan]);

  async function handleCreatePlan(input: {
    hobby: string;
    level: SkillLevel;
    goal: string | null;
  }) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/learning-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as { plan?: LearningPlan; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create a plan.");
      if (!data.plan) throw new Error("Invalid response.");
      addPath(data.plan);
      setShowNewPathForm(false);
      setSheetTechnique(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function statusFor(id: string): TechniqueStatus {
    return progress[id]?.status ?? "active";
  }

  if (!authReady) {
    return (
      <div className="flex w-full flex-col gap-10 lg:flex-row lg:items-start lg:gap-10">
        <PathsSidebar
          paths={[]}
          activePathId={null}
          loading
          onSelect={() => undefined}
          onAddPath={() => undefined}
          onRemovePath={() => undefined}
        />
        <div className="min-w-0 flex-1 space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-80 animate-pulse rounded bg-white/10" />
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`loading-tech-${i}`}
                className="rounded-2xl border border-white/10 bg-white/[0.05] p-5"
              >
                <div className="mb-3 h-5 w-56 animate-pulse rounded bg-white/10" />
                <div className="mb-2 h-4 w-40 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-full animate-pulse rounded bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasPaths = paths.length > 0;
  const showEmptyOnboarding = !hasPaths && !showNewPathForm;

  return (
    <div className="flex w-full flex-col gap-10 lg:flex-row lg:items-start lg:gap-10">
      <PathsSidebar
        paths={paths}
        activePathId={activePathId}
        loading={!serverSyncReady}
        onSelect={(id) => {
          setActivePath(id);
          setSheetTechnique(null);
          setError(null);
        }}
        onAddPath={() => {
          setShowNewPathForm(true);
          setError(null);
        }}
        onRemovePath={removePath}
      />

      <div className="min-w-0 flex-1 space-y-10">
        <header className="mx-auto w-full max-w-3xl space-y-4 text-center lg:max-w-none lg:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#99f6e4]">Your path</p>
          <h1 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
            Learn deeply.{" "}
            <span className="bg-gradient-to-r from-[#99f6e4] via-[#2dd4bf] to-[#a78bfa] bg-clip-text text-transparent">
              Stay light.
            </span>
          </h1>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-white/60 lg:mx-0">
            One hobby, one level, one short path—five to eight techniques you can actually finish. Add
            multiple paths from the sidebar whenever you like.
          </p>
        </header>

        {(showNewPathForm || showEmptyOnboarding) && (
          <section
            aria-label="Create learning path"
            className="mx-auto w-full max-w-xl rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl sm:p-10 lg:mx-0"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-white">
                {hasPaths ? "Start another learning path" : "Create your first path"}
              </h2>
              {hasPaths && (
                <button
                  type="button"
                  onClick={() => {
                    setShowNewPathForm(false);
                    setError(null);
                  }}
                  className="text-sm text-white/55 hover:text-white"
                >
                  Cancel
                </button>
              )}
            </div>
            <PlanForm variant="dark" onSubmit={handleCreatePlan} loading={loading} />
            {error && (
              <p className="mt-4 rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            )}
          </section>
        )}

        {hasPaths && !showNewPathForm && !showEmptyOnboarding && (
          <button
            type="button"
            onClick={() => setShowNewPathForm(true)}
            className="mx-auto flex w-full max-w-xl items-center justify-center rounded-full border border-white/15 bg-white/5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 lg:mx-0 lg:hidden"
          >
            + Add another learning path
          </button>
        )}

        {plan && (
          <>
            <ProgressHeader
              plan={plan}
              progress={progress}
              saveState={saveState}
              onRetrySave={() => {
                const signature = JSON.stringify({ activePathId, paths });
                void pushUserPathsToServer({ paths, activePathId }, signature);
              }}
            />
            {saveState === "error" && saveError ? (
              <div className="rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {saveError}
              </div>
            ) : null}

            {progressPct >= 100 ? (
              <div className="rounded-2xl border border-[#2dd4bf]/35 bg-[#2dd4bf]/10 p-4 sm:p-5">
                <p className="text-sm font-semibold text-[#99f6e4]">
                  You completed this level. Nice work.
                </p>
                {nextLevel ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <p className="text-sm text-white/80">
                      Now move on to <span className="capitalize">{nextLevel}</span> level.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        void handleCreatePlan({
                          hobby: plan.hobby,
                          level: nextLevel,
                          goal: plan.goal,
                        })
                      }
                      disabled={loading}
                      className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0c0e12] transition hover:bg-white/95 disabled:opacity-50"
                    >
                      {loading ? "Creating next level..." : `Start ${nextLevel} path`}
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-white/70">
                    You have completed the highest configured level for this hobby.
                  </p>
                )}
              </div>
            ) : null}
            <section aria-label="Techniques" className="w-full space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <h2 className="font-display text-2xl font-semibold text-white">Your techniques</h2>
              </div>
              <div className="grid w-full gap-4">
                {!serverSyncReady ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={`sk-${i}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.05] p-5"
                    >
                      <div className="mb-3 h-5 w-56 animate-pulse rounded bg-white/10" />
                      <div className="mb-2 h-4 w-40 animate-pulse rounded bg-white/10" />
                      <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                    </div>
                  ))
                ) : (
                  sortedTechniques.map((t) => (
                    <TechniqueCard
                      key={t.id}
                      technique={t}
                      status={statusFor(t.id)}
                      onOpen={() => setSheetTechnique(t)}
                      onSetStatus={(s) => setTechniqueStatus(t.id, s)}
                    />
                  ))
                )}
              </div>
            </section>
          </>
        )}

        {hasPaths && !plan && (
          <p className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-8 text-center text-sm text-white/60">
            Choose a path in the sidebar to resume, or add a new learning path.
          </p>
        )}
      </div>

      {plan ? (
        <TechniqueLearnSheet
          open={!!sheetTechnique}
          plan={plan}
          technique={sheetTechnique}
          onClose={() => setSheetTechnique(null)}
        />
      ) : null}
    </div>
  );
}
