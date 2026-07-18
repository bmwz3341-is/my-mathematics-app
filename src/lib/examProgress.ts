/**
 * Per-exam progress, persisted to localStorage — one key per exam, mirroring
 * the read/write style of `activityTracker.ts`. Lets a student leave an exam
 * mid-way and resume at the same question later.
 */

const PROGRESS_KEY_PREFIX = "mathApp.examProgress.";

export interface QuestionAnswer {
  userAnswer: string;
  isCorrect: boolean;
}

export interface ExamProgress {
  currentQuestionIndex: number;
  answers: Record<string, QuestionAnswer>;
  completed: boolean;
  lastScore?: number;
}

export const EMPTY_EXAM_PROGRESS: ExamProgress = { currentQuestionIndex: 0, answers: {}, completed: false };

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
    // localStorage unavailable (private browsing, quota exceeded) — progress tracking is best-effort.
  }
}

export function getExamProgress(examId: string): ExamProgress {
  return readJSON(PROGRESS_KEY_PREFIX + examId, EMPTY_EXAM_PROGRESS);
}

export function saveExamProgress(examId: string, progress: ExamProgress): void {
  writeJSON(PROGRESS_KEY_PREFIX + examId, progress);
}

export function resetExamProgress(examId: string): void {
  writeJSON(PROGRESS_KEY_PREFIX + examId, EMPTY_EXAM_PROGRESS);
}
