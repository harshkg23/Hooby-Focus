"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/me");
      const data = (await res.json()) as {
        user?: { name: string; email: string };
      };
      if (!cancelled && data.user) setUser(data.user);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#0c0e12] text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-1/4 top-0 h-[min(520px,70vw)] w-[min(520px,70vw)] rounded-full bg-[#06b6d4] opacity-[0.11] blur-[120px] animate-orb" />
        <div className="absolute -right-1/4 top-1/4 h-[min(480px,65vw)] w-[min(480px,65vw)] rounded-full bg-[#7c5cff] opacity-[0.09] blur-[110px] animate-orb-delayed" />
        <div className="absolute bottom-0 left-1/2 h-[280px] w-[min(100%,720px)] -translate-x-1/2 rounded-full bg-[#2dd4bf] opacity-[0.05] blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgb(12_14_18/0.72)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="font-display text-lg font-semibold tracking-tight text-white"
          >
            Hobby Focus
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <span className="hidden max-w-[200px] truncate text-white/65 sm:inline" title={user.email}>
                {user.name}
              </span>
            ) : (
              <span className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-medium text-white/90 transition hover:bg-white/10"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] flex-1 px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        {children}
      </div>
    </div>
  );
}
