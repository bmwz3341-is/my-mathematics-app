/**
 * Unit-circle engine (5-unit level): bidirectional degree/radian conversion
 * (radian input may be a π-expression, e.g. "2π/3" or "-pi/4"), exact
 * sin/cos/tan values for the 16 standard angles via quadrant + reference-angle
 * reduction (decimal fallback otherwise), and five basic reduction identities
 * (negative angle, supplementary, anti-supplementary, complementary, period)
 * demonstrated by evaluating both the original and the transformed angle.
 *
 * Every result carries pedagogical steps (formula → substitution/reasoning →
 * value), matching the step-by-step convention used across the app's other
 * solvers.
 */

import { evaluateMathExpression } from "./mathEvaluator";

export class UnitCircleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnitCircleError";
  }
}

export type AngleUnit = "deg" | "rad";

export interface Step {
  law: string;
  expr: string;
}

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4 || 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function gcd(a: number, b: number): number {
  while (b > 0) [a, b] = [b, a % b];
  return a || 1;
}

/** "2π/3", "-pi/4", "180" → a plain number, via the shared expression evaluator (π needs an explicit "*" before it, which this inserts). */
export function parseAngleExpression(raw: string): number | null {
  const withPi = raw.trim().replace(/π/g, "pi").replace(/,/g, ".");
  const withMul = withPi.replace(/(\d)\s*(pi)/gi, "$1*$2");
  return evaluateMathExpression(withMul);
}

