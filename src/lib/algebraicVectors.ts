/**
 * Algebraic 3D-vector engine (5-unit level): addition, subtraction, scalar
 * multiplication, dot product, magnitude, and the angle between two vectors
 * (cosθ = u·v / (|u||v|), reported in degrees). Every operation records
 * per-component pedagogical steps (e.g. "x = uₓ + vₓ = 3 + (-1) = 2").
 */

export class VectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VectorError";
  }
}

export type Vec3 = [number, number, number];

export type VectorOp = "add" | "sub" | "scalarMul" | "dot" | "magnitude" | "angle";

export interface VectorStep {
  law: string;
  expr: string;
}

export type VectorResult =
  | {
      type: "result";
      op: VectorOp;
      vector?: Vec3;
      scalar?: number;
      angleDeg?: number;
      steps: VectorStep[];
    }
  | { type: "error"; message: string };

const AXES = ["x", "y", "z"] as const;

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4 || 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function wrapNeg(n: number): string {
  return n < 0 ? `(${formatNumber(n)})` : formatNumber(n);
}

function formatVec(v: Vec3): string {
  return `[${formatNumber(v[0])}, ${formatNumber(v[1])}, ${formatNumber(v[2])}]`;
}

function dotOf(u: Vec3, v: Vec3): number {
  return u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
}

function dotSteps(u: Vec3, v: Vec3, uName: string, vName: string): { value: number; step: VectorStep } {
  const value = dotOf(u, v);
  const products = AXES.map((_, i) => `${wrapNeg(u[i])}·${wrapNeg(v[i])}`).join(" + ");
  const values = AXES.map((_, i) => wrapNeg(u[i] * v[i])).join(" + ");
  return {
    value,
    step: {
      law: `מכפלה סקלרית: ${uName}·${vName} = ${uName}_x·${vName}_x + ${uName}_y·${vName}_y + ${uName}_z·${vName}_z`,
      expr: `${uName}·${vName} = ${products} = ${values} = ${formatNumber(value)}`,
    },
  };
}

function magnitudeSteps(u: Vec3, name: string): { value: number; step: VectorStep } {
  const sumSquares = dotOf(u, u);
  const value = Math.sqrt(sumSquares);
  const squares = AXES.map((_, i) => `${wrapNeg(u[i])}²`).join(" + ");
  return {
    value,
    step: {
      law: `אורך וקטור: |${name}| = √(${name}_x² + ${name}_y² + ${name}_z²)`,
      expr: `|${name}| = √(${squares}) = √${formatNumber(sumSquares)} = ${formatNumber(value)}`,
    },
  };
}

export function solveVectors(op: VectorOp, u: Vec3, v?: Vec3, scalar?: number): VectorResult {
  try {
    const steps: VectorStep[] = [];

    if (op === "add" || op === "sub") {
      if (!v) throw new VectorError("נדרש וקטור שני לפעולה זו");
      const sign = op === "add" ? 1 : -1;
      const symbol = op === "add" ? "+" : "-";
      const result: Vec3 = [u[0] + sign * v[0], u[1] + sign * v[1], u[2] + sign * v[2]];
      AXES.forEach((axis, i) => {
        steps.push({
          law: `רכיב ${axis}: חיבור/חיסור רכיב-רכיב`,
          expr: `${axis} = u_${axis} ${symbol} v_${axis} = ${formatNumber(u[i])} ${symbol} ${wrapNeg(v[i])} = ${formatNumber(result[i])}`,
        });
      });
      steps.push({
        law: "תוצאה סופית",
        expr: `u ${symbol} v = ${formatVec(result)}`,
      });
      return { type: "result", op, vector: result, steps };
    }

    if (op === "scalarMul") {
      if (scalar === undefined) throw new VectorError("נדרש סקלר k לפעולה זו");
      const result: Vec3 = [scalar * u[0], scalar * u[1], scalar * u[2]];
      AXES.forEach((axis, i) => {
        steps.push({
          law: `רכיב ${axis}: כפל כל רכיב בסקלר`,
          expr: `${axis} = k·u_${axis} = ${wrapNeg(scalar)}·${wrapNeg(u[i])} = ${formatNumber(result[i])}`,
        });
      });
      steps.push({
        law: "תוצאה סופית",
        expr: `k·u = ${formatVec(result)}`,
      });
      return { type: "result", op, vector: result, steps };
    }

    if (op === "dot") {
      if (!v) throw new VectorError("נדרש וקטור שני לפעולה זו");
      const { value, step } = dotSteps(u, v, "u", "v");
      steps.push(step);
      steps.push({ law: "תוצאה סופית", expr: `u·v = ${formatNumber(value)}` });
      return { type: "result", op, scalar: value, steps };
    }

    if (op === "magnitude") {
      const { value, step } = magnitudeSteps(u, "u");
      steps.push(step);
      steps.push({ law: "תוצאה סופית", expr: `|u| = ${formatNumber(value)}` });
      return { type: "result", op, scalar: value, steps };
    }

    // angle
    if (!v) throw new VectorError("נדרש וקטור שני לפעולה זו");
    const magU = magnitudeSteps(u, "u");
    const magV = magnitudeSteps(v, "v");
    if (magU.value < 1e-12 || magV.value < 1e-12) {
      throw new VectorError("לא מוגדרת זווית עם וקטור האפס — שני הווקטורים חייבים להיות שונים מאפס");
    }
    const dot = dotSteps(u, v, "u", "v");
    steps.push(dot.step);
    steps.push(magU.step);
    steps.push(magV.step);

    const cosTheta = dot.value / (magU.value * magV.value);
    const clamped = Math.max(-1, Math.min(1, cosTheta));
    const angleDeg = (Math.acos(clamped) * 180) / Math.PI;
    steps.push({
      law: "נוסחת הזווית: cosθ = u·v / (|u|·|v|)",
      expr: `cosθ = ${formatNumber(dot.value)} / (${formatNumber(magU.value)}·${formatNumber(magV.value)}) = ${formatNumber(clamped)}`,
    });
    steps.push({
      law: "בידוד הזווית באמצעות arccos",
      expr: `θ = arccos(${formatNumber(clamped)}) = ${formatNumber(angleDeg)}°`,
    });
    if (Math.abs(dot.value) < 1e-9) {
      steps.push({ law: "מסקנה", expr: "u·v = 0  ⇒  הווקטורים מאונכים (θ = 90°)" });
    }
    steps.push({ law: "תוצאה סופית", expr: `θ = ${formatNumber(angleDeg)}°` });
    return { type: "result", op, angleDeg, scalar: clamped, steps };
  } catch (err) {
    return { type: "error", message: err instanceof VectorError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}
