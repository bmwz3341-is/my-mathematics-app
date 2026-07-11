/**
 * Symbolic integration engine: parses a sum/difference of terms built from
 * power monomials (coeff * x^n), sin(x)/cos(x), and e^x, then applies the
 * power/trig/exponential integration rules term by term. Supports both the
 * indefinite integral (+C) and the definite integral via the Newton-Leibniz
 * substitution F(b) - F(a).
 */

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
    }
  | { type: "error"; message: string };

export function detectVariable(input: string): string {
  const stripped = input.replace(/sin/gi, "").replace(/cos/gi, "").replace(/e\^/gi, "");
  const match = stripped.match(/[a-zA-Z]/);
  return match ? match[0].toLowerCase() : "x";
}

/** Splits on top-level +/- (not the sign inside an exponent like x^-2). */
function splitTerms(expr: string): string[] {
  const terms: string[] = [];
  let current = "";
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if ((ch === "+" || ch === "-") && current !== "" && expr[i - 1] !== "^") {
      terms.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) terms.push(current);
  return terms.filter((t) => t.trim() !== "");
}

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

  const re = new RegExp(`^(\\d+(?:\\.\\d+)?)?(${v})?(?:\\^([+-]?\\d+))?$`, "i");
  const match = s.match(re);
  if (!match || (!match[1] && !match[2])) {
    if (/[a-zA-Z]/.test(s)) {
      throw new IntegralError(`ביטוי לא נתמך: "${raw}" (נתמכים: חזקות, sin(${variable}), cos(${variable}), e^${variable})`);
    }
    throw new IntegralError(`איבר לא תקין: "${raw}"`);
  }
  const [, coefStr, varPart, powStr] = match;
  if (!varPart) return { kind: "power", coefficient: sign * parseFloat(coefStr!), power: 0 };
  const coefficient = coefStr ? parseFloat(coefStr) : 1;
  const power = powStr !== undefined ? parseInt(powStr, 10) : 1;
  if (!Number.isInteger(power)) throw new IntegralError("נתמכות רק חזקות שלמות");
  return { kind: "power", coefficient: sign * coefficient, power };
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

export function integrate(input: string, mode: IntegralMode, aInput?: string, bInput?: string): IntegralResult {
  const trimmed = input.trim();
  if (!trimmed) return { type: "error", message: "נא להזין פונקציה, למשל x^2 + sin(x)" };
  if (trimmed.includes("=")) {
    return { type: "error", message: "נא להזין ביטוי (פונקציה) ולא משוואה — ללא סימן =" };
  }

  const variable = detectVariable(trimmed);
  let a = 0;
  let b = 0;
  if (mode === "definite") {
    a = parseFloat((aInput ?? "").trim());
    b = parseFloat((bInput ?? "").trim());
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return { type: "error", message: "נא להזין גבולות אינטגרציה מספריים (a ו-b)" };
    }
  }

  try {
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
