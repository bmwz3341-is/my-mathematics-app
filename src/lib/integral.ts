/**
 * Symbolic integration engine: parses a sum/difference of terms built from
 * power monomials (coeff * x^n), sin(x)/cos(x), and e^x, then applies the
 * power/trig/exponential integration rules term by term. Supports both the
 * indefinite integral (+C) and the definite integral via the Newton-Leibniz
 * substitution F(b) - F(a). Definite bounds may also be linear expressions in
 * a single free parameter (e.g. "2a" to "3a"), in which case F(b) - F(a) is
 * produced as an algebraic expression in that parameter, optionally solved
 * against a given target value.
 */

import {
  type Sym,
  symAdd,
  symSub,
  symScale,
  symPow,
  symConst,
  symConstValue,
  symVariables,
  formatSym,
  formatPolyInVar,
  polyCoefficients,
  solveRealPolynomial,
  parseAlgebraic,
} from "./symbolicAlgebra";

export class IntegralError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegralError";
  }
}

export type TermKind = "power" | "sin" | "cos" | "exp";

export interface Term {
  kind: TermKind;
  coefficient: number;
  power?: number;
}

export interface IntegralStep {
  law: string;
  expr: string;
}

export type IntegralMode = "indefinite" | "definite";

export type IntegralResult =
  | {
      type: "result";
      mode: IntegralMode;
      variable: string;
      originalExpr: string;
      antiderivativeExpr: string;
      originalTerms: Term[];
      antiderivativeTerms: Term[];
      steps: IntegralStep[];
      a?: number;
      b?: number;
      valueAtA?: number;
      valueAtB?: number;
      definiteValue?: number;
      parametric?: {
        paramName: string;
        aExpr: string;
        bExpr: string;
        definiteExpr: string;
        equationExpr?: string;
        solutions?: number[];
      };
    }
  | { type: "error"; message: string };

export function detectVariable(input: string): string {
  const stripped = input.replace(/sin/gi, "").replace(/cos/gi, "").replace(/e\^/gi, "");
  const match = stripped.match(/[a-zA-Z]/);
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
  if (s === "") throw new IntegralError(`איבר לא תקין: "${raw}"`);

  const v = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const coefRe = "(\\d+(?:\\.\\d+)?)?";

  let m = s.match(new RegExp(`^${coefRe}e\\^${v}$`, "i"));
  if (m) return { kind: "exp", coefficient: sign * (m[1] ? parseFloat(m[1]) : 1) };

  m = s.match(new RegExp(`^${coefRe}sin\\(${v}\\)$`, "i"));
  if (m) return { kind: "sin", coefficient: sign * (m[1] ? parseFloat(m[1]) : 1) };

  m = s.match(new RegExp(`^${coefRe}cos\\(${v}\\)$`, "i"));
  if (m) return { kind: "cos", coefficient: sign * (m[1] ? parseFloat(m[1]) : 1) };

  const re = new RegExp(`^(\\d+(?:\\.\\d+)?)?(${v})?(?:\\^([+-]?\\d+))?(?:\\/(\\d+(?:\\.\\d+)?))?$`, "i");
  const match = s.match(re);
  if (!match || (!match[1] && !match[2])) {
    if (s.includes("/")) throw new IntegralError(UNSUPPORTED_QUOTIENT_MESSAGE);
    if (/[a-zA-Z]/.test(s)) {
      throw new IntegralError(`ביטוי לא נתמך: "${raw}" (נתמכים: חזקות, sin(${variable}), cos(${variable}), e^${variable})`);
    }
    throw new IntegralError(`איבר לא תקין: "${raw}"`);
  }
  const [, coefStr, varPart, powStr, denomStr] = match;
  let denom = 1;
  if (denomStr) {
    denom = parseFloat(denomStr);
    if (!Number.isFinite(denom) || denom === 0) throw new IntegralError(`מכנה לא תקין באיבר: "${raw}"`);
  }
  if (!varPart) return { kind: "power", coefficient: (sign * parseFloat(coefStr!)) / denom, power: 0 };
  const coefficient = coefStr ? parseFloat(coefStr) : 1;
  const power = powStr !== undefined ? parseInt(powStr, 10) : 1;
  if (!Number.isInteger(power)) throw new IntegralError("נתמכות רק חזקות שלמות");
  return { kind: "power", coefficient: (sign * coefficient) / denom, power };
}

