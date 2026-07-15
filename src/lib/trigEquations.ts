/**
 * Trigonometric-equation solver (5-unit level) for equations of the form
 * f(mx+c) = v, a quadratic in a single trig function (a·f² + b·f + d = 0),
 * or a linear combination of sin and cos (a·sin(mx+c) + b·cos(mx+c) = v,
 * solved via the auxiliary-angle substitution a·sinθ+b·cosθ = R·sin(θ+φ) —
 * this also covers "sin x = cos x" as the special case a=1, b=-1, v=0).
 *
 * All arithmetic runs in the chosen angle unit (degrees or radians) end to
 * end. `k` is reserved for the general-solution integer, matching Israeli
 * textbook convention; the argument's x-coefficient is called `m` instead.
 * Every basic angle equation is reduced to two (sin), two (cos) or one (tan)
 * arithmetic progressions in x; integers k within a bounded window are
 * substituted to enumerate every solution inside the given range.
 */

import { solveRealPolynomial } from "./symbolicAlgebra";

export class TrigEquationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrigEquationError";
  }
}

export type TrigFunc = "sin" | "cos" | "tan";
export type EquationForm = "basic" | "quadratic" | "linearCombo";
export type AngleUnit = "deg" | "rad";

export interface TrigEquationInput {
  form: EquationForm;
  func: TrigFunc;
  m: number;
  c: number;
  unit: AngleUnit;
  v?: number;
  a?: number;
  b?: number;
  d?: number;
  rangeFrom: number;
  rangeTo: number;
}

export interface TrigEquationStep {
  law: string;
  expr: string;
}

export interface TrigEquationSpecificSolution {
  k: number;
  x: number;
}

export type TrigEquationResult =
  | {
      type: "result";
      unit: AngleUnit;
      steps: TrigEquationStep[];
      solutions: TrigEquationSpecificSolution[];
    }
  | { type: "error"; message: string };

const D2R = Math.PI / 180;
const MAX_SOLUTIONS = 500;

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4 || 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function unitSuffix(unit: AngleUnit): string {
  return unit === "deg" ? "°" : "";
}

function fullTurn(unit: AngleUnit): number {
  return unit === "deg" ? 360 : 2 * Math.PI;
}

function halfTurn(unit: AngleUnit): number {
  return unit === "deg" ? 180 : Math.PI;
}

function fullTurnLabel(unit: AngleUnit): string {
  return unit === "deg" ? "360°" : "2π";
}

function halfTurnLabel(unit: AngleUnit): string {
  return unit === "deg" ? "180°" : "π";
}

function asinOf(t: number, unit: AngleUnit): number {
  const clamped = Math.max(-1, Math.min(1, t));
  const rad = Math.asin(clamped);
  return unit === "deg" ? rad / D2R : rad;
}

function acosOf(t: number, unit: AngleUnit): number {
  const clamped = Math.max(-1, Math.min(1, t));
  const rad = Math.acos(clamped);
  return unit === "deg" ? rad / D2R : rad;
}

function atanOf(t: number, unit: AngleUnit): number {
  const rad = Math.atan(t);
  return unit === "deg" ? rad / D2R : rad;
}

function atan2Of(y: number, x: number, unit: AngleUnit): number {
  const rad = Math.atan2(y, x);
  return unit === "deg" ? rad / D2R : rad;
}

interface AngleFamily {
  base: number;
  period: number;
}

function basicAngleFamilies(func: TrigFunc, t: number, unit: AngleUnit): AngleFamily[] {
  const full = fullTurn(unit);
  const half = halfTurn(unit);
  if (func === "sin") {
    const base = asinOf(t, unit);
    return [
      { base, period: full },
      { base: half - base, period: full },
    ];
  }
  if (func === "cos") {
    const base = acosOf(t, unit);
    return [
      { base, period: full },
      { base: -base, period: full },
    ];
  }
  const base = atanOf(t, unit);
  return [{ base, period: half }];
}

function referenceLawLabel(func: TrigFunc, unit: AngleUnit): string {
  if (func === "sin") {
    return `θ = arcsin(t) + ${fullTurnLabel(unit)}·k  או  θ = (${halfTurnLabel(unit)} - arcsin(t)) + ${fullTurnLabel(unit)}·k,  k∈ℤ`;
  }
  if (func === "cos") {
    return `θ = ±arccos(t) + ${fullTurnLabel(unit)}·k,  k∈ℤ`;
  }
  return `θ = arctan(t) + ${halfTurnLabel(unit)}·k,  k∈ℤ`;
}

