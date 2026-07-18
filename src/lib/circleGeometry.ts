/**
 * Circle-geometry engine (5-unit analytic geometry): identifies a circle's
 * center and radius from either the general form (x²+y²+Ax+By+C=0, via
 * completing the square) or the canonical form ((x-a)²+(y-b)²=R²), and finds
 * the tangent line at a given point on the circle (the radius to that point
 * is perpendicular to the tangent, m₁·m₂=-1).
 */

export class CircleGeometryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircleGeometryError";
  }
}

export interface CircleStep {
  law: string;
  expr: string;
}

export interface CircleData {
  centerX: number;
  centerY: number;
  radius: number;
}

export type CircleResult =
  | { type: "result"; circle: CircleData; generalExpr: string; canonicalExpr: string; steps: CircleStep[] }
  | { type: "error"; message: string };

export interface TangentPoint {
  x: number;
  y: number;
}

export type TangentResult =
  | { type: "result"; circle: CircleData; point: TangentPoint; slope: number | null; tangentExpr: string; steps: CircleStep[] }
  | { type: "error"; message: string };

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4 || 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function signedNum(v: number): string {
  return v >= 0 ? `+${formatNumber(v)}` : `-${formatNumber(-v)}`;
}

/** "(x-2)" for shift=2, "(x+3)" for shift=-3, bare "x" for shift=0 — the canonical (variable-shift) bracket. */
function centerBracket(variable: string, shift: number): string {
  if (Math.abs(shift) < 1e-9) return variable;
  return `(${variable}${shift > 0 ? "-" : "+"}${formatNumber(Math.abs(shift))})`;
}

function formatGeneralEquation(A: number, B: number, C: number): string {
  let out = "x^2+y^2";
  if (Math.abs(A) > 1e-9) out += `${signedNum(A)}x`;
  if (Math.abs(B) > 1e-9) out += `${signedNum(B)}y`;
  if (Math.abs(C) > 1e-9) out += signedNum(C);
  return `${out}=0`;
}

/** Splits on top-level +/- (not inside parens, and not the sign inside an exponent like x^-2). */
function splitSignedTerms(expr: string): string[] {
  const terms: string[] = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (depth === 0 && (ch === "+" || ch === "-") && current !== "" && expr[i - 1] !== "^") {
      terms.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) terms.push(current);
  return terms.filter((t) => t.trim() !== "");
}

/** Splits on top-level "+" only (canonical form never has a top-level "-" between the two squared terms). */
function splitTopLevelPlus(expr: string): string[] {
  const terms: string[] = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (depth === 0 && ch === "+" && current !== "") {
      terms.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) terms.push(current);
  return terms;
}

/* ------------------------------------------------------------------ */
/* Circle identification: general form <-> canonical form              */
/* ------------------------------------------------------------------ */

interface GeneralTerm {
  kind: "x2" | "y2" | "x" | "y" | "const";
  coefficient: number;
}

function parseGeneralTerm(raw: string): GeneralTerm {
  let s = raw;
  let sign = 1;
  if (s[0] === "+") s = s.slice(1);
  else if (s[0] === "-") {
    sign = -1;
    s = s.slice(1);
  }
  if (s === "") throw new CircleGeometryError("איבר ריק במשוואת המעגל");

  let m = s.match(/^(\d+(?:\.\d+)?)?x\^2$/i);
  if (m) return { kind: "x2", coefficient: sign * (m[1] ? parseFloat(m[1]) : 1) };

  m = s.match(/^(\d+(?:\.\d+)?)?y\^2$/i);
  if (m) return { kind: "y2", coefficient: sign * (m[1] ? parseFloat(m[1]) : 1) };

  m = s.match(/^(\d+(?:\.\d+)?)?x$/i);
  if (m) return { kind: "x", coefficient: sign * (m[1] ? parseFloat(m[1]) : 1) };

  m = s.match(/^(\d+(?:\.\d+)?)?y$/i);
  if (m) return { kind: "y", coefficient: sign * (m[1] ? parseFloat(m[1]) : 1) };

  if (/^[\d.]+$/.test(s)) return { kind: "const", coefficient: sign * parseFloat(s) };

  throw new CircleGeometryError(`איבר לא נתמך במשוואת המעגל: "${raw}" — נתמכים רק x², y², x, y ומספר קבוע (ללא איבר מעורב xy)`);
}

