/**
 * Quadratic-equation solver upgraded to the 5-unit curriculum level:
 *  - clears numeric-denominator fractions before standardizing, with an
 *    explicit "equation with no fractions" pedagogical step,
 *  - supports coefficients that contain a parameter (e.g. m), in which case
 *    the discriminant and the roots are presented as algebraic expressions
 *    instead of numbers,
 *  - explains what the discriminant's sign means for the number of real
 *    solutions,
 *  - and ends with a "check" step substituting the root(s) back into the
 *    standard-form equation.
 *
 * Internally every coefficient is a small multivariate polynomial ("Sym") in
 * whatever parameter letters appear in the input besides the unknown — the
 * unknown itself is just another Sym variable, bucketed out by its exponent
 * (0, 1 or 2) once both sides have been combined into standard form.
 */

/* ------------------------------------------------------------------ */
/* Sym: a small multivariate polynomial (parameters + the unknown).    */
/* ------------------------------------------------------------------ */

interface SymTerm {
  vars: Record<string, number>;
  coeff: number;
}

type Sym = SymTerm[];

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
function formatPolyInVar(sym: Sym, variable: string): string {
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

/** Splits sym's terms by `variable`'s exponent: bucket 2 = a, 1 = b, 0 = c. */
function bucketByVar(sym: Sym, variable: string): { a: Sym; b: Sym; c: Sym; maxDeg: number } {
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

/* ------------------------------------------------------------------ */
/* Tokenizer & parser                                                   */
/* ------------------------------------------------------------------ */

type Token =
  | { type: "num"; value: number }
  | { type: "letter"; name: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "lparen" }
  | { type: "rparen" };

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

function parseExpr(tokens: Token[]): Sym {
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
    if (t.type === "op" && t.value === "-") {
      consume();
      return symNeg(parsePrimary());
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

  function parsePower(): Sym {
    const base = parsePrimary();
    const t = peek();
    if (t && t.type === "op" && t.value === "^") {
      consume();
      return power(base, parsePower());
    }
    return base;
  }

  function parseMulDiv(): Sym {
    let value = parsePower();
    while (true) {
      const t = peek();
      if (t && t.type === "op" && (t.value === "*" || t.value === "/")) {
        consume();
        const rhs = parsePower();
        value = t.value === "*" ? symMul(value, rhs) : divide(value, rhs);
      } else if (t && (t.type === "letter" || t.type === "lparen" || t.type === "num")) {
        const rhs = parsePower();
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

function detectVariable(input: string): string {
  if (/x/i.test(input)) return "x";
  const match = input.match(/[a-zA-Z]/);
  return match ? match[0].toLowerCase() : "x";
}

/* ------------------------------------------------------------------ */
/* Result types                                                        */
/* ------------------------------------------------------------------ */

export interface QuadraticStep {
  label: string;
  expr: string;
}

export type QuadraticResult =
  | {
      type: "result";
      variable: string;
      hasParams: false;
      a: number;
      b: number;
      c: number;
      discriminant: number;
      roots: number[];
      standardExpr: string;
      steps: QuadraticStep[];
    }
  | {
      type: "result";
      variable: string;
      hasParams: true;
      standardExpr: string;
      rootsExpr: string;
      steps: QuadraticStep[];
    }
  | { type: "error"; message: string };

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export function solveQuadratic(input: string): QuadraticResult {
  const trimmed = input.trim();
  if (!trimmed) return { type: "error", message: "נא להזין משוואה ריבועית, למשל x^2 + 5x + 6 = 0" };

  const equalsCount = (trimmed.match(/=/g) ?? []).length;
  if (equalsCount !== 1) {
    return { type: "error", message: "יש להזין משוואה עם סימן שוויון (=) יחיד" };
  }

  const [rawLeft, rawRight] = trimmed.split("=");
  const variable = detectVariable(trimmed);

  try {
    const leftSym = parseExpr(tokenize(rawLeft));
    const rightSym = parseExpr(tokenize(rawRight));

    const chain: string[] = [`${rawLeft.trim()} = ${rawRight.trim()}`];

    const denominators = extractDenominators(trimmed);
    const lcm = denominators.length > 0 ? lcmAll(denominators) : null;
    let stdLeft = leftSym;
    let stdRight = rightSym;
    if (lcm !== null && lcm > 1) {
      stdLeft = symScale(leftSym, lcm);
      stdRight = symScale(rightSym, lcm);
      chain.push(
        `×${formatStepNumber(lcm)} (מכנה משותף, ללא שברים):  ${formatPolyInVar(stdLeft, variable)} = ${formatPolyInVar(stdRight, variable)}`,
      );
    }

    const combined = symSub(stdLeft, stdRight);
    const standardExpr = `${formatPolyInVar(combined, variable)} = 0`;
    chain.push(`צורה סטנדרטית:  ${standardExpr}`);

    const steps: QuadraticStep[] = [
      { label: "שלב 1: פישוט המשוואה (ניקוי שברים וסידור לצורה סטנדרטית)", expr: chain.join("  →  ") },
    ];

    const { a, b, c, maxDeg } = bucketByVar(combined, variable);
    if (maxDeg > 2) {
      return { type: "error", message: `נתמכות רק משוואות ריבועיות (עד חזקה 2) — זוהתה חזקה ${maxDeg}` };
    }
    if (symIsZero(a)) {
      return {
        type: "error",
        message: `המקדם של ${variable}² הוא אפס — זו אינה משוואה ריבועית (נסו את כרטסת המשוואות הלינאריות)`,
      };
    }

    const hasParams = symHasParams(a) || symHasParams(b) || symHasParams(c);

    let coefExpr = `a = ${formatSym(a)},  b = ${formatSym(b)},  c = ${formatSym(c)}`;
    if (!symIsPureConst(a)) coefExpr += `   [בהנחה ש- ${formatSym(a)} ≠ 0]`;
    steps.push({ label: "שלב 2: זיהוי המקדמים a, b, c", expr: coefExpr });

    const discSym = symSub(symMul(b, b), symScale(symMul(a, c), 4));
    const discBase = `Δ = b² - 4ac = (${formatSym(b)})² - 4·(${formatSym(a)})·(${formatSym(c)}) = ${formatSym(discSym)}`;

    if (!hasParams) {
      const aN = symConstValue(a);
      const bN = symConstValue(b);
      const cN = symConstValue(c);
      const discriminant = symConstValue(discSym);

      const meaning =
        discriminant < -1e-9
          ? "Δ < 0  ⇒  אין פתרון ממשי (הפרבולה אינה נחתכת עם ציר ה-x)"
          : Math.abs(discriminant) <= 1e-9
            ? "Δ = 0  ⇒  פתרון ממשי יחיד (הפרבולה משיקה לציר ה-x בקודקודה)"
            : "Δ > 0  ⇒  שני פתרונות ממשיים שונים (הפרבולה חותכת את ציר ה-x בשתי נקודות)";
      steps.push({ label: "שלב 3: חישוב הדיסקרימיננטה וניתוחה", expr: `${discBase}  →  ${meaning}` });

      let roots: number[] = [];
      if (discriminant < -1e-9) {
        steps.push({ label: "שלב 4: תוצאה סופית", expr: "אין שורש ריבועי ממשי ל-Δ שלילי  ⇒  אין פתרון ממשי למשוואה (∅)" });
      } else if (Math.abs(discriminant) <= 1e-9) {
        const x0 = -bN / (2 * aN);
        steps.push({
          label: "שלב 4: הצבה בנוסחת השורשים ותוצאה סופית",
          expr: `${variable} = -b / 2a = ${formatStepNumber(-bN)} / ${formatStepNumber(2 * aN)} = ${formatStepNumber(x0)}`,
        });
        roots = [x0];
      } else {
        const sq = Math.sqrt(discriminant);
        const x1 = (-bN + sq) / (2 * aN);
        const x2 = (-bN - sq) / (2 * aN);
        roots = [x1, x2].sort((p, q) => p - q);
        steps.push({
          label: "שלב 4: הצבה בנוסחת השורשים ותוצאה סופית",
          expr: `${variable} = (-b ± √Δ) / 2a = (${formatStepNumber(-bN)} ± √${formatStepNumber(discriminant)}) / ${formatStepNumber(2 * aN)}  ⇒  ${variable}₁ = ${formatStepNumber(roots[1])},  ${variable}₂ = ${formatStepNumber(roots[0])}`,
        });
      }

      if (roots.length > 0) {
        const checkOne = (r: number) => {
          const lhs = aN * r * r + bN * r + cN;
          const ok = Math.abs(lhs) < 1e-6;
          return `${formatStepNumber(aN)}(${formatStepNumber(r)})² + ${formatStepNumber(bN)}(${formatStepNumber(r)}) + ${formatStepNumber(cN)} = ${formatStepNumber(lhs)} ${ok ? "✓" : "✗"}`;
        };
        steps.push({
          label: "שלב 5: בדיקה — הצבת הפתרון במשוואה המקורית",
          expr:
            roots.length === 1
              ? `${variable} = ${formatStepNumber(roots[0])}:  ${checkOne(roots[0])}`
              : `${variable}₁ = ${formatStepNumber(roots[1])}:  ${checkOne(roots[1])}      ${variable}₂ = ${formatStepNumber(roots[0])}:  ${checkOne(roots[0])}`,
        });
      }

      return { type: "result", variable, hasParams: false, a: aN, b: bN, c: cN, discriminant, roots, standardExpr, steps };
    }

    // Parametric coefficients: present Δ and the roots as algebraic expressions.
    const discIsZero = symIsZero(discSym);
    steps.push({
      label: "שלב 3: חישוב הדיסקרימיננטה וניתוחה",
      expr: discIsZero
        ? `${discBase}  →  Δ ≡ 0 לכל ערך של הפרמטר  ⇒  פתרון ממשי יחיד (ביטוי ריבוע שלם)`
        : `${discBase}  →  הביטוי מכיל פרמטר, לכן סימן Δ (וממנו מספר הפתרונות) תלוי בערכו`,
    });

    const rootsExpr = discIsZero
      ? `${variable} = ${formatSym(symNeg(b))} / (${formatSym(symScale(a, 2))})`
      : `${variable} = (${formatSym(symNeg(b))} ± √(${formatSym(discSym)})) / (${formatSym(symScale(a, 2))})`;
    steps.push({ label: "שלב 4: נוסחת השורשים (ביטוי אלגברי)", expr: rootsExpr });
    steps.push({
      label: "שלב 5: בדיקה",
      expr: `הצבת הביטוי שנמצא עבור ${variable} ב-a${variable}² + b${variable} + c מקיימת שוויון לאפס, מכיוון ש-(√Δ)² = Δ מתוך הגדרת השורש הריבועי`,
    });

    return { type: "result", variable, hasParams: true, standardExpr, rootsExpr, steps };
  } catch (err) {
    return { type: "error", message: err instanceof Error ? err.message : "שגיאה בעיבוד המשוואה" };
  }
}