/** Finds the smallest denominator q ≤ 36 such that rad ≈ (p/q)·π, and formats it as a π-fraction. */
function rationalizePi(rad: number): string | null {
  if (Math.abs(rad) < 1e-9) return "0";
  const ratio = rad / Math.PI;
  for (let q = 1; q <= 36; q++) {
    const p = ratio * q;
    const pr = Math.round(p);
    if (Math.abs(p - pr) < 1e-6 && pr !== 0) {
      const g = gcd(Math.abs(pr), q);
      const num = pr / g;
      const den = q / g;
      const sign = num < 0 ? "-" : "";
      const an = Math.abs(num);
      if (den === 1) return an === 1 ? `${sign}π` : `${sign}${an}π`;
      return an === 1 ? `${sign}π/${den}` : `${sign}${an}π/${den}`;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Mode 1: degree ⇄ radian conversion                                  */
/* ------------------------------------------------------------------ */

export type ConversionResult =
  | { type: "result"; fromUnit: AngleUnit; toUnit: AngleUnit; fromValue: number; toValue: number; toExact: string; steps: Step[] }
  | { type: "error"; message: string };

export function convertAngle(raw: string, fromUnit: AngleUnit): ConversionResult {
  try {
    const trimmed = raw.trim();
    if (!trimmed) throw new UnitCircleError("נא להזין זווית");
    const parsed = parseAngleExpression(trimmed);
    if (parsed === null || !Number.isFinite(parsed)) {
      throw new UnitCircleError("הביטוי שהוזן אינו תקין — ניתן להשתמש במספרים, ב-π ובפעולות +, -, *, /");
    }
    const toUnit: AngleUnit = fromUnit === "deg" ? "rad" : "deg";
    const toValue = fromUnit === "deg" ? (parsed * Math.PI) / 180 : (parsed * 180) / Math.PI;
    const toExactPi = toUnit === "rad" ? rationalizePi(toValue) : null;

    const steps: Step[] =
      fromUnit === "deg"
        ? [
            { law: "נוסחת המרה ממעלות לרדיאנים", expr: "rad = deg · (π/180)" },
            {
              law: "הצבת הנתונים",
              expr: `rad = ${formatNumber(parsed)}° · (π/180) = ${formatNumber(toValue)}${toExactPi ? ` (${toExactPi})` : ""}`,
            },
          ]
        : [
            { law: "נוסחת המרה מרדיאנים למעלות", expr: "deg = rad · (180/π)" },
            { law: "הצבת הנתונים", expr: `deg = ${formatNumber(parsed)} · (180/π) = ${formatNumber(toValue)}°` },
          ];

    return {
      type: "result",
      fromUnit,
      toUnit,
      fromValue: parsed,
      toValue,
      toExact: toUnit === "rad" ? (toExactPi ?? formatNumber(toValue)) : `${formatNumber(toValue)}°`,
      steps,
    };
  } catch (err) {
    return { type: "error", message: err instanceof UnitCircleError ? err.message : "שגיאה בעיבוד הזווית" };
  }
}

/* ------------------------------------------------------------------ */
/* Mode 2: exact trig values via quadrant + reference angle            */
/* ------------------------------------------------------------------ */

export interface TrigValueEntry {
  exact: string;
  value: number | null;
}

export interface UnitCirclePoint {
  angleDeg: number; // normalized to [0, 360)
  rawDeg: number; // unnormalized (preserves sign / direction for arc drawing)
  angleRad: number;
  x: number;
  y: number;
  quadrant: 0 | 1 | 2 | 3 | 4; // 0 = on an axis
  referenceAngleDeg: number;
  isNice: boolean;
  sin: TrigValueEntry;
  cos: TrigValueEntry;
  tan: TrigValueEntry;
}

const REF_TABLE: Record<
  30 | 45 | 60,
  { sin: { exact: string; value: number }; cos: { exact: string; value: number }; tan: { exact: string; value: number } }
> = {
  30: { sin: { exact: "1/2", value: 0.5 }, cos: { exact: "√3/2", value: Math.sqrt(3) / 2 }, tan: { exact: "√3/3", value: Math.sqrt(3) / 3 } },
  45: { sin: { exact: "√2/2", value: Math.SQRT2 / 2 }, cos: { exact: "√2/2", value: Math.SQRT2 / 2 }, tan: { exact: "1", value: 1 } },
  60: { sin: { exact: "√3/2", value: Math.sqrt(3) / 2 }, cos: { exact: "1/2", value: 0.5 }, tan: { exact: "√3", value: Math.sqrt(3) } },
};

const AXIS_TABLE: Record<0 | 90 | 180 | 270, { sin: TrigValueEntry; cos: TrigValueEntry; tan: TrigValueEntry }> = {
  0: { sin: { exact: "0", value: 0 }, cos: { exact: "1", value: 1 }, tan: { exact: "0", value: 0 } },
  90: { sin: { exact: "1", value: 1 }, cos: { exact: "0", value: 0 }, tan: { exact: "לא מוגדר", value: null } },
  180: { sin: { exact: "0", value: 0 }, cos: { exact: "-1", value: -1 }, tan: { exact: "0", value: 0 } },
  270: { sin: { exact: "-1", value: -1 }, cos: { exact: "0", value: 0 }, tan: { exact: "לא מוגדר", value: null } },
};

function applySign(exact: string, sign: 1 | -1): string {
  return sign === 1 || exact === "0" ? exact : `-${exact}`;
}

function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  const snapped = Math.round(d * 1e6) / 1e6;
  return snapped === 360 ? 0 : snapped;
}

export function computeUnitCirclePointFromDeg(rawDeg: number): UnitCirclePoint {
  const deg = normalizeDeg(rawDeg);
  const rad = (deg * Math.PI) / 180;
  const x = Math.cos(rad);
  const y = Math.sin(rad);

  if (deg === 0 || deg === 90 || deg === 180 || deg === 270) {
    const table = AXIS_TABLE[deg as 0 | 90 | 180 | 270];
    return { angleDeg: deg, rawDeg, angleRad: rad, x, y, quadrant: 0, referenceAngleDeg: deg, isNice: true, ...table };
  }

  const quadrant: 1 | 2 | 3 | 4 = deg < 90 ? 1 : deg < 180 ? 2 : deg < 270 ? 3 : 4;
  const referenceDeg = quadrant === 1 ? deg : quadrant === 2 ? 180 - deg : quadrant === 3 ? deg - 180 : 360 - deg;
  const refRounded = Math.round(referenceDeg * 1e6) / 1e6;
  const nice = refRounded === 30 || refRounded === 45 || refRounded === 60;
  const sinSign: 1 | -1 = quadrant === 1 || quadrant === 2 ? 1 : -1;
  const cosSign: 1 | -1 = quadrant === 1 || quadrant === 4 ? 1 : -1;
  const tanSign: 1 | -1 = sinSign === cosSign ? 1 : -1;

  if (nice) {
    const ref = REF_TABLE[refRounded as 30 | 45 | 60];
    return {
      angleDeg: deg,
      rawDeg,
      angleRad: rad,
      x,
      y,
      quadrant,
      referenceAngleDeg: refRounded,
      isNice: true,
      sin: { exact: applySign(ref.sin.exact, sinSign), value: sinSign * ref.sin.value },
      cos: { exact: applySign(ref.cos.exact, cosSign), value: cosSign * ref.cos.value },
      tan: { exact: applySign(ref.tan.exact, tanSign), value: tanSign * ref.tan.value },
    };
  }

  const tanUndefined = Math.abs(x) < 1e-9;
  return {
    angleDeg: deg,
    rawDeg,
    angleRad: rad,
    x,
    y,
    quadrant,
    referenceAngleDeg: referenceDeg,
    isNice: false,
    sin: { exact: formatNumber(y), value: y },
    cos: { exact: formatNumber(x), value: x },
    tan: { exact: tanUndefined ? "לא מוגדר" : formatNumber(y / x), value: tanUndefined ? null : y / x },
  };
}

const QUADRANT_LABEL = ["", "I", "II", "III", "IV"];

export type UnitCircleResult = { type: "result"; point: UnitCirclePoint; steps: Step[] } | { type: "error"; message: string };

export function computeUnitCircleValues(raw: string, unit: AngleUnit): UnitCircleResult {
  try {
    const trimmed = raw.trim();
    if (!trimmed) throw new UnitCircleError("נא להזין זווית");
    const parsed = parseAngleExpression(trimmed);
    if (parsed === null || !Number.isFinite(parsed)) {
      throw new UnitCircleError("הביטוי שהוזן אינו תקין — ניתן להשתמש במספרים, ב-π ובפעולות +, -, *, /");
    }
    const rawDeg = unit === "deg" ? parsed : (parsed * 180) / Math.PI;
    const point = computeUnitCirclePointFromDeg(rawDeg);

    const steps: Step[] = [];
    if (unit === "rad") {
      steps.push({ law: "המרה לרדיאנים למעלות לצורך זיהוי הרבע", expr: `${formatNumber(parsed)} rad · (180/π) = ${formatNumber(rawDeg)}°` });
    }
    if (point.quadrant === 0) {
      steps.push({ law: "הזווית נמצאת על אחד הצירים", expr: `${formatNumber(point.angleDeg)}° — הערכים ידועים ישירות מהמעגל` });
    } else {
      steps.push({
        law: "זיהוי הרבע וזווית הייחוס",
        expr: `${formatNumber(point.angleDeg)}° נמצאת ברבע ${QUADRANT_LABEL[point.quadrant]}; זווית ייחוס = ${formatNumber(point.referenceAngleDeg)}°`,
      });
    }
    steps.push({ law: "sin", expr: `sin(${formatNumber(point.angleDeg)}°) = ${point.sin.exact}` });
    steps.push({ law: "cos", expr: `cos(${formatNumber(point.angleDeg)}°) = ${point.cos.exact}` });
    steps.push({ law: "tan", expr: `tan(${formatNumber(point.angleDeg)}°) = ${point.tan.exact}` });

    return { type: "result", point, steps };
  } catch (err) {
    return { type: "error", message: err instanceof UnitCircleError ? err.message : "שגיאה בעיבוד הזווית" };
  }
}

/* ------------------------------------------------------------------ */
/* Mode 3: basic reduction identities                                  */
/* ------------------------------------------------------------------ */

export type IdentityKind = "negative" | "supplementary" | "antiSupplement" | "complementary" | "period";

export interface IdentityInfo {
  kind: IdentityKind;
  label: string;
  angleExpr: string;
  formulaSin: string;
  formulaCos: string;
  transformDeg: (deg: number) => number;
}

export const IDENTITY_KINDS: IdentityInfo[] = [
  { kind: "negative", label: "זווית נגדית", angleExpr: "-θ", formulaSin: "sin(-θ) = -sin(θ)", formulaCos: "cos(-θ) = cos(θ)", transformDeg: (d) => -d },
  {
    kind: "supplementary",
    label: "משלימה ל-180°",
    angleExpr: "180°-θ",
    formulaSin: "sin(180°-θ) = sin(θ)",
    formulaCos: "cos(180°-θ) = -cos(θ)",
    transformDeg: (d) => 180 - d,
  },
  {
    kind: "antiSupplement",
    label: "180°+θ",
    angleExpr: "180°+θ",
    formulaSin: "sin(180°+θ) = -sin(θ)",
    formulaCos: "cos(180°+θ) = -cos(θ)",
    transformDeg: (d) => 180 + d,
  },
  {
    kind: "complementary",
    label: "משלימה ל-90°",
    angleExpr: "90°-θ",
    formulaSin: "sin(90°-θ) = cos(θ)",
    formulaCos: "cos(90°-θ) = sin(θ)",
    transformDeg: (d) => 90 - d,
  },
  { kind: "period", label: "מחזוריות", angleExpr: "360°+θ", formulaSin: "sin(360°+θ) = sin(θ)", formulaCos: "cos(360°+θ) = cos(θ)", transformDeg: (d) => 360 + d },
];

export type IdentityResult =
  | { type: "result"; identity: IdentityInfo; base: UnitCirclePoint; transformed: UnitCirclePoint; steps: Step[] }
  | { type: "error"; message: string };

export function computeIdentityDemo(raw: string, unit: AngleUnit, kind: IdentityKind): IdentityResult {
  try {
    const trimmed = raw.trim();
    if (!trimmed) throw new UnitCircleError("נא להזין זווית");
    const parsed = parseAngleExpression(trimmed);
    if (parsed === null || !Number.isFinite(parsed)) {
      throw new UnitCircleError("הביטוי שהוזן אינו תקין — ניתן להשתמש במספרים, ב-π ובפעולות +, -, *, /");
    }
    const identity = IDENTITY_KINDS.find((i) => i.kind === kind);
    if (!identity) throw new UnitCircleError("זהות לא מוכרת");

    const baseDeg = unit === "deg" ? parsed : (parsed * 180) / Math.PI;
    const transformedDeg = identity.transformDeg(baseDeg);
    const base = computeUnitCirclePointFromDeg(baseDeg);
    const transformed = computeUnitCirclePointFromDeg(transformedDeg);

    const steps: Step[] = [
      { law: identity.label, expr: `${identity.formulaSin}   |   ${identity.formulaCos}` },
      {
        law: "sin — אימות מספרי",
        expr: `sin(${formatNumber(base.angleDeg)}°) = ${base.sin.exact}  ,  sin(${formatNumber(transformed.angleDeg)}°) = ${transformed.sin.exact}`,
      },
      {
        law: "cos — אימות מספרי",
        expr: `cos(${formatNumber(base.angleDeg)}°) = ${base.cos.exact}  ,  cos(${formatNumber(transformed.angleDeg)}°) = ${transformed.cos.exact}`,
      },
    ];

    return { type: "result", identity, base, transformed, steps };
  } catch (err) {
    return { type: "error", message: err instanceof UnitCircleError ? err.message : "שגיאה בעיבוד הזווית" };
  }
}