function parseGeneralForm(rawLeft: string): { A: number; B: number; C: number } {
  const terms = splitSignedTerms(rawLeft).map(parseGeneralTerm);
  let coeffX2 = 0;
  let coeffY2 = 0;
  let A = 0;
  let B = 0;
  let C = 0;
  for (const t of terms) {
    if (t.kind === "x2") coeffX2 += t.coefficient;
    else if (t.kind === "y2") coeffY2 += t.coefficient;
    else if (t.kind === "x") A += t.coefficient;
    else if (t.kind === "y") B += t.coefficient;
    else C += t.coefficient;
  }
  if (Math.abs(coeffX2) < 1e-9 || Math.abs(coeffY2) < 1e-9) {
    throw new CircleGeometryError("משוואת מעגל חייבת לכלול גם איבר x² וגם איבר y²");
  }
  if (Math.abs(coeffX2 - coeffY2) > 1e-9) {
    throw new CircleGeometryError("המקדמים של x² ו-y² חייבים להיות שווים (תנאי הכרחי למעגל)");
  }
  if (Math.abs(coeffX2 - 1) > 1e-9) {
    A /= coeffX2;
    B /= coeffX2;
    C /= coeffX2;
  }
  return { A, B, C };
}

/** Matches "(x-2)^2" / "(x+3)^2" / bare "x^2" (shift 0) for the given variable; returns the shift `a` in (variable-a)^2. */
function matchSquaredShift(term: string, variable: string): number | null {
  if (new RegExp(`^${variable}\\^2$`, "i").test(term)) return 0;
  const m = term.match(new RegExp(`^\\(${variable}([+-][0-9.]+)?\\)\\^2$`, "i"));
  if (!m) return null;
  return m[1] ? -parseFloat(m[1]) : 0;
}

function tryParseCanonical(rawLeft: string, rawRight: string): { a: number; b: number; r2: number } | null {
  const terms = splitTopLevelPlus(rawLeft);
  if (terms.length !== 2) return null;

  const xShift0 = matchSquaredShift(terms[0], "x");
  const yShift0 = matchSquaredShift(terms[0], "y");
  const xShift1 = matchSquaredShift(terms[1], "x");
  const yShift1 = matchSquaredShift(terms[1], "y");

  let a: number | null = null;
  let b: number | null = null;
  if (xShift0 !== null && yShift1 !== null) {
    a = xShift0;
    b = yShift1;
  } else if (yShift0 !== null && xShift1 !== null) {
    a = xShift1;
    b = yShift0;
  }
  if (a === null || b === null) return null;

  const r2 = parseFloat(rawRight);
  if (!Number.isFinite(r2)) return null;
  return { a, b, r2 };
}

/**
 * Identifies a circle's center and radius from either form. General form is
 * solved by completing the square for x and y independently; canonical form
 * is read off directly and expanded back to general form for display.
 */
