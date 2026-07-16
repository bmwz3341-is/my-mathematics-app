/**
 * Symbolic derivative engine for polynomials: parses a sum/difference of
 * monomials (coeff * x^n) and applies the power rule term by term, with a
 * signed, human-readable rendering of both the input and the result.
 */

export class DerivativeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DerivativeError";
  }
}

export interface Term {
  coefficient: number;
  power: number;
}

export interface DerivativeStep {
  law: string;
  expr: string;
}

export type DerivativeResult =
  | {
      type: "result";
      variable: string;
      originalExpr: string;
      derivativeExpr: string;
      originalTerms: Term[];
      derivativeTerms: Term[];
      steps: DerivativeStep[];
    }
  | { type: "error"; message: string };

export function detectVariable(input: string): string {
  const match = input.match(/[a-zA-Z]/);
  return match ? match[0].toLowerCase() : "x";
}

/** Splits on top-level +/- (not the sign inside an exponent like x^-2, and not inside parens). */
function splitTerms(expr: string): string[] {
  const terms: string[] = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (depth === 0 && (ch === "+" || ch === "-") && current !== "" && expr[i - 1] !== "^") {
      terms.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) terms.push(current);
  return terms.filter((t) => t.trim() !== "");
}

/**
 * Shown when a term contains "/" but isn't a plain numeric denominator (e.g. "(x+1)/(x-2)"
 * or "1/x") — this engine is monomial-only and has no quotient rule yet. Surfaced as a
 * clean, honest result rather than a raw parse error, so fraction input is always accepted
 * at the field level even where the engine can't solve it yet.
 */
const UNSUPPORTED_QUOTIENT_MESSAGE = "הפונקציה שציינת (מנה) טרם נתמכת בגרסת האלגברה הנוכחית";

