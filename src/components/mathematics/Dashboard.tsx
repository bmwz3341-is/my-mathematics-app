"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, History } from "lucide-react";
import { mathItems } from "@/config/mathematicsData";
import { getRecentExercises, getWeeklyCount, type RecentExercise } from "@/lib/activityTracker";
import { setPendingChallenge } from "@/lib/dailyChallengeSession";
import type { Challenge } from "@/config/challenges";

/**
 * Personal home-screen dashboard: a one-line weekly-activity summary plus a
 * "continue last exercise" button. Reads localStorage via `activityTracker`,
 * so state is only available after mount — read it in an effect rather than
 * during render to avoid an SSR/client hydration mismatch.
 *
 * Navigation reuses the existing daily-challenge hand-off mechanism
 * (`setPendingChallenge` + `useDailyChallengeAutoFill`, already wired into
 * every solver page) instead of inventing a new one, so no solver page needs
 * to change to support "continue last exercise".
 */
export default function Dashboard() {
  const router = useRouter();
  const [weeklyCount, setWeeklyCount] = useState<number | null>(null);
  const [lastExercise, setLastExercise] = useState<RecentExercise | null>(null);

  useEffect(() => {
    setWeeklyCount(getWeeklyCount());
    setLastExercise(getRecentExercises()[0] ?? null);
  }, []);

  const lastTool = lastExercise ? mathItems.find((item) => item.id === lastExercise.type) : undefined;

  function handleContinue() {
    if (!lastExercise || !lastTool?.href) return;
    const challenge: Challenge = {
      toolId: lastExercise.type,
      href: lastTool.href,
      type: "algebra",
      equation1: lastExercise.expression,
    };
    setPendingChallenge(challenge);
    router.push(lastTool.href);
  }

  // Nothing saved yet (or still on the server) — render nothing rather than a misleading "0".
  if (weeklyCount === null) return null;

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-xl border border-white/40 bg-white/20 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-black/70">
          <Flame className="size-4 text-white" strokeWidth={2} />
        </span>
        <p className="flex-1 text-right text-sm font-bold text-slate-800">
          {weeklyCount > 0 ? `פתרת ${weeklyCount} תרגילים השבוע` : "עדיין לא פתרת תרגילים השבוע"}
        </p>
      </div>

      {lastExercise && lastTool?.href && (
        <button
          type="button"
          onClick={handleContinue}
          className="flex w-full items-center gap-3 rounded-xl bg-white/80 px-4 py-3 text-right shadow-sm transition hover:bg-white active:brightness-95"
        >
          <History className="size-4 shrink-0 text-slate-500" strokeWidth={2.5} />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-slate-500">המשך תרגיל אחרון · {lastTool.label}</span>
            <span dir="ltr" className="block truncate text-left font-mono text-sm font-extrabold text-slate-800">
              {lastExercise.expression}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
