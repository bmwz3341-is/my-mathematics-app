/**
 * Function-analysis engine built directly on the general symbolic-algebra
 * layer (`symbolicAlgebra.ts`) instead of the old monomial-only engine in
 * `derivative.ts`. This lets it differentiate expressions that engine could
 * not parse at all: bracketed/factored products (e.g. "(x-2)(x+2)^3") and
 * coefficients that carry a parameter letter (e.g. "x^3 - 3a*x^2").
 *
 * Finding extrema still requires the derivative to be a *purely numeric*
 * single-variable polynomial (no leftover parameter) — solving f'(x) = 0
 * exactly for an arbitrary symbolic parameter isn't attempted here, so a
 * parameter must be substituted with a number first, same as before.
 */

import {
  type Sym,
  parseAlgebraic,
  differentiateSym,
  formatPolyInVar,
  formatStepNumber,
  polyCoefficients,
  solveRealPolynomial,
  evalSymSingleVar,
  symIsZero,
} from "@/lib/symbolicAlgebra";

export interface AnalysisStep {
  law: string;
  expr: string;
}

export interface CriticalPoint {
  x: number;
  y: number;
  secondDerivative: number;
  kind: "max" | "min" | "unknown";
}

export type DerivativeResult =
  | {
      type: "result";
      variable: string;
      originalExpr: string;
      derivativeExpr: string;
      originalSym: Sym;
      derivativeSym: Sym;
      steps: AnalysisStep[];
    }
  | { type: "error"; message: string };

export type FunctionAnalysisResult =
  | {
      type: "result";
      variable: string;
      derivativeExpr: string;
      secondDerivativeExpr: string;
      criticalPoints: CriticalPoint[];
      steps: AnalysisStep[];
      note?: string;
    }
  | { type: "error"; message: string };

/**
 * "x" whenever it appears (a parameter letter like `a` or `k` may also be
 * present, and must not be mistaken for the differentiation variable);
 * otherwise the first alphabetic character found. Matches the same
 * convention already used by `equationSolver.ts`/`quadraticSolver.ts`.
 */
function detectVariable(input: string): string {
  if (/x/i.test(input)) return "x";
  const match = input.match(/[a-zA-Z]/);
  return match ? match[0].toLowerCase() : "x";
}

/**
 * Parses and differentiates `input` once, expanding any brackets and keeping
 * parameter letters symbolic. Used by the "גזור פונקציה" button.
 */
export function differentiateExpr(input: string): DerivativeResult {
  const trimmed = input.trim();
  if (!trimmed) return { type: "error", message: "נא להזין פונקציה, למשל x^3 + 2x^2" };
  if (trimmed.includes("=")) {
    return { type: "error", message: "נא להזין ביטוי (פונקציה) ולא משוואה — ללא סימן =" };
  }

  const variable = detectVariable(trimmed);
  try {
    const originalSym = parseAlgebraic(trimmed);
    const derivativeSym = differentiateSym(originalSym, variable);
    const originalExpr = formatPolyInVar(originalSym, variable);
    const derivativeExpr = formatPolyInVar(derivativeSym, variable);

    const steps: AnalysisStep[] = [
      { law: "פישוט/פיתוח הביטוי (כולל סוגריים)", expr: `f(${variable}) = ${originalExpr}` },
      {
        law: `כלל החזקה וכלל הסכום: (${variable}ⁿ)' = n·${variable}ⁿ⁻¹`,
        expr: `f'(${variable}) = ${derivativeExpr}`,
      },
    ];

    return { type: "result", variable, originalExpr, derivativeExpr, originalSym, derivativeSym, steps };
  } catch (err) {
    return { type: "error", message: err instanceof Error ? err.message : "שגיאה בעיבוד הביטוי" };
  }
}

/**
 * Real roots of `expr`, read as a single-variable numeric polynomial in
 * `variable` (throws — via `polyCoefficients` — if a parameter letter is
 * still present). Wraps `solveRealPolynomial`, which is exact for degree
 * ≤ 2 and numeric (bisection) for higher degrees.
 */
export function findRoots(expr: Sym, variable: string): number[] {
  const coeffs = polyCoefficients(expr, variable);
  return solveRealPolynomial(coeffs);
}

/** Finds and classifies the extrema of `originalSym` (a numeric polynomial in `variable`). */
export function findExtrema(originalSym: Sym, variable: string): FunctionAnalysisResult {
  const derivativeSym = differentiateSym(originalSym, variable);
  const secondDerivativeSym = differentiateSym(derivativeSym, variable);
  const derivativeExpr = formatPolyInVar(derivativeSym, variable);
  const secondDerivativeExpr = formatPolyInVar(secondDerivativeSym, variable);

  const steps: AnalysisStep[] = [
    { law: "השוואת הנגזרת לאפס", expr: `f'(${variable}) = 0  ⇒  ${derivativeExpr} = 0` },
  ];

  if (symIsZero(derivativeSym)) {
    return {
      type: "result",
      variable,
      derivativeExpr,
      secondDerivativeExpr,
      criticalPoints: [],
      steps,
      note: "הנגזרת שווה לאפס בכל נקודה — הפונקציה קבועה, ואין נקודות קיצון מבודדות",
    };
  }

  let roots: number[];
  try {
    roots = findRoots(derivativeSym, variable);
  } catch (err) {
    return {
      type: "error",
      message:
        err instanceof Error
          ? `יש להציב ערך מספרי לכל הפרמטרים לפני חיפוש נקודות קיצון (${err.message})`
          : "יש להציב ערך מספרי לכל הפרמטרים לפני חיפוש נקודות קיצון",
    };
  }

  steps.push({
    law: roots.length > 0 ? "פתרון המשוואה" : "אין פתרון",
    expr:
      roots.length > 0
        ? `${derivativeExpr} = 0  ⇒  ${variable} = ${roots.map(formatStepNumber).join(", ")}`
        : `${derivativeExpr} = 0 אינו מתקיים לאף ${variable} ממשי  ⇒  אין נקודות קיצון`,
  });

  const criticalPoints: CriticalPoint[] = roots.map((x0) => {
    const y0 = evalSymSingleVar(originalSym, variable, x0);
    const secondVal = evalSymSingleVar(secondDerivativeSym, variable, x0);
    const kind: CriticalPoint["kind"] = secondVal > 1e-9 ? "min" : secondVal < -1e-9 ? "max" : "unknown";
    const kindLabel =
      kind === "min" ? "נקודת מינימום" : kind === "max" ? "נקודת מקסימום" : "לא ניתן לקבוע (יתכן נקודת פיתול)";
    steps.push({
      law: `סיווג לפי הנגזרת השנייה ב-${variable} = ${formatStepNumber(x0)}`,
      expr: `f''(${formatStepNumber(x0)}) = ${formatStepNumber(secondVal)}  ⇒  ${kindLabel}`,
    });
    return { x: x0, y: y0, secondDerivative: secondVal, kind };
  });

  return { type: "result", variable, derivativeExpr, secondDerivativeExpr, criticalPoints, steps };
}
