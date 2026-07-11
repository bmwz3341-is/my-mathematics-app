/**
 * Extremum finder built on top of the derivative engine: solves f'(x) = 0
 * (exactly for degree <= 2, numerically otherwise) and classifies each
 * critical point via the sign of f''(x) at that point.
 */

import { type Term, differentiateTerms, evalPolynomial, formatPolynomial } from "@/lib/derivative";

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

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function degreeOf(terms: Term[]): number {
  return terms.reduce((m, t) => Math.max(m, t.power), 0);
}

function coeffOf(terms: Term[], power: number): number {
  return terms.find((t) => t.power === power)?.coefficient ?? 0;
}

function newtonRaphsonRoots(f: (x: number) => number, fPrime: (x: number) => number, seeds: number[]): number[] {
  const found: number[] = [];
  for (const seed of seeds) {
    let x = seed;
    let converged = false;
    for (let iter = 0; iter < 100; iter++) {
      const fx = f(x);
      const dfx = fPrime(x);
      if (!Number.isFinite(fx) || !Number.isFinite(dfx) || Math.abs(dfx) < 1e-12) break;
      const next = x - fx / dfx;
      if (!Number.isFinite(next)) break;
      if (Math.abs(next - x) < 1e-9) {
        x = next;
        converged = true;
        break;
      }
      x = next;
    }
    if (converged && Math.abs(f(x)) < 1e-6) found.push(x);
  }
  const rounded = found.map((v) => Math.round(v * 1e6) / 1e6);
  return Array.from(new Set(rounded)).sort((a, b) => a - b);
}

export function findExtrema(originalTerms: Term[], variable: string): FunctionAnalysisResult {
  const derivativeTerms = differentiateTerms(originalTerms);
  const secondDerivativeTerms = differentiateTerms(derivativeTerms);
  const derivativeExpr = formatPolynomial(derivativeTerms, variable);
  const secondDerivativeExpr = formatPolynomial(secondDerivativeTerms, variable);

  const steps: AnalysisStep[] = [
    { law: "השוואת הנגזרת לאפס", expr: `f'(${variable}) = 0  ⇒  ${derivativeExpr} = 0` },
  ];

  if (derivativeTerms.length === 0) {
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

  const degree = degreeOf(derivativeTerms);
  let roots: number[] = [];

  if (degree === 0) {
    roots = [];
    steps.push({ law: "אין פתרון", expr: `${derivativeExpr} = 0 אינו מתקיים לאף ${variable}  ⇒  אין נקודות קיצון` });
  } else if (degree === 1) {
    const a = coeffOf(derivativeTerms, 1);
    const b = coeffOf(derivativeTerms, 0);
    const x0 = -b / a;
    steps.push({
      law: "פתרון משוואה לינארית",
      expr: `${derivativeExpr} = 0  ⇒  ${variable} = ${formatNumber(x0)}`,
    });
    roots = [x0];
  } else if (degree === 2) {
    const a = coeffOf(derivativeTerms, 2);
    const b = coeffOf(derivativeTerms, 1);
    const c = coeffOf(derivativeTerms, 0);
    const disc = b * b - 4 * a * c;
    steps.push({
      law: "דיסקרימיננטה",
      expr: `D = b² - 4ac = (${formatNumber(b)})² - 4·(${formatNumber(a)})·(${formatNumber(c)}) = ${formatNumber(disc)}`,
    });
    if (disc < 0) {
      steps.push({ law: "אין פתרון ממשי", expr: "D < 0  ⇒  אין נקודות קיצון" });
      roots = [];
    } else if (disc === 0) {
      const x0 = -b / (2 * a);
      steps.push({ law: "פתרון (שורש כפול)", expr: `${variable} = -b/(2a) = ${formatNumber(x0)}` });
      roots = [x0];
    } else {
      const sq = Math.sqrt(disc);
      const x1 = (-b + sq) / (2 * a);
      const x2 = (-b - sq) / (2 * a);
      steps.push({
        law: "נוסחת השורשים",
        expr: `${variable} = (-b ± √D) / 2a  ⇒  ${variable} = ${formatNumber(x1)}, ${formatNumber(x2)}`,
      });
      roots = [x1, x2].sort((p, q) => p - q);
    }
  } else {
    const f = (x: number) => evalPolynomial(derivativeTerms, x);
    const fPrime = (x: number) => evalPolynomial(secondDerivativeTerms, x);
    const seeds = [-20, -10, -6, -4, -3, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3, 4, 6, 10, 20];
    roots = newtonRaphsonRoots(f, fPrime, seeds);
    steps.push({
      law: "שיטה נומרית: ניוטון-רפסון",
      expr:
        roots.length > 0
          ? `${derivativeExpr} = 0  ⇒  ${variable} ≈ ${roots.map(formatNumber).join(", ")}`
          : `${derivativeExpr} = 0  ⇒  לא נמצאו נקודות קיצון ממשיות בטווח החיפוש`,
    });
  }

  const criticalPoints: CriticalPoint[] = roots.map((x0) => {
    const y0 = evalPolynomial(originalTerms, x0);
    const secondVal = evalPolynomial(secondDerivativeTerms, x0);
    const kind: CriticalPoint["kind"] = secondVal > 1e-9 ? "min" : secondVal < -1e-9 ? "max" : "unknown";
    const kindLabel = kind === "min" ? "נקודת מינימום" : kind === "max" ? "נקודת מקסימום" : "לא ניתן לקבוע (יתכן נקודת פיתול)";
    steps.push({
      law: `סיווג לפי הנגזרת השנייה ב-${variable} = ${formatNumber(x0)}`,
      expr: `f''(${formatNumber(x0)}) = ${formatNumber(secondVal)}  ⇒  ${kindLabel}`,
    });
    return { x: x0, y: y0, secondDerivative: secondVal, kind };
  });

  return { type: "result", variable, derivativeExpr, secondDerivativeExpr, criticalPoints, steps };
}
