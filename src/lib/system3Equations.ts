/**
 * Solver for a system of three linear equations in x, y and z
 * (a1x + b1y + c1z = d1, ...), using true Gaussian elimination (row
 * reduction to echelon form) with a full pedagogical step trace matching
 * the 5-unit bagrut format:
 *   step 0 - clear fractions in each equation individually (generic
 *            preprocessing, before any matrix work begins),
 *   step 1 - the tidied-up system,
 *   step 2 - the elimination process, shown as the augmented matrix going
 *            from its initial form to row-echelon form,
 *   step 3 - back-substitution to find all three unknowns,
 *   step 4 - the final result together with a check substituting it back
 *            into the three original equations.
 */

import type { SystemStep } from "@/lib/systemOfEquations";

export interface StandardEquation3 {
  a: number;
  b: number;
  c: number;
  d: number;
  raw: string;
}

export type System3Result =
  | {
      type: "unique";
      eq1: StandardEquation3;
      eq2: StandardEquation3;
      eq3: StandardEquation3;
      x: number;
      y: number;
      z: number;
      steps: SystemStep[];
    }
  | {
      type: "none";
      eq1: StandardEquation3;
      eq2: StandardEquation3;
      eq3: StandardEquation3;
      steps: SystemStep[];
    }
  | {
      type: "infinite";
      eq1: StandardEquation3;
      eq2: StandardEquation3;
      eq3: StandardEquation3;
      steps: SystemStep[];
      paramExpr: string;
    }
  | { type: "error"; message: string };

const TOL = 1e-9;
const LABELS = ["I", "II", "III"];

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

/** "p + q·t" (or just "p" when q = 0), used for the free-parameter case. */
function formatAffine(base: number, slope: number): string {
  if (Math.abs(slope) < TOL) return formatNumber(base);
  return `${formatNumber(base)} ${slope >= 0 ? "+" : "-"} ${formatNumber(Math.abs(slope))}t`;
}

/** Splits on top-level +/- (not the sign inside a leading term). */
function splitTerms(expr: string): string[] {
  const terms: string[] = [];
  let current = "";
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if ((ch === "+" || ch === "-") && current !== "") {
      terms.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) terms.push(current);
  return terms.filter((t) => t.trim() !== "");
}

interface ParsedTerm3 {
  variable: "x" | "y" | "z" | null;
  value: number;
  denom?: number;
}

/** Parses one term, allowing an optional numeric denominator, e.g. "x/2", "3y/4", "5/2". */
function parseTerm3(raw: string): ParsedTerm3 {
  let s = raw.replace(/\s+/g, "");
  let sign = 1;
  if (s[0] === "+") s = s.slice(1);
  else if (s[0] === "-") {
    sign = -1;
    s = s.slice(1);
  }
  s = s.replace(/\*/g, "");
  if (s === "") throw new Error(`איבר לא תקין: "${raw}"`);
  if (s.includes("^")) throw new Error("נתמכות רק משוואות לינאריות (ללא חזקות)");

  const match = s.match(/^(\d+(?:\.\d+)?)?([a-zA-Z])?(?:\/(\d+(?:\.\d+)?))?$/);
  if (!match || (!match[1] && !match[2])) {
    throw new Error(`איבר לא תקין: "${raw}"`);
  }
  const [, coefStr, varLetter, denomStr] = match;
  let value = varLetter ? (coefStr ? parseFloat(coefStr) : 1) : parseFloat(coefStr!);
  let denom: number | undefined;
  if (denomStr) {
    denom = parseFloat(denomStr);
    if (!Number.isFinite(denom) || denom === 0) throw new Error(`מכנה לא תקין באיבר: "${raw}"`);
    value /= denom;
  }
  value *= sign;

  if (varLetter) {
    const lower = varLetter.toLowerCase();
    if (lower !== "x" && lower !== "y" && lower !== "z") {
      throw new Error(`נתמכים רק המשתנים x, y ו-z (נמצא "${varLetter}")`);
    }
    return { variable: lower as "x" | "y" | "z", value, denom };
  }
  return { variable: null, value, denom };
}

function parseSide3(side: string): { x: number; y: number; z: number; c: number; denominators: number[] } {
  const normalized = side.replace(/\s+/g, "");
  if (normalized === "") throw new Error("נא להזין את שני אגפי המשוואה");
  let x = 0;
  let y = 0;
  let z = 0;
  let c = 0;
  const denominators: number[] = [];
  for (const rawTerm of splitTerms(normalized)) {
    const term = parseTerm3(rawTerm);
    if (term.denom !== undefined) denominators.push(term.denom);
    if (term.variable === "x") x += term.value;
    else if (term.variable === "y") y += term.value;
    else if (term.variable === "z") z += term.value;
    else c += term.value;
  }
  return { x, y, z, c, denominators };
}

