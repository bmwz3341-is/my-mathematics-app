/**
 * Safe algebra engine for exponent laws, built on top of exact fractions and
 * hand-written tokenizing/parsing — no `eval`/`Function` is ever used.
 *
 * A general expression is simplified into an *Expression*: a sum of ordinary
 * polynomial monomials (`coeff * a1^e1 * a2^e2 * ...`) plus a sum of
 * *exponential terms* (`coeff * base^X`, for expressions like `2^(X-4)` where
 * the variable sits in the exponent). Every combination step (same-base
 * multiply/divide, power of a power, power of a product, negative-exponent
 * rewriting, zero exponent, collecting like terms, and exponent decomposition)
 * is recorded with the specific rule that produced it.
 *
 * Supported input:
 *  - Products, quotients and (constant, integer) powers of single-letter
 *    variables and numbers: "x^2 * x^3", "(x^2)^3", "x^-2", "2x^3 * 3x^-5".
 *  - Addition/subtraction between terms, with like-term collection:
 *    "x^2 + 3x^2 - 5", "(x+1)*(x-1)", "(x+1)^3".
 *  - Exponential decomposition: a numeric base raised to a *linear*
 *    expression in a variable, e.g. "2^(X-4)" -> "(1/16)*2^X", via
 *    aᶜˣ⁺ᵏ = aᵏ·(aᶜ)ˣ. Mixed polynomial+exponential sums are simplified part
 *    by part and combined ("x + 2^x + x").
 *  - Division is only supported when the divisor reduces to a single term
 *    (dividing by a multi-term expression is a different problem — long
 *    division — and is rejected with a clear message).
 *  - A single "=" turns the input into an equation:
 *      - Pure polynomial equations: linear ones solved directly; pure power
 *        equations (aⁿ = k) via exact/approximate n-th roots.
 *      - Pure exponential equations: a single term solved via logarithm;
 *        two or more terms attempt a t = bˣ substitution (reducing to a
 *        linear/quadratic/higher-degree polynomial in t, solved exactly when
 *        possible).
 *      - Anything left over (mixed polynomial+exponential, or a
 *        substitution/root search that doesn't resolve exactly) falls back to
 *        a bounded multi-seed Newton-Raphson numerical search, clearly
 *        labeled as an approximation.
 *      - Genuinely unsolvable shapes (more than one variable, or more than
 *        one polynomial power with no common exponential base) are reported
 *        honestly with the simplified form, rather than guessed at.
 */

export class PowerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PowerError";
  }
}

export interface PowerStep {
  law: string;
  expr: string;
}

export type PowerSolveResult =
  | { type: "result"; headline: string; note?: string; steps: PowerStep[] }
  | { type: "error"; message: string };

// ---------------------------------------------------------------------------
// Exact fractions (avoids floating-point error for things like 2^-3 = 1/8).
// ---------------------------------------------------------------------------

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

class Fraction {
  static ONE = new Fraction(1, 1);
  static ZERO = new Fraction(0, 1);

  private constructor(
    public readonly num: number,
    public readonly den: number,
  ) {}

  static of(num: number, den: number): Fraction {
    if (den === 0) throw new PowerError("חלוקה באפס");
    if (den < 0) {
      num = -num;
      den = -den;
    }
    const g = gcd(num, den);
    return new Fraction(num / g, den / g);
  }

  static fromRaw(raw: string): Fraction {
    if (!/^\d+(\.\d+)?$|^\.\d+$/.test(raw)) {
      throw new PowerError(`מספר לא תקין: "${raw}"`);
    }
    const [intPart, fracPart = ""] = raw.split(".");
    const den = Math.pow(10, fracPart.length);
    const num = parseInt((intPart || "0") + fracPart, 10);
    return Fraction.of(num, den);
  }

  isZero(): boolean {
    return this.num === 0;
  }

  equalsInt(n: number): boolean {
    return this.den === 1 && this.num === n;
  }

  negate(): Fraction {
    return Fraction.of(-this.num, this.den);
  }

  add(other: Fraction): Fraction {
    return Fraction.of(this.num * other.den + other.num * this.den, this.den * other.den);
  }

  multiply(other: Fraction): Fraction {
    return Fraction.of(this.num * other.num, this.den * other.den);
  }

  divide(other: Fraction): Fraction {
    if (other.isZero()) throw new PowerError("חלוקה באפס");
    return Fraction.of(this.num * other.den, this.den * other.num);
  }

  pow(exponent: number): Fraction {
    if (exponent === 0) return Fraction.ONE;
    if (this.isZero()) {
      if (exponent < 0) throw new PowerError("חלוקה באפס (0 בחזקה שלילית)");
      return Fraction.ZERO;
    }
    const magnitude = Math.abs(exponent);
    if (magnitude > 200) throw new PowerError("החזקה גדולה מדי לחישוב מדויק בכלי זה");
    let num = 1;
    let den = 1;
    for (let i = 0; i < magnitude; i++) {
      num *= this.num;
      den *= this.den;
      if (!Number.isSafeInteger(num) || !Number.isSafeInteger(den)) {
        throw new PowerError("התוצאה גדולה מכדי לחשב במדויק");
      }
    }
    return exponent > 0 ? Fraction.of(num, den) : Fraction.of(den, num);
  }

  toNumber(): number {
    return this.num / this.den;
  }

  toString(): string {
    return this.den === 1 ? `${this.num}` : `${this.num}/${this.den}`;
  }
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type Token =
  | { type: "num"; raw: string }
  | { type: "var"; name: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "sqrt" };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let raw = "";
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        raw += expr[i];
        i++;
      }
      tokens.push({ type: "num", raw });
      continue;
    }
    if (expr.slice(i, i + 4).toLowerCase() === "sqrt") {
      if (expr[i + 4] !== "(") throw new PowerError("sqrt חייב להיות מלווה בסוגריים, למשל sqrt(9)");
      tokens.push({ type: "sqrt" });
      i += 4;
      continue;
    }
    if (ch === "√") {
      if (expr[i + 1] !== "(") throw new PowerError("√ חייב להיות מלווה בסוגריים, למשל √(9)");
      tokens.push({ type: "sqrt" });
      i++;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      tokens.push({ type: "var", name: ch });
      i++;
      continue;
    }
    if (ch === "×" || ch === "·") {
      tokens.push({ type: "op", value: "*" });
      i++;
      continue;
    }
    if (ch === "÷" || ch === ":") {
      tokens.push({ type: "op", value: "/" });
      i++;
      continue;
    }
    if ("+-*/^".includes(ch)) {
      tokens.push({ type: "op", value: ch as "+" | "-" | "*" | "/" | "^" });
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
    throw new PowerError(`תו לא חוקי בביטוי: "${ch}"`);
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Parser -> AST
// ---------------------------------------------------------------------------

type Node =
  | { kind: "num"; raw: string }
  | { kind: "var"; name: string }
  | { kind: "neg"; value: Node }
  | { kind: "add"; left: Node; right: Node }
  | { kind: "sub"; left: Node; right: Node }
  | { kind: "mul"; left: Node; right: Node }
  | { kind: "div"; left: Node; right: Node }
  | { kind: "pow"; base: Node; exp: Node }
  | { kind: "sqrt"; value: Node };

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }

  parse(): Node {
    if (this.tokens.length === 0) throw new PowerError("נא להזין ביטוי חזקות");
    const node = this.parseExpr();
    if (this.pos < this.tokens.length) throw new PowerError("תווים מיותרים בסוף הביטוי");
    return node;
  }

  private startsFactor(t: Token | undefined): boolean {
    return !!t && (t.type === "num" || t.type === "var" || t.type === "lparen" || t.type === "sqrt");
  }

  private parseExpr(): Node {
    let left = this.parseTerm();
    for (;;) {
      const t = this.peek();
      if (t?.type === "op" && (t.value === "+" || t.value === "-")) {
        this.next();
        const right = this.parseTerm();
        left = { kind: t.value === "+" ? "add" : "sub", left, right };
      } else break;
    }
    return left;
  }

  private parseTerm(): Node {
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek();
      if (t?.type === "op" && (t.value === "*" || t.value === "/")) {
        this.next();
        const right = this.parseUnary();
        left = { kind: t.value === "*" ? "mul" : "div", left, right };
      } else if (this.startsFactor(t)) {
        // implicit multiplication: "2x", "3(x+1)", "(x+1)(x-1)"
        const right = this.parseUnary();
        left = { kind: "mul", left, right };
      } else break;
    }
    return left;
  }

  private parseUnary(): Node {
    const t = this.peek();
    if (t?.type === "op" && t.value === "-") {
      this.next();
      return { kind: "neg", value: this.parseUnary() };
    }
    if (t?.type === "op" && t.value === "+") {
      this.next();
      return this.parseUnary();
    }
    return this.parsePower();
  }

  private parsePower(): Node {
    const base = this.parseAtom();
    const t = this.peek();
    if (t?.type === "op" && t.value === "^") {
      this.next();
      // For a numeric base ("2^2X"), the exponent greedily absorbs trailing
      // implicit-multiplication factors so "2^2X" reads as 2^(2*X) — matching
      // a flattened LaTeX superscript like 2^{2X}. A variable base ("x^2y")
      // is left alone: in ordinary polynomial notation that means (x^2)*y,
      // and changing it would break standard multi-variable monomials.
      const exp = base.kind === "num" ? this.parseExponentOfNumericBase() : this.parseUnary();
      return { kind: "pow", base, exp };
    }
    return base;
  }

  private parseExponentOfNumericBase(): Node {
    let left = this.parseUnary(); // right-assoc, allows 2^-3X
    for (;;) {
      const t = this.peek();
      if (this.startsFactor(t)) {
        const right = this.parseUnary();
        left = { kind: "mul", left, right };
      } else break;
    }
    return left;
  }

  private parseAtom(): Node {
    const t = this.next();
    if (!t) throw new PowerError("סוף בלתי צפוי של הביטוי");
    if (t.type === "num") return { kind: "num", raw: t.raw };
    if (t.type === "var") return { kind: "var", name: t.name };
    if (t.type === "lparen") {
      const inner = this.parseExpr();
      const close = this.next();
      if (close?.type !== "rparen") throw new PowerError("חסר סוגר )");
      return inner;
    }
    if (t.type === "sqrt") {
      const open = this.next();
      if (open?.type !== "lparen") throw new PowerError("חסר סוגר ( אחרי sqrt");
      const inner = this.parseExpr();
      const close = this.next();
      if (close?.type !== "rparen") throw new PowerError("חסר סוגר ) אחרי sqrt");
      return { kind: "sqrt", value: inner };
    }
    throw new PowerError("ביטוי לא תקין");
  }
}

