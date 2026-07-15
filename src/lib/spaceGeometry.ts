/**
 * Space-geometry engine (5-unit level), two independent halves:
 *
 * Point geometry in R³ — distance between two points, midpoint, the vector
 * AB, collinearity of three points (via component-ratio / cross-product
 * test), and dividing a segment in a given ratio m:n measured from A.
 *
 * Solid geometry — box (a×b×c), cube (a), and a right square pyramid
 * (base edge a, height h): volume, surface area, diagonals/slant lengths,
 * and the characteristic angles to the base plane (reported in degrees,
 * the way bagrut answers expect them).
 *
 * Every result carries pedagogical steps with the formula and substitution.
 */

export class SpaceGeometryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpaceGeometryError";
  }
}

export type Point3 = [number, number, number];

export interface GeoStep {
  law: string;
  expr: string;
}

/* ------------------------------------------------------------------ */
/* Shared formatting                                                   */
/* ------------------------------------------------------------------ */

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4 || 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function wrapNeg(n: number): string {
  return n < 0 ? `(${formatNumber(n)})` : formatNumber(n);
}

function formatPoint(p: Point3): string {
  return `(${p.map(formatNumber).join(", ")})`;
}

function formatVec(p: Point3): string {
  return `[${p.map(formatNumber).join(", ")}]`;
}

const toDeg = (rad: number) => (rad * 180) / Math.PI;

/* ------------------------------------------------------------------ */
/* Point geometry                                                      */
/* ------------------------------------------------------------------ */

export type PointOp = "distance" | "midpoint" | "vectorAB" | "collinear" | "divideRatio";

export type PointGeoResult =
  | {
      type: "result";
      op: PointOp;
      point?: Point3;
      vector?: Point3;
      scalar?: number;
      collinear?: boolean;
      steps: GeoStep[];
    }
  | { type: "error"; message: string };

