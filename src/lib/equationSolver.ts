/**
 * Linear-equation solver for the 5-unit curriculum. No `eval`/`Function` is
 * ever used — expressions are tokenized and parsed by hand.
 *
 * Every quantity is tracked as `a*x + b`, where `a` and `b` are themselves
 * "Sym" values: small multivariate polynomials in whatever parameter letters
 * (e.g. a, b, k) appear in the input besides the solved-for unknown. This is
 * what lets the same engine handle plain numeric equations, equations with
 * numeric-denominator fractions (cleared via a common-denominator step),
 * equations with parameters (answer given as a symbolic expression, or as a
 * fraction when the x-coefficient itself is parametric), and |A| = B
 * equations (split into the two classic cases).
 */

/* ------------------------------------------------------------------ */
/* Sym: a small multivariate polynomial (no `x`) used for parameters.   */
/* ------------------------------------------------------------------ */

interface SymTerm {
  vars: Record<string, number>;
  coeff: number;
}

export type Sym = SymTerm[];

const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
};

function supNum(n: number): string {
  return String(n).split("").map((c) => SUPERSCRIPTS[c] ?? c).join("");
}

function monoKey(vars: Record<string, number>): string {
  return Object.keys(vars)
    .filter((k) => vars[k] !== 0)
    .sort()
    .map((k) => `${k}^${vars[k]}`)
    .join("*");
}

function symZero(): Sym {
  return [];
}

function symConst(n: number): Sym {
  return n === 0 ? [] : [{ vars: {}, coeff: n }];
}

function symParam(name: string): Sym {
  return [{ vars: { [name]: 1 }, coeff: 1 }];
}

function mergeInto(list: SymTerm[], term: SymTerm) {
  if (term.coeff === 0) return;
  const key = monoKey(term.vars);
  const existing = list.find((t) => monoKey(t.vars) === key);
  if (existing) existing.coeff += term.coeff;
  else list.push({ vars: { ...term.vars }, coeff: term.coeff });
}

function symAdd(s1: Sym, s2: Sym): Sym {
  const out: SymTerm[] = s1.map((t) => ({ vars: { ...t.vars }, coeff: t.coeff }));
  for (const t of s2) mergeInto(out, t);
  return out.filter((t) => Math.abs(t.coeff) > 1e-9);
}

function symNeg(s: Sym): Sym {
  return s.map((t) => ({ vars: { ...t.vars }, coeff: -t.coeff }));
}

function symSub(s1: Sym, s2: Sym): Sym {
  return symAdd(s1, symNeg(s2));
}

function symScale(s: Sym, k: number): Sym {
  if (k === 0) return [];
  return s.map((t) => ({ vars: { ...t.vars }, coeff: t.coeff * k })).filter((t) => Math.abs(t.coeff) > 1e-9);
}

function symMul(s1: Sym, s2: Sym): Sym {
  const out: SymTerm[] = [];
  for (const t1 of s1) {
    for (const t2 of s2) {
      const vars: Record<string, number> = { ...t1.vars };
      for (const [k, p] of Object.entries(t2.vars)) vars[k] = (vars[k] ?? 0) + p;
      mergeInto(out, { vars, coeff: t1.coeff * t2.coeff });
    }
  }
  return out.filter((t) => Math.abs(t.coeff) > 1e-9);
}

function symPow(s: Sym, n: number): Sym {
  let result = symConst(1);
  for (let i = 0; i < n; i++) result = symMul(result, s);
  return result;
}

function symIsZero(s: Sym): boolean {
  return s.length === 0;
}

function symIsPureConst(s: Sym): boolean {
  return s.every((t) => Object.keys(t.vars).length === 0);
}

function symHasParams(s: Sym): boolean {
  return s.some((t) => Object.keys(t.vars).length > 0);
}

function symConstValue(s: Sym): number {
  return s.reduce((acc, t) => acc + (Object.keys(t.vars).length === 0 ? t.coeff : 0), 0);
}