export function analyzeCircle(input: string): CircleResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { type: "error", message: "נא להזין משוואת מעגל, בצורה כללית (x²+y²+Ax+By+C=0) או קנונית ((x-a)²+(y-b)²=R²)" };
  }
  if (!trimmed.includes("=")) return { type: "error", message: "משוואת המעגל חייבת לכלול סימן שוויון (=)" };

  const normalized = trimmed.replace(/\s+/g, "").replace(/\*\*/g, "^");
  const eqIdx = normalized.indexOf("=");
  const rawLeft = normalized.slice(0, eqIdx);
  const rawRight = normalized.slice(eqIdx + 1);
  if (!rawLeft || !rawRight) return { type: "error", message: "אחד מאגפי המשוואה ריק" };

  try {
    const steps: CircleStep[] = [];

    const canonical = rawLeft.includes("(") ? tryParseCanonical(rawLeft, rawRight) : null;
    if (canonical) {
      const { a, b, r2 } = canonical;
      if (r2 <= 0) throw new CircleGeometryError("הריבוע של הרדיוס (R²) חייב להיות מספר חיובי");
      const radius = Math.sqrt(r2);

      steps.push({
        law: "זיהוי המרכז והרדיוס מהצורה הקנונית",
        expr: `(x-a)²+(y-b)²=R²  ⇒  a=${formatNumber(a)}, b=${formatNumber(b)}, R²=${formatNumber(r2)}`,
      });
      steps.push({ law: "חישוב הרדיוס", expr: `R = √R² = √${formatNumber(r2)} = ${formatNumber(radius)}` });

      const generalA = -2 * a;
      const generalB = -2 * b;
      const generalC = a * a + b * b - r2;
      const generalExpr = formatGeneralEquation(generalA, generalB, generalC);
      steps.push({ law: "פתיחת הצורה הקנונית לצורה הכללית", expr: generalExpr });

      const canonicalExpr = `${centerBracket("x", a)}^2+${centerBracket("y", b)}^2=${formatNumber(r2)}`;
      return { type: "result", circle: { centerX: a, centerY: b, radius }, generalExpr, canonicalExpr, steps };
    }

    if (rawRight.trim() !== "0") {
      throw new CircleGeometryError("בצורה הכללית יש להזין משוואה השווה לאפס, למשל x²+y²-4x+6y-3=0");
    }
    const { A, B, C } = parseGeneralForm(rawLeft);
    steps.push({ law: "זיהוי המקדמים בצורה הכללית", expr: `x²+y²+Ax+By+C=0  ⇒  A=${formatNumber(A)}, B=${formatNumber(B)}, C=${formatNumber(C)}` });

    const a = -A / 2;
    const b = -B / 2;
    steps.push({ law: "השלמה לריבוע עבור x", expr: `x²${signedNum(A)}x = ${centerBracket("x", a)}² - ${formatNumber(a * a)}` });
    steps.push({ law: "השלמה לריבוע עבור y", expr: `y²${signedNum(B)}y = ${centerBracket("y", b)}² - ${formatNumber(b * b)}` });

    const r2 = a * a + b * b - C;
    if (r2 <= 0) {
      throw new CircleGeometryError(r2 === 0 ? "R²=0 — המשוואה מתארת נקודה בודדת, לא מעגל" : "R²<0 — המשוואה אינה מתארת מעגל ממשי");
    }
    const radius = Math.sqrt(r2);
    steps.push({
      law: "הרכבת הצורה הקנונית",
      expr: `${centerBracket("x", a)}² + ${centerBracket("y", b)}² = ${formatNumber(a * a)} + ${formatNumber(b * b)} - (${formatNumber(C)}) = ${formatNumber(r2)}`,
    });
    steps.push({ law: "חישוב הרדיוס", expr: `R = √${formatNumber(r2)} = ${formatNumber(radius)}` });

    const generalExpr = formatGeneralEquation(A, B, C);
    const canonicalExpr = `${centerBracket("x", a)}^2+${centerBracket("y", b)}^2=${formatNumber(r2)}`;
    return { type: "result", circle: { centerX: a, centerY: b, radius }, generalExpr, canonicalExpr, steps };
  } catch (err) {
    return { type: "error", message: err instanceof CircleGeometryError ? err.message : "שגיאה בעיבוד משוואת המעגל" };
  }
}

/* ------------------------------------------------------------------ */
/* Tangent line at a point on the circle                               */
/* ------------------------------------------------------------------ */

function parsePoint(raw: string): TangentPoint {
  const trimmed = raw.trim().replace(/^\(/, "").replace(/\)$/, "");
  const parts = trimmed.split(",");
  if (parts.length !== 2) throw new CircleGeometryError("יש להזין נקודה בצורה x0,y0 או (x0,y0)");
  const x = parseFloat(parts[0].trim());
  const y = parseFloat(parts[1].trim());
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new CircleGeometryError("קואורדינטות הנקודה אינן מספרים תקינים");
  return { x, y };
}

