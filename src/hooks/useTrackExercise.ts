"use client";

import { useCallback } from "react";
import { saveRecentExercise } from "@/lib/activityTracker";

/**
 * Thin hook wrapper around `activityTracker.saveRecentExercise`, so every
 * solver component wires up tracking with one import + one call instead of
 * importing `activityTracker` directly in each of them. Returns a stable
 * `track` function: `track(toolId, expression)`, where `toolId` matches a
 * `MathItem.id` (see `mathematicsData.ts`) / `Challenge.toolId`.
 */
export function useTrackExercise(): (toolId: string, expression: string) => void {
  return useCallback((toolId: string, expression: string) => {
    saveRecentExercise(toolId, expression);
  }, []);
}
