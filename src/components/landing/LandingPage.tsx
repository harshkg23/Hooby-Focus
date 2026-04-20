"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarketingHeader } from "@/components/layout/MarketingHeader";

const STEPS = [
  {
    title: "Choose your craft",
    body: "Name your hobby, your level, and an optional goal. We meet you where you are.",
  },
  {
    title: "Follow a tiny path",
    body: "Five to eight techniques—curated, ordered, and free of endless tabs.",
  },
  {
    title: "Learn in three modes",
    body: "Video, structured reading, and listen-on-demand. Progress stays visible.",
  },
];

export function LandingPage() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!cancelled) setLoggedIn(res.ok);
      } catch {
        if (!cancelled) setLoggedIn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0c0e12] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 top-0 h-[520px] w-[520px] rounded-full bg-[#06b6d4] opacity-[0.12] blur-[120px] animate-orb" />
        <div className="absolute -right-1/4 top-1/3 h-[480px] w-[480px] rounded-full bg-[#7c5cff] opacity-[0.1] blur-[110px] animate-orb-delayed" />
        <div className="absolute bottom-0 left-1/2 h-[320px] w-[min(100%,720px)] -translate-x-1/2 rounded-full bg-[#2dd4bf] opacity-[0.06] blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <MarketingHeader />

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6 sm:pb-32 sm:pt-36">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white/70">
              Curated paths · Any hobby
            </p>
            <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-5xl md:text-6xl">
              Master{" "}
              <span className="bg-gradient-to-r from-[#99f6e4] via-[#2dd4bf] to-[#a78bfa] bg-clip-text text-transparent">
                one thing
              </span>{" "}
              at a time.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/65 sm:text-xl">
              A calm studio for learning—not a content landfill. Short plans, clear progress, and
              three ways to absorb each technique.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              {loggedIn ? (
                <Link
                  href="/dashboard"
                  className="inline-flex w-full min-w-[220px] items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-[#0c0e12] shadow-xl shadow-black/25 transition hover:bg-white/95 sm:w-auto"
                >
                  Go to dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="inline-flex w-full min-w-[200px] items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-[#0c0e12] shadow-xl shadow-black/25 transition hover:bg-white/95 sm:w-auto"
                  >
                    Start free
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex w-full min-w-[200px] items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-base font-medium text-white backdrop-blur-sm transition hover:bg-white/10 sm:w-auto"
                  >
                    I have an account
                  </Link>
                </>
              )}
            </div>
            <p className="mt-6 text-sm text-white/40">No credit card · Your progress stays yours</p>
          </div>

          <div className="mx-auto mt-20 grid max-w-4xl gap-4 sm:grid-cols-3">
            {["Focused", "Human-paced", "Rewarding"].map((label) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center backdrop-blur-sm"
              >
                <p className="text-sm font-medium text-white/90">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 bg-black/20 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-semibold sm:text-4xl">How it works</h2>
              <p className="mt-3 text-white/55">
                Three beats—setup, path, practice—designed to protect your attention.
              </p>
            </div>
            <ol className="mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-transparent p-8"
                >
                  <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold text-white/90">
                    {i + 1}
                  </span>
                  <h3 className="font-display text-xl font-semibold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent p-10 sm:p-14 md:p-16">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="font-display text-3xl font-semibold sm:text-4xl">
                  Ready for a quieter way to improve?
                </h2>
                <p className="mt-4 text-lg text-white/60">
                  Sign in, pick your next skill, and let the path do the organizing.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  {loggedIn ? (
                    <Link
                      href="/dashboard"
                      className="inline-flex min-w-[220px] items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-[#0c0e12] shadow-lg transition hover:bg-white/95"
                    >
                      Open dashboard
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/signup"
                        className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-[#0c0e12] shadow-lg transition hover:bg-white/95"
                      >
                        Create account
                      </Link>
                      <Link
                        href="/login"
                        className="text-sm font-medium text-white/70 underline-offset-4 hover:text-white hover:underline"
                      >
                        Log in instead
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 py-10 text-center text-sm text-white/40">
          <p>Hobby Focus — learn with intention.</p>
        </footer>
      </main>
    </div>
  );
}
