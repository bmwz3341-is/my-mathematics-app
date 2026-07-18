/**
 * Small multivariate polynomial ("Sym") engine shared by solvers that need to
 * treat a letter in the input as an algebraic parameter instead of a number
 * (e.g. "2a" as an integration bound, or "m" as a coefficient in an equation).
 * Every coefficient is bucketed by the set of variable letters it carries and
 * their integer exponents; arithmetic just merges/multiplies those buckets.
 */

export interface SymTerm {
  vars: Record<string, number>;
  coeff: number;
}

export type Sym = SymTerm[];

const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
};

export function supNum(n: number): string {
  return String(n).split("").map((c) => SUPERSCRIPTS[c] ?? c).join("");
}

function monoKey(vars: Record<string, number>): string {
  return Object.keys(vars)
    .filter((k) => vars[k] !== 0)
    .sort()
    .map((k) => `${k}^${vars[k]}`)
    .join("*");
}

export function symConst(n: number): Sym {
  return n === 0 ? [] : [{ vars: {}, coeff: n }];
}

export function symParam(name: string): Sym {
  return [{ vars: { [name]: 1 }, coeff: 1 }];
}

function mergeInto(list: SymTerm[], term: SymTerm) {
  if (term.coeff === 0) return;
  const key = monoKey(term.vars);
  const existing = list.find((t) => monoKey(t.vars) === key);
  if (existing) existing.coeff += term.coeff;
  else list.push({ vars: { ...term.vars }, coeff: term.coeff });
}

export function symAdd(s1: Sym, s2: Sym): Sym {
  const out: SymTerm[] = s1.map((t) => ({ vars: { ...t.vars }, coeff: t.coeff }));
  for (const t of s2) mergeInto(out, t);
  return out.filter((t) => Math.abs(t.coeff) > 1e-9);
}

export function symNeg(s: Sym): Sym {
  return s.map((t) => ({ vars: { ...t.vars }, coeff: -t.coeff }));
}

export function symSub(s1: Sym, s2: Sym): Sym {
  return symAdd(s1, symNeg(s2));
}

export function symScale(s: Sym, k: number): Sym {
  if (k === 0) return [];
  return s.map((t) => ({ vars: { ...t.vars }, coeff: t.coeff * k })).filter((t) => Math.abs(t.coeff) > 1e-9);
}

