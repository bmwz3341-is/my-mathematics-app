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
 * Scope: sin/cos/tan/cot only (no sec/csc), single variable x, linear
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

export type TrigFn = "sin" | "cos" | "tan" | "cot";

export interface TrigIdentityStep {
  law: string;
  expr: string;
  explanation: string;
}

export type TrigIdentityResult =
  | { type: "result"; original: string; simplified: string; steps: TrigIdentityStep[] }
  | { type: "error"; message: string; hint?: string };

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

/** Rescales num/den so a single-term denominator has a leading coefficient of 1 (e.g. "1/0.5tan(x)" -> "2/tan(x)"). Coefficient-only, so it never affects scoreVector. */
function normalizeLeadingDenCoeff(r: Rational): Rational {
  if (r.den.length !== 1) return r;
  const k = r.den[0].coeff;
  if (Math.abs(k - 1) < 1e-9) return r;
  return {
    num: r.num.map((t) => ({ ...t, coeff: t.coeff / k })),
    den: r.den.map((t) => ({ ...t, coeff: t.coeff / k })),
  };
}

function ratReduce(r: Rational): Rational {
  if (r.num.length === 0) return { num: [], den: symConst(1) };
  const allTerms = [...r.num, ...r.den];
  const mono = commonMonomial(allTerms);
  const nontrivial = mono.coeff !== 1 || Object.values(mono.vars).some((v) => v !== 0);
  const reduced = nontrivial ? { num: divideByMonomial(r.num, mono), den: divideByMonomial(r.den, mono) } : r;
  return normalizeLeadingDenCoeff(reduced);
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
    for (const fn of ["sin", "cos", "tan", "cot"] as const) {
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

/**
 * sin(θ)^p * cos(θ)^p (same θ, matching powers, within a single term) -> (sin(2θ)/2)^p.
 * Unlike the other collapses this looks inside one term rather than pairing two terms —
 * it's what lets e.g. sin(x)cos(x) in a denominator line up with a cos(2x) elsewhere.
 * Always a strict win under scoreVector (fewer atoms, half the degree, same term count),
 * so — like the other collapses — it fires unconditionally whenever found.
 */
function tryDoubleAngleProductCollapse(sym: Sym, atoms: AtomMap): Sym | null {
  for (let idx = 0; idx < sym.length; idx++) {
    const t = sym[idx];
    const keys = Object.keys(t.vars).filter((k) => (t.vars[k] ?? 0) !== 0);
    for (const sinKey of keys) {
      const sinInfo = atoms.get(sinKey);
      if (!sinInfo || sinInfo.fn !== "sin") continue;
      const p = t.vars[sinKey];
      for (const cosKey of keys) {
        if (cosKey === sinKey) continue;
        const cosInfo = atoms.get(cosKey);
        if (!cosInfo || cosInfo.fn !== "cos") continue;
        if (t.vars[cosKey] !== p || !sameArg(sinInfo, cosInfo)) continue;

        const dblKey = registerAtom(atoms, "sin", sinInfo.m * 2, sinInfo.c * 2);
        const restVars = { ...t.vars };
        delete restVars[sinKey];
        delete restVars[cosKey];
        restVars[dblKey] = (restVars[dblKey] ?? 0) + p;
        const newTerm: SymTerm = { vars: restVars, coeff: t.coeff / Math.pow(2, p) };
        const rest = sym.filter((_, i) => i !== idx);
        return symAdd(rest, [newTerm]);
      }
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
        `**${label}²** הוחלף לפי sin²θ=1-cos²θ, בביטוי עם **${canonicalKey("cos", info.m, info.c)}**`,
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
          `**${label}** הוחלף לפי sinθ=2sin(θ/2)cos(θ/2)`,
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
        `**${label}²** הוחלף לפי sin²θ=(1-cos(2θ))/2`,
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
          `**${label}** הוחלף לפי sinθ=tanθ·cosθ, כדי לאפשר צמצום עם cos באותה זווית`,
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
        `**${label}²** הוחלף לפי cos²θ=1-sin²θ, בביטוי עם **${canonicalKey("sin", info.m, info.c)}**`,
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
          `**${label}** הוחלף לפי cosθ=1-2sin²(θ/2)`,
        ),
      );
      out.push(
        makeAnyPowerCandidate(
          side,
          r,
          key,
          ratFromSym(symSub(symScale(symPow(symParam(cosHalfKey), 2), 2), symConst(1))),
          "זהות זווית כפולה",
          `**${label}** הוחלף לפי cosθ=2cos²(θ/2)-1`,
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
        `**${label}²** הוחלף לפי cos²θ=(1+cos(2θ))/2`,
      );
      if (halfSq) out.push(halfSq);
    } else if (info.fn === "tan") {
      const sinKey = registerAtom(atoms, "sin", info.m, info.c);
      const cosKey = registerAtom(atoms, "cos", info.m, info.c);
      out.push(
        makeAnyPowerCandidate(
          side,
          r,
          key,
          { num: symParam(sinKey), den: symParam(cosKey) },
          "tan = sin/cos",
          `**${label}** הוחלף לפי tanθ=sinθ/cosθ`,
        ),
      );
    } else {
      const sinKey = registerAtom(atoms, "sin", info.m, info.c);
      const cosKey = registerAtom(atoms, "cos", info.m, info.c);
      out.push(
        makeAnyPowerCandidate(
          side,
          r,
          key,
          { num: symParam(cosKey), den: symParam(sinKey) },
          "cot = cos/sin",
          `**${label}** הוחלף לפי cotθ=cosθ/sinθ`,
        ),
      );
    }
  }

  return out;
}

/**
 * Lexicographic complexity score: (argument mismatch, total term count, unique atom count,
 * total degree). Term count dominates the last three because it is the most reliable proxy
 * for "did this actually get simpler" — merging two distinct atoms into one (lower atom
 * count) is only a win if it doesn't also expand the term count (see collapseFully / the
 * candidate-selection lookahead below, which is what makes that distinction possible).
 *
 * `foreign` only matters in "prove identity" mode: it counts how many distinct argument
 * multiples (the m in sin(mx+c)) appear in the expression but not in `targetArgs` — the set
 * of argument multiples used on the *other* side of the identity. It's checked first,
 * ahead of term count, so a substitution that speaks the other side's "language" (e.g.
 * cos(2x) -> terms in x, when the other side is all in x) is taken even when it makes the
 * term/atom/degree counts temporarily worse — that's the forced-expansion behavior proof
 * mode needs and plain simplify mode must never pay for. targetArgs is only ever passed by
 * the proof-mode caller; ordinary simplification always leaves it undefined, so `foreign`
 * stays 0 for both sides of every comparison and this dimension is a no-op.
 */
interface ScoreVec {
  foreign: number;
  terms: number;
  atoms: number;
  degree: number;
}

function isTrivialOne(sym: Sym): boolean {
  return symIsPureConst(sym) && Math.abs(symConstValue(sym) - 1) < 1e-9;
}

function scoreVector(r: Rational, atoms: AtomMap, targetArgs?: Set<number>): ScoreVec {
  const numTerms = r.num.length;
  const denTerms = isTrivialOne(r.den) ? 0 : r.den.length;
  const atomKeys = new Set<string>();
  let totalDeg = 0;
  for (const t of [...r.num, ...r.den]) {
    for (const [k, p] of Object.entries(t.vars)) {
      if (p !== 0) {
        atomKeys.add(k);
        totalDeg += Math.abs(p);
      }
    }
  }
  let foreign = 0;
  if (targetArgs && targetArgs.size > 0) {
    const argMultiples = new Set<number>();
    for (const key of atomKeys) argMultiples.add(atoms.get(key)!.m);
    for (const m of argMultiples) if (!targetArgs.has(m)) foreign++;
  }
  return { foreign, terms: numTerms + denTerms, atoms: atomKeys.size, degree: totalDeg };
}

function compareScore(a: ScoreVec, b: ScoreVec): number {
  if (a.foreign !== b.foreign) return a.foreign - b.foreign;
  if (a.terms !== b.terms) return a.terms - b.terms;
  if (a.atoms !== b.atoms) return a.atoms - b.atoms;
  return a.degree - b.degree;
}

/**
 * Applies one eager collapse (Pythagorean or sum/difference) to num, else den, if either
 * pattern matches; returns null if neither applies.
 */
function collapseOnce(r: Rational, atoms: AtomMap): Rational | null {
  const collapsedNum = tryPythagoreanCollapse(r.num, atoms) ?? trySumDifferenceCollapse(r.num, atoms) ?? tryDoubleAngleProductCollapse(r.num, atoms);
  if (collapsedNum) return ratReduce({ num: collapsedNum, den: r.den });
  const collapsedDen = tryPythagoreanCollapse(r.den, atoms) ?? trySumDifferenceCollapse(r.den, atoms) ?? tryDoubleAngleProductCollapse(r.den, atoms);
  if (collapsedDen) return ratReduce({ num: r.num, den: collapsedDen });
  return null;
}

/**
 * One-step-ahead lookahead used when scoring a candidate substitution: a substitution that
 * temporarily raises the term count is only worth taking if it immediately unlocks a
 * collapse (e.g. completes a Pythagorean pair) — so candidates are scored on their state
 * *after* any collapse that becomes available, not on their raw post-substitution form.
 */
function collapseFully(r: Rational, atoms: AtomMap): Rational {
  let cur = r;
  for (let i = 0; i < 5; i++) {
    const next = collapseOnce(cur, atoms);
    if (!next) break;
    cur = next;
  }
  return cur;
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

/**
 * Standing tip shown alongside parse errors. Math snippets are wrapped in `backticks` so the
 * UI can render them as isolated LTR spans — inlined directly in an RTL sentence, parentheses
 * in a snippet like (1-cos(x))/sin(x) get bidi-reordered by the browser and look garbled/cut.
 */
const PARSE_HINT =
  "ודאו שכל פונקציה (sin, cos, tan, cot) נכתבת עם סוגריים סביב הזווית, ושמכנה של שבר עם יותר " +
  "מאיבר אחד עטוף בסוגריים — למשל `(1-cos(x))/sin(x)` ולא `1-cos(x)/sin(x)`.";

/**
 * Parses `input` just far enough to report which argument multiples (the m in sin(mx+c))
 * it uses — e.g. "cos(2x)+tan(x)" -> {1, 2}. Used by proof mode to tell each side what
 * "language" (argument vocabulary) the other side speaks, so it knows what to expand
 * toward. Returns an empty set on any parse failure — the caller degrades to plain
 * simplification with no target bias, never a proof-mode crash.
 */
export function collectArgumentMultipliers(input: string): Set<number> {
  try {
    const atoms: AtomMap = new Map();
    parseRationalExpr(input.trim(), atoms);
    return new Set([...atoms.values()].map((a) => a.m));
  } catch {
    return new Set();
  }
}

/**
 * `targetArgs`, when passed (proof mode only), biases the greedy search toward the argument
 * vocabulary used by the other side of an identity — see the `foreign` field of ScoreVec.
 * Plain simplification (the default) never passes it, so this is a pure no-op there: the
 * exact same candidates, collapses, and lexicographic comparisons as before.
 */
export function simplifyTrigExpression(input: string, targetArgs?: Set<number>): TrigIdentityResult {
  try {
    const trimmed = input.trim();
    if (!trimmed) throw new TrigIdentityError("נא להזין ביטוי טריגונומטרי, למשל (1-cos(2x))/sin(2x)");
    if (trimmed.includes("=")) throw new TrigIdentityError("נא להזין ביטוי לפישוט (ללא סימן =)");

    const atoms: AtomMap = new Map();
    let current: Rational;
    try {
      current = ratReduce(parseRationalExpr(trimmed, atoms));
    } catch (err) {
      const msg = err instanceof TrigIdentityError ? err.message : "לא הצלחתי לפענח את הביטוי";
      return { type: "error", message: msg, hint: PARSE_HINT };
    }
    const originalStr = formatRational(current);
    const steps: TrigIdentityStep[] = [];
    let score = scoreVector(current, atoms, targetArgs);

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const collapsedNum = tryPythagoreanCollapse(current.num, atoms) ?? trySumDifferenceCollapse(current.num, atoms) ?? tryDoubleAngleProductCollapse(current.num, atoms);
      if (collapsedNum) {
        current = ratReduce({ num: collapsedNum, den: current.den });
        score = scoreVector(current, atoms, targetArgs);
        steps.push({
          law: "צמצום ישיר",
          expr: formatRational(current),
          explanation: "זוהתה תבנית שמצטמצמת ישירות במונה (פיתגורס או סכום/הפרש זוויות)",
        });
        continue;
      }
      const collapsedDen = tryPythagoreanCollapse(current.den, atoms) ?? trySumDifferenceCollapse(current.den, atoms) ?? tryDoubleAngleProductCollapse(current.den, atoms);
      if (collapsedDen) {
        current = ratReduce({ num: current.num, den: collapsedDen });
        score = scoreVector(current, atoms, targetArgs);
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
      let best: { candidate: Candidate; rational: Rational; s: ScoreVec } | null = null;
      for (const cand of candidates) {
        // Score the candidate on its state after any immediately-available collapse, not
        // its raw post-substitution form — this is what lets a substitution that unlocks a
        // Pythagorean/sum-difference collapse win, while one that just shuffles atoms
        // around without unlocking anything (and inflates the term count) loses.
        const collapsed = collapseFully(cand.rational, atoms);
        const s = scoreVector(collapsed, atoms, targetArgs);
        if (compareScore(s, score) < 0 && (!best || compareScore(s, best.s) < 0)) {
          best = { candidate: cand, rational: collapsed, s };
        }
      }
      if (!best) break;
      current = best.rational;
      score = best.s;
      steps.push({ law: best.candidate.ruleName, expr: formatRational(current), explanation: best.candidate.explanation });
    }

    return { type: "result", original: originalStr, simplified: formatRational(current), steps };
  } catch (err) {
    return { type: "error", message: err instanceof TrigIdentityError ? err.message : "שגיאה בעיבוד הביטוי" };
  }
}
