import type { Challenge } from "@/config/challenges";

const STORAGE_KEY = "pendingDailyChallenge";

export function setPendingChallenge(challenge: Challenge): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(challenge));
}

export function consumePendingChallenge(): Challenge | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    return JSON.parse(raw) as Challenge;
  } catch {
    return null;
  }
}