function vecAB(a: Point3, b: Point3): Point3 {
  return [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
}

function cross(u: Point3, v: Point3): Point3 {
  return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
}

export function solvePointGeometry(
  op: PointOp,
  A: Point3,
  B: Point3,
  C?: Point3,
  ratioM?: number,
  ratioN?: number,
): PointGeoResult {
  try {
    const steps: GeoStep[] = [];

    if (op === "distance") {
      const d = vecAB(A, B);
      const sumSq = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
      const dist = Math.sqrt(sumSq);
      steps.push({
        law: "נוסחת המרחק בין שתי נקודות במרחב",
        expr: `AB = √((x₂-x₁)² + (y₂-y₁)² + (z₂-z₁)²)`,
      });
      steps.push({
        law: "הצבה",
        expr: `AB = √((${wrapNeg(B[0])}-${wrapNeg(A[0])})² + (${wrapNeg(B[1])}-${wrapNeg(A[1])})² + (${wrapNeg(B[2])}-${wrapNeg(A[2])})²) = √${formatNumber(sumSq)} = ${formatNumber(dist)}`,
      });
      steps.push({ law: "תוצאה סופית", expr: `AB = ${formatNumber(dist)}` });
      return { type: "result", op, scalar: dist, steps };
    }

    if (op === "midpoint") {
      const m: Point3 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
      steps.push({
        law: "נוסחת אמצע קטע",
        expr: `M = ((x₁+x₂)/2, (y₁+y₂)/2, (z₁+z₂)/2)`,
      });
      steps.push({
        law: "הצבה",
        expr: `M = ((${wrapNeg(A[0])}+${wrapNeg(B[0])})/2, (${wrapNeg(A[1])}+${wrapNeg(B[1])})/2, (${wrapNeg(A[2])}+${wrapNeg(B[2])})/2) = ${formatPoint(m)}`,
      });
      steps.push({ law: "תוצאה סופית", expr: `M = ${formatPoint(m)}` });
      return { type: "result", op, point: m, steps };
    }

    if (op === "vectorAB") {
      const d = vecAB(A, B);
      steps.push({ law: "וקטור בין שתי נקודות", expr: `AB = B - A = (x₂-x₁, y₂-y₁, z₂-z₁)` });
      steps.push({
        law: "הצבה",
        expr: `AB = (${wrapNeg(B[0])}-${wrapNeg(A[0])}, ${wrapNeg(B[1])}-${wrapNeg(A[1])}, ${wrapNeg(B[2])}-${wrapNeg(A[2])}) = ${formatVec(d)}`,
      });
      steps.push({ law: "תוצאה סופית", expr: `AB = ${formatVec(d)}` });
      return { type: "result", op, vector: d, steps };
    }

    if (op === "collinear") {
      if (!C) throw new SpaceGeometryError("נדרשת נקודה שלישית C לבדיקת קולינאריות");
      const ab = vecAB(A, B);
      const ac = vecAB(A, C);
      const cr = cross(ab, ac);
      const isCollinear = Math.abs(cr[0]) < 1e-9 && Math.abs(cr[1]) < 1e-9 && Math.abs(cr[2]) < 1e-9;
      steps.push({
        law: "בניית הווקטורים AB ו-AC",
        expr: `AB = ${formatVec(ab)},   AC = ${formatVec(ac)}`,
      });
      steps.push({
        law: "שלוש נקודות על ישר אחד ⇔ AB ו-AC מקבילים (המכפלה הווקטורית היא וקטור האפס)",
        expr: `AB × AC = ${formatVec(cr)}`,
      });
      steps.push({
        law: "תוצאה סופית",
        expr: isCollinear
          ? "AB × AC = [0, 0, 0]  ⇒  הנקודות A, B, C נמצאות על ישר אחד (קולינאריות)"
          : "AB × AC ≠ [0, 0, 0]  ⇒  הנקודות A, B, C אינן על ישר אחד",
      });
      return { type: "result", op, collinear: isCollinear, vector: cr, steps };
    }

    // divideRatio
    if (ratioM === undefined || ratioN === undefined) {
      throw new SpaceGeometryError("נדרש יחס m:n לחלוקת הקטע");
    }
    if (!(ratioM > 0) || !(ratioN > 0)) {
      throw new SpaceGeometryError("היחס m:n חייב להיות חיובי (חלוקה פנימית)");
    }
    const t = ratioM / (ratioM + ratioN);
    const p: Point3 = [A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1]), A[2] + t * (B[2] - A[2])];
    steps.push({
      law: `נקודה המחלקת את AB ביחס m:n = ${formatNumber(ratioM)}:${formatNumber(ratioN)} (נמדד מ-A)`,
      expr: `P = A + (m/(m+n))·(B - A),   m/(m+n) = ${formatNumber(ratioM)}/${formatNumber(ratioM + ratioN)} = ${formatNumber(t)}`,
    });
    steps.push({
      law: "הצבה רכיב-רכיב",
      expr: `P = (${wrapNeg(A[0])} + ${formatNumber(t)}·${wrapNeg(B[0] - A[0])}, ${wrapNeg(A[1])} + ${formatNumber(t)}·${wrapNeg(B[1] - A[1])}, ${wrapNeg(A[2])} + ${formatNumber(t)}·${wrapNeg(B[2] - A[2])}) = ${formatPoint(p)}`,
    });
    steps.push({ law: "תוצאה סופית", expr: `P = ${formatPoint(p)}` });
    return { type: "result", op, point: p, steps };
  } catch (err) {
    return { type: "error", message: err instanceof SpaceGeometryError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}

/* ------------------------------------------------------------------ */
/* Solid geometry                                                      */
/* ------------------------------------------------------------------ */

export type SolidKind = "box" | "cube" | "squarePyramid";

export interface SolidMeasure {
  label: string;
  symbol: string;
  value: number;
}

export type SolidResult =
  | { type: "result"; kind: SolidKind; measures: SolidMeasure[]; steps: GeoStep[] }
  | { type: "error"; message: string };

export function solveSolid(kind: SolidKind, dims: { a?: number; b?: number; c?: number; h?: number }): SolidResult {
  try {
    const steps: GeoStep[] = [];
    const measures: SolidMeasure[] = [];

    const requirePositive = (value: number | undefined, label: string): number => {
      if (value === undefined || !(value > 0)) {
        throw new SpaceGeometryError(`המידה ${label} חייבת להיות מספר חיובי`);
      }
      return value;
    };

    if (kind === "box" || kind === "cube") {
      const a = requirePositive(dims.a, "a");
      const b = kind === "cube" ? a : requirePositive(dims.b, "b");
      const c = kind === "cube" ? a : requirePositive(dims.c, "c");

      const volume = a * b * c;
      const surface = 2 * (a * b + b * c + a * c);
      const baseDiag = Math.sqrt(a * a + b * b);
      const spaceDiag = Math.sqrt(a * a + b * b + c * c);
      const angleDeg = toDeg(Math.atan(c / baseDiag));

      steps.push({
        law: "נפח תיבה: V = a·b·c",
        expr: `V = ${formatNumber(a)}·${formatNumber(b)}·${formatNumber(c)} = ${formatNumber(volume)}`,
      });
      steps.push({
        law: "שטח פנים: S = 2(ab + bc + ac)",
        expr: `S = 2(${formatNumber(a * b)} + ${formatNumber(b * c)} + ${formatNumber(a * c)}) = ${formatNumber(surface)}`,
      });
      steps.push({
        law: "אלכסון הבסיס (פיתגורס במישור הבסיס)",
        expr: `d₁ = √(a² + b²) = √(${formatNumber(a * a)} + ${formatNumber(b * b)}) = ${formatNumber(baseDiag)}`,
      });
      steps.push({
        law: "אלכסון התיבה (פיתגורס במרחב)",
        expr: `d = √(a² + b² + c²) = √${formatNumber(a * a + b * b + c * c)} = ${formatNumber(spaceDiag)}`,
      });
      steps.push({
        law: "הזווית בין אלכסון התיבה למישור הבסיס: ההיטל של האלכסון על הבסיס הוא אלכסון הבסיס",
        expr: `tanθ = c/d₁ = ${formatNumber(c)}/${formatNumber(baseDiag)} = ${formatNumber(c / baseDiag)}  →  θ = ${formatNumber(angleDeg)}°`,
      });

      measures.push({ label: "נפח", symbol: "V", value: volume });
      measures.push({ label: "שטח פנים", symbol: "S", value: surface });
      measures.push({ label: "אלכסון הבסיס", symbol: "d₁", value: baseDiag });
      measures.push({ label: "אלכסון התיבה", symbol: "d", value: spaceDiag });
      measures.push({ label: "זווית האלכסון עם הבסיס", symbol: "θ", value: angleDeg });
      return { type: "result", kind, measures, steps };
    }

    // squarePyramid
    const a = requirePositive(dims.a, "a (צלע הבסיס)");
    const h = requirePositive(dims.h, "h (הגובה)");

    const volume = (a * a * h) / 3;
    const apothem = Math.sqrt(h * h + (a / 2) * (a / 2));
    const halfDiag = (a * Math.SQRT2) / 2;
    const lateralEdge = Math.sqrt(h * h + halfDiag * halfDiag);
    const surface = a * a + 2 * a * apothem;
    const faceAngleDeg = toDeg(Math.atan(h / (a / 2)));
    const edgeAngleDeg = toDeg(Math.atan(h / halfDiag));

    steps.push({
      law: "נפח פירמידה: V = (1/3)·שטח הבסיס·h",
      expr: `V = (1/3)·${formatNumber(a * a)}·${formatNumber(h)} = ${formatNumber(volume)}`,
    });
    steps.push({
      law: "אפותמה (גובה פאה צדדית) — פיתגורס במשולש שבין הגובה, מחצית צלע הבסיס והאפותמה",
      expr: `m = √(h² + (a/2)²) = √(${formatNumber(h * h)} + ${formatNumber((a / 2) * (a / 2))}) = ${formatNumber(apothem)}`,
    });
    steps.push({
      law: "מחצית אלכסון הבסיס",
      expr: `d/2 = a·√2/2 = ${formatNumber(halfDiag)}`,
    });
    steps.push({
      law: "מקצוע צדדי — פיתגורס בין הגובה למחצית האלכסון",
      expr: `l = √(h² + (d/2)²) = √(${formatNumber(h * h)} + ${formatNumber(halfDiag * halfDiag)}) = ${formatNumber(lateralEdge)}`,
    });
    steps.push({
      law: "שטח פנים: S = a² + 4·(a·m/2) = a² + 2am",
      expr: `S = ${formatNumber(a * a)} + 2·${formatNumber(a)}·${formatNumber(apothem)} = ${formatNumber(surface)}`,
    });
    steps.push({
      law: "הזווית בין פאה צדדית לבסיס: ההיטל של האפותמה על הבסיס הוא a/2",
      expr: `tanα = h/(a/2) = ${formatNumber(h)}/${formatNumber(a / 2)}  →  α = ${formatNumber(faceAngleDeg)}°`,
    });
    steps.push({
      law: "הזווית בין מקצוע צדדי לבסיס: ההיטל של המקצוע על הבסיס הוא מחצית האלכסון",
      expr: `tanβ = h/(d/2) = ${formatNumber(h)}/${formatNumber(halfDiag)}  →  β = ${formatNumber(edgeAngleDeg)}°`,
    });

    measures.push({ label: "נפח", symbol: "V", value: volume });
    measures.push({ label: "שטח פנים", symbol: "S", value: surface });
    measures.push({ label: "אפותמה", symbol: "m", value: apothem });
    measures.push({ label: "מקצוע צדדי", symbol: "l", value: lateralEdge });
    measures.push({ label: "זווית פאה-בסיס", symbol: "α", value: faceAngleDeg });
    measures.push({ label: "זווית מקצוע-בסיס", symbol: "β", value: edgeAngleDeg });
    return { type: "result", kind, measures, steps };
  } catch (err) {
    return { type: "error", message: err instanceof SpaceGeometryError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}