interface RawEquation3 {
  a: number;
  b: number;
  c: number;
  d: number;
  denominators: number[];
  raw: string;
}

function parseLinearEquation3(input: string, ordinal: string): RawEquation3 {
  const trimmed = input.trim();
  if (!trimmed) throw new Error(`נא להזין את המשוואה ${ordinal}, למשל x + y + z = 6`);

  const equalsCount = (trimmed.match(/=/g) ?? []).length;
  if (equalsCount !== 1) throw new Error(`יש להזין במשוואה ${ordinal} סימן שוויון (=) יחיד`);

  const [rawLeft, rawRight] = trimmed.split("=");
  const left = parseSide3(rawLeft);
  const right = parseSide3(rawRight);

  const a = left.x - right.x;
  const b = left.y - right.y;
  const c = left.z - right.z;
  const d = right.c - left.c;

  if (a === 0 && b === 0 && c === 0) {
    throw new Error(`המשוואה ${ordinal} אינה תקינה — חסרים בה הנעלמים x, y ו-z`);
  }

  return { a, b, c, d, denominators: [...left.denominators, ...right.denominators], raw: `${rawLeft.trim()} = ${rawRight.trim()}` };
}

function formatLinearSide3(a: number, b: number, c: number): string {
  const terms: { coef: number; sym: string }[] = [];
  if (a !== 0) terms.push({ coef: a, sym: "x" });
  if (b !== 0) terms.push({ coef: b, sym: "y" });
  if (c !== 0) terms.push({ coef: c, sym: "z" });
  if (terms.length === 0) return "0";

  let out = "";
  terms.forEach((t, i) => {
    const absCoef = Math.abs(t.coef);
    const coefPart = absCoef === 1 ? "" : formatNumber(absCoef);
    const body = `${coefPart}${t.sym}`;
    const sign = t.coef < 0 ? "-" : "+";
    if (i === 0) out = sign === "-" ? `-${body}` : body;
    else out += ` ${sign} ${body}`;
  });
  return out;
}

function formatStandardEquation3(eq: { a: number; b: number; c: number; d: number }): string {
  return `${formatLinearSide3(eq.a, eq.b, eq.c)} = ${formatNumber(eq.d)}`;
}

function gcdNum(a: number, b: number): number {
  return b === 0 ? a : gcdNum(b, a % b);
}

/** Least common multiple of a list of denominators; null if any is non-integer (skip clearing). */
function lcmOf(nums: number[]): number | null {
  const ints = nums.filter((n) => Number.isInteger(n) && n > 0);
  if (ints.length !== nums.length || ints.length === 0) return null;
  let result = ints[0];
  for (let i = 1; i < ints.length; i++) result = (result * ints[i]) / gcdNum(result, ints[i]);
  return result > 100000 ? null : result;
}

function formatMatrixRow(row: [number, number, number, number]): string {
  const [a, b, c, d] = row;
  return `[ ${formatNumber(a)}  ${formatNumber(b)}  ${formatNumber(c)}  |  ${formatNumber(d)} ]`;
}

function formatMatrix(rows: [number, number, number, number][]): string {
  return rows.map(formatMatrixRow).join("   ");
}

