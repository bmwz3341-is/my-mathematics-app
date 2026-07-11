/**
 * Logarithmic-equation solver: parses equations built from log_a(...) and
 * ln(...) terms (with integer coefficients, summed/subtracted, plus plain
 * numeric constants), isolates a single logarithm per side using the
 * product/quotient/power laws, converts to exponential form, solves the
 * resulting linear/quadratic polynomial equation, and finally rejects any
 * root that violates the domain (every log argument must stay positive).
 */

import { evalPolynomial, formatPolynomial, parsePolynomial, type Term } from "@/lib/derivative";

export class LogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LogError";
  }
}

export interface LogStep {
  label: string;
  expr: string;
}

export type LogSolveResult =
  | { type: "result"; mode: "equation"; headline: string; note?: string; steps: LogStep[] }
  | { type: "result"; mode: "expression"; original: string; domain: string; simplified: string; note?: string; steps: LogStep[] }
  | { type: "error"; message: string };

const MAX_LOG_POWER = 6;
const EPSILON = 1e-9;

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function detectVariable(input: string): string {
  const stripped = input.replace(/log(?:_[0-9.]+)?/gi, "").replace(/ln/gi, "");
  const match = stripped.match(/[a-zA-Z]/);
  return match ? match[0].toLowerCase() : "x";
}

// ---------------------------------------------------------------------------
// Small polynomial helpers (reusing derivative.ts's Term = {coefficient, power})
// ---------------------------------------------------------------------------

function combineLikeTerms(terms: Term[]): Term[] {
  const byPower = new Map<number, number>();
  const order: number[] = [];
  for (const t of terms) {
    if (!byPower.has(t.power)) order.push(t.power);
    byPower.set(t.power, (byPower.get(t.power) ?? 0) + t.coefficient);
  }
  return order
    .map((power) => ({ power, coefficient: byPower.get(power)! }))
    .filter((t) => Math.abs(t.coefficient) > EPSILON)
    .sort((a, b) => b.power - a.power);
}

function polyMultiply(a: Term[], b: Term[]): Term[] {
  const raw: Term[] = [];
  for (const ta of a) for (const tb of b) raw.push({ coefficient: ta.coefficient * tb.coefficient, power: ta.power + tb.power });
  return combineLikeTerms(raw);
}

function polyPow(a: Term[], n: number): Term[] {
  let result: Term[] = [{ coefficient: 1, power: 0 }];
  for (let i = 0; i < n; i++) result = polyMultiply(result, a);
  return result;
}

function isOnePoly(p: Term[]): boolean {
  return p.length === 1 && p[0].power === 0 && Math.abs(p[0].coefficient - 1) < EPSILON;
}

function ratioExprString(numerator: Term[], denominator: Term[], variable: string): string {
  const n = formatPolynomial(numerator, variable);
  if (isOnePoly(denominator)) return n;
  return `(${n})/(${formatPolynomial(denominator, variable)})`;
}

