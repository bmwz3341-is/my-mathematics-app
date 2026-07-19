/**
 * Exam Hub data access: types + a typed, validated view over the static
 * `src/data/exams.json` seed data. `subject` deliberately reuses the same
 * id vocabulary as `MathItem.id` (mathematicsData.ts) / `Challenge.toolId`,
 * so an exam can look up its track's icon/label/href for free.
 */

import examsData from "@/data/exams.json";

export type Difficulty = "easy" | "medium" | "hard";

export interface ExamQuestion {
  id: string;
  expression: string;
  expectedAnswer: string;
  /** functionAnalysis-only: "derivative" (default) asks for f'(x); "extrema" asks for the min/max points. */
  mode?: "derivative" | "extrema";
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  difficulty: Difficulty;
  questions: ExamQuestion[];
}

export const exams: Exam[] = examsData as Exam[];

export function getExamById(id: string): Exam | undefined {
  return exams.find((exam) => exam.id === id);
}