/**
 * Finds the tangent line to a circle at a point P known to lie on it: the
 * radius OP is perpendicular to the tangent (m_OP · m_tangent = -1), so the
 * tangent's slope is the negative reciprocal of the radius's slope. Reuses
 * analyzeCircle for the circle itself — its steps are prepended so the full
 * derivation (center/radius, then tangent) reads as one continuous trace.
 */
export function solveTangentLine(circleInput: string, pointInput: string): TangentResult {
  const circleAnalysis = analyzeCircle(circleInput);
  if (circleAnalysis.type === "error") return circleAnalysis;
  const { circle } = circleAnalysis;

  try {
    const trimmedPoint = pointInput.trim();
    if (!trimmedPoint) throw new CircleGeometryError("נא להזין את נקודת ההשקה P(x₀,y₀)");
    const point = parsePoint(trimmedPoint);

    const steps: CircleStep[] = [...circleAnalysis.steps];

    const distSq = (point.x - circle.centerX) ** 2 + (point.y - circle.centerY) ** 2;
    const r2 = circle.radius ** 2;
    const onCircle = Math.abs(distSq - r2) < 1e-4 * Math.max(1, r2);
    steps.push({
      law: "בדיקה שהנקודה P נמצאת על המעגל",
      expr: `(${formatNumber(point.x)}-${formatNumber(circle.centerX)})² + (${formatNumber(point.y)}-${formatNumber(circle.centerY)})² = ${formatNumber(distSq)} ${onCircle ? "=" : "≠"} R² = ${formatNumber(r2)}`,
    });
    if (!onCircle) throw new CircleGeometryError("הנקודה P אינה נמצאת על המעגל — בדקו את הקואורדינטות");

    const dx = point.x - circle.centerX;
    const dy = point.y - circle.centerY;

    if (Math.abs(dx) < 1e-9) {
      steps.push({ law: "שיפוע הרדיוס OP", expr: "הרדיוס אנכי (x₀=a)  ⇒  המשיק אופקי" });
      const tangentExpr = `y = ${formatNumber(point.y)}`;
      steps.push({ law: "משוואת המשיק", expr: tangentExpr });
      return { type: "result", circle, point, slope: 0, tangentExpr, steps };
    }

    const mRadius = dy / dx;
    steps.push({ law: "שיפוע הרדיוס OP", expr: `m_OP = (y₀-b)/(x₀-a) = ${formatNumber(dy)}/${formatNumber(dx)} = ${formatNumber(mRadius)}` });

    if (Math.abs(mRadius) < 1e-9) {
      steps.push({ law: "תנאי מאונכות: m_OP · m_משיק = -1", expr: "הרדיוס אופקי  ⇒  המשיק אנכי" });
      const tangentExpr = `x = ${formatNumber(point.x)}`;
      steps.push({ law: "משוואת המשיק", expr: tangentExpr });
      return { type: "result", circle, point, slope: null, tangentExpr, steps };
    }

    const mTangent = -1 / mRadius;
    steps.push({ law: "תנאי מאונכות: m_OP · m_משיק = -1", expr: `m_משיק = -1/m_OP = -1/${formatNumber(mRadius)} = ${formatNumber(mTangent)}` });

    const intercept = point.y - mTangent * point.x;
    const tangentExpr = `y = ${formatNumber(mTangent)}x ${signedNum(intercept)}`;
    steps.push({
      law: "הצבה בנוסחת הישר y-y₀=m(x-x₀)",
      expr: `y - ${formatNumber(point.y)} = ${formatNumber(mTangent)}(x-${formatNumber(point.x)})  ⇒  ${tangentExpr}`,
    });

    return { type: "result", circle, point, slope: mTangent, tangentExpr, steps };
  } catch (err) {
    return { type: "error", message: err instanceof CircleGeometryError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}