function dedupePolys(polys: Term[][]): Term[][] {
  const seen = new Set<string>();
  const out: Term[][] = [];
  for (const p of polys) {
    const key = p.map((t) => `${t.power}:${t.coefficient}`).join(",");
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

function constSuffix(v: number): string {
  if (Math.abs(v) < EPSILON) return "";
  return v > 0 ? ` + ${formatNumber(v)}` : ` - ${formatNumber(-v)}`;
}

/** Renders a side as "log_a(ratio) [+/- const]", or just the bare constant if that side has no log terms at all. */
function sideExprString(hasLogTerms: boolean, combined: Combined, constant: number, label: string, variable: string): string {
  if (!hasLogTerms) return formatNumber(constant);
  return `${label}(${ratioExprString(combined.numerator, combined.denominator, variable)})${constSuffix(constant)}`;
}

// ---------------------------------------------------------------------------
// Parsing: "3log_2(x+1) - ln(x) + 4" -> log terms + a constant
// ---------------------------------------------------------------------------

interface LogTerm {
  coeff: number;
  base: number;
  isNatural: boolean;
  argument: Term[];
}

interface ParsedSide {
  logTerms: LogTerm[];
  constant: number;
}

function splitTopLevelTerms(expr: string): string[] {
  const terms: string[] = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if ((ch === "+" || ch === "-") && depth === 0 && current !== "" && expr[i - 1] !== "^") {
      terms.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) terms.push(current);
  return terms.filter((t) => t.trim() !== "");
}

function logLabel(isNatural: boolean, base: number): string {
  return isNatural ? "ln" : `log_${formatNumber(base)}`;
}

function parseLogOrNumber(
  body: string,
  variable: string,
): { isLog: true; coeff: number; base: number; isNatural: boolean; argument: Term[] } | { isLog: false; value: number } {
  if (body === "") throw new LogError("איבר ריק במשוואה");
  const m = body.match(/^(\d+(?:\.\d+)?)?\*?(ln|log)(?:_([0-9]+(?:\.[0-9]+)?))?\(/i);
  if (!m) {
    const num = parseFloat(body);
    if (Number.isNaN(num)) throw new LogError(`איבר לא תקין: "${body}" — נדרש מספר או ביטוי log/ln`);
    return { isLog: false, value: num };
  }
  const [full, coeffStr, name, baseStr] = m;
  const openIdx = full.length - 1;
  let depth = 0;
  let closeIdx = -1;
  for (let i = openIdx; i < body.length; i++) {
    if (body[i] === "(") depth++;
    else if (body[i] === ")") {
      depth--;
      if (depth === 0) {
        closeIdx = i;
        break;
      }
    }
  }
  if (closeIdx === -1) throw new LogError(`חסר סוגר סוגר בביטוי הלוגריתמי: "${body}"`);
  if (closeIdx !== body.length - 1) throw new LogError(`תווים מיותרים אחרי הלוגריתם: "${body}"`);
  const argumentRaw = body.slice(openIdx + 1, closeIdx);
  if (argumentRaw === "") throw new LogError("תוכן הלוגריתם לא יכול להיות ריק");

  const isNatural = name.toLowerCase() === "ln";
  if (isNatural && baseStr) throw new LogError("אין להוסיף בסיס ל-ln — הבסיס של ln הוא תמיד e");
  const base = isNatural ? Math.E : baseStr ? parseFloat(baseStr) : 10;
  if (!isNatural && (base <= 0 || Math.abs(base - 1) < EPSILON)) {
    throw new LogError("בסיס הלוגריתם חייב להיות חיובי ושונה מ-1");
  }
  const coeff = coeffStr ? parseFloat(coeffStr) : 1;
  const argument = parsePolynomial(argumentRaw, variable);
  return { isLog: true, coeff, base, isNatural, argument };
}

function parseSide(sideRaw: string, variable: string): ParsedSide {
  const normalized = sideRaw.replace(/\s+/g, "");
  if (normalized === "") throw new LogError("אחד מאגפי המשוואה ריק");
  const logTerms: LogTerm[] = [];
  let constant = 0;
  for (const rawTerm of splitTopLevelTerms(normalized)) {
    let sign = 1;
    let body = rawTerm;
    if (body[0] === "+") body = body.slice(1);
    else if (body[0] === "-") {
      sign = -1;
      body = body.slice(1);
    }
    const parsed = parseLogOrNumber(body, variable);
    if (parsed.isLog) {
      logTerms.push({ coeff: sign * parsed.coeff, base: parsed.base, isNatural: parsed.isNatural, argument: parsed.argument });
    } else {
      constant += sign * parsed.value;
    }
  }
  return { logTerms, constant };
}

// ---------------------------------------------------------------------------
// Combining a side's log terms into a single log_a(numerator/denominator),
// recording every product/quotient/power-law application along the way.
// ---------------------------------------------------------------------------

interface Combined {
  numerator: Term[];
  denominator: Term[];
}

function combineSide(logTerms: LogTerm[], variable: string, isNatural: boolean, base: number, steps: LogStep[]): Combined {
  const label = logLabel(isNatural, base);
  const postPower: { sign: 1 | -1; arg: Term[] }[] = [];

  for (const t of logTerms) {
    if (!Number.isInteger(t.coeff) || t.coeff === 0) {
      throw new LogError(`מקדם ${t.coeff} לפני לוגריתם אינו נתמך — יש להשתמש במקדמים שלמים ושונים מאפס בלבד`);
    }
    const n = Math.abs(t.coeff);
    if (n > MAX_LOG_POWER) throw new LogError(`המקדם ${t.coeff} גדול מדי עבור כלל ההעלאה בחזקה בכלי זה`);
    let arg = t.argument;
    if (n > 1) {
      arg = polyPow(t.argument, n);
      steps.push({
        label: "n·log_a(x) = log_a(xⁿ)",
        expr: `${n}·${label}(${formatPolynomial(t.argument, variable)}) = ${label}(${formatPolynomial(arg, variable)})`,
      });
    }
    postPower.push({ sign: t.coeff > 0 ? 1 : -1, arg });
  }

  let numerator: Term[] = [{ coefficient: 1, power: 0 }];
  let denominator: Term[] = [{ coefficient: 1, power: 0 }];
  for (const p of postPower) {
    if (p.sign === 1) numerator = polyMultiply(numerator, p.arg);
    else denominator = polyMultiply(denominator, p.arg);
  }

  if (postPower.length > 1) {
    const before = postPower
      .map((p, i) => {
        const body = `${label}(${formatPolynomial(p.arg, variable)})`;
        if (i === 0) return p.sign < 0 ? `-${body}` : body;
        return `${p.sign > 0 ? "+" : "-"} ${body}`;
      })
      .join(" ");
    const hasQuotient = postPower.some((p) => p.sign < 0);
    const hasProduct = postPower.some((p) => p.sign > 0) && postPower.filter((p) => p.sign > 0).length > 1;
    steps.push({
      label:
        hasProduct && hasQuotient
          ? "log_a(x)+log_a(y) = log_a(x·y)  ,  log_a(x)-log_a(y) = log_a(x/y)"
          : hasQuotient
            ? "log_a(x) - log_a(y) = log_a(x/y)"
            : "log_a(x) + log_a(y) = log_a(x·y)",
      expr: `${before} = ${label}(${ratioExprString(numerator, denominator, variable)})`,
    });
  }

  return { numerator, denominator };
}

// ---------------------------------------------------------------------------
// Solving the resulting polynomial equation (degree 0, 1 or 2).
// ---------------------------------------------------------------------------

type PolySolution = { kind: "identity" } | { kind: "contradiction" } | { kind: "roots"; roots: number[] };

function solvePolynomial(terms: Term[]): PolySolution {
  const cleaned = terms.filter((t) => Math.abs(t.coefficient) > EPSILON);
  if (cleaned.length === 0) return { kind: "identity" };
  const degree = Math.max(...cleaned.map((t) => t.power));
  if (degree === 0) return { kind: "contradiction" };
  if (degree > 2) throw new LogError(`המשוואה המתקבלת היא ממעלה ${degree} — הכלי תומך בפתרון עד משוואה ריבועית בלבד`);

  const coeffOf = (p: number) => cleaned.find((t) => t.power === p)?.coefficient ?? 0;
  if (degree === 1) {
    const a = coeffOf(1);
    const b = coeffOf(0);
    return { kind: "roots", roots: [-b / a] };
  }
  const a = coeffOf(2);
  const b = coeffOf(1);
  const c = coeffOf(0);
  const disc = b * b - 4 * a * c;
  if (disc < -EPSILON) return { kind: "roots", roots: [] };
  if (Math.abs(disc) < EPSILON) return { kind: "roots", roots: [-b / (2 * a)] };
  const sq = Math.sqrt(disc);
  return { kind: "roots", roots: [(-b + sq) / (2 * a), (-b - sq) / (2 * a)].sort((p, q) => p - q) };
}

// ---------------------------------------------------------------------------
// Expression analysis (no "=" sign): domain + law-based simplification of a
// single logarithmic expression, without solving for x.
// ---------------------------------------------------------------------------

function analyzeLogarithmicExpression(trimmed: string): LogSolveResult {
  const variable = detectVariable(trimmed);
  try {
    const side = parseSide(trimmed, variable);
    if (side.logTerms.length === 0) {
      throw new LogError("לא נמצא ביטוי לוגריתמי (log_a(...) או ln(...)) בביטוי");
    }
    const baseKeys = new Set(side.logTerms.map((t) => (t.isNatural ? "e" : formatNumber(t.base))));
    if (baseKeys.size > 1) {
      throw new LogError("כל הלוגריתמים בביטוי חייבים להיות מאותו בסיס (או כולם ln) — הכלי אינו תומך בשילוב בסיסים שונים באותו ביטוי");
    }
    const { isNatural, base } = side.logTerms[0];
    const label = logLabel(isNatural, base);

    const steps: LogStep[] = [];
    const uniqueArgs = dedupePolys(side.logTerms.map((t) => t.argument));
    const domain = uniqueArgs.map((arg) => `${formatPolynomial(arg, variable)} > 0`).join("  ,  ");
    steps.push({ label: "תחום הגדרה — תוכן הלוגריתם חייב להיות חיובי", expr: domain });

    const combined = combineSide(side.logTerms, variable, isNatural, base, steps);
    const simplified = sideExprString(true, combined, side.constant, label, variable);

    const alreadySimplified = side.logTerms.length === 1 && side.logTerms[0].coeff === 1 && side.constant === 0;
    if (!alreadySimplified) steps.push({ label: "ביטוי מפושט", expr: `${trimmed} = ${simplified}` });

    return {
      type: "result",
      mode: "expression",
      original: trimmed,
      domain,
      simplified,
      note: alreadySimplified ? "הביטוי כבר בצורה הפשוטה ביותר" : undefined,
      steps,
    };
  } catch (err) {
    return { type: "error", message: err instanceof LogError ? err.message : "שגיאה בעיבוד הביטוי" };
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function solveLogarithmicEquation(input: string): LogSolveResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { type: "error", message: "נא להזין ביטוי או משוואה לוגריתמית, למשל log_2(x+3) + log_2(x-3) = 4 או log(x-3)" };
  }
  const equalsCount = (trimmed.match(/=/g) ?? []).length;
  if (equalsCount > 1) {
    return { type: "error", message: "יש להזין ביטוי לוגריתמי בודד, או משוואה עם סימן שוויון (=) יחיד" };
  }
  if (equalsCount === 0) return analyzeLogarithmicExpression(trimmed);

  const [rawLeft, rawRight] = trimmed.split("=");
  const variable = detectVariable(trimmed);

  try {
    const lhs = parseSide(rawLeft, variable);
    const rhs = parseSide(rawRight, variable);
    const allLogTerms = [...lhs.logTerms, ...rhs.logTerms];
    if (allLogTerms.length === 0) {
      throw new LogError("לא נמצא ביטוי לוגריתמי (log_a(...) או ln(...)) במשוואה");
    }
    const baseKeys = new Set(allLogTerms.map((t) => (t.isNatural ? "e" : formatNumber(t.base))));
    if (baseKeys.size > 1) {
      throw new LogError("כל הלוגריתמים במשוואה חייבים להיות מאותו בסיס (או כולם ln) — הכלי אינו תומך בשילוב בסיסים שונים באותה משוואה");
    }
    const { isNatural, base } = allLogTerms[0];
    const label = logLabel(isNatural, base);

    const steps: LogStep[] = [];

    // Step 1: domain of definition — every log argument must be positive.
    const uniqueArgs = dedupePolys(allLogTerms.map((t) => t.argument));
    steps.push({
      label: "שלב 1: תחום הגדרה — תוכן הלוגריתם חייב להיות חיובי",
      expr: uniqueArgs.map((arg) => `${formatPolynomial(arg, variable)} > 0`).join("  ,  "),
    });

    // Step 2: use the log laws to isolate a single logarithm per side, then
    // fold both sides (and any constants) into one logarithmic equation.
    const L = combineSide(lhs.logTerms, variable, isNatural, base, steps);
    const R = combineSide(rhs.logTerms, variable, isNatural, base, steps);

    const K = rhs.constant - lhs.constant;
    const combinedNumerator = polyMultiply(L.numerator, R.denominator);
    const combinedDenominator = polyMultiply(L.denominator, R.numerator);

    const lhsExpr = sideExprString(lhs.logTerms.length > 0, L, lhs.constant, label, variable);
    const rhsExpr = sideExprString(rhs.logTerms.length > 0, R, rhs.constant, label, variable);
    const before = `${lhsExpr} = ${rhsExpr}`;
    const isolated = `${label}(${ratioExprString(combinedNumerator, combinedDenominator, variable)}) = ${formatNumber(K)}`;
    steps.push({
      label: "שלב 2: בידוד לביטוי לוגריתמי יחיד",
      expr: before === isolated ? isolated : `${before}  ⇒  ${isolated}`,
    });

    // Step 3: logarithmic form -> exponential form, log_a(x) = b  =>  x = a^b.
    const powerValue = Math.pow(base, K);
    const baseDisplay = isNatural ? "e" : formatNumber(base);
    const isNicePower = !isNatural && Number.isInteger(base) && Number.isInteger(K);
    steps.push({
      label: `שלב 3: מעבר מצורה לוגריתמית לצורה מעריכית — ${label}(x) = b  ⇒  x = ${isNatural ? "e" : "a"}^b`,
      expr: `${label}(${ratioExprString(combinedNumerator, combinedDenominator, variable)}) = ${formatNumber(K)}  ⇒  ${ratioExprString(
        combinedNumerator,
        combinedDenominator,
        variable,
      )} = ${baseDisplay}^${formatNumber(K)}${isNicePower ? "" : ` ≈ ${formatNumber(powerValue)}`}`,
    });

    // Cross-multiply into a single polynomial equation (safe: the domain
    // requires every original argument to be positive, so combinedDenominator
    // never vanishes at a domain-valid x).
    const scaledDenominator = combinedDenominator.map((t) => ({ coefficient: t.coefficient * powerValue, power: t.power }));
    const eqPoly = combineLikeTerms([...combinedNumerator, ...scaledDenominator.map((t) => ({ coefficient: -t.coefficient, power: t.power }))]);

    // Step 4: solve the resulting equation.
    const solved = solvePolynomial(eqPoly);
    const eqText = `${formatPolynomial(eqPoly, variable)} = 0`;
    if (solved.kind === "identity") {
      steps.push({ label: "שלב 4: פתרון המשוואה", expr: `${eqText}  ⇒  מתקיים לכל ${variable}` });
    } else if (solved.kind === "contradiction" || solved.roots.length === 0) {
      steps.push({ label: "שלב 4: פתרון המשוואה", expr: `${eqText}  ⇒  ∅ (אין פתרון ממשי)` });
      steps.push({ label: "שלב 5: בדיקת הפתרונות מול תחום ההגדרה", expr: "אין פתרונות מועמדים לבדוק" });
      return { type: "result", mode: "equation", headline: `${trimmed}  ⇒  ∅`, steps };
    } else {
      steps.push({
        label: "שלב 4: פתרון המשוואה",
        expr: `${eqText}  ⇒  ${variable} = ${solved.roots.map(formatNumber).join(" , ")}`,
      });
    }

    // Step 5: check every candidate against the domain from step 1.
    if (solved.kind === "identity") {
      steps.push({
        label: "שלב 5: בדיקת הפתרונות מול תחום ההגדרה",
        expr: `כל ${variable} המקיים ${uniqueArgs.map((a) => `${formatPolynomial(a, variable)} > 0`).join("  ,  ")} הוא פתרון`,
      });
      return { type: "result", mode: "equation", headline: `${trimmed}  ⇒  מתקיים לכל ${variable} בתחום ההגדרה`, steps };
    }

    const validRoots: number[] = [];
    const checks = solved.roots.map((r) => {
      const violated = uniqueArgs.find((arg) => evalPolynomial(arg, r) <= EPSILON);
      if (violated) {
        return `${variable}=${formatNumber(r)}: נפסל (${formatPolynomial(violated, variable)} = ${formatNumber(evalPolynomial(violated, r))} ≤ 0)`;
      }
      validRoots.push(r);
      return `${variable}=${formatNumber(r)}: מתקבל ✓`;
    });
    steps.push({ label: "שלב 5: בדיקת הפתרונות מול תחום ההגדרה", expr: checks.join("  ;  ") });

    if (validRoots.length === 0) {
      return {
        type: "result",
        mode: "equation",
        headline: `${trimmed}  ⇒  ∅`,
        note: "כל הפתרונות שהתקבלו נפסלו על ידי תחום ההגדרה",
        steps,
      };
    }
    return {
      type: "result",
      mode: "equation",
      headline: `${trimmed}  ⇒  ${validRoots.map((r) => `${variable} = ${formatNumber(r)}`).join(" , ")}`,
      steps,
    };
  } catch (err) {
    return { type: "error", message: err instanceof LogError ? err.message : "שגיאה בעיבוד המשוואה" };
  }
}
