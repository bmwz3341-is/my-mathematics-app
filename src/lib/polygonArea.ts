/**
 * Polygon area engine (5-unit level): triangle (base·height, or two sides
 * with the included angle), quadrilaterals (trapezoid, rhombus by
 * diagonals, parallelogram), and a regular n-gon by side length. Every
 * solver validates its inputs and returns the numeric area together with
 * pedagogical steps (formula → substitution → result), matching the
 * step-by-step convention used across the app's other solvers.
 */

export class PolygonAreaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PolygonAreaError";
  }
}

export interface AreaStep {
  law: string;
  expr: string;
}

export type AreaResult =
  | { type: "result"; area: number; steps: AreaStep[] }
  | { type: "error"; message: string };

const toRad = (deg: number) => (deg * Math.PI) / 180;

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4 || 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function requirePositive(value: number | undefined, label: string): number {
  if (value === undefined) throw new PolygonAreaError(`יש להזין ערך עבור ${label}`);
  if (!(value > 0)) throw new PolygonAreaError(`הערך של ${label} חייב להיות מספר חיובי`);
  return value;
}

function runSolver(build: () => { area: number; steps: AreaStep[] }): AreaResult {
  try {
    const { area, steps } = build();
    return { type: "result", area, steps };
  } catch (err) {
    return { type: "error", message: err instanceof PolygonAreaError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}

/* ------------------------------------------------------------------ */
/* Triangle                                                            */
/* ------------------------------------------------------------------ */

export type TriangleAreaMode = "baseHeight" | "sas";

export interface TriangleAreaInput {
  base?: number;
  height?: number;
  a?: number;
  b?: number;
  angle?: number; // included angle C between sides a and b, in degrees
}

export function solveTriangleAreaBaseHeight(input: TriangleAreaInput): AreaResult {
  return runSolver(() => {
    const base = requirePositive(input.base, "הבסיס a");
    const height = requirePositive(input.height, "הגובה h");
    const area = 0.5 * base * height;
    return {
      area,
      steps: [
        { law: "נוסחת שטח משולש לפי בסיס וגובה", expr: "S = ½ · a · h" },
        { law: "הצבת הנתונים", expr: `S = ½ · ${formatNumber(base)} · ${formatNumber(height)} = ${formatNumber(area)}` },
      ],
    };
  });
}

export function solveTriangleAreaSAS(input: TriangleAreaInput): AreaResult {
  return runSolver(() => {
    const a = requirePositive(input.a, "הצלע a");
    const b = requirePositive(input.b, "הצלע b");
    const angle = requirePositive(input.angle, "הזווית C הכלואה");
    if (!(angle < 180)) throw new PolygonAreaError("הזווית C חייבת להיות בין 0° ל-180°");
    const sinC = Math.sin(toRad(angle));
    const area = 0.5 * a * b * sinC;
    return {
      area,
      steps: [
        { law: "נוסחת שטח משולש לפי שתי צלעות והזווית הכלואה", expr: "S = ½ · a · b · sin(C)" },
        {
          law: "הצבת הנתונים",
          expr: `S = ½ · ${formatNumber(a)} · ${formatNumber(b)} · sin(${formatNumber(angle)}°) = ½ · ${formatNumber(a)} · ${formatNumber(b)} · ${formatNumber(sinC)} = ${formatNumber(area)}`,
        },
      ],
    };
  });
}

export function solveTriangleArea(mode: TriangleAreaMode, input: TriangleAreaInput): AreaResult {
  return mode === "baseHeight" ? solveTriangleAreaBaseHeight(input) : solveTriangleAreaSAS(input);
}

/* ------------------------------------------------------------------ */
/* Quadrilaterals                                                      */
/* ------------------------------------------------------------------ */

export type QuadrilateralAreaMode = "trapezoid" | "rhombus" | "parallelogram";

export interface QuadrilateralAreaInput {
  base1?: number;
  base2?: number;
  height?: number;
  d1?: number;
  d2?: number;
  base?: number;
}

export function solveTrapezoidArea(input: QuadrilateralAreaInput): AreaResult {
  return runSolver(() => {
    const base1 = requirePositive(input.base1, "הבסיס הגדול b₁");
    const base2 = requirePositive(input.base2, "הבסיס הקטן b₂");
    const height = requirePositive(input.height, "הגובה h");
    const area = ((base1 + base2) / 2) * height;
    return {
      area,
      steps: [
        { law: "נוסחת שטח טרפז", expr: "S = ((b₁ + b₂) / 2) · h" },
        {
          law: "הצבת הנתונים",
          expr: `S = ((${formatNumber(base1)} + ${formatNumber(base2)}) / 2) · ${formatNumber(height)} = ${formatNumber(area)}`,
        },
      ],
    };
  });
}

export function solveRhombusArea(input: QuadrilateralAreaInput): AreaResult {
  return runSolver(() => {
    const d1 = requirePositive(input.d1, "האלכסון d₁");
    const d2 = requirePositive(input.d2, "האלכסון d₂");
    const area = (d1 * d2) / 2;
    return {
      area,
      steps: [
        { law: "נוסחת שטח מעוין לפי אלכסונים", expr: "S = (d₁ · d₂) / 2" },
        { law: "הצבת הנתונים", expr: `S = (${formatNumber(d1)} · ${formatNumber(d2)}) / 2 = ${formatNumber(area)}` },
      ],
    };
  });
}

export function solveParallelogramArea(input: QuadrilateralAreaInput): AreaResult {
  return runSolver(() => {
    const base = requirePositive(input.base, "הצלע a");
    const height = requirePositive(input.height, "הגובה h");
    const area = base * height;
    return {
      area,
      steps: [
        { law: "נוסחת שטח מקבילית לפי צלע וגובה", expr: "S = a · h" },
        { law: "הצבת הנתונים", expr: `S = ${formatNumber(base)} · ${formatNumber(height)} = ${formatNumber(area)}` },
      ],
    };
  });
}

export function solveQuadrilateralArea(mode: QuadrilateralAreaMode, input: QuadrilateralAreaInput): AreaResult {
  if (mode === "trapezoid") return solveTrapezoidArea(input);
  if (mode === "rhombus") return solveRhombusArea(input);
  return solveParallelogramArea(input);
}

/* ------------------------------------------------------------------ */
/* Regular polygon                                                     */
/* ------------------------------------------------------------------ */

export interface RegularPolygonAreaInput {
  sides?: number;
  side?: number;
}

export function solveRegularPolygonArea(input: RegularPolygonAreaInput): AreaResult {
  return runSolver(() => {
    const sides = requirePositive(input.sides, "מספר הצלעות n");
    if (!Number.isInteger(sides) || sides < 3) {
      throw new PolygonAreaError("מספר הצלעות n חייב להיות מספר שלם גדול או שווה ל-3");
    }
    const side = requirePositive(input.side, "אורך הצלע a");
    const tanVal = Math.tan(Math.PI / sides);
    const area = (sides * side * side) / (4 * tanVal);
    return {
      area,
      steps: [
        { law: "נוסחת שטח מצולע משוכלל לפי צלע", expr: "S = (n · a²) / (4 · tan(π/n))" },
        {
          law: "הצבת הנתונים",
          expr: `S = (${sides} · ${formatNumber(side)}²) / (4 · tan(π/${sides})) = ${formatNumber(sides * side * side)} / ${formatNumber(4 * tanVal)} = ${formatNumber(area)}`,
        },
      ],
    };
  });
}
