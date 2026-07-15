/**
 * Triangle solver for the law of sines and the law of cosines (5-unit level).
 *
 * Law of sines: a/sinα = b/sinβ = c/sinγ. Requires one full side/opposite-angle
 * pair (the "anchor") plus one more angle (ASA/AAS — a single solution) or one
 * more side (SSA — the ambiguous case, 0/1/2 valid triangles).
 *
 * Law of cosines: x² = y² + z² − 2yz·cos(X) where X is the angle opposite x
 * and enclosed by y, z. Requires all three sides (SSS — solve for the angles)
 * or two sides and their included angle (SAS — solve for the third side, then
 * the remaining angles, staying within the same law rather than switching to
 * the sine rule).
 */

export class TrigLawError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrigLawError";
  }
}

export type LawMode = "sines" | "cosines";

export interface TriangleInput {
  a?: number;
  b?: number;
  c?: number;
  alpha?: number;
  beta?: number;
  gamma?: number;
}

export interface TriangleStep {
  law: string;
  expr: string;
}

export interface TriangleValues {
  a: number;
  b: number;
  c: number;
  alpha: number;
  beta: number;
  gamma: number;
}

export interface TriangleSolution extends TriangleValues {
  steps: TriangleStep[];
}

export type TriangleResult =
  | { type: "result"; ambiguous: boolean; solutions: TriangleSolution[] }
  | { type: "error"; message: string };

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function nearlyEqual(x: number, y: number): boolean {
  return Math.abs(x - y) <= 1e-3 * Math.max(1, Math.abs(x), Math.abs(y));
}

function checkConsistency(input: TriangleInput, computed: TriangleValues): boolean {
  const keys: (keyof TriangleInput)[] = ["a", "b", "c", "alpha", "beta", "gamma"];
  return keys.every((key) => input[key] === undefined || nearlyEqual(input[key]!, computed[key]));
}

function validateSides(input: TriangleInput) {
  for (const [label, v] of [
    ["a", input.a],
    ["b", input.b],
    ["c", input.c],
  ] as const) {
    if (v !== undefined && !(v > 0)) throw new TrigLawError(`הצלע ${label} חייבת להיות מספר חיובי`);
  }
}

function validateAngles(input: TriangleInput) {
  for (const [label, v] of [
    ["α", input.alpha],
    ["β", input.beta],
    ["γ", input.gamma],
  ] as const) {
    if (v !== undefined && !(v > 0 && v < 180)) throw new TrigLawError(`הזווית ${label} חייבת להיות בין 0° ל-180°`);
  }
}

/* ------------------------------------------------------------------ */
/* Law of sines                                                        */
/* ------------------------------------------------------------------ */

interface Vertex {
  sideKey: "a" | "b" | "c";
  angleKey: "alpha" | "beta" | "gamma";
  sideLabel: string;
  angleLabel: string;
}

const VERTS: Vertex[] = [
  { sideKey: "a", angleKey: "alpha", sideLabel: "a", angleLabel: "α" },
  { sideKey: "b", angleKey: "beta", sideLabel: "b", angleLabel: "β" },
  { sideKey: "c", angleKey: "gamma", sideLabel: "c", angleLabel: "γ" },
];

