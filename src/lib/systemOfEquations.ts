/**
 * Solver for a system of two linear equations in x and y (e.g. "x + y = 5",
 * "2x - y = 1"). Supports both the substitution method and the elimination
 * (coefficient-comparison) method with a full pedagogical step trace, and
 * flags the no-solution (parallel) / infinite-solutions (coincident) cases.
 */

export interface SystemStep {
  label: string;
  expr: string;
}

export type SystemMethod = "substitution" | "elimination";

export interface StandardEquation {
  a: number;
  b: number;
  c: number;
  raw: string;
}

export type SystemResult =
  | {
      type: "unique";
      method: SystemMethod;
      eq1: StandardEquation;
      eq2: StandardEquation;
      x: number;
      y: number;
      steps: SystemStep[];
    }
  | {
      type: "none";
      method: SystemMethod;
      eq1: StandardEquation;
      eq2: StandardEquation;
      steps: SystemStep[];
    }
  | {
      type: "infinite";
      method: SystemMethod;
      eq1: StandardEquation;
      eq2: StandardEquation;
      steps: SystemStep[];
      paramExpr: string;
    }
  | { type: "error"; message: string };

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

/** Splits on top-level +/- (not the sign inside a leading exponent-less term). */
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

interface ParsedTerm {
  variable: "x" | "y" | null;
  value: number;
}

/** Parses one term, allowing an optional numeric denominator, e.g. "x/2", "3y/4", "5/2". */
function parseTerm(raw: string): ParsedTerm {
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
  if (denomStr) {
    const denom = parseFloat(denomStr);
    if (!Number.isFinite(denom) || denom === 0) throw new Error(`מכנה לא תקין באיבר: "${raw}"`);
    value /= denom;
  }
  value *= sign;

  if (varLetter) {
    const lower = varLetter.toLowerCase();
    if (lower !== "x" && lower !== "y") {
      throw new Error(`נתמכים רק המשתנים x ו-y (נמצא "${varLetter}")`);
    }
    return { variable: lower, value };
  }
  return { variable: null, value };
}

function parseSide(side: string): { x: number; y: number; c: number } {
  const normalized = side.replace(/\s+/g, "");
  if (normalized === "") throw new Error("נא להזין את שני אגפי המשוואה");
  let x = 0;
  let y = 0;
  let c = 0;
  for (const rawTerm of splitTerms(normalized)) {
    const term = parseTerm(rawTerm);
    if (term.variable === "x") x += term.value;
    else if (term.variable === "y") y += term.value;
    else c += term.value;
  }
  return { x, y, c };
}

function parseLinearEquation(input: string, ordinal: string): { a: number; b: number; c: number } {
  const trimmed = input.trim();
  if (!trimmed) throw new Error(`נא להזין את המשוואה ${ordinal}, למשל x + y = 5`);

  const equalsCount = (trimmed.match(/=/g) ?? []).length;
  if (equalsCount !== 1) throw new Error(`יש להזין במשוואה ${ordinal} סימן שוויון (=) יחיד`);

  const [rawLeft, rawRight] = trimmed.split("=");
  const left = parseSide(rawLeft);
  const right = parseSide(rawRight);

  const a = left.x - right.x;
  const b = left.y - right.y;
  const c = right.c - left.c;

  if (a === 0 && b === 0) {
    throw new Error(`המשוואה ${ordinal} אינה תקינה — חסרים בה הנעלמים x ו-y`);
  }

  return { a, b, c };
}