function formatStepNumber(n: number): string {
  const rounded = Math.round(n * 1e8) / 1e8;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

function formatMonomial(vars: Record<string, number>): string {
  return Object.keys(vars)
    .filter((k) => vars[k] !== 0)
    .sort()
    .map((k) => (vars[k] === 1 ? k : `${k}${supNum(vars[k])}`))
    .join("");
}

function formatSym(s: Sym): string {
  if (s.length === 0) return "0";
  const terms = [...s].sort((t1, t2) => {
    const c1 = Object.keys(t1.vars).length === 0;
    const c2 = Object.keys(t2.vars).length === 0;
    if (c1 !== c2) return c1 ? 1 : -1;
    return formatMonomial(t1.vars).localeCompare(formatMonomial(t2.vars));
  });
  let out = "";
  terms.forEach((t, i) => {
    const mono = formatMonomial(t.vars);
    const abs = Math.abs(t.coeff);
    const numPart = mono === "" ? formatStepNumber(abs) : abs === 1 ? "" : formatStepNumber(abs);
    const body = `${numPart}${mono}`;
    if (i === 0) out = t.coeff < 0 ? `-${body}` : body;
    else out += t.coeff < 0 ? ` - ${body}` : ` + ${body}`;
  });
  return out;
}

function splitLeadSign(s: string): { sign: "+" | "-"; rest: string } {
  if (s.startsWith("-")) return { sign: "-", rest: s.slice(1) };
  return { sign: "+", rest: s };
}

/* ------------------------------------------------------------------ */
/* Linear: `a*x + b`, where a and b are Sym (polynomials in parameters). */
/* ------------------------------------------------------------------ */

export interface Linear {
  a: Sym;
  b: Sym;
}

/** A purely-numeric `a*x + b`, used only for graphing (no parameters). */
export interface NumericLinear {
  a: number;
  b: number;
}

export function symLinearToNumeric(l: Linear): NumericLinear | null {
  if (!symIsPureConst(l.a) || !symIsPureConst(l.b)) return null;
  return { a: symConstValue(l.a), b: symConstValue(l.b) };
}

/** Formats a purely-numeric `a*x + b`, e.g. "2x + 3". Used by the graph. */
export function formatNumericLinear(l: NumericLinear, variable: string): string {
  const parts: string[] = [];
  if (l.a !== 0) {
    if (l.a === 1) parts.push(variable);
    else if (l.a === -1) parts.push(`-${variable}`);
    else parts.push(`${formatStepNumber(l.a)}${variable}`);
  }
  if (l.b !== 0 || parts.length === 0) {
    if (parts.length === 0) parts.push(formatStepNumber(l.b));
    else parts.push(l.b > 0 ? `+ ${formatStepNumber(l.b)}` : `- ${formatStepNumber(-l.b)}`);
  }
  return parts.join(" ");
}

/** Formats a possibly-symbolic `a*x + b`, e.g. "2x + 3" or "(a - c)x + 5". */
export function formatLinear(l: Linear, variable: string): string {
  const aZero = symIsZero(l.a);
  const bZero = symIsZero(l.b);
  if (aZero && bZero) return "0";
  let out = "";
  if (!aZero) {
    if (symIsPureConst(l.a)) {
      const k = symConstValue(l.a);
      out = k === 1 ? variable : k === -1 ? `-${variable}` : `${formatStepNumber(k)}${variable}`;
    } else {
      const inner = formatSym(l.a);
      out = l.a.length > 1 ? `(${inner})${variable}` : `${inner}${variable}`;
    }
  }
  if (!bZero) {
    const { sign, rest } = splitLeadSign(formatSym(l.b));
    if (out === "") out = sign === "-" ? `-${rest}` : rest;
    else out += ` ${sign} ${rest}`;
  }
  return out;
}

const CONST = (n: number): Linear => ({ a: symZero(), b: symConst(n) });
const PARAM = (name: string): Linear => ({ a: symZero(), b: symParam(name) });
const VARX = (): Linear => ({ a: symConst(1), b: symZero() });

function add(l1: Linear, l2: Linear): Linear {
  return { a: symAdd(l1.a, l2.a), b: symAdd(l1.b, l2.b) };
}

function sub(l1: Linear, l2: Linear): Linear {
  return { a: symSub(l1.a, l2.a), b: symSub(l1.b, l2.b) };
}

function negate(l: Linear): Linear {
  return { a: symNeg(l.a), b: symNeg(l.b) };
}

function mul(l1: Linear, l2: Linear): Linear {
  if (!symIsZero(symMul(l1.a, l2.a))) {
    throw new Error("המשוואה אינה לינארית (מכפלת שני איברים עם המשתנה)");
  }
  return { a: symAdd(symMul(l1.a, l2.b), symMul(l2.a, l1.b)), b: symMul(l1.b, l2.b) };
}

function divide(l1: Linear, l2: Linear): Linear {
  if (!symIsZero(l2.a)) throw new Error("המשוואה אינה לינארית (חלוקה במשתנה)");
  if (!symIsPureConst(l2.b)) throw new Error("לא נתמכת חלוקה בביטוי המכיל פרמטר");
  const denom = symConstValue(l2.b);
  if (denom === 0) throw new Error("חלוקה באפס");
  return { a: symScale(l1.a, 1 / denom), b: symScale(l1.b, 1 / denom) };
}

function power(base: Linear, exponent: Linear): Linear {
  if (!symIsZero(exponent.a)) throw new Error("המשוואה אינה לינארית (חזקה עם משתנה)");
  if (!symIsPureConst(exponent.b)) throw new Error("לא נתמכת חזקה עם מעריך המכיל פרמטר");
  const expVal = symConstValue(exponent.b);
  if (!Number.isInteger(expVal)) throw new Error("נתמכות רק חזקות שלמות");
  if (!symIsZero(base.a)) {
    if (expVal === 1) return base;
    if (expVal === 0) return CONST(1);
    throw new Error("נתמכות רק משוואות לינאריות (ללא חזקות של המשתנה)");
  }
  if (expVal >= 0) return { a: symZero(), b: symPow(base.b, expVal) };
  if (!symIsPureConst(base.b)) throw new Error("לא נתמכת חזקה שלילית של ביטוי עם פרמטר");
  const baseVal = symConstValue(base.b);
  if (baseVal === 0) throw new Error("חלוקה באפס");
  return CONST(Math.pow(baseVal, expVal));
}

/* ------------------------------------------------------------------ */
/* Tokenizer & parser                                                  */
/* ------------------------------------------------------------------ */

type Token =
  | { type: "num"; value: number }
  | { type: "var" }
  | { type: "param"; name: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "lparen" }
  | { type: "rparen" };

function tokenize(expr: string, variable: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      const value = parseFloat(num);
      if (Number.isNaN(value)) throw new Error("מספר לא תקין בביטוי");
      tokens.push({ type: "num", value });
      continue;
    }
    if (ch.toLowerCase() === variable) {
      tokens.push({ type: "var" });
      i++;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      tokens.push({ type: "param", name: ch.toLowerCase() });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen" });
      i++;
      continue;
    }
    if ("+-*/^".includes(ch)) {
      tokens.push({ type: "op", value: ch as "+" | "-" | "*" | "/" | "^" });
      i++;
      continue;
    }
    throw new Error(`תו לא חוקי בביטוי: "${ch}"`);
  }
  return tokens;
}

