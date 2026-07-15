/**
 * Trigonometric-identity simplifier (5-unit level).
 *
 * Every sin/cos/tan call whose argument is linear in x (mx+c) becomes an
 * opaque "atom" variable (e.g. the key "sin(2x)"), and the whole expression
 * becomes a rational expression (numerator/denominator) over these atoms,
 * reusing the multivariate polynomial engine from symbolicAlgebra.ts.
 * Simplification is a bounded greedy search: at each step, either an eager
 * "collapse" pattern fires (Pythagorean sin²+cos²=1, or a sum/difference
 * pattern like sinAcosB+cosAsinB=sin(A+B)), or every applicable identity
 * substitution (Pythagorean, double-angle, half-angle, tan=sin/cos) is tried
 * and the one that most reduces a complexity score is kept. This is not an
 * exhaustive/optimal simplifier — it is designed to solve the "clean path"
 * exercises typical of bagrut identity proofs, not arbitrary trig algebra.
 * Scope: sin/cos/tan only (no sec/csc/cot), single variable x, linear
 * arguments only, Pythagorean substitution only at exponent 2.
 */

import {
  type Sym,
  type SymTerm,
  symAdd,
  symSub,
  symMul,
  symScale,
  symNeg,
  symPow,
  symConst,
  symParam,
  symIsPureConst,
  symConstValue,
  symVariables,
  formatSym,
  parseAlgebraic,
  polyCoefficients,
} from "./symbolicAlgebra";

export class TrigIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrigIdentityError";
  }
}

export type TrigFn = "sin" | "cos" | "tan";

export interface TrigIdentityStep {
  law: string;
  expr: string;
  explanation: string;
}

export type TrigIdentityResult =
  | { type: "result"; original: string; simplified: string; steps: TrigIdentityStep[] }
  | { type: "error"; message: string };

interface Rational {
  num: Sym;
  den: Sym;
}

interface AtomInfo {
  fn: TrigFn;
  m: number;
  c: number;
}

type AtomMap = Map<string, AtomInfo>;

function roundN(n: number, digits = 6): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f || 0;
}

