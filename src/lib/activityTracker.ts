/**
 * Local, per-browser activity tracker for the home-screen dashboard. Stored
 * entirely in localStorage (no backend) under three small, self-pruning keys
 * — nothing here ever grows unbounded, so there's no cleanup job to run.
 *
 * Placed in `src/lib/` rather than `src/utils/` to match how every other
 * cross-cutting helper in this app is organized (`dailyChallengeSession.ts`,
 * `useDailyChallengeAutoFill.ts`, the solver engines, etc. all live here).
 */

const RECENT_KEY = "mathApp.recentExercises";
const STATS_KEY = "mathApp.exerciseStats";
const WEEKLY_LOG_KEY = "mathApp.weeklyLog";

const MAX_RECENT = 3;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** One entry in the "last 3 exercises" list. `type` matches a `MathItem.id` / `Challenge.toolId`. */
export interface RecentExercise {
  type: string;
  expression: string;
  timestamp: number;
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable (private browsing, quota exceeded) — tracking is best-effort.
  }
}

/**
 * Records that the user solved `expression` on the `type` track (e.g.
 * "functionAnalysis", matching `MathItem.id`). Keeps the 3 most recent
 * exercises, bumps that track's lifetime counter, and logs a timestamp for
 * the rolling weekly count.
 */
export function saveRecentExercise(type: string, expression: string): void {
  const trimmed = expression.trim();
  if (!type || !trimmed) return;

  const now = Date.now();

  const recent = readJSON<RecentExercise[]>(RECENT_KEY, []);
  const deduped = recent.filter((e) => !(e.type === type && e.expression === trimmed));
  writeJSON(RECENT_KEY, [{ type, expression: trimmed, timestamp: now }, ...deduped].slice(0, MAX_RECENT));

  const stats = readJSON<Record<string, number>>(STATS_KEY, {});
  stats[type] = (stats[type] ?? 0) + 1;
  writeJSON(STATS_KEY, stats);

  const cutoff = now - WEEK_MS;
  const weeklyLog = readJSON<number[]>(WEEKLY_LOG_KEY, []).filter((t) => t > cutoff);
  weeklyLog.push(now);
  writeJSON(WEEKLY_LOG_KEY, weeklyLog);
}

/** The last up-to-3 exercises solved, most recent first. */
export function getRecentExercises(): RecentExercise[] {
  return readJSON<RecentExercise[]>(RECENT_KEY, []);
}

/** Lifetime count of solved exercises per track (`MathItem.id` -> count). */
export function getStats(): Record<string, number> {
  return readJSON<Record<string, number>>(STATS_KEY, {});
}

/** Count of exercises solved in the last 7 days, across all tracks. */
export function getWeeklyCount(): number {
  const cutoff = Date.now() - WEEK_MS;
  return readJSON<number[]>(WEEKLY_LOG_KEY, []).filter((t) => t > cutoff).length;
}