/** Parse result: the collected linear form plus the top-level additive terms
 * (each already expanded, e.g. "3(x-2)+4" -> [{a:3,b:-6},{a:0,b:4}]). */
interface ParsedSide {
  value: Linear;
  terms: Linear[];
}

function parseLinearExpression(tokens: Token[]): ParsedSide {
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parsePrimary(): Linear {
    const t = peek();
    if (!t) throw new Error("סוף בלתי צפוי של הביטוי");
    if (t.type === "num") {
      consume();
      return CONST(t.value);
    }
    if (t.type === "var") {
      consume();
      return VARX();
    }
    if (t.type === "param") {
      consume();
      return PARAM(t.name);
    }
    if (t.type === "op" && t.value === "-") {
      consume();
      return negate(parsePrimary());
    }
    if (t.type === "op" && t.value === "+") {
      consume();
      return parsePrimary();
    }
    if (t.type === "lparen") {
      consume();
      const value = parseAddSub();
      const close = consume();
      if (!close || close.type !== "rparen") throw new Error("חסר סוגר )");
      return value;
    }
    throw new Error("ביטוי לא תקין");
  }

  function parsePower(): Linear {
    const base = parsePrimary();
    const t = peek();
    if (t && t.type === "op" && t.value === "^") {
      consume();
      return power(base, parsePower());
    }
    return base;
  }

  function parseMulDiv(): Linear {
    let value = parsePower();
    while (true) {
      const t = peek();
      if (t && t.type === "op" && (t.value === "*" || t.value === "/")) {
        consume();
        const rhs = parsePower();
        value = t.value === "*" ? mul(value, rhs) : divide(value, rhs);
      } else if (t && (t.type === "var" || t.type === "param" || t.type === "lparen" || t.type === "num")) {
        // Implicit multiplication, e.g. "2x", "2a" or "2(x + 1)".
        const rhs = parsePower();
        value = mul(value, rhs);
      } else break;
    }
    return value;
  }

  function parseAddSub(collect?: Linear[]): Linear {
    let value = parseMulDiv();
    collect?.push(value);
    while (true) {
      const t = peek();
      if (t && t.type === "op" && (t.value === "+" || t.value === "-")) {
        consume();
        const rhs = parseMulDiv();
        value = t.value === "+" ? add(value, rhs) : sub(value, rhs);
        collect?.push(t.value === "+" ? rhs : negate(rhs));
      } else break;
    }
    return value;
  }

  const terms: Linear[] = [];
  const result = parseAddSub(terms);
  if (pos !== tokens.length) throw new Error("תווים מיותרים בסוף הביטוי");
  return { value: result, terms };
}

