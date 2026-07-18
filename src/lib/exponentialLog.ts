/**
 * Exponential-equation and growth/decay engine (5-unit level), the two new
 * tabs alongside the existing logarithmic-equations tool.
 *
 * Exponential equations: a^f(x) = b^g(x), where f and g are linear (mx+c).
 * Solved by taking ln of both sides — (mx+c)·ln(a) = (mx+c)·ln(b) — which
 * collapses to a single linear equation in x regardless of whether a and b
 * share a common base, so no base-matching/substitution search is needed
 * (unlike powerLaws.ts's solvePowerExpression, which targets same-base-style
 * algebra instead). A bare number on either side (no "^") is treated as
 * base^1, so "3^x = 81" is just the g(x)=1 special case of the same method.
 *
 * Growth/decay: N(t) = N0·(1 ± r/100)^t, computed forward from all three
 * given values (initial amount, rate, time) — no inversion/solving involved.
 */

import { parsePolynomial, formatPolynomial, detectVariable, type Term } from "./derivative";

export class ExponentialLogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExponentialLogError";
  }
}

export interface CalcStep {
  law: string;
  expr: string;
}

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4 || 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b > 1e-9) [a, b] = [b, a % b];
  return a || 1;
}

/** Snaps a numeric result to a nearby integer or small fraction (denominator <= 12) when very close to one. */
function snapToNiceValue(v: number): { str: string; isExact: boolean } {
  const rounded = Math.round(v);
  if (Math.abs(v - rounded) < 1e-9) return { str: `${rounded}`, isExact: true };
  for (let den = 2; den <= 12; den++) {
    const num = Math.round(v * den);
    if (Math.abs(v - num / den) < 1e-9) {
      const g = gcd(num, den);
      return { str: `${num / g}/${den / g}`, isExact: true };
    }
  }
  return { str: `≈${formatNumber(v)}`, isExact: false };
}

/* ------------------------------------------------------------------ */
/* Exponential equations: a^f(x) = b^g(x)                              */
/* ------------------------------------------------------------------ */

export type ExponentialEquationResult = { type: "result"; headline: string; steps: CalcStep[] } | { type: "error"; message: string };

interface ExpSide {
  base: number;
  m: number; // coefficient of x in the exponent
  c: number; // constant term of the exponent
}

function parseExpSide(raw: string, variable: string, label: string): ExpSide {
  const trimmed = raw.trim();
  if (!trimmed) throw new ExponentialLogError(`אגף ${label} של המשוואה ריק`);

  const caretIdx = trimmed.indexOf("^");
  if (caretIdx === -1) {
    const base = parseFloat(trimmed);
    if (!Number.isFinite(base)) throw new ExponentialLogError(`לא ניתן לפרש את "${trimmed}" — נדרש בסיס^מעריך (כגון 3^x) או מספר`);
    if (!(base > 0)) throw new ExponentialLogError(`הערך "${trimmed}" חייב להיות מספר חיובי`);
    return { base, m: 0, c: 1 };
  }

  const baseStr = trimmed.slice(0, caretIdx).trim();
  let expStr = trimmed.slice(caretIdx + 1).trim();
  const base = parseFloat(baseStr);
  if (!Number.isFinite(base)) throw new ExponentialLogError(`הבסיס "${baseStr}" באגף ${label} אינו מספר תקין`);
  if (!(base > 0)) throw new ExponentialLogError(`הבסיס "${baseStr}" באגף ${label} חייב להיות מספר חיובי`);

  if (expStr.startsWith("(") && expStr.endsWith(")")) expStr = expStr.slice(1, -1);
  if (!expStr) throw new ExponentialLogError(`המעריך באגף ${label} ריק`);

  let terms: Term[];
  try {
    terms = parsePolynomial(expStr, variable);
  } catch {
    throw new ExponentialLogError(`לא ניתן לפרש את המעריך "${expStr}" באגף ${label}`);
  }
  const degree = terms.reduce((max, t) => Math.max(max, t.power), 0);
  if (degree > 1) throw new ExponentialLogError(`המעריך "${expStr}" באגף ${label} חייב להיות ליניארי (מהצורה mx+c)`);

  const m = terms.find((t) => t.power === 1)?.coefficient ?? 0;
  const c = terms.find((t) => t.power === 0)?.coefficient ?? 0;
  return { base, m, c };
}

function expSideLabel(side: ExpSide, variable: string): string {
  const terms: Term[] = [];
  if (side.m !== 0) terms.push({ coefficient: side.m, power: 1 });
  terms.push({ coefficient: side.c, power: 0 });
  const expText = formatPolynomial(terms, variable);
  return side.m === 0 && side.c === 1 ? formatNumber(side.base) : `${formatNumber(side.base)}^(${expText})`;
}

