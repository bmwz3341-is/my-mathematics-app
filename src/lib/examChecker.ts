/**
 * Exam-answer checking + step extraction. Per the task's constraint, this
 * never touches solver *logic* — it only calls the existing, unmodified
 * solver functions and reads their result. That is deliberately the
 * *source of truth*: the exam JSON's `expectedAnswer` can drift from what
 * the real engine computes (a different root order, a different displayed
 * form), so for every subject with a registered checker below, both the
 * correctness check AND the displayed solution steps come straight from a
 * live call to that subject's solver — `expectedAnswer` is only a fallback
 * for subjects without a registered checker (currently none are shipped
 * fallback-only; every exam in `exams.json` targets a wired subject so that
 * "every exam shows real solution steps" is actually true, not aspirational).
 */

import { solveMathInput } from "@/lib/equationSolver";
import { solveQuadratic } from "@/lib/quadraticSolver";
import { solvePowerExpression } from "@/lib/powerLaws";
import { solveLogarithmicEquation } from "@/lib/logarithmEquations";
import { differentiateExpr } from "@/lib/functionAnalysis";
import { analyzeCircle } from "@/lib/circleGeometry";
import { solveSystem } from "@/lib/systemOfEquations";
import { solveSystem3 } from "@/lib/system3Equations";

export interface ExamStep {
  label: string;
  expr: string;
}

export interface CheckResult {
  isCorrect: boolean;
  correctAnswer: string;
  /** true when checked against a live solver engine; false when it fell back to expectedAnswer. */
  verified: boolean;
  steps: ExamStep[];
}

/** All numeric tokens anywhere in a string (tolerates "x=2, y=3", "(2, 3)", simple a/b fractions). */
function extractNumbers(raw: string): number[] {
  const matches = raw.match(/-?\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?/g) ?? [];
  return matches
    .map((m) => {
      const frac = m.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
      if (frac) return parseFloat(frac[1]) / parseFloat(frac[2]);
      return parseFloat(m);
    })
    .filter((n) => Number.isFinite(n));
}

function numbersClose(a: number, b: number, eps = 1e-4): boolean {
  return Math.abs(a - b) < eps;
}

function numberSetsMatch(userNums: number[], correctNums: number[]): boolean {
  return userNums.length === correctNums.length && correctNums.every((c) => userNums.some((u) => numbersClose(u, c)));
}

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
};

/** "x²" -> "x^2" (groups consecutive superscript digits so multi-digit exponents survive), so
 * caret-typed student input ("x^2") matches the engine's unicode-superscript display ("x²"). */
function unSuperscript(s: string): string {
  return s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (run) => "^" + run.split("").map((ch) => SUPERSCRIPT_DIGITS[ch]).join(""));
}

function normalize(s: string): string {
  return unSuperscript(s.trim()).replace(/\s+/g, "").toLowerCase();
}

/** Numeric-first, string-normalized-fallback: handles both "x=4" and "x^5" style correct answers. */
function answersMatch(userAnswer: string, correctAnswer: string): boolean {
  const userNums = extractNumbers(userAnswer);
  const correctNums = extractNumbers(correctAnswer);
  if (userNums.length === 1 && correctNums.length === 1) return numbersClose(userNums[0], correctNums[0]);
  return normalize(userAnswer) === normalize(correctAnswer);
}

/** Everything after the last "⇒" in a headline, then after its own "=" if it has one:
 * "3^x = 81  ⇒  x = 4" -> "4"; "x^2*x^3  ⇒  x^5" -> "x^5". */
function extractHeadlineAnswer(headline: string): string {
  const afterArrow = headline.split("⇒").pop()?.trim() ?? headline.trim();
  const eqMatch = afterArrow.match(/=\s*(.+)$/);
  return (eqMatch ? eqMatch[1] : afterArrow).trim();
}

type Checker = (expression: string, userAnswer: string) => CheckResult | null;