export function symMul(s1: Sym, s2: Sym): Sym {
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

export function symPow(s: Sym, n: number): Sym {
  let result = symConst(1);
  for (let i = 0; i < n; i++) result = symMul(result, s);
  return result;
}

export function symIsZero(s: Sym): boolean {
  return s.length === 0;
}

export function symIsPureConst(s: Sym): boolean {
  return s.every((t) => Object.keys(t.vars).length === 0);
}

export function symHasParams(s: Sym): boolean {
  return s.some((t) => Object.keys(t.vars).length > 0);
}

export function symConstValue(s: Sym): number {
  return s.reduce((acc, t) => acc + (Object.keys(t.vars).length === 0 ? t.coeff : 0), 0);
}

/** Every distinct variable letter appearing anywhere in the polynomial. */
export function symVariables(s: Sym): string[] {
  const names = new Set<string>();
  for (const t of s) for (const k of Object.keys(t.vars)) if (t.vars[k] !== 0) names.add(k);
  return [...names];
}

export function formatStepNumber(n: number): string {
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

export function formatSym(s: Sym): string {
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

/** Formats one bucket's coefficient attached to its power label, e.g. "3", "(m - 1)x", "-x²". */
function formatCoefPart(coefSym: Sym, label: string, isConst: boolean): string | null {
  if (symIsZero(coefSym)) return null;
  if (isConst) return formatSym(coefSym);
  if (symIsPureConst(coefSym)) {
    const k = symConstValue(coefSym);
    return k === 1 ? label : k === -1 ? `-${label}` : `${formatStepNumber(k)}${label}`;
  }
  const inner = formatSym(coefSym);
  return coefSym.length > 1 ? `(${inner})${label}` : `${inner}${label}`;
}

/** Formats a full polynomial in `variable` (any degree), e.g. "3x² - mx + 5". */
export function formatPolyInVar(sym: Sym, variable: string): string {
  const buckets = new Map<number, SymTerm[]>();
  for (const t of sym) {
    const p = t.vars[variable] ?? 0;
    const restVars = { ...t.vars };
    delete restVars[variable];
    const list = buckets.get(p) ?? [];
    list.push({ vars: restVars, coeff: t.coeff });
    buckets.set(p, list);
  }
  const powers = [...buckets.keys()].sort((p, q) => q - p);
  const parts: string[] = [];
  for (const p of powers) {
    const coefSym = (buckets.get(p) ?? []).filter((t) => Math.abs(t.coeff) > 1e-9);
    const label = p === 0 ? "" : p === 1 ? variable : `${variable}${supNum(p)}`;
    const text = formatCoefPart(coefSym, label, p === 0);
    if (text) parts.push(text);
  }
  if (parts.length === 0) return "0";
  let out = "";
  parts.forEach((p, i) => {
    const { sign, rest } = splitLeadSign(p);
    if (i === 0) out = sign === "-" ? `-${rest}` : rest;
    else out += ` ${sign} ${rest}`;
  });
  return out;
}

/** Splits sym's terms by `variable`'s exponent: bucket 2 = a, 1 = b, 0 = c (quadratic-shaped). */
export function bucketByVar(sym: Sym, variable: string): { a: Sym; b: Sym; c: Sym; maxDeg: number } {
  const buckets = new Map<number, SymTerm[]>();
  for (const t of sym) {
    const p = t.vars[variable] ?? 0;
    const restVars = { ...t.vars };
    delete restVars[variable];
    const list = buckets.get(p) ?? [];
    list.push({ vars: restVars, coeff: t.coeff });
    buckets.set(p, list);
  }
  let maxDeg = 0;
  for (const k of buckets.keys()) maxDeg = Math.max(maxDeg, k);
  const getBucket = (p: number): Sym => (buckets.get(p) ?? []).filter((t) => Math.abs(t.coeff) > 1e-9);
  return { a: getBucket(2), b: getBucket(1), c: getBucket(0), maxDeg };
}

/**
 * Numeric coefficients of `sym` as a single-variable polynomial in `variable`
 * (coeffs[i] = coefficient of variable^i). Throws if any bucket still carries
 * a second free letter (i.e. `sym` isn't really single-variable).
 */
export function polyCoefficients(sym: Sym, variable: string): number[] {
  let maxDeg = 0;
  const buckets = new Map<number, number>();
  for (const t of sym) {
    const p = t.vars[variable] ?? 0;
    const rest = { ...t.vars };
    delete rest[variable];
    if (Object.keys(rest).length > 0) {
      throw new Error("הביטוי מכיל יותר מפרמטר חופשי אחד");
    }
    buckets.set(p, (buckets.get(p) ?? 0) + t.coeff);
    maxDeg = Math.max(maxDeg, p);
  }
  const coeffs = new Array(maxDeg + 1).fill(0);
  for (const [p, c] of buckets) coeffs[p] = c;
  return coeffs;
}

/** Real roots of coeffs[0] + coeffs[1]*x + coeffs[2]*x^2 + ... = 0. */
export function solveRealPolynomial(coeffs: number[]): number[] {
  const c = [...coeffs];
  while (c.length > 1 && Math.abs(c[c.length - 1]) < 1e-9) c.pop();
  const degree = c.length - 1;
  if (degree <= 0) return [];
  if (degree === 1) return [-c[0] / c[1]];
  if (degree === 2) {
    const [c0, c1, c2] = c;
    const disc = c1 * c1 - 4 * c2 * c0;
    if (disc < -1e-9) return [];
    if (Math.abs(disc) <= 1e-9) return [-c1 / (2 * c2)];
    const sq = Math.sqrt(disc);
    return [(-c1 + sq) / (2 * c2), (-c1 - sq) / (2 * c2)].sort((x, y) => x - y);
  }

  // degree >= 3: scan for sign changes and refine each by bisection.
  const evalP = (x: number) => c.reduce((s, coef, i) => s + coef * Math.pow(x, i), 0);
  const lo = -200;
  const hi = 200;
  const step = 0.05;
  const roots: number[] = [];
  let prevX = lo;
  let prevY = evalP(lo);
  for (let x = lo + step; x <= hi; x += step) {
    const y = evalP(x);
    if ((prevY < 0 && y > 0) || (prevY > 0 && y < 0)) {
      let left = prevX;
      let right = x;
      const leftNeg = evalP(left) < 0;
      for (let i = 0; i < 60; i++) {
        const mid = (left + right) / 2;
        if ((evalP(mid) < 0) === leftNeg) left = mid;
        else right = mid;
      }
      roots.push((left + right) / 2);
    }
    prevX = x;
    prevY = y;
  }
  const dedup: number[] = [];
  for (const r of roots.sort((x, y) => x - y)) {
    if (dedup.length === 0 || Math.abs(dedup[dedup.length - 1] - r) > 1e-4) dedup.push(r);
  }
  return dedup;
}

/** Evaluates a single-variable polynomial Sym numerically at variable = value. */
export function evalSymSingleVar(sym: Sym, variable: string, value: number): number {
  return sym.reduce((sum, t) => {
    const rest = { ...t.vars };
    const p = rest[variable] ?? 0;
    delete rest[variable];
    if (Object.keys(rest).length > 0) {
      throw new Error("הביטוי מכיל יותר מפרמטר חופשי אחד");
    }
    return sum + t.coeff * Math.pow(value, p);
  }, 0);
}

/**
 * Symbolic derivative of `sym` with respect to `variable`, via the power rule
 * applied monomial-by-monomial (the sum/difference rule falls out for free by
 * iterating every term independently). Any other letter inside a monomial —
 * a parameter such as `a` or `k` — is left untouched, exactly like a numeric
 * coefficient would be: d/dx(a*x^3) = 3a*x^2, d/dx(a) = 0. Because `sym` may
 * come from a fully expanded product (e.g. "(x-2)(x+2)^3"), this also covers
 * factored input the old monomial-only engine in derivative.ts could not parse.
 */
export function differentiateSym(sym: Sym, variable: string): Sym {
  let result: Sym = [];
  for (const term of sym) {
    const power = term.vars[variable] ?? 0;
    if (power === 0) continue; // constant w.r.t. `variable` — derivative is 0
    const vars: Record<string, number> = { ...term.vars };
    if (power === 1) delete vars[variable];
    else vars[variable] = power - 1;
    result = symAdd(result, [{ vars, coeff: term.coeff * power }]);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Tokenizer & parser for algebraic expressions (numbers + letters).   */
/* ------------------------------------------------------------------ */

type Token =
  | { type: "num"; value: number }
  | { type: "letter"; name: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "lparen" }
  | { type: "rparen" };

export function tokenize(expr: string): Token[] {
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
    if (/[a-zA-Z]/.test(ch)) {
      tokens.push({ type: "letter", name: ch.toLowerCase() });
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

const MAX_EXPONENT = 12;

function divide(l: Sym, r: Sym): Sym {
  if (!symIsPureConst(r)) throw new Error("לא נתמכת חלוקה בביטוי המכיל משתנה או פרמטר");
  const denom = symConstValue(r);
  if (denom === 0) throw new Error("חלוקה באפס");
  return symScale(l, 1 / denom);
}

function power(base: Sym, exponent: Sym): Sym {
  if (!symIsPureConst(exponent)) throw new Error("המעריך חייב להיות מספר");
  const expVal = symConstValue(exponent);
  if (!Number.isInteger(expVal)) throw new Error("נתמכות רק חזקות שלמות");
  if (Math.abs(expVal) > MAX_EXPONENT) throw new Error("מעריך גדול מדי");
  if (expVal >= 0) return symPow(base, expVal);
  if (!symIsPureConst(base)) throw new Error("לא נתמכת חזקה שלילית של ביטוי עם משתנה או פרמטר");
  const baseVal = symConstValue(base);
  if (baseVal === 0) throw new Error("חלוקה באפס");
  return symConst(Math.pow(baseVal, expVal));
}

export function parseExpr(tokens: Token[]): Sym {
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parsePrimary(): Sym {
    const t = peek();
    if (!t) throw new Error("סוף בלתי צפוי של הביטוי");
    if (t.type === "num") {
      consume();
      return symConst(t.value);
    }
    if (t.type === "letter") {
      consume();
      return symParam(t.name);
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

  function parsePower(): Sym {
    const base = parsePrimary();
    const t = peek();
    if (t && t.type === "op" && t.value === "^") {
      consume();
      return power(base, parseUnary());
    }
    return base;
  }

  /** Unary +/- sits *above* `^` in precedence (like standard math notation): "-x^2" is
   * "-(x^2)", not "(-x)^2" — so this wraps `parsePower`, not `parsePrimary`. */
  function parseUnary(): Sym {
    const t = peek();
    if (t && t.type === "op" && t.value === "-") {
      consume();
      return symNeg(parseUnary());
    }
    if (t && t.type === "op" && t.value === "+") {
      consume();
      return parseUnary();
    }
    return parsePower();
  }

  function parseMulDiv(): Sym {
    let value = parseUnary();
    while (true) {
      const t = peek();
      if (t && t.type === "op" && (t.value === "*" || t.value === "/")) {
        consume();
        const rhs = parseUnary();
        value = t.value === "*" ? symMul(value, rhs) : divide(value, rhs);
      } else if (t && (t.type === "letter" || t.type === "lparen" || t.type === "num")) {
        const rhs = parseUnary();
        value = symMul(value, rhs);
      } else break;
    }
    return value;
  }

  function parseAddSub(): Sym {
    let value = parseMulDiv();
    while (true) {
      const t = peek();
      if (t && t.type === "op" && (t.value === "+" || t.value === "-")) {
        consume();
        const rhs = parseMulDiv();
        value = t.value === "+" ? symAdd(value, rhs) : symSub(value, rhs);
      } else break;
    }
    return value;
  }

  const result = parseAddSub();
  if (pos !== tokens.length) throw new Error("תווים מיותרים בסוף הביטוי");
  return result;
}

export function parseAlgebraic(expr: string): Sym {
  return parseExpr(tokenize(expr));
}