// ---------------------------------------------------------------------------
// Monomials & polynomials: coeff * product(var^exp), collected into sums.
// ---------------------------------------------------------------------------

interface Monomial {
  coeff: Fraction;
  vars: Map<string, number>;
}

type Polynomial = Monomial[];

function sup(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

function sortedVars(vars: Map<string, number>): [string, number][] {
  return Array.from(vars.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function monomialKey(vars: Map<string, number>): string {
  return sortedVars(vars)
    .map(([name, exp]) => `${name}^${exp}`)
    .join(",");
}

function negateMonomial(m: Monomial): Monomial {
  return { coeff: m.coeff.negate(), vars: m.vars };
}

function isCompound(m: Monomial): boolean {
  const coeffIsFactor = !m.coeff.equalsInt(1) && !m.coeff.equalsInt(-1);
  return m.vars.size + (coeffIsFactor ? 1 : 0) > 1;
}

function formatMonomialInline(m: Monomial): string {
  if (m.coeff.isZero()) return "0";
  const varsPart = sortedVars(m.vars)
    .map(([name, exp]) => (exp === 1 ? name : `${name}^${sup(exp)}`))
    .join("");
  if (varsPart === "") return m.coeff.toString();
  if (m.coeff.equalsInt(1)) return varsPart;
  if (m.coeff.equalsInt(-1)) return `-${varsPart}`;
  const coeffStr = m.coeff.den === 1 ? m.coeff.toString() : `(${m.coeff.toString()})`;
  return `${coeffStr}${varsPart}`;
}

function formatMonomialFraction(m: Monomial): string {
  if (m.coeff.isZero()) return "0";
  const numParts: string[] = [];
  const denParts: string[] = [];
  for (const [name, exp] of sortedVars(m.vars)) {
    if (exp > 0) numParts.push(exp === 1 ? name : `${name}^${exp}`);
    else if (exp < 0) denParts.push(-exp === 1 ? name : `${name}^${-exp}`);
  }
  const sign = m.coeff.num < 0 ? "-" : "";
  const coeffNumAbs = Math.abs(m.coeff.num);
  const coeffDen = m.coeff.den;

  const numStr =
    numParts.length === 0 ? `${coeffNumAbs}` : (coeffNumAbs === 1 ? "" : `${coeffNumAbs}`) + numParts.join("");

  const denFactorCount = (coeffDen !== 1 ? 1 : 0) + denParts.length;
  if (denFactorCount === 0) return `${sign}${numStr}`;
  const denBody = (coeffDen !== 1 ? `${coeffDen}` : "") + denParts.join("");
  const denStr = denFactorCount > 1 ? `(${denBody})` : denBody;
  return `${sign}${numStr}/${denStr}`;
}

/** Degree used only to order terms for display (descending), e.g. x^3 before x^2 before x^-1. */
function totalDegree(m: Monomial): number {
  let d = 0;
  for (const exp of m.vars.values()) d += exp;
  return d;
}

function sortPolynomialForDisplay(p: Polynomial): Polynomial {
  return [...p].sort((a, b) => totalDegree(b) - totalDegree(a) || monomialKey(a.vars).localeCompare(monomialKey(b.vars)));
}

function formatTermSigned(m: Monomial, formatter: (m: Monomial) => string): { sign: "+" | "-"; body: string } {
  const s = formatter(m);
  return s.startsWith("-") ? { sign: "-", body: s.slice(1) } : { sign: "+", body: s };
}

function formatPolynomialWith(p: Polynomial, formatter: (m: Monomial) => string): string {
  if (p.length === 0) return "0";
  const sorted = sortPolynomialForDisplay(p);
  let out = "";
  sorted.forEach((m, i) => {
    const { sign, body } = formatTermSigned(m, formatter);
    if (i === 0) out = sign === "-" ? `-${body}` : body;
    else out += ` ${sign} ${body}`;
  });
  return out;
}

function formatPolynomial(p: Polynomial): string {
  return formatPolynomialWith(p, formatMonomialFraction);
}

function formatPolynomialInline(p: Polynomial): string {
  return formatPolynomialWith(p, formatMonomialInline);
}

/** Collects like terms (same variable signature), summing their coefficients. */
function combineLikeTerms(terms: Monomial[], steps: PowerStep[]): Polynomial {
  const map = new Map<string, Monomial>();
  const order: string[] = [];
  const seen = new Set<string>();
  for (const t of terms) {
    if (t.coeff.isZero()) continue;
    const key = monomialKey(t.vars);
    const existing = map.get(key);
    if (existing) {
      const newCoeff = existing.coeff.add(t.coeff);
      const connector = t.coeff.num < 0 ? "-" : "+";
      const displayT = t.coeff.num < 0 ? formatMonomialInline(negateMonomial(t)) : formatMonomialInline(t);
      steps.push({
        law: "איחוד איברים דומים",
        expr: `${formatMonomialInline(existing)} ${connector} ${displayT} = ${formatMonomialInline({ coeff: newCoeff, vars: existing.vars })}`,
      });
      if (newCoeff.isZero()) map.delete(key);
      else map.set(key, { coeff: newCoeff, vars: existing.vars });
    } else {
      map.set(key, t);
    }
    if (!seen.has(key)) {
      seen.add(key);
      order.push(key);
    }
  }
  return order.filter((k) => map.has(k)).map((k) => map.get(k)!);
}

function multiplyMonomials(a: Monomial, b: Monomial, steps: PowerStep[]): Monomial {
  const vars = new Map(a.vars);
  for (const [name, exp] of b.vars) {
    if (vars.has(name)) {
      const oldExp = vars.get(name)!;
      const newExp = oldExp + exp;
      steps.push({
        law: "כפל בסיסים זהים: aⁿ·aᵐ = aⁿ⁺ᵐ",
        expr: `${name}^${sup(oldExp)} · ${name}^${sup(exp)} = ${name}^(${oldExp}${exp >= 0 ? "+" : ""}${exp}) = ${name}^${sup(newExp)}`,
      });
      if (newExp === 0) {
        vars.delete(name);
        steps.push({ law: "חזקת אפס: a⁰ = 1", expr: `${name}^0 = 1` });
      } else {
        vars.set(name, newExp);
      }
    } else {
      vars.set(name, exp);
    }
  }
  return { coeff: a.coeff.multiply(b.coeff), vars };
}

function divideMonomials(a: Monomial, b: Monomial, steps: PowerStep[]): Monomial {
  const vars = new Map(a.vars);
  for (const [name, exp] of b.vars) {
    const oldExp = vars.has(name) ? vars.get(name)! : 0;
    const newExp = oldExp - exp;
    steps.push({
      law: "חילוק בסיסים זהים: aⁿ:aᵐ = aⁿ⁻ᵐ",
      expr: `${name}^${sup(oldExp)} : ${name}^${sup(exp)} = ${name}^(${oldExp}-${exp >= 0 ? exp : `(${exp})`}) = ${name}^${sup(newExp)}`,
    });
    if (newExp === 0) {
      vars.delete(name);
      steps.push({ law: "חזקת אפס: a⁰ = 1", expr: `${name}^0 = 1` });
    } else {
      vars.set(name, newExp);
    }
  }
  return { coeff: a.coeff.divide(b.coeff), vars };
}

function multiplyPolynomials(pA: Polynomial, pB: Polynomial, steps: PowerStep[]): Polynomial {
  const raw: Monomial[] = [];
  for (const a of pA) for (const b of pB) raw.push(multiplyMonomials(a, b, steps));
  return combineLikeTerms(raw, steps);
}

function applyOuterPower(m: Monomial, exponent: number, steps: PowerStep[]): Monomial {
  if (exponent === 0) {
    if (m.coeff.isZero()) throw new PowerError("הביטוי 0⁰ אינו מוגדר");
    steps.push({ law: "חזקת אפס: a⁰ = 1", expr: `(${formatMonomialInline(m)})^0 = 1` });
    return { coeff: Fraction.ONE, vars: new Map() };
  }

  if (isCompound(m)) {
    const factors = [
      ...(m.coeff.equalsInt(1) || m.coeff.equalsInt(-1) ? [] : [m.coeff.toString()]),
      ...sortedVars(m.vars).map(([name, exp]) => (exp === 1 ? name : `${name}^${sup(exp)}`)),
    ];
    steps.push({
      law: "חזקת מכפלה/מנה: (a·b)ⁿ = aⁿ·bⁿ",
      expr: `(${formatMonomialInline(m)})^${sup(exponent)} = ${factors.map((f) => `(${f})^${sup(exponent)}`).join(" · ")}`,
    });
  }

  const newVars = new Map<string, number>();
  for (const [name, exp] of sortedVars(m.vars)) {
    const newExp = exp * exponent;
    if (exp !== 1) {
      steps.push({
        law: "חזקה של חזקה: (aⁿ)ᵐ = aⁿ·ᵐ",
        expr: `(${name}^${sup(exp)})^${sup(exponent)} = ${name}^(${exp}·${exponent}) = ${name}^${sup(newExp)}`,
      });
    }
    if (newExp !== 0) newVars.set(name, newExp);
    else steps.push({ law: "חזקת אפס: a⁰ = 1", expr: `${name}^0 = 1` });
  }

  return { coeff: m.coeff.pow(exponent), vars: newVars };
}

const MAX_MULTITERM_POWER = 6;

// ---------------------------------------------------------------------------
// Exponential terms: coeff * base^variable (for expressions like 2^(X-4)).
// ---------------------------------------------------------------------------

interface ExponentialTerm {
  coeff: Fraction;
  base: Fraction;
  variable: string;
}

/** A general algebraic expression: a sum of polynomial terms plus a sum of exponential terms. */
interface Expression {
  mono: Polynomial;
  exp: ExponentialTerm[];
}

function monoExpr(m: Monomial): Expression {
  return { mono: [m], exp: [] };
}

function expExpr(e: ExponentialTerm): Expression {
  return { mono: [], exp: [e] };
}

function negateExponential(e: ExponentialTerm): ExponentialTerm {
  return { coeff: e.coeff.negate(), base: e.base, variable: e.variable };
}

function negateExpression(expr: Expression): Expression {
  return { mono: expr.mono.map(negateMonomial), exp: expr.exp.map(negateExponential) };
}

function exponentialKey(e: ExponentialTerm): string {
  return `${e.variable}|${e.base.toString()}`;
}

function formatExponentialTerm(e: ExponentialTerm): string {
  const baseStr = e.base.den === 1 ? e.base.toString() : `(${e.base.toString()})`;
  const powerStr = `${baseStr}^${e.variable}`;
  if (e.coeff.equalsInt(1)) return powerStr;
  if (e.coeff.equalsInt(-1)) return `-${powerStr}`;
  return `${e.coeff.toString()}·${powerStr}`;
}

/** Collects like exponential terms (same base & variable), summing their coefficients. */
function combineLikeExponentials(terms: ExponentialTerm[], steps: PowerStep[]): ExponentialTerm[] {
  const map = new Map<string, ExponentialTerm>();
  const order: string[] = [];
  const seen = new Set<string>();
  for (const t of terms) {
    if (t.coeff.isZero()) continue;
    const key = exponentialKey(t);
    const existing = map.get(key);
    if (existing) {
      const newCoeff = existing.coeff.add(t.coeff);
      const connector = t.coeff.num < 0 ? "-" : "+";
      const displayT = t.coeff.num < 0 ? formatExponentialTerm(negateExponential(t)) : formatExponentialTerm(t);
      steps.push({
        law: "איחוד איברים דומים (מעריכיים)",
        expr: `${formatExponentialTerm(existing)} ${connector} ${displayT} = ${formatExponentialTerm({ coeff: newCoeff, base: existing.base, variable: existing.variable })}`,
      });
      if (newCoeff.isZero()) map.delete(key);
      else map.set(key, { coeff: newCoeff, base: existing.base, variable: existing.variable });
    } else {
      map.set(key, t);
    }
    if (!seen.has(key)) {
      seen.add(key);
      order.push(key);
    }
  }
  return order.filter((k) => map.has(k)).map((k) => map.get(k)!);
}

function formatExpTermSigned(e: ExponentialTerm): { sign: "+" | "-"; body: string } {
  const s = formatExponentialTerm(e);
  return s.startsWith("-") ? { sign: "-", body: s.slice(1) } : { sign: "+", body: s };
}

function formatExpressionWith(expr: Expression, monoFormatter: (m: Monomial) => string): string {
  const parts = [
    ...sortPolynomialForDisplay(expr.mono).map((m) => formatTermSigned(m, monoFormatter)),
    ...expr.exp.map((e) => formatExpTermSigned(e)),
  ];
  if (parts.length === 0) return "0";
  let out = "";
  parts.forEach(({ sign, body }, i) => {
    if (i === 0) out = sign === "-" ? `-${body}` : body;
    else out += ` ${sign} ${body}`;
  });
  return out;
}

function formatExpression(expr: Expression): string {
  return formatExpressionWith(expr, formatMonomialFraction);
}

function formatExpressionInline(expr: Expression): string {
  return formatExpressionWith(expr, formatMonomialInline);
}

function multiplyMonoByExpScalar(m: Monomial, e: ExponentialTerm): ExponentialTerm {
  if (m.vars.size > 0) {
    throw new PowerError("מכפלה של ביטוי עם משתנה רגיל בביטוי מעריכי (כגון x·2^x) אינה נתמכת בכלי זה");
  }
  return { coeff: m.coeff.multiply(e.coeff), base: e.base, variable: e.variable };
}

function multiplyExpByExp(e1: ExponentialTerm, e2: ExponentialTerm, steps: PowerStep[]): ExponentialTerm {
  if (e1.variable !== e2.variable) {
    throw new PowerError("מכפלה של ביטויים מעריכיים עם משתנים שונים אינה נתמכת");
  }
  const newBase = e1.base.multiply(e2.base);
  steps.push({
    law: "חזקת מכפלה באותו מעריך: aˣ·bˣ = (a·b)ˣ",
    expr: `${formatExponentialTerm(e1)} · ${formatExponentialTerm(e2)} = (${e1.base}·${e2.base})^${e1.variable} = ${newBase}^${e1.variable}`,
  });
  return { coeff: e1.coeff.multiply(e2.coeff), base: newBase, variable: e1.variable };
}

/** Multiplies two general expressions, distributing across every mono/exponential term pair. */
function multiplyExpressions(a: Expression, b: Expression, steps: PowerStep[]): Expression {
  const monoPart = multiplyPolynomials(a.mono, b.mono, steps);
  const expParts: ExponentialTerm[] = [];
  for (const e of a.exp) for (const m of b.mono) expParts.push(multiplyMonoByExpScalar(m, e));
  for (const e of b.exp) for (const m of a.mono) expParts.push(multiplyMonoByExpScalar(m, e));
  for (const e1 of a.exp) for (const e2 of b.exp) expParts.push(multiplyExpByExp(e1, e2, steps));
  return { mono: monoPart, exp: combineLikeExponentials(expParts, steps) };
}

function divideExpressions(left: Expression, right: Expression, steps: PowerStep[]): Expression {
  const totalRight = right.mono.length + right.exp.length;
  if (totalRight !== 1) {
    throw new PowerError(
      "חילוק בביטוי עם יותר מאיבר אחד אינו נתמך — ניתן לחלק רק במונום בודד או בביטוי מעריכי בודד, למשל x, 2x^2 או 2^x",
    );
  }
  if (right.mono.length === 1) {
    const divisor = right.mono[0];
    const newMono = combineLikeTerms(
      left.mono.map((t) => divideMonomials(t, divisor, steps)),
      steps,
    );
    if (left.exp.length > 0 && divisor.vars.size > 0) {
      throw new PowerError("חילוק ביטוי מעריכי (כגון 2^x) במשתנה רגיל אינו נתמך");
    }
    const newExp = left.exp.map((e) => ({ coeff: e.coeff.divide(divisor.coeff), base: e.base, variable: e.variable }));
    return { mono: newMono, exp: combineLikeExponentials(newExp, steps) };
  }
  const divisorExp = right.exp[0];
  if (left.mono.length > 0) {
    throw new PowerError("חילוק ביטוי רגיל בביטוי מעריכי (כגון x/2^x) אינו נתמך");
  }
  const newExp = left.exp.map((e) => {
    if (e.variable !== divisorExp.variable) {
      throw new PowerError("חילוק ביטויים מעריכיים עם משתנים שונים אינו נתמך");
    }
    return { coeff: e.coeff.divide(divisorExp.coeff), base: e.base.divide(divisorExp.base), variable: e.variable };
  });
  return { mono: [], exp: combineLikeExponentials(newExp, steps) };
}

function applyOuterPowerToExponential(e: ExponentialTerm, exponent: number, steps: PowerStep[]): ExponentialTerm {
  const newBase = e.base.pow(exponent);
  steps.push({
    law: "חזקה של ביטוי מעריכי: (aˣ)ⁿ = (aⁿ)ˣ",
    expr: `(${e.base}^${e.variable})^${sup(exponent)} = (${e.base}^${sup(exponent)})^${e.variable} = ${newBase}^${e.variable}`,
  });
  return { coeff: e.coeff.pow(exponent), base: newBase, variable: e.variable };
}

/** Expands (a + b + ...)^n for an integer n >= 1 via repeated distribution — works for any mix of terms. */
function applyExpressionPower(base: Expression, exponent: number, steps: PowerStep[]): Expression {
  if (exponent === 0) {
    steps.push({ law: "חזקת אפס: a⁰ = 1", expr: `(${formatExpressionInline(base)})^0 = 1` });
    return monoExpr({ coeff: Fraction.ONE, vars: new Map() });
  }
  if (exponent < 0) {
    throw new PowerError(
      `חזקה שלילית של ביטוי עם יותר מאיבר אחד, כגון (${formatExpressionInline(base)})^${exponent}, אינה נתמכת בכלי זה`,
    );
  }
  if (exponent > MAX_MULTITERM_POWER) {
    throw new PowerError(`חזקה גדולה מדי לביטוי עם יותר מאיבר אחד בכלי זה (המקסימום הוא ${MAX_MULTITERM_POWER})`);
  }
  if (exponent === 1) return base;

  steps.push({
    law: "הרחבת חזקה למכפלה חוזרת: aⁿ = a·a···a",
    expr: `(${formatExpressionInline(base)})^${exponent} = ${Array(exponent).fill(`(${formatExpressionInline(base)})`).join(" · ")}`,
  });
  let result = base;
  for (let i = 1; i < exponent; i++) result = multiplyExpressions(result, base, steps);
  return result;
}

/** Returns the exponent as a plain constant Fraction, or null if it contains a variable. */
function tryConstantExponent(node: Node): Fraction | null {
  if (node.kind === "neg") {
    const inner = tryConstantExponent(node.value);
    return inner === null ? null : inner.negate();
  }
  if (node.kind === "num") return Fraction.fromRaw(node.raw);
  return null;
}

function formatLinearExponent(c: number, k: number, variable: string): string {
  const cPart = c === 1 ? variable : c === -1 ? `-${variable}` : `${c}${variable}`;
  if (k === 0) return cPart;
  return k > 0 ? `${cPart}+${k}` : `${cPart}-${-k}`;
}

/**
 * Exact square roots only: a plain non-negative constant, a monomial whose
 * coefficient and every variable exponent are perfect squares/even (so each
 * exponent can be halved cleanly), or a single exponential term whose
 * coefficient and base are both perfect squares (√(aˣ) = (√a)ˣ). Anything
 * else (a multi-term sum under the root, or an inexact root) is rejected
 * with a clear message rather than silently approximated — staying "מדויק".
 */
function applySqrt(inner: Expression, steps: PowerStep[]): Expression {
  const totalTerms = inner.mono.length + inner.exp.length;
  if (totalTerms === 0) return monoExpr({ coeff: Fraction.ZERO, vars: new Map() });

  if (totalTerms > 1) {
    throw new PowerError(
      "שורש של ביטוי עם יותר מאיבר אחד (כגון √(x+1)) אינו נתמך בכלי זה כביטוי עצמאי — במשוואה מהצורה √A = B ניתן להעלות בריבוע את שני האגפים",
    );
  }

  if (inner.exp.length === 1) {
    const e = inner.exp[0];
    if (e.coeff.num < 0 || e.base.num < 0) throw new PowerError("שורש של מספר שלילי אינו ממשי");
    const coeffRoot = nthRootMagnitude(e.coeff, 2);
    const baseRoot = nthRootMagnitude(e.base, 2);
    if (!coeffRoot.exact || !baseRoot.exact) {
      throw new PowerError(
        `השורש של ${formatExponentialTerm(e)} אינו מדויק (לא כל הגורמים הם ריבועים שלמים) — הכלי תומך רק בשורשים מדויקים`,
      );
    }
    const result: ExponentialTerm = { coeff: coeffRoot.exact, base: baseRoot.exact, variable: e.variable };
    steps.push({ law: "הוצאת שורש: √(aˣ) = (√a)ˣ", expr: `√(${formatExponentialTerm(e)}) = ${formatExponentialTerm(result)}` });
    return expExpr(result);
  }

  const m = inner.mono[0];
  if (m.coeff.num < 0) throw new PowerError("שורש של מספר שלילי אינו ממשי");
  const coeffRoot = nthRootMagnitude(m.coeff, 2);
  const oddExp = Array.from(m.vars.values()).find((exp) => exp % 2 !== 0);
  if (!coeffRoot.exact || oddExp !== undefined) {
    throw new PowerError(
      `השורש של ${formatMonomialInline(m)} אינו מדויק — הכלי תומך רק בשורשים מדויקים (מספרים וחזקות זוגיות בלבד)`,
    );
  }
  const newVars = new Map<string, number>();
  for (const [name, exp] of m.vars) newVars.set(name, exp / 2);
  const result: Monomial = { coeff: coeffRoot.exact, vars: newVars };
  steps.push({ law: "הוצאת שורש: √(aⁿ) = aⁿ⁄²", expr: `√(${formatMonomialInline(m)}) = ${formatMonomialInline(result)}` });
  return monoExpr(result);
}

function simplify(node: Node, steps: PowerStep[]): Expression {
  switch (node.kind) {
    case "num":
      return monoExpr({ coeff: Fraction.fromRaw(node.raw), vars: new Map() });
    case "var":
      return monoExpr({ coeff: Fraction.ONE, vars: new Map([[node.name, 1]]) });
    case "neg":
      return negateExpression(simplify(node.value, steps));
    case "add": {
      const left = simplify(node.left, steps);
      const right = simplify(node.right, steps);
      return {
        mono: combineLikeTerms([...left.mono, ...right.mono], steps),
        exp: combineLikeExponentials([...left.exp, ...right.exp], steps),
      };
    }
    case "sub": {
      const left = simplify(node.left, steps);
      const right = negateExpression(simplify(node.right, steps));
      return {
        mono: combineLikeTerms([...left.mono, ...right.mono], steps),
        exp: combineLikeExponentials([...left.exp, ...right.exp], steps),
      };
    }
    case "mul": {
      const left = simplify(node.left, steps);
      const right = simplify(node.right, steps);
      return multiplyExpressions(left, right, steps);
    }
    case "div": {
      const left = simplify(node.left, steps);
      const right = simplify(node.right, steps);
      return divideExpressions(left, right, steps);
    }
    case "sqrt": {
      const inner = simplify(node.value, steps);
      return applySqrt(inner, steps);
    }
    case "pow": {
      const base = simplify(node.base, steps);
      const constExp = tryConstantExponent(node.exp);

      if (constExp !== null) {
        if (constExp.den !== 1) throw new PowerError("נתמכות רק חזקות שלמות (לא שבריות) — לדוגמה x^3 או x^-2");
        const exponent = constExp.num;
        const totalTerms = base.mono.length + base.exp.length;
        if (totalTerms <= 1) {
          if (base.exp.length === 1) return expExpr(applyOuterPowerToExponential(base.exp[0], exponent, steps));
          const single = base.mono[0] ?? { coeff: Fraction.ZERO, vars: new Map() };
          return monoExpr(applyOuterPower(single, exponent, steps));
        }
        return applyExpressionPower(base, exponent, steps);
      }

      // Exponent contains a variable: only "numeric base ^ linear-in-one-variable" is decomposable.
      if (base.exp.length > 0 || base.mono.length !== 1 || base.mono[0].vars.size !== 0) {
        throw new PowerError(
          "חזקה עם משתנה במעריך נתמכת רק כאשר הבסיס הוא מספר קבוע (כגון 2^(X-4)) — בסיס עם משתנה ומעריך משתני (כגון x^(x+1)) אינו נתמך",
        );
      }
      const a = base.mono[0].coeff;
      const expExpanded = simplify(node.exp, steps);
      if (expExpanded.exp.length > 0) {
        throw new PowerError("מעריך שהוא עצמו ביטוי מעריכי (כגון 2^(3^X)) אינו נתמך");
      }
      const expTerms = expExpanded.mono;
      const badTerm = expTerms.find((t) => t.vars.size > 1 || (t.vars.size === 1 && Array.from(t.vars.values())[0] !== 1));
      if (badTerm) throw new PowerError("נתמך רק מעריך ליניארי במשתנה: a^(c·X+k), למשל 2^(X-4) או 2^(2X+1)");
      const varTermsList = expTerms.filter((t) => t.vars.size === 1);
      if (varTermsList.length > 1) throw new PowerError("נתמך רק מעריך עם משתנה יחיד (לא כמה משתנים שונים)");

      const constTerm = expTerms.find((t) => t.vars.size === 0);
      const varTerm = varTermsList[0];
      const k = constTerm ? constTerm.coeff : Fraction.ZERO;
      const c = varTerm ? varTerm.coeff : Fraction.ZERO;
      const expoVariable = varTerm ? Array.from(varTerm.vars.keys())[0] : null;

      if (c.isZero() || expoVariable === null) {
        if (k.den !== 1) throw new PowerError("נתמכות רק חזקות שלמות (לא שבריות)");
        return monoExpr(applyOuterPower(base.mono[0], k.num, steps));
      }
      if (c.den !== 1 || k.den !== 1) {
        throw new PowerError("נתמכים רק מקדמים שלמים במעריך ליניארי (כגון 2X-4), לא שברים (כגון 1.5X)");
      }

      const newBase = a.pow(c.num);
      const coeff = a.pow(k.num);
      steps.push({
        law: "פירוק מעריך לפי חוקי חזקות: aᶜˣ⁺ᵏ = aᵏ·(aᶜ)ˣ",
        expr: `${a}^(${formatLinearExponent(c.num, k.num, expoVariable)}) = ${a}^${k.num} · (${a}^${c.num})^${expoVariable} = ${formatExponentialTerm({ coeff, base: newBase, variable: expoVariable })}`,
      });
      if (newBase.equalsInt(1)) return monoExpr({ coeff, vars: new Map() });
      return expExpr({ coeff, base: newBase, variable: expoVariable });
    }
  }
}

function parseToExpression(raw: string, steps: PowerStep[]): Expression {
  return simplify(new Parser(tokenize(raw)).parse(), steps);
}

// ---------------------------------------------------------------------------
// n-th roots (exact where possible, otherwise a clearly-marked approximation)
// ---------------------------------------------------------------------------

function integerPow(base: number, exp: number): number {
  let r = 1;
  for (let i = 0; i < exp; i++) {
    r *= base;
    if (!Number.isSafeInteger(r)) return Infinity;
  }
  return r;
}

/** Exact integer n-th root of a non-negative integer, or null if none exists. */
function integerNthRoot(k: number, n: number): number | null {
  if (k === 0) return 0;
  if (!Number.isInteger(k) || k < 0) return null;
  const guess = Math.round(Math.pow(k, 1 / n));
  for (const cand of [guess - 1, guess, guess + 1, guess + 2]) {
    if (cand >= 0 && integerPow(cand, n) === k) return cand;
  }
  return null;
}

function formatApprox(v: number): string {
  const rounded = Math.round(v * 1e8) / 1e8;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

/** Magnitude of the n-th root of a non-negative fraction: exact if possible. */
function nthRootMagnitude(fr: Fraction, n: number): { exact: Fraction | null; approx: number } {
  const numRoot = integerNthRoot(fr.num, n);
  const denRoot = integerNthRoot(fr.den, n);
  if (numRoot !== null && denRoot !== null) {
    return { exact: Fraction.of(numRoot, denRoot), approx: numRoot / denRoot };
  }
  return { exact: null, approx: Math.pow(fr.num / fr.den, 1 / n) };
}

/**
 * Solves x^n = rhs for real x. The result is expressed as a single symbolic
 * value string — "±3" for an even root with two solutions, "2" for a unique
 * one — so callers never need to join multiple solutions with a Hebrew "or"
 * (embedding an RTL word inside an LTR math string corrupts its rendering
 * under the Unicode bidi algorithm). `count` tells the caller how many real
 * solutions that value string represents.
 */
function solveNthRoot(rhs: Fraction, n: number): { value: string; count: 0 | 1 | 2; approx: boolean } {
  if (n % 2 === 0) {
    if (rhs.num < 0) return { value: "", count: 0, approx: false };
    const { exact, approx } = nthRootMagnitude(rhs, n);
    const magnitude = exact ? exact.toString() : formatApprox(approx);
    const isZero = exact ? exact.isZero() : approx === 0;
    return isZero
      ? { value: "0", count: 1, approx: !exact }
      : { value: `±${magnitude}`, count: 2, approx: !exact };
  }
  const sign = rhs.num < 0 ? -1 : 1;
  const magnitudeFraction = Fraction.of(Math.abs(rhs.num), rhs.den);
  const { exact, approx } = nthRootMagnitude(magnitudeFraction, n);
  if (exact) {
    const str = exact.isZero() || sign > 0 ? exact.toString() : `-${exact.toString()}`;
    return { value: str, count: 1, approx: false };
  }
  return { value: formatApprox(approx * sign), count: 1, approx: true };
}

function detectVariable(input: string): string {
  const match = input.match(/[a-zA-Z]/);
  return match ? match[0] : "x";
}

// ---------------------------------------------------------------------------
// Numeric fallback: bounded multi-seed Newton-Raphson.
// ---------------------------------------------------------------------------

function collectVariables(expr: Expression): Set<string> {
  const set = new Set<string>();
  for (const m of expr.mono) for (const name of m.vars.keys()) set.add(name);
  for (const e of expr.exp) set.add(e.variable);
  return set;
}

function evalExpressionAt(expr: Expression, x: number): number {
  let sum = 0;
  for (const m of expr.mono) {
    let term = m.coeff.toNumber();
    for (const exp of m.vars.values()) term *= Math.pow(x, exp);
    sum += term;
  }
  for (const e of expr.exp) sum += e.coeff.toNumber() * Math.pow(e.base.toNumber(), x);
  return sum;
}

/** Bounded multi-seed Newton-Raphson with a numerical derivative; returns deduped, sorted roots. */
function newtonRaphsonRoots(f: (x: number) => number, seeds: number[], minValue?: number): number[] {
  const found: number[] = [];
  const h = 1e-6;
  for (const seed of seeds) {
    let x = seed;
    let converged = false;
    for (let iter = 0; iter < 80; iter++) {
      const fx = f(x);
      if (!Number.isFinite(fx)) break;
      const deriv = (f(x + h) - f(x - h)) / (2 * h);
      if (!Number.isFinite(deriv) || Math.abs(deriv) < 1e-12) break;
      const next = x - fx / deriv;
      if (!Number.isFinite(next)) break;
      if (Math.abs(next - x) < 1e-10) {
        x = next;
        converged = true;
        break;
      }
      x = next;
    }
    if (converged && Math.abs(f(x)) < 1e-6 && (minValue === undefined || x > minValue)) found.push(x);
  }
  const rounded = found.map((r) => Math.round(r * 1e7) / 1e7);
  return Array.from(new Set(rounded)).sort((a, b) => a - b);
}

/** Snaps a numeric result to a clean integer/small-fraction string when very close to one. */
function snapToNiceValue(v: number): { str: string; exact: boolean } {
  const rounded = Math.round(v);
  if (Math.abs(v - rounded) < 1e-6) return { str: `${rounded}`, exact: true };
  for (let den = 2; den <= 12; den++) {
    const num = Math.round(v * den);
    if (Math.abs(v - num / den) < 1e-6) {
      const g = gcd(num, den);
      return { str: `${num / g}/${den / g}`, exact: true };
    }
  }
  return { str: formatApprox(v), exact: false };
}

/** Searches for an integer p with base^p === rhs exactly. */
function exactLogSearch(base: Fraction, rhs: Fraction): number | null {
  for (let p = -10; p <= 10; p++) {
    if (base.pow(p).toString() === rhs.toString()) return p;
  }
  return null;
}

/** Finds a base b such that every given base is an exact integer power of b (for t = b^X substitution). */
function findCommonRootBase(bases: Fraction[]): { base: Fraction; powers: number[] } | null {
  const distinct = Array.from(new Map(bases.map((b) => [b.toString(), b])).values());
  for (const candidate of distinct) {
    if (candidate.num <= 0 || candidate.equalsInt(1)) continue;
    const powers: number[] = [];
    let ok = true;
    for (const b of bases) {
      let found: number | null = null;
      for (let p = -6; p <= 6; p++) {
        if (p === 0) continue;
        if (candidate.pow(p).toString() === b.toString()) {
          found = p;
          break;
        }
      }
      if (found === null) {
        ok = false;
        break;
      }
      powers.push(found);
    }
    if (ok) return { base: candidate, powers };
  }
  return null;
}

interface RootResult {
  numeric: number;
  str: string;
  exact: boolean;
  fraction?: Fraction;
}

/** Quadratic formula at^2 + bt + c = 0, exact when the discriminant is a perfect square. */
function solveQuadratic(a: Fraction, b: Fraction, c: Fraction): RootResult[] {
  const discriminant = b.multiply(b).add(a.multiply(c).multiply(Fraction.of(-4, 1)));
  if (discriminant.num < 0) return [];
  const twoA = a.multiply(Fraction.of(2, 1));
  const { exact, approx } = nthRootMagnitude(discriminant, 2);
  if (exact) {
    const r1 = b.negate().add(exact).divide(twoA);
    const r2 = b.negate().add(exact.negate()).divide(twoA);
    return [
      { numeric: r1.toNumber(), str: r1.toString(), exact: true, fraction: r1 },
      { numeric: r2.toNumber(), str: r2.toString(), exact: true, fraction: r2 },
    ];
  }
  const bNum = b.toNumber();
  const twoANum = twoA.toNumber();
  const r1 = (-bNum + approx) / twoANum;
  const r2 = (-bNum - approx) / twoANum;
  return [
    { numeric: r1, str: formatApprox(r1), exact: false },
    { numeric: r2, str: formatApprox(r2), exact: false },
  ];
}

/** Renders a coefficient map (power -> Fraction) as a polynomial in "t", reusing the monomial formatter. */
function formatTPolynomial(coeffs: Map<number, Fraction>): string {
  const terms: Monomial[] = [];
  for (const [p, c] of coeffs) {
    if (c.isZero()) continue;
    terms.push({ coeff: c, vars: p === 0 ? new Map() : new Map([["t", p]]) });
  }
  return `${formatPolynomialInline(terms)} = 0`;
}

// ---------------------------------------------------------------------------
// Equation solving
// ---------------------------------------------------------------------------

// NOTE: `headline` and every step `expr` are rendered in a dir="ltr" element,
// so they must stay pure math (numbers, variables, =, ±, ≈, ⇒, ∀, ∅, and the
// neutral "," separator) with no embedded Hebrew words — mixing scripts
// inside a direction-forced string gets visually scrambled by the Unicode
// bidi algorithm. All Hebrew explanation goes in `note`, an RTL paragraph.

function numericFallbackSolve(
  original: string,
  combined: Expression,
  variable: string,
  steps: PowerStep[],
): PowerSolveResult {
  const f = (x: number) => evalExpressionAt(combined, x);
  const seeds = [-20, -10, -5, -3, -2, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3, 5, 10, 20];
  const roots = newtonRaphsonRoots(f, seeds);

  if (roots.length === 0) {
    return {
      type: "result",
      headline: `${original}  ⇒  ${formatExpression(combined)} = 0`,
      note: "לא נמצא פתרון ממשי בטווח החיפוש של השיטה הנומרית (ניוטון-רפסון)",
      steps,
    };
  }

  const snapped = roots.map((r) => snapToNiceValue(r));
  const anyApprox = snapped.some((s) => !s.exact);
  const eq = anyApprox ? "≈" : "=";
  const values = snapped.map((s) => s.str);
  steps.push({
    law: "שיטה נומרית: ניוטון-רפסון",
    expr: `${formatExpression(combined)} = 0  ⇒  ${variable} ${eq} ${values.join(" , ")}`,
  });
  const headlineValue = values.map((v) => `${variable} ${eq} ${v}`).join(" , ");
  return {
    type: "result",
    headline: `${original}  ⇒  ${headlineValue}`,
    note: "לא נמצא פתרון אנליטי מדויק — נעשה שימוש בשיטה נומרית (ניוטון-רפסון) לאיתור הפתרון",
    steps,
  };
}

function solvePureExponentialEquation(
  original: string,
  combined: Expression,
  theVar: string,
  constantValue: Fraction,
  steps: PowerStep[],
): PowerSolveResult {
  const simplifiedForm = `${formatExpression(combined)} = 0`;

  if (combined.exp.length === 1) {
    const e = combined.exp[0];
    const rhs = constantValue.negate().divide(e.coeff);
    steps.push({ law: "בידוד הביטוי המעריכי", expr: `${simplifiedForm}  ⇒  ${e.base}^${theVar} = ${rhs.toString()}` });

    if (rhs.num <= 0 || e.base.num <= 0 || e.base.equalsInt(1)) {
      steps.push({ law: "לוגריתם", expr: `${e.base}^${theVar} = ${rhs.toString()}  ⇒  ∅` });
      return {
        type: "result",
        headline: `${original}  ⇒  ∅`,
        note: "אין פתרון ממשי (בסיס לא חיובי/שווה ל-1, או שהביטוי שווה למספר לא חיובי)",
        steps,
      };
    }

    const exact = exactLogSearch(e.base, rhs);
    if (exact !== null) {
      steps.push({
        law: "השוואת מעריכים",
        expr: `${e.base}^${theVar} = ${rhs.toString()} = ${e.base}^${exact}  ⇒  ${theVar} = ${exact}`,
      });
      return { type: "result", headline: `${original}  ⇒  ${theVar} = ${exact}`, steps };
    }

    const approxX = Math.log(rhs.toNumber()) / Math.log(e.base.toNumber());
    const approxStr = formatApprox(approxX);
    steps.push({
      law: "לוגריתם",
      expr: `${e.base}^${theVar} = ${rhs.toString()}  ⇒  ${theVar} = log(${rhs.toString()})/log(${e.base.toString()}) ≈ ${approxStr}`,
    });
    return {
      type: "result",
      headline: `${original}  ⇒  ${theVar} ≈ ${approxStr}`,
      note: "אין פתרון מדויק — הערך מוצג בקירוב (באמצעות לוגריתם)",
      steps,
    };
  }

  // Two or more exponential terms: try substitution t = b^X.
  const bases = combined.exp.map((e) => e.base);
  const commonRoot = findCommonRootBase(bases);
  if (!commonRoot) return numericFallbackSolve(original, combined, theVar, steps);

  const { base: rootBase, powers } = commonRoot;
  steps.push({ law: "הצבה", expr: `t = ${rootBase}^${theVar}` });

  const tCoeffs = new Map<number, Fraction>();
  tCoeffs.set(0, constantValue);
  combined.exp.forEach((e, i) => {
    const p = powers[i];
    tCoeffs.set(p, (tCoeffs.get(p) ?? Fraction.ZERO).add(e.coeff));
  });
  const minPower = Math.min(...tCoeffs.keys());
  const shifted = new Map<number, Fraction>();
  for (const [p, c] of tCoeffs) shifted.set(p - minPower, c);
  const degree = Math.max(...shifted.keys());
  steps.push({ law: "משוואה בעזרת ההצבה", expr: formatTPolynomial(shifted) });

  let tRoots: RootResult[] = [];
  if (degree <= 1) {
    const c1 = shifted.get(1) ?? Fraction.ZERO;
    const c0 = shifted.get(0) ?? Fraction.ZERO;
    if (!c1.isZero()) {
      const r = c0.negate().divide(c1);
      tRoots = [{ numeric: r.toNumber(), str: r.toString(), exact: true, fraction: r }];
    }
  } else if (degree === 2) {
    tRoots = solveQuadratic(shifted.get(2) ?? Fraction.ZERO, shifted.get(1) ?? Fraction.ZERO, shifted.get(0) ?? Fraction.ZERO);
  } else if (degree <= 8) {
    const f = (t: number) => {
      let s = 0;
      for (const [p, c] of shifted) s += c.toNumber() * Math.pow(t, p);
      return s;
    };
    const seeds = [0.01, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 8, 13, 21, 50, 100];
    tRoots = newtonRaphsonRoots(f, seeds, 0).map((n) => ({ numeric: n, str: formatApprox(n), exact: false }));
  } else {
    return numericFallbackSolve(original, combined, theVar, steps);
  }

  const positiveRoots = tRoots.filter((r) => r.numeric > 1e-9);
  if (positiveRoots.length === 0) {
    steps.push({ law: "בדיקת תחום", expr: `t > 0  ⇒  ∅` });
    return {
      type: "result",
      headline: `${original}  ⇒  ∅`,
      note: "אין פתרון ממשי: אף שורש של t אינו חיובי (וחייב שיהיה t=בסיס^משתנה>0)",
      steps,
    };
  }

  const rootBaseNum = rootBase.toNumber();
  const xSolutions: string[] = [];
  let anyApprox = false;
  for (const r of positiveRoots) {
    if (r.fraction) {
      const exactP = exactLogSearch(rootBase, r.fraction);
      if (exactP !== null) {
        xSolutions.push(`${exactP}`);
        continue;
      }
    }
    const snapped = snapToNiceValue(Math.log(r.numeric) / Math.log(rootBaseNum));
    xSolutions.push(snapped.str);
    if (!snapped.exact) anyApprox = true;
  }

  const eq = anyApprox ? "≈" : "=";
  steps.push({
    law: "הצבה חוזרת: t = בסיס^משתנה",
    expr: `t = ${positiveRoots.map((r) => r.str).join(" , ")}  ⇒  ${theVar} ${eq} ${xSolutions.join(" , ")}`,
  });
  const headlineValue = xSolutions.map((s) => `${theVar} ${eq} ${s}`).join(" , ");
  return {
    type: "result",
    headline: `${original}  ⇒  ${headlineValue}`,
    note: anyApprox ? "אין פתרון מדויק לכל האיברים — חלק מהערכים מוצגים בקירוב" : undefined,
    steps,
  };
}

function solveCombinedEquation(
  original: string,
  combined: Expression,
  variable: string,
  steps: PowerStep[],
): PowerSolveResult {
  if (combined.mono.length === 0 && combined.exp.length === 0) {
    return {
      type: "result",
      headline: `${original}  ⇒  ∀${variable}`,
      note: `המשוואה נכונה עבור כל ערך של ${variable} (זהות)`,
      steps,
    };
  }

  if (combined.exp.length === 0) {
    // Pure polynomial equation.
    const mono = combined.mono;
    const constantTerm = mono.find((t) => t.vars.size === 0);
    const constantValue = constantTerm ? constantTerm.coeff : Fraction.ZERO;
    const varTerms = mono.filter((t) => t.vars.size > 0);
    const simplifiedEquationStr = `${formatPolynomial(mono)} = 0`;

    if (varTerms.length === 0) {
      return constantValue.isZero()
        ? {
            type: "result",
            headline: `${original}  ⇒  ∀${variable}`,
            note: `המשוואה נכונה עבור כל ערך של ${variable} (זהות)`,
            steps,
          }
        : {
            type: "result",
            headline: `${original}  ⇒  ∅`,
            note: `אין פתרון: ${simplifiedEquationStr} היא סתירה (${constantValue.toString()} ≠ 0)`,
            steps,
          };
    }

    if (varTerms.length === 1 && varTerms[0].vars.size === 1) {
      const [[name, exponent]] = Array.from(varTerms[0].vars.entries());
      const coeff = varTerms[0].coeff;

      steps.push({
        law: "בידוד המשתנה",
        expr: `${simplifiedEquationStr}  ⇒  ${formatMonomialInline({ coeff, vars: new Map([[name, exponent]]) })} = ${constantValue.negate().toString()}`,
      });

      let rhs = constantValue.negate().divide(coeff);
      let effExponent = exponent;

      if (effExponent < 0) {
        if (rhs.isZero()) throw new PowerError(`אין פתרון: ${name}^${effExponent} לא יכול להיות אפס`);
        const flipped = Fraction.ONE.divide(rhs);
        steps.push({
          law: "חזקה שלילית: a⁻ⁿ = 1/aⁿ",
          expr: `${name}^${sup(effExponent)} = ${rhs.toString()}  ⇒  ${name}^${-effExponent} = ${flipped.toString()}`,
        });
        rhs = flipped;
        effExponent = -effExponent;
      }

      if (effExponent === 1) {
        steps.push({ law: "פתרון", expr: `${name} = ${rhs.toString()}` });
        return { type: "result", headline: `${original}  ⇒  ${name} = ${rhs.toString()}`, steps };
      }

      const { value, count, approx } = solveNthRoot(rhs, effExponent);
      const rootLaw = effExponent === 2 ? "הוצאת שורש ריבועי" : `הוצאת שורש מסדר ${effExponent}`;

      if (count === 0) {
        steps.push({ law: rootLaw, expr: `${name}^${effExponent} = ${rhs.toString()}  ⇒  ∅` });
        return {
          type: "result",
          headline: `${original}  ⇒  ∅`,
          note: `אין פתרון ממשי: לא ניתן להוציא שורש ${effExponent === 2 ? "ריבועי" : `מסדר ${effExponent}`} ממספר שלילי`,
          steps,
        };
      }

      const eq = approx ? "≈" : "=";
      steps.push({ law: rootLaw, expr: `${name}^${effExponent} = ${rhs.toString()}  ⇒  ${name} ${eq} ${value}` });
      return {
        type: "result",
        headline: `${original}  ⇒  ${name} ${eq} ${value}`,
        note: approx ? "אין שורש מדויק — הערך מוצג בקירוב" : undefined,
        steps,
      };
    }

    return {
      type: "result",
      headline: `${original}  ⇒  ${simplifiedEquationStr}`,
      note: "הביטוי פושט במלואו, אך יש בו יותר מחזקה אחת של המשתנה (או יותר ממשתנה אחד) — לא ניתן לבודד אוטומטית בכלי זה",
      steps,
    };
  }

  // Expression contains at least one exponential term.
  const variables = collectVariables(combined);
  const simplifiedForm = `${formatExpression(combined)} = 0`;
  if (variables.size > 1) {
    return {
      type: "result",
      headline: `${original}  ⇒  ${simplifiedForm}`,
      note: "יש בביטוי יותר ממשתנה אחד — לא ניתן לבודד אוטומטית בכלי זה",
      steps,
    };
  }

  const theVar = variables.values().next().value ?? variable;
  const monoVarTerms = combined.mono.filter((t) => t.vars.size > 0);
  const constantTerm = combined.mono.find((t) => t.vars.size === 0);
  const constantValue = constantTerm ? constantTerm.coeff : Fraction.ZERO;

  if (monoVarTerms.length > 0) {
    // Genuinely mixed polynomial + exponential equation — no clean analytic path.
    return numericFallbackSolve(original, combined, theVar, steps);
  }

  return solvePureExponentialEquation(original, combined, theVar, constantValue, steps);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * If `side` (trimmed) is entirely wrapped by a single "sqrt(...)" or "√(...)"
 * — i.e. that call is the whole side, not just part of it — returns its
 * inner text. Returns null for anything else (including "sqrt(x)+1", where
 * the root is only part of the side).
 */
function unwrapSqrt(side: string): string | null {
  const trimmed = side.trim();
  const prefix = trimmed.toLowerCase().startsWith("sqrt(") ? "sqrt(" : trimmed.startsWith("√(") ? "√(" : null;
  if (!prefix || !trimmed.endsWith(")")) return null;
  let depth = 0;
  for (let i = prefix.length - 1; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i === trimmed.length - 1 ? trimmed.slice(prefix.length, -1) : null;
    }
  }
  return null;
}

/**
 * Fully simplifies an exponent/algebra expression ("x^2 * x^3 + x^4" ->
 * "x^5 + x^4", "2^(X-4)" -> "(1/16)*2^X") or, if it contains a single "=",
 * solves the equation. An equation with one side entirely under a square
 * root ("sqrt(3^X) = 9") is solved by squaring both sides — after checking a
 * constant bound can't be negative (a root is never negative, so that would
 * mean no solution) — and reusing the normal equation pipeline.
 */
export function solvePowerExpression(input: string): PowerSolveResult {
  const trimmed = input.trim();
  if (!trimmed) return { type: "error", message: "נא להזין ביטוי חזקות" };

  const equalsCount = (trimmed.match(/=/g) ?? []).length;
  if (equalsCount > 1) return { type: "error", message: "נתמך רק סימן שוויון (=) אחד" };

  try {
    if (equalsCount === 1) {
      const [leftRaw, rightRaw] = trimmed.split("=");
      if (!leftRaw.trim() || !rightRaw.trim()) throw new PowerError("חסר ביטוי באחד מאגפי המשוואה");
      const steps: PowerStep[] = [];

      let effLeftRaw = leftRaw;
      let effRightRaw = rightRaw;
      let sqrtCaveat: string | undefined;

      const leftInner = unwrapSqrt(leftRaw);
      const rightInner = unwrapSqrt(rightRaw);

      if (leftInner !== null && rightInner !== null) {
        // √A = √B  ⇔  A = B (no squaring needed, so no extraneous roots).
        steps.push({ law: "השוואת שורשים: √A = √B ⇒ A = B", expr: `${leftInner} = ${rightInner}` });
        effLeftRaw = leftInner;
        effRightRaw = rightInner;
      } else if (leftInner !== null || rightInner !== null) {
        const [rootInner, boundRaw, boundIsLeft] = leftInner !== null ? [leftInner, rightRaw, false] : [rightInner!, leftRaw, true];
        const boundExpr = parseToExpression(boundRaw, []);
        const boundIsPlainConstant = boundExpr.exp.length === 0 && boundExpr.mono.length <= 1 && (boundExpr.mono.length === 0 || boundExpr.mono[0].vars.size === 0);
        if (boundIsPlainConstant) {
          const boundValue = boundExpr.mono.length === 0 ? Fraction.ZERO : boundExpr.mono[0].coeff;
          if (boundValue.num < 0) {
            return { type: "result", headline: `${trimmed}  ⇒  ∅`, note: "אין פתרון: שורש (√) אינו יכול להיות שלילי", steps: [] };
          }
        } else {
          sqrtCaveat = "העלאה בריבוע של שני האגפים עלולה להוסיף פתרונות פיקטיביים — יש לוודא שהאגף שאינו מתחת לשורש אינו שלילי בכל פתרון שנמצא";
        }
        steps.push({
          law: "העלאה בריבוע של שני האגפים: √A = B ⇒ A = B²",
          expr: `${rootInner} = (${boundRaw.trim()})^2`,
        });
        effLeftRaw = boundIsLeft ? `(${boundRaw})^2` : rootInner;
        effRightRaw = boundIsLeft ? rootInner : `(${boundRaw})^2`;
      }

      const leftExpr = parseToExpression(effLeftRaw, steps);
      const rightExpr = negateExpression(parseToExpression(effRightRaw, steps));
      const combined: Expression = {
        mono: combineLikeTerms([...leftExpr.mono, ...rightExpr.mono], steps),
        exp: combineLikeExponentials([...leftExpr.exp, ...rightExpr.exp], steps),
      };
      const variable = detectVariable(trimmed);
      const result = solveCombinedEquation(trimmed, combined, variable, steps);
      if (sqrtCaveat && result.type === "result") {
        return { ...result, note: result.note ? `${result.note}. ${sqrtCaveat}` : sqrtCaveat };
      }
      return result;
    }

    const steps: PowerStep[] = [];
    const expr = parseToExpression(trimmed, steps);
    const inlineForm = formatExpressionInline(expr);
    const fractionForm = formatExpression(expr);
    if (inlineForm !== fractionForm) {
      steps.push({ law: "חזקה שלילית: a⁻ⁿ = 1/aⁿ", expr: `${inlineForm} = ${fractionForm}` });
    }
    return { type: "result", headline: `${trimmed} = ${fractionForm}`, steps };
  } catch (err) {
    return {
      type: "error",
      message: err instanceof PowerError ? err.message : "שגיאה בפישוט הביטוי",
    };
  }
}