const CHECKERS: Record<string, Checker> = {
  linearEquations: (expression, userAnswer) => {
    const result = solveMathInput(expression);
    if (result.type !== "equation" || result.hasParams) return null;
    const correctAnswer = result.solutions.map((s) => s.xDisplay).join(", ");
    const userNums = extractNumbers(userAnswer);
    const isCorrect =
      userNums.length === 1 && result.solutions.some((s) => s.xNumeric !== undefined && numbersClose(s.xNumeric, userNums[0]));
    return { isCorrect, correctAnswer, verified: true, steps: result.steps.map((s, i) => ({ label: `שלב ${i + 1}`, expr: s })) };
  },

  quadraticEquations: (expression, userAnswer) => {
    const result = solveQuadratic(expression);
    if (result.type !== "result" || result.hasParams) return null;
    const steps = result.steps.map((s) => ({ label: s.label, expr: s.expr }));
    if (result.roots.length === 0) {
      return { isCorrect: /^(אין|no|∅)/i.test(userAnswer.trim()), correctAnswer: "אין פתרון ממשי", verified: true, steps };
    }
    const correctAnswer = [...result.roots].sort((a, b) => a - b).join(", ");
    const isCorrect = numberSetsMatch(extractNumbers(userAnswer), result.roots);
    return { isCorrect, correctAnswer, verified: true, steps };
  },

  powersAlgebra: (expression, userAnswer) => {
    const result = solvePowerExpression(expression);
    if (result.type !== "result") return null;
    const correctAnswer = extractHeadlineAnswer(result.headline);
    return {
      isCorrect: answersMatch(userAnswer, correctAnswer),
      correctAnswer,
      verified: true,
      steps: result.steps.map((s) => ({ label: s.law, expr: s.expr })),
    };
  },

  logarithmicEquations: (expression, userAnswer) => {
    const result = solveLogarithmicEquation(expression);
    if (result.type !== "result" || result.mode !== "equation") return null;
    const correctAnswer = extractHeadlineAnswer(result.headline);
    return {
      isCorrect: answersMatch(userAnswer, correctAnswer),
      correctAnswer,
      verified: true,
      steps: result.steps.map((s) => ({ label: s.label, expr: s.expr })),
    };
  },

  functionAnalysis: (expression, userAnswer) => {
    const result = differentiateExpr(expression);
    if (result.type !== "result") return null;
    return {
      isCorrect: normalize(userAnswer) === normalize(result.derivativeExpr),
      correctAnswer: result.derivativeExpr,
      verified: true,
      steps: result.steps.map((s) => ({ label: s.law, expr: s.expr })),
    };
  },

  circleGeometry: (expression, userAnswer) => {
    const result = analyzeCircle(expression);
    if (result.type !== "result") return null;
    const { centerX, centerY, radius } = result.circle;
    const correctAnswer = `מרכז (${centerX}, ${centerY}), רדיוס ${radius}`;
    const isCorrect = numberSetsMatch(extractNumbers(userAnswer), [centerX, centerY, radius]);
    return { isCorrect, correctAnswer, verified: true, steps: result.steps.map((s) => ({ label: s.law, expr: s.expr })) };
  },

  systemOfEquations: (expression, userAnswer) => {
    const [eq1, eq2] = expression.split("|").map((s) => s.trim());
    if (!eq1 || !eq2) return null;
    const result = solveSystem(eq1, eq2, "elimination");
    if (result.type !== "unique") return null;
    const correctAnswer = `x = ${result.x}, y = ${result.y}`;
    const isCorrect = numberSetsMatch(extractNumbers(userAnswer), [result.x, result.y]);
    return { isCorrect, correctAnswer, verified: true, steps: result.steps.map((s) => ({ label: s.label, expr: s.expr })) };
  },

  systemOf3Equations: (expression, userAnswer) => {
    const [eq1, eq2, eq3] = expression.split("|").map((s) => s.trim());
    if (!eq1 || !eq2 || !eq3) return null;
    const result = solveSystem3(eq1, eq2, eq3);
    if (result.type !== "unique") return null;
    const correctAnswer = `x = ${result.x}, y = ${result.y}, z = ${result.z}`;
    const isCorrect = numberSetsMatch(extractNumbers(userAnswer), [result.x, result.y, result.z]);
    return { isCorrect, correctAnswer, verified: true, steps: result.steps.map((s) => ({ label: s.label, expr: s.expr })) };
  },
};

export function checkAnswer(subject: string, expression: string, userAnswer: string, expectedAnswer: string): CheckResult {
  const live = CHECKERS[subject]?.(expression, userAnswer);
  if (live) return live;
  return { isCorrect: answersMatch(userAnswer, expectedAnswer), correctAnswer: expectedAnswer, verified: false, steps: [] };
}