export function solveSystem3(input1: string, input2: string, input3: string): System3Result {
  let raw: RawEquation3[];
  try {
    raw = [
      parseLinearEquation3(input1, "הראשונה"),
      parseLinearEquation3(input2, "השנייה"),
      parseLinearEquation3(input3, "השלישית"),
    ];
  } catch (err) {
    return { type: "error", message: err instanceof Error ? err.message : "שגיאה בעיבוד המשוואות" };
  }

  const steps: SystemStep[] = [];

  // Step 0: clear fractions in each equation individually (generic preprocessing).
  const cleanedLines: string[] = [];
  const eqs = raw.map((r, i) => {
    const lcm = r.denominators.length > 0 ? lcmOf(r.denominators) : null;
    if (lcm !== null && lcm > 1) {
      const scaled = { a: r.a * lcm, b: r.b * lcm, c: r.c * lcm, d: r.d * lcm };
      cleanedLines.push(`(${LABELS[i]}):  ${r.raw}   →   ×${formatNumber(lcm)}:   ${formatStandardEquation3(scaled)}`);
      return scaled;
    }
    return { a: r.a, b: r.b, c: r.c, d: r.d };
  });
  if (cleanedLines.length > 0) {
    steps.push({ label: "שלב 0: פישוט המערכת (ניקוי שברים)", expr: cleanedLines.join("      ") });
  }

  const eq1: StandardEquation3 = { ...eqs[0], raw: formatStandardEquation3(eqs[0]) };
  const eq2: StandardEquation3 = { ...eqs[1], raw: formatStandardEquation3(eqs[1]) };
  const eq3: StandardEquation3 = { ...eqs[2], raw: formatStandardEquation3(eqs[2]) };
  const stdEqs = [eq1, eq2, eq3];

  steps.push({
    label: "שלב 1: המערכת המסודרת",
    expr: `(I)  ${eq1.raw}      (II)  ${eq2.raw}      (III)  ${eq3.raw}`,
  });

  const initialMatrix: [number, number, number, number][] = eqs.map((e) => [e.a, e.b, e.c, e.d]);

  // Eliminate x using whichever row has a nonzero x-coefficient as pivot.
  const pivotIdx = eqs.findIndex((e) => Math.abs(e.a) > TOL);
  if (pivotIdx === -1) {
    return { type: "error", message: "המשתנה x אינו מופיע באף אחת מהמשוואות — לא ניתן לדרג את המערכת" };
  }
  const otherIdx = [0, 1, 2].filter((i) => i !== pivotIdx);
  const pivot = eqs[pivotIdx];

  const reduced = otherIdx.map((i) => {
    const eq = eqs[i];
    const factor = eq.a / pivot.a;
    return { b: eq.b - factor * pivot.b, c: eq.c - factor * pivot.c, d: eq.d - factor * pivot.d };
  });
  const [row1, row2] = reduced; // row1 <-> otherIdx[0], row2 <-> otherIdx[1]

  // Eliminate y using whichever of the two reduced rows has a nonzero y-coefficient as pivot.
  const yPivotPos: 0 | 1 | null = Math.abs(row1.b) > TOL ? 0 : Math.abs(row2.b) > TOL ? 1 : null;

  /** Builds the 3x4 augmented matrix: the pivot row plus two explicit [b,c,d] rows at their original indices. */
  const buildMatrix = (
    entries: { idx: number; row: [number, number, number] }[],
  ): [number, number, number, number][] => {
    const rowFor = (idx: number): [number, number, number, number] => {
      if (idx === pivotIdx) return [pivot.a, pivot.b, pivot.c, pivot.d];
      const found = entries.find((e) => e.idx === idx);
      return found ? [0, ...found.row] : [0, 0, 0, 0];
    };
    return [rowFor(0), rowFor(1), rowFor(2)];
  };

  const matrixStep = (matrix: [number, number, number, number][]): SystemStep => ({
    label: "שלב 2: תהליך הדירוג (מטריצה מדורגת)",
    expr: `מטריצה מורחבת התחלתית:   ${formatMatrix(initialMatrix)}   →   מטריצה מדורגת:   ${formatMatrix(matrix)}`,
  });

  if (yPivotPos === null) {
    // y vanished from both reduced rows — each is a pure z-equation (or trivial): check their mutual consistency.
    const [rowA, rowB] = [row1, row2];
    steps.push(
      matrixStep(
        buildMatrix([
          { idx: otherIdx[0], row: [0, rowA.c, rowA.d] },
          { idx: otherIdx[1], row: [0, rowB.c, rowB.d] },
        ]),
      ),
    );

    const zOf = (r: { c: number; d: number }): number | null => (Math.abs(r.c) > TOL ? r.d / r.c : null);
    const zA = zOf(rowA);
    const zB = zOf(rowB);

    let z: number | null = null;
    let consistent = true;
    if (zA !== null && zB !== null) {
      consistent = Math.abs(zA - zB) < 1e-6;
      z = zA;
    } else if (zA !== null) {
      z = zA;
      consistent = Math.abs(rowB.d) < TOL; // rowB is trivial (0 = 0) to be consistent
    } else if (zB !== null) {
      z = zB;
      consistent = Math.abs(rowA.d) < TOL;
    } else {
      consistent = Math.abs(rowA.d) < TOL && Math.abs(rowB.d) < TOL;
    }

    if (!consistent) {
      steps.push({ label: "שלב 3: תוצאה", expr: "שתי המשוואות שנותרו סותרות (מתקבלים ערכי z שונים / 0 = מספר שונה מאפס)" });
      steps.push({
        label: "שלב 4: תוצאה סופית",
        expr: "אין פתרון למערכת (∅) — שלושת המישורים אינם נחתכים בנקודה משותפת",
      });
      return { type: "none", eq1, eq2, eq3, steps };
    }

    if (z === null) {
      // y and z both vanished entirely — two degrees of freedom.
      steps.push({ label: "שלב 3: תוצאה", expr: "y ו-z חופשיים לחלוטין (דרגת חופש 2)" });
      return { type: "infinite", eq1, eq2, eq3, steps, paramExpr: "אינסוף פתרונות (דרגת חופש גבוהה מ-1)" };
    }

    const x0 = (pivot.d - pivot.c * z) / pivot.a;
    steps.push({
      label: "שלב 3: מציאת הנעלמים (הצבה לאחור)",
      expr: `z = ${formatNumber(z)}   (y חופשי, y = t)   ⇒   x = ${formatAffine(x0, -pivot.b / pivot.a)}`,
    });
    const paramExpr = `x = ${formatAffine(x0, -pivot.b / pivot.a)},  y = t,  z = ${formatNumber(z)}   (t ∈ ℝ)`;
    steps.push({ label: "שלב 4: תוצאה סופית", expr: `אינסוף פתרונות: ${paramExpr}` });
    return { type: "infinite", eq1, eq2, eq3, steps, paramExpr };
  }

  const yPivotRow = yPivotPos === 0 ? row1 : row2;
  const otherRow = yPivotPos === 0 ? row2 : row1;
  const yPivotOriginalIdx = otherIdx[yPivotPos];
  const otherOriginalIdx = otherIdx[1 - yPivotPos];

  const factor2 = otherRow.b / yPivotRow.b;
  const finalRow = { c: otherRow.c - factor2 * yPivotRow.c, d: otherRow.d - factor2 * yPivotRow.d };

  const echelonMatrix = buildMatrix([
    { idx: yPivotOriginalIdx, row: [yPivotRow.b, yPivotRow.c, yPivotRow.d] },
    { idx: otherOriginalIdx, row: [0, finalRow.c, finalRow.d] },
  ]);
  steps.push(matrixStep(echelonMatrix));

  if (Math.abs(finalRow.c) < TOL) {
    if (Math.abs(finalRow.d) < TOL) {
      const p = yPivotRow.d / yPivotRow.b;
      const q = -yPivotRow.c / yPivotRow.b;
      const x0 = (pivot.d - pivot.b * p) / pivot.a;
      const x1 = -(pivot.b * q + pivot.c) / pivot.a;
      steps.push({
        label: "שלב 3: מציאת הנעלמים (הצבה לאחור)",
        expr: `השורה האחרונה 0 = 0 ⇒ z = t חופשי   ⇒   y = ${formatAffine(p, q)}   ⇒   x = ${formatAffine(x0, x1)}`,
      });
      const paramExpr = `x = ${formatAffine(x0, x1)},  y = ${formatAffine(p, q)},  z = t   (t ∈ ℝ)`;
      steps.push({ label: "שלב 4: תוצאה סופית", expr: `אינסוף פתרונות: ${paramExpr}` });
      return { type: "infinite", eq1, eq2, eq3, steps, paramExpr };
    }
    steps.push({ label: "שלב 3: תוצאה", expr: "השורה האחרונה 0 = מספר שונה מאפס  ⇒  המערכת סותרת" });
    steps.push({
      label: "שלב 4: תוצאה סופית",
      expr: "אין פתרון למערכת (∅) — שלושת המישורים אינם נחתכים בנקודה משותפת",
    });
    return { type: "none", eq1, eq2, eq3, steps };
  }

  const z = finalRow.d / finalRow.c;
  const y = (yPivotRow.d - yPivotRow.c * z) / yPivotRow.b;
  const x = (pivot.d - pivot.b * y - pivot.c * z) / pivot.a;

  steps.push({
    label: "שלב 3: מציאת הנעלמים (הצבה לאחור)",
    expr: `z = ${formatNumber(finalRow.d)} / ${formatNumber(finalRow.c)} = ${formatNumber(z)}   ⇒   y = ${formatNumber(y)}   ⇒   x = ${formatNumber(x)}`,
  });

  const check = (eq: StandardEquation3, label: string) => {
    const lhs = eq.a * x + eq.b * y + eq.c * z;
    const ok = Math.abs(lhs - eq.d) < 1e-6;
    return `(${label}):  ${formatNumber(eq.a)}(${formatNumber(x)}) + ${formatNumber(eq.b)}(${formatNumber(y)}) + ${formatNumber(eq.c)}(${formatNumber(z)}) = ${formatNumber(lhs)} ${ok ? "✓" : "✗"}`;
  };
  steps.push({
    label: "שלב 4: תוצאה סופית ובדיקה",
    expr: `x = ${formatNumber(x)},  y = ${formatNumber(y)},  z = ${formatNumber(z)}   →   בדיקה:   ${check(stdEqs[0], "I")}      ${check(stdEqs[1], "II")}      ${check(stdEqs[2], "III")}`,
  });

  return { type: "unique", eq1, eq2, eq3, x, y, z, steps };
}
