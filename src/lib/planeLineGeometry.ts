/**
 * Solver layer for analytic space geometry (5-unit level): lines and planes in R³,
 * built on the pure primitives in vectorUtils.ts. Every result carries pedagogical
 * steps naming the formula used, in the same style as trigIdentities.ts /
 * algebraicVectors.ts. A plane is always canonicalized to normal+d form (n·r = d) —
 * "3 points" or "point + 2 directions" are just input methods that convert into it
 * via a cross product.
 */

import { type Vector3, vecAdd, vecSub, vecScale, cross, dot, magnitude, isZeroVector, formatVector3 } from "./vectorUtils";

export class PlaneLineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaneLineError";
  }
}

export interface GeometryStep {
  law: string;
  expr: string;
}

export interface Plane3 {
  normal: Vector3;
  d: number;
}

export type PlaneResult =
  | { type: "result"; plane: Plane3; equation: string; steps: GeometryStep[] }
  | { type: "error"; message: string };

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4 || 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

/** Renders a plane as "ax + by + cz = d", omitting zero terms and folding signs (e.g. "x - 2y = 3"). */
function formatPlaneEquation(normal: Vector3, d: number): string {
  const labels = ["x", "y", "z"] as const;
  const parts: string[] = [];
  normal.forEach((coeff, i) => {
    if (Math.abs(coeff) < 1e-9) return;
    const label = labels[i];
    const abs = Math.abs(coeff);
    const term = abs === 1 ? label : `${formatNumber(abs)}${label}`;
    parts.push(coeff < 0 ? `- ${term}` : parts.length === 0 ? term : `+ ${term}`);
  });
  const lhs = parts.length === 0 ? "0" : parts.join(" ");
  return `${lhs} = ${formatNumber(d)}`;
}

/**
 * Plane through three (non-collinear) points: two direction vectors are formed from
 * the points, and their cross product gives the plane's normal directly.
 */