interface XFamily {
  base: number;
  period: number;
}

/** Converts a θ-family (θ = mx + c) into an x-family, recording the step. */
function thetaFamilyToX(theta: AngleFamily, m: number, c: number, unit: AngleUnit, steps: TrigEquationStep[]): XFamily {
  const base = (theta.base - c) / m;
  const period = Math.abs(theta.period / m);
  const su = unitSuffix(unit);
  steps.push({
    law: "מעבר מ-θ ל-x (θ = mx + c)",
    expr: `x = (θ - c)/m = (${formatNumber(theta.base)}${su} - ${formatNumber(c)}${su})/${formatNumber(m)}  →  x = ${formatNumber(base)}${su} + ${formatNumber(period)}${su}·k,  k∈ℤ`,
  });
  return { base, period };
}

function enumerateInRange(families: XFamily[], from: number, to: number): TrigEquationSpecificSolution[] {
  if (!(to > from)) throw new TrigEquationError("גבול עליון של הטווח חייב להיות גדול מהגבול התחתון");
  const out: TrigEquationSpecificSolution[] = [];
  for (const fam of families) {
    if (fam.period <= 1e-9) continue;
    const kMin = Math.ceil((from - fam.base) / fam.period - 1e-9);
    const kMax = Math.floor((to - fam.base) / fam.period + 1e-9);
    if (kMax - kMin > MAX_SOLUTIONS) {
      throw new TrigEquationError("הטווח גדול מדי ביחס לתקופה — צמצמו את הטווח");
    }
    for (let k = kMin; k <= kMax; k++) {
      const x = fam.base + k * fam.period;
      if (x >= from - 1e-6 && x <= to + 1e-6) out.push({ k: k === 0 ? 0 : k, x });
    }
  }
  const seen = new Set<string>();
  const dedup: TrigEquationSpecificSolution[] = [];
  for (const sol of out.sort((p, q) => p.x - q.x)) {
    const key = formatNumber(sol.x);
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(sol);
  }
  if (dedup.length > MAX_SOLUTIONS) throw new TrigEquationError("נמצאו יותר מדי פתרונות — צמצמו את הטווח");
  return dedup;
}

function validateCommon(input: TrigEquationInput) {
  if (!(input.m !== 0)) throw new TrigEquationError("המקדם m (מקדם x בארגומנט) חייב להיות שונה מאפס");
  if (!(input.rangeTo > input.rangeFrom)) throw new TrigEquationError("גבול עליון של הטווח חייב להיות גדול מהגבול התחתון");
}