export function solveExponentialEquation(input: string): ExponentialEquationResult {
  const trimmed = input.trim();
  if (!trimmed) return { type: "error", message: "נא להזין משוואה מהצורה a^f(x) = b^g(x), למשל 3^x = 81 או 2^(x-1) = 3^(2x+1)" };

  const equalsCount = (trimmed.match(/=/g) ?? []).length;
  if (equalsCount !== 1) return { type: "error", message: "יש להזין משוואה עם סימן שוויון (=) יחיד" };

  const [rawLeft, rawRight] = trimmed.split("=");
  const variable = detectVariable(trimmed);

  try {
    const left = parseExpSide(rawLeft, variable, "שמאל");
    const right = parseExpSide(rawRight, variable, "ימין");

    const steps: CalcStep[] = [
      { law: "המשוואה בצורה a^f(x) = b^g(x)", expr: `${expSideLabel(left, variable)} = ${expSideLabel(right, variable)}` },
    ];

    const lnA = Math.log(left.base);
    const lnB = Math.log(right.base);
    steps.push({
      law: "הפעלת לוגריתם טבעי (ln) על שני האגפים: f(x)·ln(a) = g(x)·ln(b)",
      expr: `f(x)·ln(${formatNumber(left.base)}) = g(x)·ln(${formatNumber(right.base)})  ⇒  f(x)·${formatNumber(lnA)} = g(x)·${formatNumber(lnB)}`,
    });

    // (left.m x + left.c)·lnA = (right.m x + right.c)·lnB  ⇒  A·x = B
    const A = left.m * lnA - right.m * lnB;
    const B = right.c * lnB - left.c * lnA;
    const signedConst = (v: number) => (v >= 0 ? `+ ${formatNumber(v)}` : `- ${formatNumber(-v)}`);
    steps.push({
      law: "פתיחת סוגריים ואיסוף איברי x לאגף אחד",
      expr: `${formatNumber(left.m * lnA)}x ${signedConst(left.c * lnA)} = ${formatNumber(right.m * lnB)}x ${signedConst(right.c * lnB)}  ⇒  ${formatNumber(A)}x = ${formatNumber(B)}`,
    });

    if (Math.abs(A) < 1e-9) {
      if (Math.abs(B) < 1e-9) {
        steps.push({ law: "פתרון", expr: "0 = 0  ⇒  מתקיים לכל x" });
        return { type: "result", headline: `${trimmed}  ⇒  מתקיים לכל x`, steps };
      }
      steps.push({ law: "פתרון", expr: `0 = ${formatNumber(B)}  ⇒  ∅` });
      return { type: "result", headline: `${trimmed}  ⇒  ∅`, steps };
    }

    const x = B / A;
    const snapped = snapToNiceValue(x);
    steps.push({ law: "בידוד x", expr: `x = ${formatNumber(B)} / ${formatNumber(A)} = ${snapped.str}` });
    return { type: "result", headline: `${trimmed}  ⇒  x = ${snapped.str}`, steps };
  } catch (err) {
    return { type: "error", message: err instanceof ExponentialLogError ? err.message : "שגיאה בעיבוד המשוואה" };
  }
}

/* ------------------------------------------------------------------ */
/* Growth / decay: N(t) = N0 · (1 ± r/100)^t                           */
/* ------------------------------------------------------------------ */

export type GrowthDecayDirection = "growth" | "decay";

export interface GrowthDecayFields {
  initial: string;
  ratePercent: string;
  time: string;
  direction: GrowthDecayDirection;
}

export type GrowthDecayResult =
  | { type: "result"; finalAmount: number; factor: number; steps: CalcStep[] }
  | { type: "error"; message: string };

function parsePositiveNumber(raw: string, label: string): number {
  const trimmed = raw.trim();
  if (!trimmed) throw new ExponentialLogError(`יש להזין ערך עבור ${label}`);
  const n = parseFloat(trimmed);
  if (!Number.isFinite(n)) throw new ExponentialLogError(`הערך של ${label} אינו מספר תקין`);
  if (!(n > 0)) throw new ExponentialLogError(`הערך של ${label} חייב להיות מספר חיובי`);
  return n;
}

export function computeGrowthDecay(fields: GrowthDecayFields): GrowthDecayResult {
  try {
    const initial = parsePositiveNumber(fields.initial, "הכמות ההתחלתית N₀");

    const rateTrimmed = fields.ratePercent.trim();
    if (!rateTrimmed) throw new ExponentialLogError("יש להזין ערך עבור אחוז השינוי r");
    const rate = parseFloat(rateTrimmed);
    if (!Number.isFinite(rate)) throw new ExponentialLogError("הערך של אחוז השינוי r אינו מספר תקין");
    if (rate < 0) throw new ExponentialLogError("יש להזין את אחוז השינוי כערך חיובי — הכיוון (גדילה/דעיכה) נקבע בבחירת המצב");
    if (fields.direction === "decay" && rate >= 100) {
      throw new ExponentialLogError("אחוז הדעיכה חייב להיות קטן מ-100 (אחרת הכמות מתאפסת או הופכת לשלילית)");
    }

    const timeTrimmed = fields.time.trim();
    if (!timeTrimmed) throw new ExponentialLogError("יש להזין ערך עבור הזמן t");
    const time = parseFloat(timeTrimmed);
    if (!Number.isFinite(time)) throw new ExponentialLogError("הערך של הזמן t אינו מספר תקין");

    const sign = fields.direction === "growth" ? "+" : "-";
    const factor = fields.direction === "growth" ? 1 + rate / 100 : 1 - rate / 100;
    const finalAmount = initial * Math.pow(factor, time);

    const steps: CalcStep[] = [
      { law: "נוסחת המודל המעריכי", expr: `N(t) = N₀ · (1 ${sign} r/100)^t` },
      { law: "חישוב מקדם הגדילה/הדעיכה", expr: `1 ${sign} r/100 = 1 ${sign} ${formatNumber(rate)}/100 = ${formatNumber(factor)}` },
      {
        law: "הצבת הנתונים",
        expr: `N(${formatNumber(time)}) = ${formatNumber(initial)} · (${formatNumber(factor)})^${formatNumber(time)} = ${formatNumber(finalAmount)}`,
      },
    ];

    return { type: "result", finalAmount, factor, steps };
  } catch (err) {
    return { type: "error", message: err instanceof ExponentialLogError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}
