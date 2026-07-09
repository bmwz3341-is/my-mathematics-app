const STORAGE_KEY = "recentConversions";
const MAX_RECENT = 3;

export function getRecentConversionIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function addRecentConversionId(id: string) {
  if (typeof window === "undefined") return;
  const withoutId = getRecentConversionIds().filter((existingId) => existingId !== id);
  const updated = [id, ...withoutId].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