function termKey(t: Term): string {
  return t.kind === "power" ? `power:${t.power}` : t.kind;
}

function combineLikeTerms(terms: Term[]): Term[] {
  const byKey = new Map<string, Term>();
  const order: string[] = [];
  for (const t of terms) {
    const key = termKey(t);
    if (!byKey.has(key)) {
      order.push(key);
      byKey.set(key, { ...t, coefficient: 0 });
    }
    byKey.get(key)!.coefficient += t.coefficient;
  }
  return order.map((k) => byKey.get(k)!).filter((t) => t.coefficient !== 0);
}

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function formatTermAbs(t: Term, variable: string): string {
  const absCoef = Math.abs(t.coefficient);
  if (t.kind === "power") {
    if (t.power === 0) return formatNumber(absCoef);
    const coefPart = absCoef === 1 ? "" : formatNumber(absCoef);
    const varPart = t.power === 1 ? variable : `${variable}^${t.power}`;
    return `${coefPart}${varPart}`;
  }
  const coefPart = absCoef === 1 ? "" : formatNumber(absCoef);
  if (t.kind === "sin") return `${coefPart}sin(${variable})`;
  if (t.kind === "cos") return `${coefPart}cos(${variable})`;
  return `${coefPart}e^${variable}`;
}

function signedTerm(t: Term, variable: string): string {
  const body = formatTermAbs(t, variable);
  return t.coefficient < 0 ? `-${body}` : body;
}

export function formatExpression(terms: Term[], variable: string, plusC = false): string {
  if (terms.length === 0) return plusC ? "C" : "0";
  let out = "";
  terms.forEach((t, i) => {
    const body = formatTermAbs(t, variable);
    const sign = t.coefficient < 0 ? "-" : "+";
    if (i === 0) out = sign === "-" ? `-${body}` : body;
    else out += ` ${sign} ${body}`;
  });
  return plusC ? `${out} + C` : out;
}

function lawForTerm(t: Term): string {
  if (t.kind === "power") {
    if (t.power === 0) return "אינטגרל של קבוע: ∫c dx = c·x + C";
    return "חוק החזקה: ∫xⁿ dx = xⁿ⁺¹⁄(n+1) + C";
  }
  if (t.kind === "sin") return "אינטגרל של sin: ∫sin(x) dx = -cos(x) + C";
  if (t.kind === "cos") return "אינטגרל של cos: ∫cos(x) dx = sin(x) + C";
  return "אינטגרל של פונקציה מעריכית: ∫eˣ dx = eˣ + C";
}

function integrateTerm(t: Term): Term {
  if (t.kind === "power") {
    if (t.power === -1) throw new IntegralError("אינטגרל של x⁻¹ (1/x) אינו נתמך בגרסה זו");
    return { kind: "power", coefficient: t.coefficient / (t.power! + 1), power: t.power! + 1 };
  }
  if (t.kind === "sin") return { kind: "cos", coefficient: -t.coefficient };
  if (t.kind === "cos") return { kind: "sin", coefficient: t.coefficient };
  return { kind: "exp", coefficient: t.coefficient };
}

function stepExprForTerm(t: Term, antiderivative: Term, variable: string): string {
  if (t.kind === "power" && t.power === 0) {
    return `∫(${signedTerm(t, variable)})dx = ${signedTerm(t, variable)}·${variable}`;
  }
  if (t.kind === "power") {
    return `∫(${signedTerm(t, variable)})dx = ${formatNumber(t.coefficient)}·${variable}^${t.power! + 1}/${t.power! + 1} = ${signedTerm(antiderivative, variable)}`;
  }
  return `∫(${signedTerm(t, variable)})dx = ${signedTerm(antiderivative, variable)}`;
}