function parseTerm(raw: string, variable: string): Term {
  let s = raw.replace(/\s+/g, "");
  let sign = 1;
  if (s[0] === "+") s = s.slice(1);
  else if (s[0] === "-") {
    sign = -1;
    s = s.slice(1);
  }
  s = s.replace(/\*/g, "");
  if (s === "") throw new DerivativeError(`איבר לא תקין: "${raw}"`);

  const varLetter = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^(\\d+(?:\\.\\d+)?)?(${varLetter})?(?:\\^([+-]?\\d+))?(?:\\/(\\d+(?:\\.\\d+)?))?$`, "i");
  const match = s.match(re);
  if (!match || (!match[1] && !match[2])) {
    if (s.includes("/")) throw new DerivativeError(UNSUPPORTED_QUOTIENT_MESSAGE);
    if (/[a-zA-Z]/.test(s)) throw new DerivativeError("נתמך משתנה יחיד בלבד (למשל x)");
    throw new DerivativeError(`איבר לא תקין: "${raw}"`);
  }
  const [, coefStr, varPart, powStr, denomStr] = match;
  let denom = 1;
  if (denomStr) {
    denom = parseFloat(denomStr);
    if (!Number.isFinite(denom) || denom === 0) throw new DerivativeError(`מכנה לא תקין באיבר: "${raw}"`);
  }
  if (!varPart) {
    return { coefficient: (sign * parseFloat(coefStr!)) / denom, power: 0 };
  }
  const coefficient = coefStr ? parseFloat(coefStr) : 1;
  const power = powStr !== undefined ? parseInt(powStr, 10) : 1;
  if (!Number.isInteger(power)) throw new DerivativeError("נתמכות רק חזקות שלמות");
  return { coefficient: (sign * coefficient) / denom, power };
}

function combineLikeTerms(terms: Term[]): Term[] {
  const byPower = new Map<number, number>();
  const order: number[] = [];
  for (const t of terms) {
    if (!byPower.has(t.power)) order.push(t.power);
    byPower.set(t.power, (byPower.get(t.power) ?? 0) + t.coefficient);
  }
  return order
    .map((power) => ({ power, coefficient: byPower.get(power)! }))
    .filter((t) => t.coefficient !== 0)
    .sort((a, b) => b.power - a.power);
}

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function formatMonomialAbs(t: Term, variable: string): string {
  const absCoef = Math.abs(t.coefficient);
  if (t.power === 0) return formatNumber(absCoef);
  const coefPart = absCoef === 1 ? "" : formatNumber(absCoef);
  const varPart = t.power === 1 ? variable : `${variable}^${t.power}`;
  return `${coefPart}${varPart}`;
}

function signedMonomial(t: Term, variable: string): string {
  const body = formatMonomialAbs(t, variable);
  return t.coefficient < 0 ? `-${body}` : body;
}

export function formatPolynomial(terms: Term[], variable: string): string {
  const sorted = combineLikeTerms(terms);
  if (sorted.length === 0) return "0";
  let out = "";
  sorted.forEach((t, i) => {
    const body = formatMonomialAbs(t, variable);
    const sign = t.coefficient < 0 ? "-" : "+";
    if (i === 0) out = sign === "-" ? `-${body}` : body;
    else out += ` ${sign} ${body}`;
  });
  return out;
}

export function parsePolynomial(input: string, variable: string): Term[] {
  const normalized = input.replace(/\s+/g, "").replace(/\*\*/g, "^");
  if (normalized === "") throw new DerivativeError("נא להזין פונקציה");
  return splitTerms(normalized).map((t) => parseTerm(t, variable));
}

function derivativeOfTerm(t: Term): Term {
  if (t.power === 0) return { coefficient: 0, power: 0 };
  return { coefficient: t.coefficient * t.power, power: t.power - 1 };
}

export function differentiate(input: string): DerivativeResult {
  const trimmed = input.trim();
  if (!trimmed) return { type: "error", message: "נא להזין פונקציה, למשל x^3 + 2x^2" };
  if (trimmed.includes("=")) {
    return { type: "error", message: "נא להזין ביטוי (פונקציה) ולא משוואה — ללא סימן =" };
  }

  const variable = detectVariable(trimmed);
  try {
    const terms = combineLikeTerms(parsePolynomial(trimmed, variable));
    if (terms.length === 0) {
      return {
        type: "result",
        variable,
        originalExpr: "0",
        derivativeExpr: "0",
        originalTerms: [],
        derivativeTerms: [],
        steps: [],
      };
    }

    const steps: DerivativeStep[] = [];
    const derivativeTermsRaw: Term[] = [];
    for (const t of terms) {
      const d = derivativeOfTerm(t);
      derivativeTermsRaw.push(d);
      if (t.power === 0) {
        steps.push({ law: "נגזרת של קבוע: (c)' = 0", expr: `(${signedMonomial(t, variable)})' = 0` });
      } else {
        steps.push({
          law: `חוק החזקה: (${variable}ⁿ)' = n·${variable}ⁿ⁻¹`,
          expr: `(${signedMonomial(t, variable)})' = ${formatNumber(t.coefficient)}·${t.power}·${variable}^${t.power - 1} = ${signedMonomial(d, variable)}`,
        });
      }
    }
    if (terms.length > 1) {
      steps.push({
        law: "כלל הסכום/הפרש: (f ± g)' = f' ± g'",
        expr: `(${formatPolynomial(terms, variable)})' = ${formatPolynomial(derivativeTermsRaw, variable)}`,
      });
    }

    const derivativeTerms = combineLikeTerms(derivativeTermsRaw);
    return {
      type: "result",
      variable,
      originalExpr: formatPolynomial(terms, variable),
      derivativeExpr: formatPolynomial(derivativeTerms, variable),
      originalTerms: terms,
      derivativeTerms,
      steps,
    };
  } catch (err) {
    return {
      type: "error",
      message: err instanceof DerivativeError ? err.message : "שגיאה בעיבוד הביטוי",
    };
  }
}

export function evalPolynomial(terms: Term[], x: number): number {
  return terms.reduce((sum, t) => sum + t.coefficient * Math.pow(x, t.power), 0);
}

/** Applies the power rule term-by-term to an already-parsed polynomial. */
export function differentiateTerms(terms: Term[]): Term[] {
  return combineLikeTerms(terms.map(derivativeOfTerm));
}