export function solvePlaneFromThreePoints(p1: Vector3, p2: Vector3, p3: Vector3): PlaneResult {
  try {
    const ab = vecSub(p2, p1);
    const ac = vecSub(p3, p1);

    const steps: GeometryStep[] = [
      {
        law: "בניית שני וקטורי כיוון על המישור",
        expr: `AB = B - A = ${formatVector3(ab)},  AC = C - A = ${formatVector3(ac)}`,
      },
    ];

    const normal = cross(ab, ac);
    if (isZeroVector(normal)) {
      throw new PlaneLineError("שלוש הנקודות קוליניאריות (על ישר אחד) — אין מישור יחיד שעובר דרכן");
    }

    steps.push({
      law: "מכפלה וקטורית של וקטורי הכיוון נותנת את הנורמל למישור: n = AB × AC",
      expr: `n = ${formatVector3(ab)} × ${formatVector3(ac)} = ${formatVector3(normal)}`,
    });

    const d = dot(normal, p1);
    steps.push({
      law: "הצבת נקודה A במשוואה n·r = n·A למציאת d",
      expr: `d = n·A = ${formatVector3(normal)}·${formatVector3(p1)} = ${formatNumber(d)}`,
    });

    const equation = formatPlaneEquation(normal, d);
    steps.push({ law: "משוואת המישור", expr: equation });

    return { type: "result", plane: { normal, d }, equation, steps };
  } catch (err) {
    return { type: "error", message: err instanceof PlaneLineError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}

/**
 * Plane through a point and two (non-parallel) direction vectors: their cross product
 * gives the normal directly — by construction it's perpendicular to both, since a×b is
 * always perpendicular to both a and b.
 */
export function solvePlaneFromPointAndTwoDirections(point: Vector3, dir1: Vector3, dir2: Vector3): PlaneResult {
  try {
    const steps: GeometryStep[] = [
      {
        law: "שני וקטורי הכיוון הנתונים על המישור",
        expr: `u = ${formatVector3(dir1)},  v = ${formatVector3(dir2)}`,
      },
    ];

    const normal = cross(dir1, dir2);
    if (isZeroVector(normal)) {
      throw new PlaneLineError("שני וקטורי הכיוון מקבילים — הם אינם פורשים מישור יחיד");
    }

    steps.push({
      law: "מכפלה וקטורית של וקטורי הכיוון נותנת את הנורמל למישור: n = u × v",
      expr: `n = ${formatVector3(dir1)} × ${formatVector3(dir2)} = ${formatVector3(normal)}`,
    });

    const d = dot(normal, point);
    steps.push({
      law: "הצבת הנקודה הנתונה במשוואה n·r = n·P למציאת d",
      expr: `d = n·P = ${formatVector3(normal)}·${formatVector3(point)} = ${formatNumber(d)}`,
    });

    const equation = formatPlaneEquation(normal, d);
    steps.push({ law: "משוואת המישור", expr: equation });

    return { type: "result", plane: { normal, d }, equation, steps };
  } catch (err) {
    return { type: "error", message: err instanceof PlaneLineError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}

/** Parametric line: r = point + t·direction. */
export interface Line3 {
  point: Vector3;
  direction: Vector3;
}

export type LineRelationshipKind = "parallel" | "coincident" | "intersecting" | "skew";

export type LineRelationshipResult =
  | { type: "result"; kind: LineRelationshipKind; intersection?: Vector3; steps: GeometryStep[] }
  | { type: "error"; message: string };

const AXIS_LABELS = ["x", "y", "z"] as const;
const AXIS_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 2],
  [0, 2],
];

/**
 * Solves t·d1[i] - s·d2[i] = rhs[i] for the given axis pair via Cramer's rule.
 * Returns null when the pair is degenerate (its 2x2 determinant is ~0) — the caller
 * tries the next axis pair, since d1/d2 not being parallel guarantees at least one works.
 */
function solveAxisPair(d1: Vector3, d2: Vector3, rhs: Vector3, i: number, j: number): { t: number; s: number } | null {
  const det = d2[i] * d1[j] - d1[i] * d2[j];
  if (Math.abs(det) < 1e-9) return null;
  const t = (-rhs[i] * d2[j] + d2[i] * rhs[j]) / det;
  const s = (d1[i] * rhs[j] - d1[j] * rhs[i]) / det;
  return { t, s };
}

/**
 * Classifies the mutual position of two lines in R³: parallel (distinct), coincident,
 * intersecting (with the intersection point), or skew. The direction-vector cross
 * product distinguishes parallel from non-parallel; for parallel lines, whether the
 * connecting vector also lines up with the direction distinguishes coincident from
 * (merely) parallel. For non-parallel lines, the scalar triple product tests
 * coplanarity — zero means they intersect (solved as a 2-equation system in t, s),
 * nonzero means skew.
 */
export function lineRelationship(l1: Line3, l2: Line3): LineRelationshipResult {
  try {
    if (isZeroVector(l1.direction) || isZeroVector(l2.direction)) {
      throw new PlaneLineError("וקטור הכיוון של ישר אינו יכול להיות וקטור האפס");
    }

    const steps: GeometryStep[] = [];
    const dirCross = cross(l1.direction, l2.direction);
    const parallel = isZeroVector(dirCross);
    steps.push({
      law: "השוואת וקטורי הכיוון: הישרים מקבילים אם ורק אם d1 × d2 = 0",
      expr: `d1 × d2 = ${formatVector3(l1.direction)} × ${formatVector3(l2.direction)} = ${formatVector3(dirCross)}`,
    });

    const diff = vecSub(l2.point, l1.point);

    if (parallel) {
      const connectorCross = cross(diff, l1.direction);
      const onSameLine = isZeroVector(connectorCross);
      steps.push({
        law: "בדיקה אם נקודה על הישר השני מקיימת את משוואת הישר הראשון: (P2-P1) × d1 = 0 ⇔ נקודה משותפת",
        expr: `(P2 - P1) × d1 = ${formatVector3(diff)} × ${formatVector3(l1.direction)} = ${formatVector3(connectorCross)}`,
      });
      if (onSameLine) {
        steps.push({ law: "מסקנה", expr: "וקטורי הכיוון מקבילים ויש נקודה משותפת ⇒ הישרים מתלכדים" });
        return { type: "result", kind: "coincident", steps };
      }
      steps.push({ law: "מסקנה", expr: "וקטורי הכיוון מקבילים אך אין נקודה משותפת ⇒ הישרים מקבילים" });
      return { type: "result", kind: "parallel", steps };
    }

    const tripleProduct = dot(diff, dirCross);
    steps.push({
      law: "בדיקת מישוריות (Coplanarity) — המכפלה המעורבת (P2-P1)·(d1×d2)",
      expr: `(P2 - P1)·(d1 × d2) = ${formatVector3(diff)}·${formatVector3(dirCross)} = ${formatNumber(tripleProduct)}`,
    });

    if (Math.abs(tripleProduct) > 1e-9) {
      steps.push({ law: "מסקנה", expr: "המכפלה המעורבת שונה מאפס ⇒ הישרים אינם מישוריים ⇒ הישרים מצטלבים (Skew)" });
      return { type: "result", kind: "skew", steps };
    }

    let solved: { t: number; s: number } | null = null;
    let axes: readonly [number, number] = [0, 1];
    for (const pair of AXIS_PAIRS) {
      solved = solveAxisPair(l1.direction, l2.direction, diff, pair[0], pair[1]);
      if (solved) {
        axes = pair;
        break;
      }
    }
    if (!solved) throw new PlaneLineError("שגיאה פנימית באיתור נקודת החיתוך");

    const [i, j] = axes;
    steps.push({
      law: "פתרון מערכת המשוואות P1 + t·d1 = P2 + s·d2 (שני רכיבים בלתי-תלויים מספיקים)",
      expr:
        `${AXIS_LABELS[i]}: ${formatNumber(l1.point[i])} + t·${formatNumber(l1.direction[i])} = ${formatNumber(l2.point[i])} + s·${formatNumber(l2.direction[i])}\n` +
        `${AXIS_LABELS[j]}: ${formatNumber(l1.point[j])} + t·${formatNumber(l1.direction[j])} = ${formatNumber(l2.point[j])} + s·${formatNumber(l2.direction[j])}\n` +
        `⇒ t = ${formatNumber(solved.t)}, s = ${formatNumber(solved.s)}`,
    });

    const intersection = vecAdd(l1.point, vecScale(l1.direction, solved.t));
    steps.push({
      law: "הצבת t בישר הראשון למציאת נקודת החיתוך",
      expr: `P = P1 + t·d1 = ${formatVector3(l1.point)} + ${formatNumber(solved.t)}·${formatVector3(l1.direction)} = ${formatVector3(intersection)}`,
    });
    steps.push({ law: "מסקנה", expr: `הישרים נחתכים בנקודה ${formatVector3(intersection)}` });

    return { type: "result", kind: "intersecting", intersection, steps };
  } catch (err) {
    return { type: "error", message: err instanceof PlaneLineError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}

export type LinePlaneRelationshipKind = "contained" | "parallel" | "intersecting";

export type LinePlaneRelationshipResult =
  | { type: "result"; kind: LinePlaneRelationshipKind; intersection?: Vector3; steps: GeometryStep[] }
  | { type: "error"; message: string };

/**
 * Classifies a line's position relative to a plane: contained (every point of the line
 * satisfies the plane equation), parallel (no common points), or intersecting (exactly
 * one point). The dot product of the line's direction and the plane's normal is the
 * deciding quantity: it's zero exactly when the direction lies in the plane's directional
 * space (perpendicular to the normal) — which splits into contained vs. parallel depending
 * on whether the line's own point satisfies the plane equation. When it's nonzero, the
 * line pierces the plane once; the intersection point comes from substituting the line's
 * parametric form r = point + t·direction directly into the plane equation n·r = d and
 * solving the resulting single linear equation for t.
 */
export function linePlaneRelationship(line: Line3, plane: Plane3): LinePlaneRelationshipResult {
  try {
    if (isZeroVector(line.direction)) {
      throw new PlaneLineError("וקטור הכיוון של הישר אינו יכול להיות וקטור האפס");
    }
    if (isZeroVector(plane.normal)) {
      throw new PlaneLineError("וקטור הנורמל של המישור אינו יכול להיות וקטור האפס");
    }

    const steps: GeometryStep[] = [];
    const dirDotNormal = dot(line.direction, plane.normal);
    steps.push({
      law: "מכפלה סקלרית בין וקטור הכיוון של הישר לנורמל של המישור: d·n = 0 ⇔ הכיוון מקביל למישור",
      expr: `d·n = ${formatVector3(line.direction)}·${formatVector3(plane.normal)} = ${formatNumber(dirDotNormal)}`,
    });

    if (Math.abs(dirDotNormal) < 1e-9) {
      const pointValue = dot(plane.normal, line.point);
      steps.push({
        law: "הצבת נקודת הישר במשוואת המישור: n·P0 =? d",
        expr: `n·P0 = ${formatVector3(plane.normal)}·${formatVector3(line.point)} = ${formatNumber(pointValue)}, מול d = ${formatNumber(plane.d)}`,
      });
      if (Math.abs(pointValue - plane.d) < 1e-9) {
        steps.push({ law: "מסקנה", expr: "כיוון הישר מאונך לנורמל, ונקודת הישר מקיימת את משוואת המישור ⇒ הישר מוכל במישור" });
        return { type: "result", kind: "contained", steps };
      }
      steps.push({ law: "מסקנה", expr: "כיוון הישר מאונך לנורמל, אך נקודת הישר אינה מקיימת את משוואת המישור ⇒ הישר מקביל למישור (ללא נקודות משותפות)" });
      return { type: "result", kind: "parallel", steps };
    }

    const pointValue = dot(plane.normal, line.point);
    const t = (plane.d - pointValue) / dirDotNormal;
    steps.push({
      law: "הצבת המשוואה הפרמטרית של הישר r = P0 + t·d במשוואת המישור n·r = d ופתרון עבור t",
      expr: `n·P0 + t·(n·d) = d  ⇒  ${formatNumber(pointValue)} + t·${formatNumber(dirDotNormal)} = ${formatNumber(plane.d)}  ⇒  t = ${formatNumber(t)}`,
    });

    const intersection = vecAdd(line.point, vecScale(line.direction, t));
    steps.push({
      law: "הצבת t בישר למציאת נקודת החיתוך",
      expr: `P = P0 + t·d = ${formatVector3(line.point)} + ${formatNumber(t)}·${formatVector3(line.direction)} = ${formatVector3(intersection)}`,
    });
    steps.push({ law: "מסקנה", expr: `הישר חותך את המישור בנקודה ${formatVector3(intersection)}` });

    return { type: "result", kind: "intersecting", intersection, steps };
  } catch (err) {
    return { type: "error", message: err instanceof PlaneLineError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}

export type AngleResult = { type: "result"; angleDeg: number; steps: GeometryStep[] } | { type: "error"; message: string };

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Angle between a line and a plane: sinθ = |d·n| / (|d|·|n|), θ ∈ [0°, 90°]. The absolute
 * value keeps the angle in that range regardless of which way the normal happens to point.
 */
export function angleLinePlane(line: Line3, plane: Plane3): AngleResult {
  try {
    if (isZeroVector(line.direction)) throw new PlaneLineError("וקטור הכיוון של הישר אינו יכול להיות וקטור האפס");
    if (isZeroVector(plane.normal)) throw new PlaneLineError("וקטור הנורמל של המישור אינו יכול להיות וקטור האפס");

    const steps: GeometryStep[] = [];
    const dDotN = dot(line.direction, plane.normal);
    const dMag = magnitude(line.direction);
    const nMag = magnitude(plane.normal);
    const sinTheta = Math.abs(dDotN) / (dMag * nMag);
    const clamped = Math.max(-1, Math.min(1, sinTheta));
    const angleDeg = toDeg(Math.asin(clamped));

    steps.push({
      law: "נוסחת הזווית בין ישר למישור: sinθ = |d·n| / (|d|·|n|)",
      expr: `sinθ = |${formatVector3(line.direction)}·${formatVector3(plane.normal)}| / (${formatNumber(dMag)}·${formatNumber(nMag)}) = ${formatNumber(clamped)}`,
    });
    steps.push({ law: "בידוד הזווית באמצעות arcsin", expr: `θ = arcsin(${formatNumber(clamped)}) = ${formatNumber(angleDeg)}°` });
    steps.push({ law: "תוצאה סופית", expr: `θ = ${formatNumber(angleDeg)}°` });

    return { type: "result", angleDeg, steps };
  } catch (err) {
    return { type: "error", message: err instanceof PlaneLineError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}

/**
 * Angle between two planes: cosθ = |n1·n2| / (|n1|·|n2|), θ ∈ [0°, 90°] — the acute angle
 * between them (the same absolute-value convention as angleLinePlane).
 */
export function angleBetweenPlanes(p1: Plane3, p2: Plane3): AngleResult {
  try {
    if (isZeroVector(p1.normal) || isZeroVector(p2.normal)) {
      throw new PlaneLineError("וקטור הנורמל של מישור אינו יכול להיות וקטור האפס");
    }

    const steps: GeometryStep[] = [];
    const n1DotN2 = dot(p1.normal, p2.normal);
    const n1Mag = magnitude(p1.normal);
    const n2Mag = magnitude(p2.normal);
    const cosTheta = Math.abs(n1DotN2) / (n1Mag * n2Mag);
    const clamped = Math.max(-1, Math.min(1, cosTheta));
    const angleDeg = toDeg(Math.acos(clamped));

    steps.push({
      law: "נוסחת הזווית בין שני מישורים: cosθ = |n1·n2| / (|n1|·|n2|)",
      expr: `cosθ = |${formatVector3(p1.normal)}·${formatVector3(p2.normal)}| / (${formatNumber(n1Mag)}·${formatNumber(n2Mag)}) = ${formatNumber(clamped)}`,
    });
    steps.push({ law: "בידוד הזווית באמצעות arccos", expr: `θ = arccos(${formatNumber(clamped)}) = ${formatNumber(angleDeg)}°` });
    steps.push({ law: "תוצאה סופית", expr: `θ = ${formatNumber(angleDeg)}°` });

    return { type: "result", angleDeg, steps };
  } catch (err) {
    return { type: "error", message: err instanceof PlaneLineError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}

export type DistanceResult = { type: "result"; distance: number; steps: GeometryStep[] } | { type: "error"; message: string };

/** Distance from a point to a plane: |n·P - d| / |n|. */
export function distancePointToPlane(point: Vector3, plane: Plane3): DistanceResult {
  try {
    if (isZeroVector(plane.normal)) throw new PlaneLineError("וקטור הנורמל של המישור אינו יכול להיות וקטור האפס");

    const steps: GeometryStep[] = [];
    const nDotP = dot(plane.normal, point);
    const nMag = magnitude(plane.normal);
    const distance = Math.abs(nDotP - plane.d) / nMag;

    steps.push({
      law: "נוסחת המרחק מנקודה למישור: מרחק = |n·P - d| / |n|",
      expr: `מרחק = |${formatVector3(plane.normal)}·${formatVector3(point)} - ${formatNumber(plane.d)}| / ${formatNumber(nMag)} = |${formatNumber(nDotP)} - ${formatNumber(plane.d)}| / ${formatNumber(nMag)} = ${formatNumber(distance)}`,
    });
    steps.push({ law: "תוצאה סופית", expr: `מרחק = ${formatNumber(distance)}` });

    return { type: "result", distance, steps };
  } catch (err) {
    return { type: "error", message: err instanceof PlaneLineError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}

const LINE_AXIS_LABELS = ["x", "y", "z"] as const;

function formatParametricForm(point: Vector3, direction: Vector3): string {
  const parts = LINE_AXIS_LABELS.map((label, i) => {
    const comp = direction[i];
    if (Math.abs(comp) < 1e-9) return `${label} = ${formatNumber(point[i])}`;
    const sign = comp < 0 ? "-" : "+";
    return `${label} = ${formatNumber(point[i])} ${sign} t·${formatNumber(Math.abs(comp))}`;
  });
  return parts.join(",  ");
}

/** One "(label - coord)/comp" ratio term, folding the coordinate's sign into a clean +/-. */
function formatSymmetricTerm(label: string, coord: number, comp: number): string {
  const coordPart = coord === 0 ? label : coord > 0 ? `(${label} - ${formatNumber(coord)})` : `(${label} + ${formatNumber(-coord)})`;
  return `${coordPart}/${formatNumber(comp)}`;
}

/**
 * Renders the symmetric form (x-x0)/a = (y-y0)/b = (z-z0)/c. A zero direction component
 * has no ratio (that coordinate is simply constant) and is shown as "label = value"
 * instead; if only one component is left non-zero there's no proportion to write at all
 * (the line runs parallel to a single axis, and that coordinate is unconstrained).
 */
function formatSymmetricForm(point: Vector3, direction: Vector3): string {
  const fixedEquations: string[] = [];
  const ratioTerms: string[] = [];
  direction.forEach((comp, i) => {
    if (Math.abs(comp) < 1e-9) {
      fixedEquations.push(`${LINE_AXIS_LABELS[i]} = ${formatNumber(point[i])}`);
    } else {
      ratioTerms.push(formatSymmetricTerm(LINE_AXIS_LABELS[i], point[i], comp));
    }
  });
  const ratioPart = ratioTerms.length >= 2 ? ratioTerms.join(" = ") : "";
  return [...fixedEquations, ratioPart].filter((s) => s !== "").join(",  ");
}

export type LineFormResult =
  | { type: "result"; point: Vector3; direction: Vector3; parametricText: string; symmetricText: string; steps: GeometryStep[] }
  | { type: "error"; message: string };

/**
 * Converts a line between its parametric form (r = P0 + t·d) and its symmetric form
 * (eliminating t: (x-x0)/a = (y-y0)/b = (z-z0)/c wherever a component is non-zero).
 * Both forms describe the exact same line — this doesn't change point/direction, only
 * how they're displayed — so the two are returned alongside point/direction themselves,
 * letting a caller verify the round-trip numerically instead of re-parsing the text.
 */
export function solveLineForm(line: Line3): LineFormResult {
  try {
    if (isZeroVector(line.direction)) {
      throw new PlaneLineError("וקטור הכיוון של ישר אינו יכול להיות וקטור האפס");
    }

    const steps: GeometryStep[] = [];
    const parametricText = formatParametricForm(line.point, line.direction);
    steps.push({ law: "הצורה הפרמטרית: r = P0 + t·d", expr: parametricText });

    const zeroAxes = line.direction.filter((c) => Math.abs(c) < 1e-9).length;
    if (zeroAxes > 0) {
      steps.push({
        law: "בידוד t מכל רכיב עם כיוון שונה מאפס",
        expr: `רכיב עם מקדם כיוון 0 קבוע לערך הנקודה ואינו משתתף ביחס הסימטרי (${zeroAxes} רכיב/ים כאלה כאן)`,
      });
    } else {
      steps.push({ law: "בידוד t מכל רכיב", expr: "t = (x-x0)/a = (y-y0)/b = (z-z0)/c" });
    }

    const symmetricText = formatSymmetricForm(line.point, line.direction);
    steps.push({ law: "הצורה הסימטרית", expr: symmetricText });

    return { type: "result", point: line.point, direction: line.direction, parametricText, symmetricText, steps };
  } catch (err) {
    return { type: "error", message: err instanceof PlaneLineError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}