function formatLinearSide(a: number, b: number): string {
  const terms: { coef: number; sym: string }[] = [];
  if (a !== 0) terms.push({ coef: a, sym: "x" });
  if (b !== 0) terms.push({ coef: b, sym: "y" });
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

function formatStandardEquation(a: number, b: number, c: number): string {
  return `${formatLinearSide(a, b)} = ${formatNumber(c)}`;
}

/** Formats "m·x + k" (used for an isolated y = m x + k expression). */
function formatSlopeIntercept(m: number, k: number): string {
  if (m === 0) return formatNumber(k);
  const absM = Math.abs(m);
  const coefPart = absM === 1 ? "" : formatNumber(absM);
  let out = `${m < 0 ? "-" : ""}${coefPart}x`;
  if (k !== 0) out += ` ${k < 0 ? "-" : "+"} ${formatNumber(Math.abs(k))}`;
  return out;
}

function substitutionSteps(
  a1: number,
  b1: number,
  c1: number,
  a2: number,
  b2: number,
  c2: number,
  steps: SystemStep[],
): { x: number; y: number } {
  if (b1 === 0) {
    const xVal = c1 / a1;
    steps.push({
      label: "שלב 3: בידוד נעלם ממשוואה (I)",
      expr: `${formatNumber(a1)}x = ${formatNumber(c1)}  ⇒  x = ${formatNumber(xVal)}`,
    });
    const yVal = (c2 - a2 * xVal) / b2;
    steps.push({
      label: "שלב 4: הצבה במשוואה (II)",
      expr: `${formatNumber(a2)}·(${formatNumber(xVal)}) + ${formatNumber(b2)}y = ${formatNumber(c2)}  ⇒  y = ${formatNumber(yVal)}`,
    });
    steps.push({ label: "שלב 5: תוצאה סופית", expr: `x = ${formatNumber(xVal)},  y = ${formatNumber(yVal)}` });
    return { x: xVal, y: yVal };
  }

  const m = -a1 / b1;
  const k = c1 / b1;
  steps.push({
    label: "שלב 3: בידוד y ממשוואה (I)",
    expr: `y = (${formatNumber(c1)} - ${formatNumber(a1)}x) / ${formatNumber(b1)}  ⇒  y = ${formatSlopeIntercept(m, k)}`,
  });

  const coefA = a2 + b2 * m;
  const coefB = c2 - b2 * k;
  const xVal = coefB / coefA;
  steps.push({
    label: "שלב 4: הצבה במשוואה (II)",
    expr: `${formatNumber(a2)}x + ${formatNumber(b2)}(${formatSlopeIntercept(m, k)}) = ${formatNumber(c2)}  ⇒  x = ${formatNumber(xVal)}`,
  });

  const yVal = m * xVal + k;
  steps.push({
    label: "שלב 5: הצבה חוזרת למציאת y",
    expr: `y = ${formatSlopeIntercept(m, k)} = ${formatNumber(yVal)}`,
  });

  return { x: xVal, y: yVal };
}

function eliminationSteps(
  a1: number,
  b1: number,
  c1: number,
  a2: number,
  b2: number,
  c2: number,
  steps: SystemStep[],
): { x: number; y: number } {
  steps.push({
    label: "שלב 3: הכפלת המשוואות לביטול y",
    expr: `(I)×(${formatNumber(b2)}):  ${formatNumber(a1 * b2)}x + ${formatNumber(b1 * b2)}y = ${formatNumber(c1 * b2)}   |   (II)×(${formatNumber(b1)}):  ${formatNumber(a2 * b1)}x + ${formatNumber(b2 * b1)}y = ${formatNumber(c2 * b1)}`,
  });
  const xCoef = a1 * b2 - a2 * b1;
  const xConst = c1 * b2 - c2 * b1;
  const xVal = xConst / xCoef;
  steps.push({
    label: "שלב 4: חיסור המשוואות ופתרון עבור x",
    expr: `${formatNumber(xCoef)}x = ${formatNumber(xConst)}  ⇒  x = ${formatNumber(xVal)}`,
  });

  steps.push({
    label: "שלב 5: הכפלת המשוואות לביטול x",
    expr: `(I)×(${formatNumber(a2)}):  ${formatNumber(a1 * a2)}x + ${formatNumber(b1 * a2)}y = ${formatNumber(c1 * a2)}   |   (II)×(${formatNumber(a1)}):  ${formatNumber(a2 * a1)}x + ${formatNumber(b2 * a1)}y = ${formatNumber(c2 * a1)}`,
  });
  const yCoef = b1 * a2 - b2 * a1;
  const yConst = c1 * a2 - c2 * a1;
  const yVal = yConst / yCoef;
  steps.push({
    label: "שלב 6: חיסור המשוואות ופתרון עבור y",
    expr: `${formatNumber(yCoef)}y = ${formatNumber(yConst)}  ⇒  y = ${formatNumber(yVal)}`,
  });

  steps.push({ label: "שלב 7: תוצאה סופית", expr: `x = ${formatNumber(xVal)},  y = ${formatNumber(yVal)}` });
  return { x: xVal, y: yVal };
}

export function solveSystem(input1: string, input2: string, method: SystemMethod): SystemResult {
  let raw1: { a: number; b: number; c: number };
  let raw2: { a: number; b: number; c: number };
  try {
    raw1 = parseLinearEquation(input1, "הראשונה");
    raw2 = parseLinearEquation(input2, "השנייה");
  } catch (err) {
    return { type: "error", message: err instanceof Error ? err.message : "שגיאה בעיבוד המשוואות" };
  }

  const { a: a1, b: b1, c: c1 } = raw1;
  const { a: a2, b: b2, c: c2 } = raw2;

  const eq1: StandardEquation = { a: a1, b: b1, c: c1, raw: formatStandardEquation(a1, b1, c1) };
  const eq2: StandardEquation = { a: a2, b: b2, c: c2, raw: formatStandardEquation(a2, b2, c2) };

  const steps: SystemStep[] = [
    { label: "שלב 1: רישום שתי המשוואות", expr: `(I)  ${eq1.raw}      (II)  ${eq2.raw}` },
    {
      label: "שלב 2: בחירת שיטת הפתרון",
      expr: method === "substitution" ? "שיטת ההצבה" : "שיטת השוואת המקדמים (חיבור/חיסור)",
    },
  ];

  const D = a1 * b2 - a2 * b1;
  const Dx = c1 * b2 - c2 * b1;
  const Dy = a1 * c2 - a2 * c1;

  if (D === 0) {
    if (Dx === 0 && Dy === 0) {
      steps.push({
        label: "שלב 3: בדיקת יחס המקדמים",
        expr: `a1·b2 = a2·b1 וגם a1·c2 = a2·c1  ⇒  המשוואות תלויות ומייצגות אותו קו`,
      });
      const paramExpr =
        b1 !== 0 ? `y = ${formatSlopeIntercept(-a1 / b1, c1 / b1)}` : `x = ${formatNumber(c1 / a1)}`;
      steps.push({
        label: "שלב 4: תוצאה סופית",
        expr: `אינסוף פתרונות — כל נקודה המקיימת ${paramExpr} היא פתרון של המערכת`,
      });
      return { type: "infinite", method, eq1, eq2, steps, paramExpr };
    }

    steps.push({
      label: "שלב 3: בדיקת יחס המקדמים",
      expr: `a1·b2 = a2·b1 (${formatNumber(a1 * b2)} = ${formatNumber(a2 * b1)}) אך אין קבוע משותף  ⇒  הישרים מקבילים`,
    });
    steps.push({ label: "שלב 4: תוצאה סופית", expr: "אין פתרון למערכת (∅)" });
    return { type: "none", method, eq1, eq2, steps };
  }

  const { x, y } =
    method === "substitution"
      ? substitutionSteps(a1, b1, c1, a2, b2, c2, steps)
      : eliminationSteps(a1, b1, c1, a2, b2, c2, steps);

  return { type: "unique", method, eq1, eq2, x, y, steps };
}
