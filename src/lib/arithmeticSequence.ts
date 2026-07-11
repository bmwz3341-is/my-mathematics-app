/**
 * Arithmetic sequence engine: given any sufficient subset of the parameters
 * a1 (first term), d (common difference), n (term index/count), an (n-th term)
 * and Sn (sum of first n terms), derives the missing ones using
 * an = a1 + (n-1)d and Sn = n/2 * (2a1 + (n-1)d), recording pedagogical steps
 * and validating consistency when the problem is over-specified.
 */

export class SequenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SequenceError";
  }
}

export interface SequenceInput {
  a1?: number;
  d?: number;
  n?: number;
  an?: number;
  Sn?: number;
}

export interface SequenceStep {
  law: string;
  expr: string;
}

export type SequenceKind = "increasing" | "decreasing" | "constant";

export type SequenceResult =
  | {
      type: "result";
      a1: number;
      d: number;
      n: number;
      an: number;
      Sn: number;
      kind: SequenceKind;
      generalTermExpr: string;
      terms: number[];
      steps: SequenceStep[];
      foundTerm?: { index: number; value: number };
    }
  | { type: "error"; message: string };

function formatNumber(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

const EPS = 1e-9;

function nearlyEqual(x: number, y: number): boolean {
  return Math.abs(x - y) <= EPS * Math.max(1, Math.abs(x), Math.abs(y));
}

function validateN(n: number, source: string): number {
  if (!Number.isFinite(n) || Math.abs(n - Math.round(n)) > 1e-6 || Math.round(n) < 1) {
    throw new SequenceError(`${source} נותן n=${formatNumber(n)}, אבל n חייב להיות מספר שלם חיובי`);
  }
  return Math.round(n);
}

/** Builds the simplified general-term expression a_n = a1 + (n-1)d. */
export function generalTermExpression(a1: number, d: number): string {
  // a1 + (n-1)d = dn + (a1 - d)
  const constant = a1 - d;
  if (d === 0) return `a_n = ${formatNumber(a1)}`;
  const dPart = d === 1 ? "n" : d === -1 ? "-n" : `${formatNumber(d)}n`;
  if (constant === 0) return `a_n = ${dPart}`;
  const sign = constant < 0 ? "-" : "+";
  return `a_n = ${dPart} ${sign} ${Math.abs(constant) === 0 ? "" : formatNumber(Math.abs(constant))}`;
}

export function classifySequence(d: number): SequenceKind {
  if (d > 0) return "increasing";
  if (d < 0) return "decreasing";
  return "constant";
}

export function kindLabel(kind: SequenceKind): string {
  if (kind === "increasing") return "סדרה עולה (d > 0)";
  if (kind === "decreasing") return "סדרה יורדת (d < 0)";
  return "סדרה קבועה (d = 0)";
}

export function solveSequence(input: SequenceInput, findIndex?: number): SequenceResult {
  const given: string[] = [];
  if (input.a1 !== undefined) given.push(`a₁ = ${formatNumber(input.a1)}`);
  if (input.d !== undefined) given.push(`d = ${formatNumber(input.d)}`);
  if (input.n !== undefined) given.push(`n = ${formatNumber(input.n)}`);
  if (input.an !== undefined) given.push(`aₙ = ${formatNumber(input.an)}`);
  if (input.Sn !== undefined) given.push(`Sₙ = ${formatNumber(input.Sn)}`);

  if (given.length < 3) {
    return { type: "error", message: "נא להזין לפחות שלושה נתונים כדי שאפשר יהיה לפתור את הסדרה" };
  }

  const steps: SequenceStep[] = [
    { law: "הנתונים שזוהו מהקלט", expr: given.join(",  ") },
  ];

  let { a1, d, n } = input;
  const { an, Sn } = input;

  try {
    if (n !== undefined) n = validateN(n, "הקלט");

    // Resolve a1, d, n first; an and Sn follow from the formulas.
    if (n === undefined) {
      if (a1 !== undefined && d !== undefined && an !== undefined) {
        if (d === 0) {
          if (!nearlyEqual(a1, an)) throw new SequenceError("בסדרה קבועה (d = 0) חייב להתקיים aₙ = a₁, אך הערכים שהוזנו שונים");
          throw new SequenceError("בסדרה קבועה (d = 0) עם aₙ = a₁ אי אפשר לקבוע את n — נא להזין את n");
        }
        const rawN = (an - a1) / d + 1;
        n = validateN(rawN, "החישוב (aₙ - a₁)/d + 1");
        steps.push({
          law: "בחירת נוסחה: איבר כללי aₙ = a₁ + (n-1)d, בידוד n",
          expr: `n = (aₙ - a₁)/d + 1 = (${formatNumber(an)} - ${formatNumber(a1)})/${formatNumber(d)} + 1 = ${formatNumber(n)}`,
        });
      } else if (a1 !== undefined && d !== undefined && Sn !== undefined) {
        // Sn = n/2 (2a1 + (n-1)d)  ->  (d/2)n^2 + (a1 - d/2)n - Sn = 0
        const A = d / 2;
        const B = a1 - d / 2;
        const C = -Sn;
        let rawN: number;
        if (Math.abs(A) < EPS) {
          if (Math.abs(B) < EPS) throw new SequenceError("לא ניתן לקבוע את n מהנתונים (a₁ = 0 ו-d = 0)");
          rawN = -C / B;
        } else {
          const disc = B * B - 4 * A * C;
          if (disc < 0) throw new SequenceError("לא קיים n ממשי שמקיים את סכום הסדרה שהוזן");
          const root1 = (-B + Math.sqrt(disc)) / (2 * A);
          const root2 = (-B - Math.sqrt(disc)) / (2 * A);
          const candidates = [root1, root2].filter((r) => r > 0.5 && Math.abs(r - Math.round(r)) < 1e-6);
          if (candidates.length === 0) {
            throw new SequenceError("לא קיים n שלם וחיובי שמקיים את סכום הסדרה שהוזן");
          }
          rawN = candidates[0];
        }
        n = validateN(rawN, "פתרון המשוואה הריבועית של הסכום");
        steps.push({
          law: "בחירת נוסחה: סכום סדרה Sₙ = n/2·(2a₁ + (n-1)d), פתרון משוואה ב-n",
          expr: `${formatNumber(d / 2)}n² + ${formatNumber(a1 - d / 2)}n - ${formatNumber(Sn)} = 0  →  n = ${formatNumber(n)}`,
        });
      } else {
        throw new SequenceError("כדי לפתור ללא n יש להזין a₁, d ועוד נתון (aₙ או Sₙ)");
      }
    }

    // n is known from here on.
    if (a1 === undefined || d === undefined) {
      if (a1 !== undefined && an !== undefined) {
        if (n === 1) {
          if (!nearlyEqual(a1, an)) throw new SequenceError("עבור n = 1 חייב להתקיים aₙ = a₁");
          throw new SequenceError("עבור n = 1 לא ניתן לקבוע את d — נא להזין נתון נוסף");
        }
        d = (an - a1) / (n - 1);
        steps.push({
          law: "בחירת נוסחה: איבר כללי aₙ = a₁ + (n-1)d, בידוד d",
          expr: `d = (aₙ - a₁)/(n - 1) = (${formatNumber(an)} - ${formatNumber(a1)})/(${formatNumber(n)} - 1) = ${formatNumber(d)}`,
        });
      } else if (a1 !== undefined && Sn !== undefined) {
        if (n === 1) {
          if (!nearlyEqual(a1, Sn)) throw new SequenceError("עבור n = 1 חייב להתקיים Sₙ = a₁");
          throw new SequenceError("עבור n = 1 לא ניתן לקבוע את d — נא להזין נתון נוסף");
        }
        d = (2 * Sn / n - 2 * a1) / (n - 1);
        steps.push({
          law: "בחירת נוסחה: סכום סדרה Sₙ = n/2·(2a₁ + (n-1)d), בידוד d",
          expr: `d = (2Sₙ/n - 2a₁)/(n - 1) = (${formatNumber(2 * Sn / n)} - ${formatNumber(2 * a1)})/(${formatNumber(n - 1)}) = ${formatNumber(d)}`,
        });
      } else if (d !== undefined && an !== undefined) {
        a1 = an - (n - 1) * d;
        steps.push({
          law: "בחירת נוסחה: איבר כללי aₙ = a₁ + (n-1)d, בידוד a₁",
          expr: `a₁ = aₙ - (n - 1)d = ${formatNumber(an)} - ${formatNumber(n - 1)}·${formatNumber(d)} = ${formatNumber(a1)}`,
        });
      } else if (d !== undefined && Sn !== undefined) {
        a1 = Sn / n - ((n - 1) * d) / 2;
        steps.push({
          law: "בחירת נוסחה: סכום סדרה Sₙ = n/2·(2a₁ + (n-1)d), בידוד a₁",
          expr: `a₁ = Sₙ/n - (n - 1)d/2 = ${formatNumber(Sn / n)} - ${formatNumber(((n - 1) * d) / 2)} = ${formatNumber(a1)}`,
        });
      } else if (an !== undefined && Sn !== undefined) {
        a1 = (2 * Sn) / n - an;
        steps.push({
          law: "בחירת נוסחה: סכום עם איבר אחרון Sₙ = n·(a₁ + aₙ)/2, בידוד a₁",
          expr: `a₁ = 2Sₙ/n - aₙ = ${formatNumber((2 * Sn) / n)} - ${formatNumber(an)} = ${formatNumber(a1)}`,
        });
        if (n === 1) {
          d = 0;
        } else {
          d = (an - a1) / (n - 1);
          steps.push({
            law: "מציאת d מהאיבר הכללי",
            expr: `d = (aₙ - a₁)/(n - 1) = (${formatNumber(an)} - ${formatNumber(a1)})/(${formatNumber(n - 1)}) = ${formatNumber(d)}`,
          });
        }
      } else {
        throw new SequenceError("הנתונים שהוזנו אינם מספיקים לפתרון — נא להזין צירוף אחר");
      }
    }

    if (a1 === undefined || d === undefined || n === undefined) {
      throw new SequenceError("הנתונים שהוזנו אינם מספיקים לפתרון — נא להזין צירוף אחר");
    }

    const computedAn = a1 + (n - 1) * d;
    const computedSn = (n / 2) * (2 * a1 + (n - 1) * d);

    if (an !== undefined && !nearlyEqual(an, computedAn)) {
      throw new SequenceError(
        `הנתונים סותרים: לפי a₁ ו-d מתקבל aₙ = ${formatNumber(computedAn)}, אך הוזן aₙ = ${formatNumber(an)}`,
      );
    }
    if (Sn !== undefined && !nearlyEqual(Sn, computedSn)) {
      throw new SequenceError(
        `הנתונים סותרים: לפי a₁ ו-d מתקבל Sₙ = ${formatNumber(computedSn)}, אך הוזן Sₙ = ${formatNumber(Sn)}`,
      );
    }

    if (input.an === undefined) {
      steps.push({
        law: "הצבה בנוסחת האיבר הכללי aₙ = a₁ + (n-1)d",
        expr: `a${n} = ${formatNumber(a1)} + (${formatNumber(n)} - 1)·${formatNumber(d)} = ${formatNumber(computedAn)}`,
      });
    }
    if (input.Sn === undefined) {
      steps.push({
        law: "הצבה בנוסחת הסכום Sₙ = n/2·(2a₁ + (n-1)d)",
        expr: `S${n} = ${formatNumber(n)}/2·(2·${formatNumber(a1)} + ${formatNumber(n - 1)}·${formatNumber(d)}) = ${formatNumber(computedSn)}`,
      });
    }

    const kind = classifySequence(d);
    const generalTermExpr = generalTermExpression(a1, d);

    let foundTerm: { index: number; value: number } | undefined;
    if (findIndex !== undefined) {
      const k = validateN(findIndex, "שדה 'מצא איבר n'");
      const value = a1 + (k - 1) * d;
      foundTerm = { index: k, value };
      steps.push({
        law: `מציאת האיבר ה-${k}: הצבת n = ${k} בנוסחת האיבר הכללי aₙ = a₁ + (n-1)d`,
        expr: `a${k} = ${formatNumber(a1)} + (${k} - 1)·${formatNumber(d)} = ${formatNumber(value)}`,
      });
    }

    steps.push({
      law: "תוצאה סופית",
      expr: `a₁ = ${formatNumber(a1)},  d = ${formatNumber(d)},  n = ${formatNumber(n)},  aₙ = ${formatNumber(computedAn)},  Sₙ = ${formatNumber(computedSn)}  |  ${generalTermExpr}`,
    });

    const termsCount = Math.min(n, 12);
    const terms: number[] = [];
    for (let k = 1; k <= termsCount; k++) terms.push(a1 + (k - 1) * d);

    return {
      type: "result",
      a1,
      d,
      n,
      an: computedAn,
      Sn: computedSn,
      kind,
      generalTermExpr,
      terms,
      steps,
      foundTerm,
    };
  } catch (err) {
    return {
      type: "error",
      message: err instanceof SequenceError ? err.message : "שגיאה בעיבוד הנתונים",
    };
  }
}