export function solveTrigEquation(input: TrigEquationInput): TrigEquationResult {
  try {
    validateCommon(input);
    const { unit, m, c } = input;
    const su = unitSuffix(unit);
    const steps: TrigEquationStep[] = [];
    let thetaFamilies: AngleFamily[] = [];

    if (input.form === "basic") {
      if (input.v === undefined) throw new TrigEquationError("יש להזין את הערך v במשוואה f(mx+c) = v");
      const t = input.v;
      if (input.func !== "tan" && Math.abs(t) > 1 + 1e-9) {
        return { type: "result", unit, steps: [{ law: "בדיקת תחום", expr: `|${formatNumber(t)}| > 1 — אין פתרון` }], solutions: [] };
      }
      steps.push({ law: "המשוואה הבסיסית", expr: `${input.func}(θ) = ${formatNumber(t)},  θ = mx + c` });
      steps.push({ law: "פתרון כללי עבור θ", expr: referenceLawLabel(input.func, unit) });
      thetaFamilies = basicAngleFamilies(input.func, t, unit);
    } else if (input.form === "quadratic") {
      const a = input.a ?? 0;
      const b = input.b ?? 0;
      const d = input.d ?? 0;
      if (a === 0 && b === 0) throw new TrigEquationError("המקדמים a ו-b לא יכולים להיות אפס יחד");
      steps.push({
        law: `הצבת t = ${input.func}(θ) ופתרון המשוואה הריבועית`,
        expr: `${formatNumber(a)}·t² + ${formatNumber(b)}·t + ${formatNumber(d)} = 0`,
      });
      const rawTs = solveRealPolynomial([d, b, a]);
      if (rawTs.length === 0) {
        return { type: "result", unit, steps: [...steps, { law: "תוצאה", expr: "אין פתרון ממשי למשוואה הריבועית ב-t" }], solutions: [] };
      }
      const validTs = rawTs.filter((t) => input.func === "tan" || Math.abs(t) <= 1 + 1e-9);
      steps.push({
        law: "פתרונות עבור t",
        expr:
          validTs.length > 0
            ? validTs.map((t) => `t = ${formatNumber(t)}`).join(",  ") +
              (rawTs.length > validTs.length ? `  (נפסלו: ${rawTs.filter((t) => !validTs.includes(t)).map((t) => formatNumber(t)).join(", ")} — מחוץ לתחום [-1,1])` : "")
            : `כל הפתרונות נפסלו — מחוץ לתחום [-1,1]`,
      });
      if (validTs.length === 0) {
        return { type: "result", unit, steps, solutions: [] };
      }
      for (const t of validTs) {
        steps.push({ law: `פתרון כללי עבור θ כאשר ${input.func}(θ) = ${formatNumber(t)}`, expr: referenceLawLabel(input.func, unit) });
        thetaFamilies.push(...basicAngleFamilies(input.func, t, unit));
      }
    } else {
      const a = input.a ?? 0;
      const b = input.b ?? 0;
      const v = input.v ?? 0;
      if (a === 0 && b === 0) throw new TrigEquationError("המקדמים a ו-b לא יכולים להיות אפס יחד");
      const R = Math.sqrt(a * a + b * b);
      const phi = atan2Of(b, a, unit);
      steps.push({
        law: "הצבה לצורת R·sin(θ + φ) — שיטת הזווית העזר",
        expr: `R = √(a² + b²) = √(${formatNumber(a)}² + ${formatNumber(b)}²) = ${formatNumber(R)},   φ = atan2(b, a) = ${formatNumber(phi)}${su}`,
      });
      const ratio = v / R;
      if (Math.abs(ratio) > 1 + 1e-9) {
        return {
          type: "result",
          unit,
          steps: [...steps, { law: "בדיקת תחום", expr: `sin(θ+φ) = v/R = ${formatNumber(ratio)},  |v/R| > 1 — אין פתרון` }],
          solutions: [],
        };
      }
      steps.push({
        law: "המשוואה המצומצמת",
        expr: `R·sin(θ + φ) = v  →  sin(θ + φ) = ${formatNumber(v)}/${formatNumber(R)} = ${formatNumber(ratio)}`,
      });
      steps.push({ law: "פתרון כללי עבור ψ = θ + φ", expr: referenceLawLabel("sin", unit) });
      const psiFamilies = basicAngleFamilies("sin", ratio, unit);
      thetaFamilies = psiFamilies.map((f) => ({ base: f.base - phi, period: f.period }));
      steps.push({
        law: "מעבר מ-ψ ל-θ (θ = ψ - φ)",
        expr: thetaFamilies.map((f) => `θ = ${formatNumber(f.base)}${su} + ${formatNumber(f.period)}${su}·k`).join(",  "),
      });
    }

    const xFamilies = thetaFamilies.map((f) => thetaFamilyToX(f, m, c, unit, steps));

    const solutions = enumerateInRange(xFamilies, input.rangeFrom, input.rangeTo);

    steps.push({
      law: `הצבת k בטווח [${formatNumber(input.rangeFrom)}${su}, ${formatNumber(input.rangeTo)}${su}]`,
      expr:
        solutions.length > 0
          ? solutions.map((s) => `k=${s.k} → x=${formatNumber(s.x)}${su}`).join(",  ")
          : "לא נמצאו פתרונות בטווח הנתון",
    });
    steps.push({
      law: "תוצאה סופית",
      expr: solutions.length > 0 ? solutions.map((s) => `x = ${formatNumber(s.x)}${su}`).join(",  ") : "אין פתרון בטווח הנתון",
    });

    return { type: "result", unit, steps, solutions };
  } catch (err) {
    return { type: "error", message: err instanceof TrigEquationError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}