export function evalTerms(terms: Term[], x: number): number {
  return terms.reduce((sum, t) => {
    if (t.kind === "power") return sum + t.coefficient * Math.pow(x, t.power!);
    if (t.kind === "sin") return sum + t.coefficient * Math.sin(x);
    if (t.kind === "cos") return sum + t.coefficient * Math.cos(x);
    return sum + t.coefficient * Math.exp(x);
  }, 0);
}

export function parseIntegrand(input: string, variable: string): Term[] {
  const normalized = input.replace(/\s+/g, "").replace(/\*\*/g, "^");
  if (normalized === "") throw new IntegralError("נא להזין פונקציה");
  return splitTerms(normalized).map((t) => parseTerm(t, variable));
}

/** Parses an integration bound as an algebraic expression (number or linear-in-parameter). */
function parseBoundSym(raw: string | undefined, label: string, integrationVar: string): Sym {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) throw new IntegralError(`נא להזין גבול ${label} של האינטגרל`);
  const normalized = trimmed.replace(/\s+/g, "").replace(/\*\*/g, "^");
  let sym: Sym;
  try {
    sym = parseAlgebraic(normalized);
  } catch (err) {
    throw new IntegralError(`גבול ${label} לא תקין: ${err instanceof Error ? err.message : "שגיאה בעיבוד הביטוי"}`);
  }
  if (symVariables(sym).includes(integrationVar)) {
    throw new IntegralError(`גבול ${label} אינו יכול להכיל את משתנה האינטגרציה (${integrationVar})`);
  }
  return sym;
}