export function solveLawOfSines(input: TriangleInput): TriangleResult {
  try {
    validateSides(input);
    validateAngles(input);

    const anchor = VERTS.find((v) => input[v.sideKey] !== undefined && input[v.angleKey] !== undefined);
    if (!anchor) {
      throw new TrigLawError(
        "במשפט הסינוסים יש להזין לפחות זוג אחד שלם של צלע והזווית שמולה (למשל a ו-α), ועוד נתון אחד (זווית או צלע נוספת)",
      );
    }
    const anchorSide = input[anchor.sideKey]!;
    const anchorAngle = input[anchor.angleKey]!;
    const k = anchorSide / Math.sin(toRad(anchorAngle));

    const others = VERTS.filter((v) => v.sideKey !== anchor.sideKey);
    const angleGiven = others.find((v) => input[v.angleKey] !== undefined);
    const sideGiven = others.find((v) => input[v.sideKey] !== undefined);

    const buildFrom = (target: Vertex, targetAngleDeg: number, steps: TriangleStep[]): TriangleSolution => {
      const third = others.find((v) => v.sideKey !== target.sideKey)!;
      const thirdAngleDeg = 180 - anchorAngle - targetAngleDeg;
      if (!(thirdAngleDeg > 0)) throw new TrigLawError("לא קיים משולש עם הנתונים שהוזנו — סכום הזוויות חורג מ-180°");
      const targetSide = k * Math.sin(toRad(targetAngleDeg));
      const thirdSide = k * Math.sin(toRad(thirdAngleDeg));

      steps.push({
        law: `השלמת הזווית השלישית ${third.angleLabel}`,
        expr: `${third.angleLabel} = 180° - ${anchor.angleLabel} - ${target.angleLabel} = 180° - ${formatNumber(anchorAngle)}° - ${formatNumber(targetAngleDeg)}° = ${formatNumber(thirdAngleDeg)}°`,
      });
      steps.push({
        law: `הצבה חוזרת ביחס כדי למצוא ${third.sideLabel}`,
        expr: `${third.sideLabel} = ${anchor.sideLabel}·sin(${third.angleLabel})/sin(${anchor.angleLabel}) = ${formatNumber(thirdSide)}`,
      });

      const values: Record<string, number> = {
        [anchor.sideKey]: anchorSide,
        [anchor.angleKey]: anchorAngle,
        [target.sideKey]: targetSide,
        [target.angleKey]: targetAngleDeg,
        [third.sideKey]: thirdSide,
        [third.angleKey]: thirdAngleDeg,
      };
      const computed = values as unknown as TriangleValues;

      steps.push({
        law: "תוצאה סופית",
        expr: `a=${formatNumber(computed.a)}, b=${formatNumber(computed.b)}, c=${formatNumber(computed.c)}, α=${formatNumber(computed.alpha)}°, β=${formatNumber(computed.beta)}°, γ=${formatNumber(computed.gamma)}°`,
      });

      return { ...computed, steps };
    };

    if (angleGiven) {
      const targetAngleDeg = input[angleGiven.angleKey]!;
      const baseSteps: TriangleStep[] = [
        {
          law: "זיהוי היחס המשותף ממשפט הסינוסים",
          expr: `${anchor.sideLabel}/sin(${anchor.angleLabel}) = ${formatNumber(anchorSide)}/sin(${formatNumber(anchorAngle)}°) = ${formatNumber(k)}`,
        },
        {
          law: `הצבה במשפט הסינוסים כדי למצוא ${angleGiven.sideLabel}`,
          expr: `${angleGiven.sideLabel} = ${formatNumber(k)}·sin(${angleGiven.angleLabel}) = ${formatNumber(k)}·sin(${formatNumber(targetAngleDeg)}°) = ${formatNumber(k * Math.sin(toRad(targetAngleDeg)))}`,
        },
      ];
      const solution = buildFrom(angleGiven, targetAngleDeg, baseSteps);
      if (!checkConsistency(input, solution)) {
        throw new TrigLawError("הנתונים שהוזנו סותרים זה את זה — בדקו את הערכים");
      }
      return { type: "result", ambiguous: false, solutions: [solution] };
    }

    if (sideGiven) {
      const targetSide = input[sideGiven.sideKey]!;
      const ratio = (targetSide * Math.sin(toRad(anchorAngle))) / anchorSide;
      if (ratio > 1 + 1e-9) {
        throw new TrigLawError("לא קיים משולש עם הנתונים שהוזנו (sin > 1) — בדקו את הערכים");
      }
      const clamped = Math.min(1, ratio);
      const base = toDeg(Math.asin(clamped));
      const candidates = base >= 90 - 1e-9 ? [base] : [base, 180 - base];

      const solutions: TriangleSolution[] = [];
      for (const cand of candidates) {
        if (!(cand > 0 && cand + anchorAngle < 180)) continue;
        try {
          const steps: TriangleStep[] = [
            {
              law: "זיהוי היחס המשותף ממשפט הסינוסים",
              expr: `${anchor.sideLabel}/sin(${anchor.angleLabel}) = ${formatNumber(anchorSide)}/sin(${formatNumber(anchorAngle)}°) = ${formatNumber(k)}`,
            },
            {
              law: `הצבה במשפט הסינוסים כדי למצוא sin(${sideGiven.angleLabel}) — המקרה הדו-משמעי (SSA)`,
              expr: `sin(${sideGiven.angleLabel}) = ${sideGiven.sideLabel}·sin(${anchor.angleLabel})/${anchor.sideLabel} = ${formatNumber(clamped)}  →  ${sideGiven.angleLabel} = ${formatNumber(cand)}°`,
            },
          ];
          const solution = buildFrom(sideGiven, cand, steps);
          if (checkConsistency(input, solution)) solutions.push(solution);
        } catch {
          continue;
        }
      }
      if (solutions.length === 0) {
        throw new TrigLawError("לא קיים משולש תקף עם הנתונים שהוזנו");
      }
      return { type: "result", ambiguous: solutions.length > 1, solutions };
    }

    throw new TrigLawError("נדרש נתון נוסף מלבד זוג הצלע-זווית הידוע — עוד זווית או עוד צלע");
  } catch (err) {
    return { type: "error", message: err instanceof TrigLawError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}

/* ------------------------------------------------------------------ */
/* Law of cosines                                                      */
/* ------------------------------------------------------------------ */

interface CosVertex {
  sideKey: "a" | "b" | "c";
  angleKey: "alpha" | "beta" | "gamma";
  sideLabel: string;
  angleLabel: string;
  o1: "a" | "b" | "c";
  o2: "a" | "b" | "c";
}

const COS_VERTS: CosVertex[] = [
  { sideKey: "a", angleKey: "alpha", sideLabel: "a", angleLabel: "α", o1: "b", o2: "c" },
  { sideKey: "b", angleKey: "beta", sideLabel: "b", angleLabel: "β", o1: "a", o2: "c" },
  { sideKey: "c", angleKey: "gamma", sideLabel: "c", angleLabel: "γ", o1: "a", o2: "b" },
];

function angleFromSides(x: number, y: number, z: number): number {
  // Angle opposite side x, given all three sides.
  const cosVal = (y * y + z * z - x * x) / (2 * y * z);
  const clamped = Math.max(-1, Math.min(1, cosVal));
  return toDeg(Math.acos(clamped));
}

export function solveLawOfCosines(input: TriangleInput): TriangleResult {
  try {
    validateSides(input);
    validateAngles(input);

    const sidesKnown = COS_VERTS.filter((v) => input[v.sideKey] !== undefined);
    const steps: TriangleStep[] = [];
    let a: number;
    let b: number;
    let c: number;

    if (sidesKnown.length === 3) {
      a = input.a!;
      b = input.b!;
      c = input.c!;
      if (!(a + b > c && a + c > b && b + c > a)) {
        throw new TrigLawError("אי-שוויון המשולש אינו מתקיים — לא קיים משולש עם שלוש הצלעות שהוזנו");
      }
      steps.push({
        law: "שלוש הצלעות ידועות (SSS) — נחשב את הזוויות באמצעות משפט הקוסינוסים",
        expr: `a=${formatNumber(a)}, b=${formatNumber(b)}, c=${formatNumber(c)}`,
      });
    } else {
      const sasVert = COS_VERTS.find(
        (v) => input[v.angleKey] !== undefined && input[v.o1] !== undefined && input[v.o2] !== undefined,
      );
      if (!sasVert) {
        throw new TrigLawError(
          "משפט הקוסינוסים דורש שלוש צלעות ידועות (SSS), או שתי צלעות והזווית הכלואה ביניהן (SAS)",
        );
      }
      const y = input[sasVert.o1]!;
      const z = input[sasVert.o2]!;
      const angleDeg = input[sasVert.angleKey]!;
      const x = Math.sqrt(y * y + z * z - 2 * y * z * Math.cos(toRad(angleDeg)));

      steps.push({
        law: `הצבה במשפט הקוסינוסים כדי למצוא את הצלע ${sasVert.sideLabel} (SAS)`,
        expr: `${sasVert.sideLabel}² = ${sasVert.o1}² + ${sasVert.o2}² - 2·${sasVert.o1}·${sasVert.o2}·cos(${sasVert.angleLabel}) = ${formatNumber(y * y)} + ${formatNumber(z * z)} - 2·${formatNumber(y)}·${formatNumber(z)}·cos(${formatNumber(angleDeg)}°)  →  ${sasVert.sideLabel} = ${formatNumber(x)}`,
      });

      a = sasVert.sideKey === "a" ? x : input.a!;
      b = sasVert.sideKey === "b" ? x : input.b!;
      c = sasVert.sideKey === "c" ? x : input.c!;
    }

    const alpha = angleFromSides(a, b, c);
    const beta = angleFromSides(b, a, c);
    const gamma = angleFromSides(c, a, b);

    for (const v of COS_VERTS) {
      const angleDeg = v.sideKey === "a" ? alpha : v.sideKey === "b" ? beta : gamma;
      steps.push({
        law: `משפט הקוסינוסים עבור הזווית ${v.angleLabel}`,
        expr: `cos(${v.angleLabel}) = (${v.o1}² + ${v.o2}² - ${v.sideLabel}²)/(2·${v.o1}·${v.o2}) → ${v.angleLabel} = ${formatNumber(angleDeg)}°`,
      });
    }

    const computed: TriangleValues = { a, b, c, alpha, beta, gamma };
    steps.push({
      law: "תוצאה סופית",
      expr: `a=${formatNumber(a)}, b=${formatNumber(b)}, c=${formatNumber(c)}, α=${formatNumber(alpha)}°, β=${formatNumber(beta)}°, γ=${formatNumber(gamma)}°`,
    });

    if (!checkConsistency(input, computed)) {
      throw new TrigLawError("הנתונים שהוזנו סותרים זה את זה — בדקו את הערכים");
    }

    return { type: "result", ambiguous: false, solutions: [{ ...computed, steps }] };
  } catch (err) {
    return { type: "error", message: err instanceof TrigLawError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}

export function solveTriangle(mode: LawMode, input: TriangleInput): TriangleResult {
  return mode === "sines" ? solveLawOfSines(input) : solveLawOfCosines(input);
}
