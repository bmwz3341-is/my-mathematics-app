"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getExamProgress,
  saveExamProgress,
  resetExamProgress,
  EMPTY_EXAM_PROGRESS,
  type ExamProgress,
} from "@/lib/examProgress";

/**
 * Reactive wrapper around `examProgress.ts` for a single exam — reads once on
 * mount (localStorage is client-only), and every `update` both re-renders and
 * persists in one call.
 */
export function useExamProgress(examId: string) {
  const [progress, setProgress] = useState<ExamProgress>(EMPTY_EXAM_PROGRESS);

  useEffect(() => {
    setProgress(getExamProgress(examId));
  }, [examId]);

  const update = useCallback(
    (next: ExamProgress) => {
      setProgress(next);
      saveExamProgress(examId, next);
    },
    [examId],
  );

  const reset = useCallback(() => {
    resetExamProgress(examId);
    setProgress(EMPTY_EXAM_PROGRESS);
  }, [examId]);

  return { progress, update, reset };
}