export function integrate(
  input: string,
  mode: IntegralMode,
  aInput?: string,
  bInput?: string,
  targetValue?: string,
): IntegralResult {
  const trimmed = input.trim();
  if (!trimmed) return { type: "error", message: "נא להזין פונקציה, למשל x^2 + sin(x)" };
  if (trimmed.includes("=")) {
    return { type: "error", message: "נא להזין ביטוי (פונקציה) ולא משוואה — ללא סימן =" };
  }

  const variable = detectVariable(trimmed);

  try {
    let a = 0;
    let b = 0;
    let aSym: Sym = [];
    let bSym: Sym = [];
    let paramName: string | null = null;

    if (mode === "definite") {
      aSym = parseBoundSym(aInput, "תחתון (a)", variable);
      bSym = parseBoundSym(bInput, "עליון (b)", variable);
      const params = new Set([...symVariables(aSym), ...symVariables(bSym)]);
      if (params.size > 1) {
        throw new IntegralError(`נתמך פרמטר יחיד בגבולות האינטגרציה (זוהו: ${[...params].join(", ")})`);
      }
      if (params.size === 1) {
        paramName = [...params][0];
      } else {
        a = symConstValue(aSym);
        b = symConstValue(bSym);
      }
    }

    const terms = combineLikeTerms(parseIntegrand(trimmed, variable));
    const steps: IntegralStep[] = [];
    const antiderivativeRaw: Term[] = [];

    for (const t of terms) {
      const dt = integrateTerm(t);
      antiderivativeRaw.push(dt);
      steps.push({ law: lawForTerm(t), expr: stepExprForTerm(t, dt, variable) });
    }

    const antiderivativeTerms = combineLikeTerms(antiderivativeRaw);
    const originalExpr = formatExpression(terms, variable);

    if (terms.length > 1) {
      steps.push({
        law: "כלל הסכום/ההפרש: ∫(f ± g)dx = ∫f dx ± ∫g dx",
        expr: `∫(${originalExpr})dx = ${formatExpression(antiderivativeTerms, variable)}`,
      });
    }

    if (mode === "indefinite") {
      const antiderivativeExpr = formatExpression(antiderivativeTerms, variable, true);
      steps.push({ law: "תוצאה סופית", expr: `∫(${originalExpr})dx = ${antiderivativeExpr}` });
      return {
        type: "result",
        mode,
        variable,
        originalExpr,
        antiderivativeExpr,
        originalTerms: terms,
        antiderivativeTerms,
        steps,
      };
    }

    if (paramName) {
      for (const t of antiderivativeTerms) {
        if (t.kind !== "power") {
          throw new IntegralError("גבולות פרמטריים נתמכים כרגע רק עבור פונקציות פולינומיאליות (לא sin, cos או e^x)");
        }
        if (t.power === undefined || t.power < 0) {
          throw new IntegralError("גבולות פרמטריים אינם נתמכים עבור חזקות שליליות (1/xⁿ)");
        }
      }

      const substitute = (boundSym: Sym): Sym =>
        antiderivativeTerms.reduce(
          (acc, t) => symAdd(acc, symScale(symPow(boundSym, t.power!), t.coefficient)),
          [] as Sym,
        );

      const FA = substitute(aSym);
      const FB = substitute(bSym);
      const definiteSym = symSub(FB, FA);
      const antiderivativeExpr = formatExpression(antiderivativeTerms, variable);
      const aExpr = formatSym(aSym);
      const bExpr = formatSym(bSym);
      const definiteExpr = formatPolyInVar(definiteSym, paramName);

      steps.push({
        law: "משפט ניוטון-לייבניץ עם גבולות פרמטריים: ∫ₐᵇ f(x)dx = F(b) - F(a)",
        expr: `F(${bExpr}) - F(${aExpr}) = (${formatPolyInVar(FB, paramName)}) - (${formatPolyInVar(FA, paramName)})`,
      });
      steps.push({
        law: "תוצאה סופית — ביטוי במונחי הפרמטר",
        expr: `∫_{${aExpr}}^{${bExpr}} (${originalExpr}) d${variable} = ${definiteExpr}`,
      });

      let equationExpr: string | undefined;
      let solutions: number[] | undefined;
      const targetTrimmed = (targetValue ?? "").trim();
      if (targetTrimmed) {
        const targetNum = parseFloat(targetTrimmed);
        if (!Number.isFinite(targetNum)) {
          throw new IntegralError("ערך היעד חייב להיות מספר");
        }
        const eqSym = symSub(definiteSym, symConst(targetNum));
        const coeffs = polyCoefficients(eqSym, paramName);
        solutions = solveRealPolynomial(coeffs);
        equationExpr = `${definiteExpr} = ${formatNumber(targetNum)}`;
        steps.push({
          law: "השוואה לערך הנתון ופתרון עבור הפרמטר",
          expr:
            solutions.length > 0
              ? `${equationExpr}  ⇒  ${solutions.map((s) => `${paramName} = ${formatNumber(s)}`).join(",  ")}`
              : `${equationExpr}  ⇒  אין פתרון ממשי`,
        });
      }

      return {
        type: "result",
        mode,
        variable,
        originalExpr,
        antiderivativeExpr,
        originalTerms: terms,
        antiderivativeTerms,
        steps,
        parametric: { paramName, aExpr, bExpr, definiteExpr, equationExpr, solutions },
      };
    }

    const valueAtA = evalTerms(antiderivativeTerms, a);
    const valueAtB = evalTerms(antiderivativeTerms, b);
    const definiteValue = valueAtB - valueAtA;
    const antiderivativeExpr = formatExpression(antiderivativeTerms, variable);

    steps.push({
      law: "משפט ניוטון-לייבניץ: ∫ₐᵇ f(x)dx = F(b) - F(a)",
      expr: `F(${formatNumber(b)}) - F(${formatNumber(a)}) = ${formatNumber(valueAtB)} - ${formatNumber(valueAtA)} = ${formatNumber(definiteValue)}`,
    });
    steps.push({
      law: "תוצאה סופית",
      expr: `∫_{${formatNumber(a)}}^{${formatNumber(b)}} (${originalExpr}) dx = ${formatNumber(definiteValue)}`,
    });

    return {
      type: "result",
      mode,
      variable,
      originalExpr,
      antiderivativeExpr,
      originalTerms: terms,
      antiderivativeTerms,
      steps,
      a,
      b,
      valueAtA,
      valueAtB,
      definiteValue,
    };
  } catch (err) {
    return {
      type: "error",
      message: err instanceof IntegralError ? err.message : "שגיאה בעיבוד הביטוי",
    };
  }
}