/** Formats expanded top-level terms before collection, e.g. "3x - 6 + 4". */
function formatTerms(terms: Linear[], variable: string): string {
  const atoms: { text: string; sign: "+" | "-" }[] = [];
  for (const t of terms) {
    if (!symIsZero(t.a)) {
      const s = formatLinear({ a: t.a, b: symZero() }, variable);
      const { sign, rest } = splitLeadSign(s);
      atoms.push({ text: rest, sign });
    }
    if (!symIsZero(t.b) || symIsZero(t.a)) {
      const { sign, rest } = splitLeadSign(formatSym(t.b));
      atoms.push({ text: rest, sign });
    }
  }
  if (atoms.length === 0) return "0";
  let out = "";
  atoms.forEach((atom, i) => {
    if (i === 0) out = atom.sign === "-" ? `-${atom.text}` : atom.text;
    else out += ` ${atom.sign} ${atom.text}`;
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Clearing numeric-denominator fractions                              */
/* ------------------------------------------------------------------ */

function extractDenominators(raw: string): number[] {
  const matches = raw.match(/\/\s*(\d+(?:\.\d+)?)/g) ?? [];
  return matches.map((m) => parseFloat(m.replace("/", "").trim())).filter((n) => Number.isFinite(n) && n > 0);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function lcmAll(nums: number[]): number | null {
  const ints = nums.filter((n) => Number.isInteger(n));
  if (ints.length !== nums.length || ints.length === 0) return null;
  let result = ints[0];
  for (let i = 1; i < ints.length; i++) result = (result * ints[i]) / gcd(result, ints[i]);
  return result > 100000 ? null : result;
}

/* ------------------------------------------------------------------ */
/* Solving `combined.a * x + combined.b = 0` for x                     */
/* ------------------------------------------------------------------ */

type Finalized =
  | { kind: "sym"; sym: Sym; xDisplay: string; xNumeric?: number; hasParams: boolean; extraSteps: string[] }
  | { kind: "frac"; numerator: Sym; denominator: Sym; xDisplay: string; xNumeric?: undefined; hasParams: true; extraSteps: string[] }
  | { error: string };

function finalizeX(combined: Linear, variable: string): Finalized {
  if (symIsZero(combined.a)) {
    if (symIsZero(combined.b)) return { error: "לכל x קיים פתרון (זהות)" };
    if (symIsPureConst(combined.b)) return { error: "אין פתרון למשוואה זו" };
    return {
      error: `מקדם ה-${variable} מתאפס ללא תלות ב-x — יש לבדוק בנפרד את התנאי ${formatSym(combined.b)} = 0`,
    };
  }

  const extraSteps: string[] = [
    `${formatLinear({ a: combined.a, b: symZero() }, variable)} = ${formatSym(symNeg(combined.b))}`,
  ];

  if (symIsPureConst(combined.a)) {
    const A = symConstValue(combined.a);
    const xSym = symScale(symNeg(combined.b), 1 / A);
    if (A !== 1) extraSteps.push(`${variable} = ${formatSym(symNeg(combined.b))} / ${formatStepNumber(A)}`);
    const display = formatSym(xSym);
    extraSteps.push(`${variable} = ${display}`);
    const hasParams = symHasParams(xSym);
    return { kind: "sym", sym: xSym, xDisplay: display, xNumeric: hasParams ? undefined : symConstValue(xSym), hasParams, extraSteps };
  }

  const numerator = symNeg(combined.b);
  const denominator = combined.a;
  const display = `(${formatSym(numerator)}) / (${formatSym(denominator)})`;
  extraSteps.push(`${variable} = ${display}   [בהנחה ש- ${formatSym(denominator)} ≠ 0]`);
  return { kind: "frac", numerator, denominator, xDisplay: display, hasParams: true, extraSteps };
}

function buildVerificationSteps(
  left: Linear,
  right: Linear,
  finalized: Finalized,
  variable: string,
  rawLeft: string,
  rawRight: string,
): string[] {
  if ("error" in finalized) return [];

  if (finalized.kind === "sym" && !finalized.hasParams && finalized.xNumeric !== undefined) {
    const xv = finalized.xNumeric;
    const pattern = new RegExp(`(?<![a-zA-Z])${variable}(?![a-zA-Z])`, "gi");
    const substitute = (raw: string) => raw.replace(pattern, `(${formatStepNumber(xv)})`);
    const leftNum = symConstValue(left.a) * xv + symConstValue(left.b);
    const rightNum = symConstValue(right.a) * xv + symConstValue(right.b);
    return [
      `בדיקה: ${variable} = ${formatStepNumber(xv)}  →  ${substitute(rawLeft.trim())} = ${substitute(rawRight.trim())}  →  ${formatStepNumber(leftNum)} = ${formatStepNumber(rightNum)} ✓`,
    ];
  }

  if (finalized.kind === "sym") {
    const leftAtX = symAdd(symMul(left.a, finalized.sym), left.b);
    const rightAtX = symAdd(symMul(right.a, finalized.sym), right.b);
    return [
      `בדיקה: הצבת ${variable} = ${finalized.xDisplay} בשני האגפים  →  ${formatSym(leftAtX)} = ${formatSym(rightAtX)} ✓`,
    ];
  }

  return [
    `בדיקה: הצבת ${variable} = ${finalized.xDisplay} בשני האגפים של המשוואה המקורית מקיימת את השוויון (בהנחה ש- ${formatSym(finalized.denominator)} ≠ 0)`,
  ];
}

/* ------------------------------------------------------------------ */
/* Result types                                                        */
/* ------------------------------------------------------------------ */

export interface Solution {
  xDisplay: string;
  xNumeric?: number;
}

export type SolveResult =
  | {
      type: "equation";
      variable: string;
      solutions: Solution[];
      steps: string[];
      left: Linear;
      right: Linear;
      hasParams: boolean;
    }
  | { type: "value"; value: number }
  | { type: "error"; message: string };

/* ------------------------------------------------------------------ */
/* Single equation (no absolute value)                                 */
/* ------------------------------------------------------------------ */

function solveSingleEquation(rawLeft: string, rawRight: string, variable: string): SolveResult {
  const leftSide = parseLinearExpression(tokenize(rawLeft, variable));
  const rightSide = parseLinearExpression(tokenize(rawRight, variable));

  const steps: string[] = [`${rawLeft.trim()} = ${rawRight.trim()}`];
  const push = (s: string) => {
    if (s !== steps[steps.length - 1]) steps.push(s);
  };

  const denominators = extractDenominators(`${rawLeft}=${rawRight}`);
  const lcm = denominators.length > 0 ? lcmAll(denominators) : null;
  if (lcm !== null && lcm > 1) {
    const scaledLeft = { a: symScale(leftSide.value.a, lcm), b: symScale(leftSide.value.b, lcm) };
    const scaledRight = { a: symScale(rightSide.value.a, lcm), b: symScale(rightSide.value.b, lcm) };
    push(`×${formatStepNumber(lcm)} (מכנה משותף, ללא שברים):  ${formatLinear(scaledLeft, variable)} = ${formatLinear(scaledRight, variable)}`);
  }

  push(`${formatTerms(leftSide.terms, variable)} = ${formatTerms(rightSide.terms, variable)}`);
  push(`${formatLinear(leftSide.value, variable)} = ${formatLinear(rightSide.value, variable)}`);

  const combined = sub(leftSide.value, rightSide.value);
  const finalized = finalizeX(combined, variable);
  if ("error" in finalized) return { type: "error", message: finalized.error };

  for (const s of finalized.extraSteps) push(s);
  for (const s of buildVerificationSteps(leftSide.value, rightSide.value, finalized, variable, rawLeft, rawRight)) push(s);

  return {
    type: "equation",
    variable,
    solutions: [{ xDisplay: finalized.xDisplay, xNumeric: finalized.xNumeric }],
    steps,
    left: leftSide.value,
    right: rightSide.value,
    hasParams: finalized.hasParams,
  };
}

/* ------------------------------------------------------------------ */
/* Absolute value: |A| = B  ⇔  A = B  or  A = -B                       */
/* ------------------------------------------------------------------ */

function solveAbsoluteEquation(innerRaw: string, rhsRaw: string, variable: string): SolveResult {
  const innerSide = parseLinearExpression(tokenize(innerRaw, variable));
  const rhsSide = parseLinearExpression(tokenize(rhsRaw, variable));

  const steps: string[] = [`|${innerRaw.trim()}| = ${rhsRaw.trim()}`];

  if (symIsZero(rhsSide.value.a) && symIsPureConst(rhsSide.value.b)) {
    const rhsVal = symConstValue(rhsSide.value.b);
    if (rhsVal < 0) {
      return { type: "error", message: `אין פתרון: ערך מוחלט אינו יכול להיות שווה למספר שלילי (${formatStepNumber(rhsVal)})` };
    }
  } else {
    steps.push(`בהנחה ש- ${formatLinear(rhsSide.value, variable)} ≥ 0`);
  }

  steps.push(
    `פיצול למקרים: ${formatLinear(innerSide.value, variable)} = ${formatLinear(rhsSide.value, variable)}   או   ${formatLinear(innerSide.value, variable)} = -(${formatLinear(rhsSide.value, variable)})`,
  );

  const combined1 = sub(innerSide.value, rhsSide.value);
  const combined2 = add(innerSide.value, rhsSide.value);
  const f1 = finalizeX(combined1, variable);
  const f2 = finalizeX(combined2, variable);

  const solutions: Solution[] = [];
  if ("error" in f1) {
    steps.push(`מקרה 1: ${f1.error}`);
  } else {
    steps.push(`מקרה 1:  ${f1.extraSteps.join("  →  ")}`);
    solutions.push({ xDisplay: f1.xDisplay, xNumeric: f1.kind === "sym" ? f1.xNumeric : undefined });
  }
  if ("error" in f2) {
    steps.push(`מקרה 2: ${f2.error}`);
  } else {
    steps.push(`מקרה 2:  ${f2.extraSteps.join("  →  ")}`);
    solutions.push({ xDisplay: f2.xDisplay, xNumeric: f2.kind === "sym" ? f2.xNumeric : undefined });
  }

  if (solutions.length === 0) {
    return { type: "error", message: "לא נמצא פתרון לאף אחד משני המקרים" };
  }

  const uniqueSolutions = solutions.filter((s, i) => solutions.findIndex((o) => o.xDisplay === s.xDisplay) === i);

  const pattern = new RegExp(`(?<![a-zA-Z])${variable}(?![a-zA-Z])`, "gi");
  for (const sol of uniqueSolutions) {
    if (sol.xNumeric !== undefined) {
      const substitute = (raw: string) => raw.replace(pattern, `(${formatStepNumber(sol.xNumeric!)})`);
      steps.push(`בדיקה עבור ${variable} = ${sol.xDisplay}:  |${substitute(innerRaw.trim())}| = ${substitute(rhsRaw.trim())}`);
    }
  }

  return {
    type: "equation",
    variable,
    solutions: uniqueSolutions,
    steps,
    left: innerSide.value,
    right: rhsSide.value,
    hasParams: uniqueSolutions.some((s) => s.xNumeric === undefined),
  };
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

function detectVariable(input: string): string {
  if (/x/i.test(input)) return "x";
  const match = input.match(/[a-zA-Z]/);
  return match ? match[0].toLowerCase() : "x";
}

/**
 * Solves a linear equation (numeric, with fractions, with parameters, or of
 * the form |ax + b| = c) or evaluates a plain arithmetic expression.
 */
export function solveMathInput(input: string): SolveResult {
  const trimmed = input.trim();
  if (!trimmed) return { type: "error", message: "נא להזין ביטוי או משוואה" };

  const equalsCount = (trimmed.match(/=/g) ?? []).length;
  if (equalsCount > 1) return { type: "error", message: "נתמך רק סימן שוויון (=) אחד" };

  const pipeCount = (trimmed.match(/\|/g) ?? []).length;

  try {
    if (pipeCount > 0) {
      if (equalsCount !== 1) return { type: "error", message: "יש לרשום משוואת ערך מוחלט בפורמט |ax + b| = c" };
      let m = trimmed.match(/^\|(.+)\|\s*=\s*(.+)$/);
      let innerRaw: string;
      let rhsRaw: string;
      if (m) {
        innerRaw = m[1];
        rhsRaw = m[2];
      } else {
        m = trimmed.match(/^(.+?)=\s*\|(.+)\|\s*$/);
        if (!m) return { type: "error", message: "יש לרשום משוואת ערך מוחלט בפורמט |ax + b| = c" };
        innerRaw = m[2];
        rhsRaw = m[1];
      }
      const variable = detectVariable(`${innerRaw}${rhsRaw}`);
      return solveAbsoluteEquation(innerRaw, rhsRaw, variable);
    }

    const variable = detectVariable(trimmed);

    if (equalsCount === 1) {
      const [left, right] = trimmed.split("=");
      return solveSingleEquation(left.trim(), right.trim(), variable);
    }

    const linear = parseLinearExpression(tokenize(trimmed, variable)).value;
    if (!symIsZero(linear.a)) return { type: "error", message: "יש להזין ביטוי מספרי בלבד, או משוואה עם סימן =" };
    if (!symIsPureConst(linear.b)) return { type: "error", message: "יש להזין ביטוי ללא פרמטרים כאשר אין סימן =" };
    const value = symConstValue(linear.b);
    if (!Number.isFinite(value)) return { type: "error", message: "התוצאה אינה מספר סופי" };
    return { type: "value", value };
  } catch (err) {
    return { type: "error", message: err instanceof Error ? err.message : "שגיאה בפתרון הביטוי" };
  }
}