function formatCoeff(n: number): string {
  const r = roundN(n, 4);
  return r.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function canonicalKey(fn: TrigFn, m: number, c: number): string {
  const mm = roundN(m);
  const cc = roundN(c);
  const mPart = mm === 1 ? "x" : mm === -1 ? "-x" : `${formatCoeff(mm)}x`;
  const cPart = cc === 0 ? "" : cc > 0 ? `+${formatCoeff(cc)}` : `${formatCoeff(cc)}`;
  return `${fn}(${mPart}${cPart})`;
}

function registerAtom(atoms: AtomMap, fn: TrigFn, m: number, c: number): string {
  let mm = roundN(m);
  let cc = roundN(c);
  // cos is even: cos(-θ) = cos(θ) — safe to canonicalize (no coefficient sign flip needed,
  // unlike sin/tan which are odd and would require tracking a sign through every use site).
  if (fn === "cos" && (mm < 0 || (mm === 0 && cc < 0))) {
    mm = -mm;
    cc = -cc;
  }
  const key = canonicalKey(fn, mm, cc);
  if (!atoms.has(key)) atoms.set(key, { fn, m: mm, c: cc });
  return key;
}

/* ------------------------------------------------------------------ */
/* Rational arithmetic over Sym (monomial-GCD cancellation only)       */
/* ------------------------------------------------------------------ */

function gcdNum(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b > 1e-9) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

function commonMonomial(terms: SymTerm[]): { vars: Record<string, number>; coeff: number } {
  const varsCommon: Record<string, number> = {};
  if (terms.length > 0) {
    for (const k of Object.keys(terms[0].vars)) varsCommon[k] = terms[0].vars[k];
    for (const t of terms.slice(1)) {
      for (const k of Object.keys(varsCommon)) varsCommon[k] = Math.min(varsCommon[k], t.vars[k] ?? 0);
    }
  }
  const allInt = terms.every((t) => Math.abs(t.coeff - Math.round(t.coeff)) < 1e-9);
  let coeff = 1;
  if (allInt && terms.length > 0) {
    coeff = terms.reduce((acc, t) => gcdNum(acc, Math.round(Math.abs(t.coeff))), 0) || 1;
  }
  return { vars: varsCommon, coeff };
}

function divideByMonomial(sym: Sym, mono: { vars: Record<string, number>; coeff: number }): Sym {
  return sym.map((t) => ({
    coeff: t.coeff / mono.coeff,
    vars: Object.fromEntries(
      Object.entries(t.vars)
        .map(([k, v]) => [k, v - (mono.vars[k] ?? 0)])
        .filter(([, v]) => v !== 0),
    ),
  }));
}

function ratReduce(r: Rational): Rational {
  if (r.num.length === 0) return { num: [], den: symConst(1) };
  const allTerms = [...r.num, ...r.den];
  const mono = commonMonomial(allTerms);
  const nontrivial = mono.coeff !== 1 || Object.values(mono.vars).some((v) => v !== 0);
  if (!nontrivial) return r;
  return { num: divideByMonomial(r.num, mono), den: divideByMonomial(r.den, mono) };
}

function ratFromConst(n: number): Rational {
  return { num: symConst(n), den: symConst(1) };
}
function ratFromSym(s: Sym): Rational {
  return { num: s, den: symConst(1) };
}
function ratNeg(p: Rational): Rational {
  return { num: symNeg(p.num), den: p.den };
}
function ratAdd(p: Rational, q: Rational): Rational {
  return ratReduce({ num: symAdd(symMul(p.num, q.den), symMul(q.num, p.den)), den: symMul(p.den, q.den) });
}
function ratSub(p: Rational, q: Rational): Rational {
  return ratAdd(p, ratNeg(q));
}
function ratMul(p: Rational, q: Rational): Rational {
  return ratReduce({ num: symMul(p.num, q.num), den: symMul(p.den, q.den) });
}
function ratDiv(p: Rational, q: Rational): Rational {
  if (q.num.length === 0) throw new TrigIdentityError("חלוקה באפס בביטוי");
  return ratReduce({ num: symMul(p.num, q.den), den: symMul(p.den, q.num) });
}
function ratPow(p: Rational, n: number): Rational {
  if (n >= 0) return ratReduce({ num: symPow(p.num, n), den: symPow(p.den, n) });
  return ratReduce({ num: symPow(p.den, -n), den: symPow(p.num, -n) });
}

/* ------------------------------------------------------------------ */
/* Parser: text -> Rational, recognizing sin/cos/tan with linear args  */
/* ------------------------------------------------------------------ */

function parseRationalExpr(input: string, atoms: AtomMap): Rational {
  const s = input.replace(/\s+/g, "").replace(/\*\*/g, "^");
  let i = 0;

  function fail(msg: string): never {
    throw new TrigIdentityError(msg);
  }

  function parseAddSub(): Rational {
    let left = parseMulDiv();
    while (i < s.length && (s[i] === "+" || s[i] === "-")) {
      const op = s[i];
      i++;
      const right = parseMulDiv();
      left = op === "+" ? ratAdd(left, right) : ratSub(left, right);
    }
    return left;
  }

  function parseMulDiv(): Rational {
    let left = parsePow();
    while (i < s.length) {
      if (s[i] === "*") {
        i++;
        left = ratMul(left, parsePow());
      } else if (s[i] === "/") {
        i++;
        left = ratDiv(left, parsePow());
      } else if (/[0-9a-zA-Z(]/.test(s[i])) {
        left = ratMul(left, parsePow());
      } else break;
    }
    return left;
  }

  function parsePow(): Rational {
    const base = parseUnary();
    if (s[i] === "^") {
      i++;
      const exp = readExponent();
      return ratPow(base, exp);
    }
    return base;
  }

  function readExponent(): number {
    let neg = false;
    if (s[i] === "-") {
      neg = true;
      i++;
    }
    let numStr = "";
    while (i < s.length && /[0-9]/.test(s[i])) {
      numStr += s[i];
      i++;
    }
    if (!numStr) fail("מעריך לא תקין — נתמכות רק חזקות שלמות");
    const n = parseInt(numStr, 10);
    return neg ? -n : n;
  }

  function parseUnary(): Rational {
    if (s[i] === "-") {
      i++;
      return ratNeg(parseUnary());
    }
    if (s[i] === "+") {
      i++;
      return parseUnary();
    }
    return parseAtom();
  }

  function parseAtom(): Rational {
    if (s[i] === undefined) fail("סוף בלתי צפוי של הביטוי");
    if (s[i] === "(") {
      i++;
      const inner = parseAddSub();
      if (s[i] !== ")") fail("חסר סוגר )");
      i++;
      return inner;
    }
    for (const fn of ["sin", "cos", "tan"] as const) {
      if (s.startsWith(fn, i) && s[i + fn.length] === "(") {
        i += fn.length + 1;
        const argStart = i;
        let depth = 1;
        while (i < s.length && depth > 0) {
          if (s[i] === "(") depth++;
          else if (s[i] === ")") depth--;
          if (depth > 0) i++;
        }
        if (depth !== 0) fail(`חסר סוגר עבור ${fn}(`);
        const argText = s.slice(argStart, i);
        i++;
        if (!argText) fail(`הארגומנט של ${fn}(...) ריק`);
        let argSym: Sym;
        try {
          argSym = parseAlgebraic(argText);
        } catch (err) {
          fail(`ארגומנט לא תקין ב-${fn}(${argText}): ${err instanceof Error ? err.message : "שגיאה"}`);
        }
        const vars = symVariables(argSym);
        if (vars.some((v) => v !== "x")) fail(`הארגומנט של ${fn}(...) חייב להיות תלוי רק ב-x`);
        let m = 0;
        let c = 0;
        if (vars.length > 0) {
          const coeffs = polyCoefficients(argSym, "x");
          if (coeffs.length > 2) fail(`הארגומנט של ${fn}(${argText}) חייב להיות לינארי ב-x`);
          c = coeffs[0] ?? 0;
          m = coeffs[1] ?? 0;
        } else {
          c = symConstValue(argSym);
        }
        const key = registerAtom(atoms, fn, m, c);
        return ratFromSym(symParam(key));
      }
    }
    if (/[0-9.]/.test(s[i])) {
      let numStr = "";
      while (i < s.length && /[0-9.]/.test(s[i])) {
        numStr += s[i];
        i++;
      }
      return ratFromConst(parseFloat(numStr));
    }
    if (s[i] === "x") {
      i++;
      return ratFromSym(symParam("x"));
    }
    fail(`תו לא צפוי: "${s[i]}"`);
  }

  const result = parseAddSub();
  if (i !== s.length) fail("תווים מיותרים בסוף הביטוי");
  return result;
}

/* ------------------------------------------------------------------ */
/* Atom-level substitution helpers                                     */
/* ------------------------------------------------------------------ */

/**
 * Substitutes every occurrence of atomKey (any power p) by replacement^p.
 * The replacement is a full Rational (not just a Sym) because some
 * identities — tan(θ)=sin(θ)/cos(θ) — introduce a new denominator.
 */
function substituteAtomAnyPowerRational(sym: Sym, atomKey: string, replacement: Rational): Rational {
  let result: Rational = { num: [], den: symConst(1) };
  for (const t of sym) {
    const p = t.vars[atomKey] ?? 0;
    const restVars = { ...t.vars };
    delete restVars[atomKey];
    const restSym: Sym = [{ vars: restVars, coeff: t.coeff }];
    const termAsRat = p === 0 ? ratFromSym(restSym) : ratMul(ratFromSym(restSym), ratPow(replacement, p));
    result = ratAdd(result, termAsRat);
  }
  return result;
}

/** Same as above but only rewrites terms where the atom's power exactly matches (leaves other powers untouched). */
function substituteAtomExactPowerRational(sym: Sym, atomKey: string, requiredPower: number, replacement: Rational): Rational {
  let result: Rational = { num: [], den: symConst(1) };
  for (const t of sym) {
    const p = t.vars[atomKey] ?? 0;
    if (p !== requiredPower) {
      result = ratAdd(result, ratFromSym([t]));
      continue;
    }
    const restVars = { ...t.vars };
    delete restVars[atomKey];
    const restSym: Sym = [{ vars: restVars, coeff: t.coeff }];
    result = ratAdd(result, ratMul(ratFromSym(restSym), replacement));
  }
  return result;
}

function hasExactPower(sym: Sym, atomKey: string, power: number): boolean {
  return sym.some((t) => (t.vars[atomKey] ?? 0) === power);
}

/* ------------------------------------------------------------------ */
/* Eager collapse rules                                                */
/* ------------------------------------------------------------------ */

function onlyAtom(t: SymTerm): string | null {
  const keys = Object.keys(t.vars).filter((k) => (t.vars[k] ?? 0) !== 0);
  return keys.length === 1 ? keys[0] : null;
}

/** sin(θ)² + cos(θ)² (same θ, same coefficient) -> constant. */
function tryPythagoreanCollapse(sym: Sym, atoms: AtomMap): Sym | null {
  for (let i = 0; i < sym.length; i++) {
    const keyI = onlyAtom(sym[i]);
    if (!keyI || sym[i].vars[keyI] !== 2) continue;
    const infoI = atoms.get(keyI);
    if (!infoI) continue;
    for (let j = 0; j < sym.length; j++) {
      if (j === i) continue;
      const keyJ = onlyAtom(sym[j]);
      if (!keyJ || sym[j].vars[keyJ] !== 2) continue;
      const infoJ = atoms.get(keyJ);
      if (!infoJ) continue;
      if (infoI.m !== infoJ.m || infoI.c !== infoJ.c) continue;
      if (!((infoI.fn === "sin" && infoJ.fn === "cos") || (infoI.fn === "cos" && infoJ.fn === "sin"))) continue;
      if (Math.abs(sym[i].coeff - sym[j].coeff) > 1e-9) continue;
      const rest = sym.filter((_, idx) => idx !== i && idx !== j);
      return symAdd(rest, symConst(sym[i].coeff));
    }
  }
  return null;
}

interface Pair {
  a: AtomInfo;
  b: AtomInfo;
}

function decomposeTwoAtomTerm(t: SymTerm, atoms: AtomMap): Pair | null {
  const keys = Object.keys(t.vars).filter((k) => (t.vars[k] ?? 0) !== 0);
  if (keys.length !== 2) return null;
  if (keys.some((k) => t.vars[k] !== 1)) return null;
  const a = atoms.get(keys[0]);
  const b = atoms.get(keys[1]);
  if (!a || !b) return null;
  return { a, b };
}

function sameArg(p: AtomInfo, q: AtomInfo): boolean {
  return Math.abs(p.m - q.m) < 1e-9 && Math.abs(p.c - q.c) < 1e-9;
}

/** sin(A)cos(B) ± cos(A)sin(B) -> sin(A±B); cos(A)cos(B) ± sin(A)sin(B) -> cos(A∓B). */
function matchBilinear(di: Pair, dj: Pair): { resultFn: TrigFn; A: AtomInfo; B: AtomInfo } | null {
  for (const [s1, c1] of [
    [di.a, di.b],
    [di.b, di.a],
  ] as const) {
    if (s1.fn !== "sin" || c1.fn !== "cos") continue;
    for (const [c2, s2] of [
      [dj.a, dj.b],
      [dj.b, dj.a],
    ] as const) {
      if (c2.fn !== "cos" || s2.fn !== "sin") continue;
      if (sameArg(c2, s1) && sameArg(s2, c1)) return { resultFn: "sin", A: s1, B: c1 };
    }
  }
  const ccFrom = (p: Pair) => (p.a.fn === "cos" && p.b.fn === "cos" ? [p.a, p.b] : null);
  const ssFrom = (p: Pair) => (p.a.fn === "sin" && p.b.fn === "sin" ? [p.a, p.b] : null);
  for (const [cc, ss] of [
    [ccFrom(di), ssFrom(dj)],
    [ccFrom(dj), ssFrom(di)],
  ] as const) {
    if (!cc || !ss) continue;
    const [c1, c2] = cc;
    const [s1, s2] = ss;
    if ((sameArg(c1, s1) && sameArg(c2, s2)) || (sameArg(c1, s2) && sameArg(c2, s1))) {
      return { resultFn: "cos", A: c1, B: c2 };
    }
  }
  return null;
}

function trySumDifferenceCollapse(sym: Sym, atoms: AtomMap): Sym | null {
  for (let i = 0; i < sym.length; i++) {
    const di = decomposeTwoAtomTerm(sym[i], atoms);
    if (!di) continue;
    for (let j = i + 1; j < sym.length; j++) {
      const dj = decomposeTwoAtomTerm(sym[j], atoms);
      if (!dj) continue;
      const match = matchBilinear(di, dj);
      if (!match) continue;
      const { resultFn, A, B } = match;
      const sameSign = Math.abs(sym[i].coeff - sym[j].coeff) < 1e-9;
      const oppSign = Math.abs(sym[i].coeff + sym[j].coeff) < 1e-9;
      if (!sameSign && !oppSign) continue;
      const rest = sym.filter((_, idx) => idx !== i && idx !== j);
      if (resultFn === "sin") {
        const argM = sameSign ? A.m + B.m : A.m - B.m;
        const argC = sameSign ? A.c + B.c : A.c - B.c;
        const key = registerAtom(atoms, "sin", argM, argC);
        return symAdd(rest, symScale(symParam(key), sym[i].coeff));
      }
      const argM = sameSign ? A.m - B.m : A.m + B.m;
      const argC = sameSign ? A.c - B.c : A.c + B.c;
      const key = registerAtom(atoms, "cos", argM, argC);
      return symAdd(rest, symScale(symParam(key), sym[i].coeff));
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Search candidates (identity substitutions, scored by complexity)    */
/* ------------------------------------------------------------------ */

interface Candidate {
  rational: Rational;
  ruleName: string;
  explanation: string;
}

function combineSide(side: "num" | "den", r: Rational, sideResult: Rational): Rational {
  return side === "num" ? ratDiv(sideResult, ratFromSym(r.den)) : ratDiv(ratFromSym(r.num), sideResult);
}

function makeExactPowerCandidate(
  side: "num" | "den",
  r: Rational,
  atomKey: string,
  power: number,
  replacement: Rational,
  ruleName: string,
  explanation: string,
): Candidate | null {
  const target = side === "num" ? r.num : r.den;
  if (!hasExactPower(target, atomKey, power)) return null;
  const sideResult = substituteAtomExactPowerRational(target, atomKey, power, replacement);
  return { rational: ratReduce(combineSide(side, r, sideResult)), ruleName, explanation };
}

function makeAnyPowerCandidate(
  side: "num" | "den",
  r: Rational,
  atomKey: string,
  replacement: Rational,
  ruleName: string,
  explanation: string,
): Candidate {
  const target = side === "num" ? r.num : r.den;
  const sideResult = substituteAtomAnyPowerRational(target, atomKey, replacement);
  return { rational: ratReduce(combineSide(side, r, sideResult)), ruleName, explanation };
}

function generateCandidatesForSide(r: Rational, atoms: AtomMap, side: "num" | "den"): Candidate[] {
  const sym = side === "num" ? r.num : r.den;
  const keys = symVariables(sym).filter((k) => atoms.has(k));
  const out: Candidate[] = [];

  for (const key of keys) {
    const info = atoms.get(key)!;
    const label = canonicalKey(info.fn, info.m, info.c);
    const half = { m: info.m / 2, c: info.c / 2 };
    const dbl = { m: info.m * 2, c: info.c * 2 };

    if (info.fn === "sin") {
      const cosKey = registerAtom(atoms, "cos", info.m, info.c);
      const pyth = makeExactPowerCandidate(
        side,
        r,
        key,
        2,
        ratFromSym(symSub(symConst(1), symPow(symParam(cosKey), 2))),
        "זהות פיתגורס",
        `${label}² הוחלף לפי sin²θ=1-cos²θ, בביטוי עם ${canonicalKey("cos", info.m, info.c)}`,
      );
      if (pyth) out.push(pyth);

      const sinHalfKey = registerAtom(atoms, "sin", half.m, half.c);
      const cosHalfKey = registerAtom(atoms, "cos", half.m, half.c);
      out.push(
        makeAnyPowerCandidate(
          side,
          r,
          key,
          ratFromSym(symScale(symMul(symParam(sinHalfKey), symParam(cosHalfKey)), 2)),
          "זהות זווית כפולה",
          `${label} הוחלף לפי sinθ=2sin(θ/2)cos(θ/2)`,
        ),
      );

      const cosDblKey = registerAtom(atoms, "cos", dbl.m, dbl.c);
      const halfSq = makeExactPowerCandidate(
        side,
        r,
        key,
        2,
        ratFromSym(symScale(symSub(symConst(1), symParam(cosDblKey)), 0.5)),
        "זהות זווית כפולה (היוצג כמחצית)",
        `${label}² הוחלף לפי sin²θ=(1-cos(2θ))/2`,
      );
      if (halfSq) out.push(halfSq);

      const tanKeyForSin = registerAtom(atoms, "tan", info.m, info.c);
      out.push(
        makeAnyPowerCandidate(
          side,
          r,
          key,
          ratFromSym(symMul(symParam(tanKeyForSin), symParam(cosKey))),
          "זהות המנה (tan=sin/cos)",
          `${label} הוחלף לפי sinθ=tanθ·cosθ, כדי לאפשר צמצום עם cos באותה זווית`,
        ),
      );
    } else if (info.fn === "cos") {
      const sinKey = registerAtom(atoms, "sin", info.m, info.c);
      const pyth = makeExactPowerCandidate(
        side,
        r,
        key,
        2,
        ratFromSym(symSub(symConst(1), symPow(symParam(sinKey), 2))),
        "זהות פיתגורס",
        `${label}² הוחלף לפי cos²θ=1-sin²θ, בביטוי עם ${canonicalKey("sin", info.m, info.c)}`,
      );
      if (pyth) out.push(pyth);

      const sinHalfKey = registerAtom(atoms, "sin", half.m, half.c);
      const cosHalfKey = registerAtom(atoms, "cos", half.m, half.c);
      out.push(
        makeAnyPowerCandidate(
          side,
          r,
          key,
          ratFromSym(symSub(symConst(1), symScale(symPow(symParam(sinHalfKey), 2), 2))),
          "זהות זווית כפולה",
          `${label} הוחלף לפי cosθ=1-2sin²(θ/2)`,
        ),
      );
      out.push(
        makeAnyPowerCandidate(
          side,
          r,
          key,
          ratFromSym(symSub(symScale(symPow(symParam(cosHalfKey), 2), 2), symConst(1))),
          "זהות זווית כפולה",
          `${label} הוחלף לפי cosθ=2cos²(θ/2)-1`,
        ),
      );

      const cosDblKey = registerAtom(atoms, "cos", dbl.m, dbl.c);
      const halfSq = makeExactPowerCandidate(
        side,
        r,
        key,
        2,
        ratFromSym(symScale(symAdd(symConst(1), symParam(cosDblKey)), 0.5)),
        "זהות זווית כפולה (היוצג כמחצית)",
        `${label}² הוחלף לפי cos²θ=(1+cos(2θ))/2`,
      );
      if (halfSq) out.push(halfSq);
    } else {
      const sinKey = registerAtom(atoms, "sin", info.m, info.c);
      const cosKey = registerAtom(atoms, "cos", info.m, info.c);
      out.push(
        makeAnyPowerCandidate(
          side,
          r,
          key,
          { num: symParam(sinKey), den: symParam(cosKey) },
          "tan = sin/cos",
          `${label} הוחלף לפי tanθ=sinθ/cosθ`,
        ),
      );
    }
  }

  return out;
}

function complexityScore(r: Rational): number {
  const allTerms = [...r.num, ...r.den];
  const atomKeys = new Set<string>();
  let totalDeg = 0;
  for (const t of allTerms) {
    for (const [k, p] of Object.entries(t.vars)) {
      if (p !== 0) {
        atomKeys.add(k);
        totalDeg += Math.abs(p);
      }
    }
  }
  return atomKeys.size * 100 + allTerms.length * 10 + totalDeg;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

function formatRational(r: Rational): string {
  const denIsOne = symIsPureConst(r.den) && Math.abs(symConstValue(r.den) - 1) < 1e-9;
  if (denIsOne) return r.num.length === 0 ? "0" : formatSym(r.num);
  const numStr = r.num.length > 1 ? `(${formatSym(r.num)})` : formatSym(r.num);
  const denStr = r.den.length > 1 ? `(${formatSym(r.den)})` : formatSym(r.den);
  return `${numStr}/${denStr}`;
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

const MAX_ITERATIONS = 8;

export function simplifyTrigExpression(input: string): TrigIdentityResult {
  try {
    const trimmed = input.trim();
    if (!trimmed) throw new TrigIdentityError("נא להזין ביטוי טריגונומטרי, למשל (1-cos(2x))/sin(2x)");
    if (trimmed.includes("=")) throw new TrigIdentityError("נא להזין ביטוי לפישוט (ללא סימן =)");

    const atoms: AtomMap = new Map();
    let current = ratReduce(parseRationalExpr(trimmed, atoms));
    const originalStr = formatRational(current);
    const steps: TrigIdentityStep[] = [];
    let score = complexityScore(current);

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const collapsedNum = tryPythagoreanCollapse(current.num, atoms) ?? trySumDifferenceCollapse(current.num, atoms);
      if (collapsedNum) {
        current = ratReduce({ num: collapsedNum, den: current.den });
        score = complexityScore(current);
        steps.push({
          law: "צמצום ישיר",
          expr: formatRational(current),
          explanation: "זוהתה תבנית שמצטמצמת ישירות במונה (פיתגורס או סכום/הפרש זוויות)",
        });
        continue;
      }
      const collapsedDen = tryPythagoreanCollapse(current.den, atoms) ?? trySumDifferenceCollapse(current.den, atoms);
      if (collapsedDen) {
        current = ratReduce({ num: current.num, den: collapsedDen });
        score = complexityScore(current);
        steps.push({
          law: "צמצום ישיר",
          expr: formatRational(current),
          explanation: "זוהתה תבנית שמצטמצמת ישירות במכנה (פיתגורס או סכום/הפרש זוויות)",
        });
        continue;
      }

      const candidates = [
        ...generateCandidatesForSide(current, atoms, "num"),
        ...generateCandidatesForSide(current, atoms, "den"),
      ];
      let best: { candidate: Candidate; s: number } | null = null;
      for (const cand of candidates) {
        const s = complexityScore(cand.rational);
        if (s < score && (!best || s < best.s)) best = { candidate: cand, s };
      }
      if (!best) break;
      current = best.candidate.rational;
      score = best.s;
      steps.push({ law: best.candidate.ruleName, expr: formatRational(current), explanation: best.candidate.explanation });
    }

    return { type: "result", original: originalStr, simplified: formatRational(current), steps };
  } catch (err) {
    return { type: "error", message: err instanceof TrigIdentityError ? err.message : "שגיאה בעיבוד הביטוי" };
  }
}
