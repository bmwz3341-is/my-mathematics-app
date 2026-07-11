/**
 * Geometric sequence engine: given any sufficient subset of the parameters
 * a1 (first term), q (common ratio), n (term count), an (n-th term) and
 * Sn (sum of first n terms), derives the missing ones using
 * an = a1 * q^(n-1) and Sn = a1 * (q^n - 1)/(q - 1) (or n*a1 when q = 1),
 * recording pedagogical steps. Combinations with no closed form (finding q
 * from a sum) are solved numerically by scanning for sign changes.
 */

export class GeoSequenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeoSequenceError";
  }
}

export interface GeoSequenceInput {
  a1?: number;
  q?: number;
  n?: number;
  an?: number;
  Sn?: number;
}

export interface GeoSequenceStep {
  law: string;
  expr: string;
}

export type GeoSequenceKind = "increasing" | "decreasing" | "constant" | "alternating";

export type GeoSequenceResult =
  | {
      type: "result";
      a1: number;
      q: number;
      n: number;
      an: number;
      Sn: number;
      kind: GeoSequenceKind;
      generalTermExpr: string;
      terms: number[];
      steps: GeoSequenceStep[];
      foundTerm?: { index: number; value: number };
    }
  | { type: "error"; message: string };

function formatNumber(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

const EPS = 1e-9;

function nearlyEqual(x: number, y: number): boolean {
  return Math.abs(x - y) <= 1e-6 * Math.max(1, Math.abs(x), Math.abs(y));
}

function validateN(n: number, source: string): number {
  if (!Number.isFinite(n) || Math.abs(n - Math.round(n)) > 1e-6 || Math.round(n) < 1) {
    throw new GeoSequenceError(`${source} נותן n=${formatNumber(n)}, אבל n חייב להיות מספר שלם חיובי`);
  }
  return Math.round(n);
}

/** Sum of the first n terms, computed iteratively so q = 1 needs no special case. */
function sumOfTerms(a1: number, q: number, n: number): number {
  let sum = 0;
  let term = a1;
  for (let k = 0; k < n; k++) {
    sum += term;
    term *= q;
  }
  return sum;
}

/** Scans f over [-10, 10] (excluding a gap around 0) and bisects sign changes. */
function scanForRoot(f: (q: number) => number): number | null {
  const roots: number[] = [];
  const STEP = 0.002;
  let prevQ: number | null = null;
  let prevV: number | null = null;
  for (let q = -10; q <= 10 + EPS; q += STEP) {
    if (Math.abs(q) < 0.01) {
      prevQ = null;
      prevV = null;
      continue;
    }
    const v = f(q);
    if (!Number.isFinite(v)) {
      prevQ = null;
      prevV = null;
      continue;
    }
    if (Math.abs(v) < 1e-9) roots.push(q);
    else if (prevQ !== null && prevV !== null && prevV * v < 0) {
      let lo = prevQ;
      let hi = q;
      let flo = prevV;
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        const fm = f(mid);
        if (flo * fm <= 0) hi = mid;
        else {
          lo = mid;
          flo = fm;
        }
      }
      roots.push((lo + hi) / 2);
    }
    prevQ = q;
    prevV = v;
  }
  if (roots.length === 0) return null;
  // Prefer a positive ratio, then the smallest magnitude, and snap near-round values.
  roots.sort((r1, r2) => {
    const pos1 = r1 > 0 ? 0 : 1;
    const pos2 = r2 > 0 ? 0 : 1;
    if (pos1 !== pos2) return pos1 - pos2;
    return Math.abs(r1) - Math.abs(r2);
  });
  const root = roots[0];
  const snapped = Math.round(root * 1e6) / 1e6;
  return Math.abs(snapped - Math.round(snapped)) < 1e-6 ? Math.round(snapped) : snapped;
}

export function classifyGeoSequence(a1: number, q: number): GeoSequenceKind {
  if (q < 0) return "alternating";
  if (q === 1) return "constant";
  // For q > 0: increasing iff a1*(q-1) > 0.
  return a1 * (q - 1) > 0 ? "increasing" : "decreasing";
}

export function geoKindLabel(kind: GeoSequenceKind): string {
  if (kind === "increasing") return "סדרה עולה";
  if (kind === "decreasing") return "סדרה יורדת";
  if (kind === "alternating") return "סדרה מתחלפת סימן (q < 0)";
  return "סדרה קבועה (q = 1)";
}

export function geoGeneralTermExpression(a1: number, q: number): string {
  if (q === 1) return `a_n = ${formatNumber(a1)}`;
  const coefPart = a1 === 1 ? "" : a1 === -1 ? "-" : `${formatNumber(a1)}·`;
  const qPart = q < 0 ? `(${formatNumber(q)})` : formatNumber(q);
  return `a_n = ${coefPart}${qPart}^(n-1)`;
}

export function solveGeoSequence(input: GeoSequenceInput, findIndex?: number): GeoSequenceResult {
  const given: string[] = [];
  if (input.a1 !== undefined) given.push(`a₁ = ${formatNumber(input.a1)}`);
  if (input.q !== undefined) given.push(`q = ${formatNumber(input.q)}`);
  if (input.n !== undefined) given.push(`n = ${formatNumber(input.n)}`);
  if (input.an !== undefined) given.push(`aₙ = ${formatNumber(input.an)}`);
  if (input.Sn !== undefined) given.push(`Sₙ = ${formatNumber(input.Sn)}`);

  if (given.length < 3) {
    return { type: "error", message: "נא להזין לפחות שלושה נתונים כדי שאפשר יהיה לפתור את הסדרה" };
  }

  const steps: GeoSequenceStep[] = [{ law: "הנתונים שזוהו מהקלט", expr: given.join(",  ") }];

  let { a1, q, n } = input;
  const { an, Sn } = input;

  try {
    if (a1 !== undefined && a1 === 0) throw new GeoSequenceError("בסדרה הנדסית האיבר הראשון חייב להיות שונה מ-0");
    if (q !== undefined && q === 0) throw new GeoSequenceError("בסדרה הנדסית המנה q חייבת להיות שונה מ-0");
    if (n !== undefined) n = validateN(n, "הקלט");

    // Resolve n first when missing.
    if (n === undefined) {
      if (a1 !== undefined && q !== undefined && an !== undefined) {
        if (q === 1 || q === -1) {
          throw new GeoSequenceError(`עבור q = ${formatNumber(q)} לא ניתן לקבוע את n מתוך aₙ — נא להזין את n`);
        }
        const ratio = an / a1;
        const rawExp = Math.log(Math.abs(ratio)) / Math.log(Math.abs(q));
        const rawN = rawExp + 1;
        n = validateN(rawN, "החישוב n = log|aₙ/a₁| / log|q| + 1");
        if (!nearlyEqual(a1 * Math.pow(q, n - 1), an)) {
          throw new GeoSequenceError("לא קיים n שלם שמקיים aₙ = a₁·qⁿ⁻¹ עם הנתונים שהוזנו (בדקו את הסימנים)");
        }
        steps.push({
          law: "בחירת נוסחה: איבר כללי aₙ = a₁·qⁿ⁻¹, בידוד n באמצעות לוגריתם",
          expr: `qⁿ⁻¹ = aₙ/a₁ = ${formatNumber(ratio)}  →  n = log|aₙ/a₁|/log|q| + 1 = ${formatNumber(n)}`,
        });
      } else if (a1 !== undefined && q !== undefined && Sn !== undefined) {
        let foundN: number | null = null;
        for (let k = 1; k <= 500; k++) {
          if (nearlyEqual(sumOfTerms(a1, q, k), Sn)) {
            foundN = k;
            break;
          }
        }
        if (foundN === null) throw new GeoSequenceError("לא נמצא n שלם (עד 500) שמקיים את סכום הסדרה שהוזן");
        n = foundN;
        steps.push({
          law: "בחירת נוסחה: סכום סדרה Sₙ = a₁·(qⁿ - 1)/(q - 1), מציאת n",
          expr: `a₁·(qⁿ - 1)/(q - 1) = ${formatNumber(Sn)}  →  n = ${formatNumber(n)}`,
        });
      } else {
        throw new GeoSequenceError("כדי לפתור ללא n יש להזין a₁, q ועוד נתון (aₙ או Sₙ)");
      }
    }

    // n is known from here on; resolve a1 and q.
    if (a1 === undefined || q === undefined) {
      if (a1 !== undefined && an !== undefined) {
        if (n === 1) {
          if (!nearlyEqual(a1, an)) throw new GeoSequenceError("עבור n = 1 חייב להתקיים aₙ = a₁");
          throw new GeoSequenceError("עבור n = 1 לא ניתן לקבוע את q — נא להזין נתון נוסף");
        }
        const ratio = an / a1;
        if (ratio === 0) throw new GeoSequenceError("בסדרה הנדסית aₙ חייב להיות שונה מ-0");
        let qResolved: number;
        if (ratio > 0) {
          qResolved = Math.pow(ratio, 1 / (n - 1));
        } else if ((n - 1) % 2 === 1) {
          qResolved = -Math.pow(-ratio, 1 / (n - 1));
        } else {
          throw new GeoSequenceError("aₙ/a₁ שלילי אך n-1 זוגי — לא קיימת מנה ממשית q");
        }
        const snapped = Math.round(qResolved * 1e6) / 1e6;
        q = Math.abs(snapped - Math.round(snapped)) < 1e-9 ? Math.round(snapped) : snapped;
        steps.push({
          law: "בחירת נוסחה: איבר כללי aₙ = a₁·qⁿ⁻¹, בידוד q",
          expr: `qⁿ⁻¹ = aₙ/a₁ = ${formatNumber(an)}/${formatNumber(a1)} = ${formatNumber(ratio)}  →  q = ${formatNumber(ratio)}^(1/${formatNumber(n - 1)}) = ${formatNumber(q)}`,
        });
      } else if (a1 !== undefined && Sn !== undefined) {
        if (n === 1) {
          if (!nearlyEqual(a1, Sn)) throw new GeoSequenceError("עבור n = 1 חייב להתקיים Sₙ = a₁");
          throw new GeoSequenceError("עבור n = 1 לא ניתן לקבוע את q — נא להזין נתון נוסף");
        }
        const nn = n;
        const target = Sn;
        const base = a1;
        const root = scanForRoot((cand) => sumOfTerms(base, cand, nn) - target);
        if (root === null) throw new GeoSequenceError("לא נמצאה מנה q (בטווח -10 עד 10) שמקיימת את סכום הסדרה שהוזן");
        q = root;
        steps.push({
          law: "בחירת נוסחה: סכום סדרה Sₙ = a₁·(qⁿ - 1)/(q - 1), פתרון נומרי של המשוואה ב-q",
          expr: `${formatNumber(a1)}·(q^${formatNumber(n)} - 1)/(q - 1) = ${formatNumber(Sn)}  →  q = ${formatNumber(q)}`,
        });
      } else if (q !== undefined && an !== undefined) {
        a1 = an / Math.pow(q, n - 1);
        steps.push({
          law: "בחירת נוסחה: איבר כללי aₙ = a₁·qⁿ⁻¹, בידוד a₁",
          expr: `a₁ = aₙ/qⁿ⁻¹ = ${formatNumber(an)}/${formatNumber(q)}^${formatNumber(n - 1)} = ${formatNumber(a1)}`,
        });
      } else if (q !== undefined && Sn !== undefined) {
        if (q === 1) {
          a1 = Sn / n;
          steps.push({
            law: "עבור q = 1 הסכום הוא Sₙ = n·a₁, בידוד a₁",
            expr: `a₁ = Sₙ/n = ${formatNumber(Sn)}/${formatNumber(n)} = ${formatNumber(a1)}`,
          });
        } else {
          a1 = (Sn * (q - 1)) / (Math.pow(q, n) - 1);
          steps.push({
            law: "בחירת נוסחה: סכום סדרה Sₙ = a₁·(qⁿ - 1)/(q - 1), בידוד a₁",
            expr: `a₁ = Sₙ·(q - 1)/(qⁿ - 1) = ${formatNumber(Sn)}·${formatNumber(q - 1)}/${formatNumber(Math.pow(q, n) - 1)} = ${formatNumber(a1)}`,
          });
        }
      } else if (an !== undefined && Sn !== undefined) {
        if (n === 1) {
          a1 = an;
          q = 1;
        } else {
          const nn = n;
          const targetSum = Sn;
          const lastTerm = an;
          const root = scanForRoot((cand) => sumOfTerms(lastTerm / Math.pow(cand, nn - 1), cand, nn) - targetSum);
          if (root === null) throw new GeoSequenceError("לא נמצאה מנה q (בטווח -10 עד 10) שמקיימת את aₙ ואת Sₙ יחד");
          q = root;
          a1 = an / Math.pow(q, n - 1);
          steps.push({
            law: "שילוב הנוסחאות: a₁ = aₙ/qⁿ⁻¹ בתוך נוסחת הסכום, פתרון נומרי ב-q",
            expr: `(aₙ/qⁿ⁻¹)·(qⁿ - 1)/(q - 1) = ${formatNumber(Sn)}  →  q = ${formatNumber(q)},  a₁ = ${formatNumber(a1)}`,
          });
        }
      } else {
        throw new GeoSequenceError("הנתונים שהוזנו אינם מספיקים לפתרון — נא להזין צירוף אחר");
      }
    }

    if (a1 === undefined || q === undefined || n === undefined) {
      throw new GeoSequenceError("הנתונים שהוזנו אינם מספיקים לפתרון — נא להזין צירוף אחר");
    }
    if (a1 === 0) throw new GeoSequenceError("בסדרה הנדסית האיבר הראשון חייב להיות שונה מ-0");
    if (q === 0) throw new GeoSequenceError("בסדרה הנדסית המנה q חייבת להיות שונה מ-0");

    const computedAn = a1 * Math.pow(q, n - 1);
    const computedSn = sumOfTerms(a1, q, n);

    if (an !== undefined && !nearlyEqual(an, computedAn)) {
      throw new GeoSequenceError(
        `הנתונים סותרים: לפי a₁ ו-q מתקבל aₙ = ${formatNumber(computedAn)}, אך הוזן aₙ = ${formatNumber(an)}`,
      );
    }
    if (Sn !== undefined && !nearlyEqual(Sn, computedSn)) {
      throw new GeoSequenceError(
        `הנתונים סותרים: לפי a₁ ו-q מתקבל Sₙ = ${formatNumber(computedSn)}, אך הוזן Sₙ = ${formatNumber(Sn)}`,
      );
    }

    if (input.an === undefined) {
      steps.push({
        law: "הצבה בנוסחת האיבר הכללי aₙ = a₁·qⁿ⁻¹",
        expr: `a${n} = ${formatNumber(a1)}·${formatNumber(q)}^${formatNumber(n - 1)} = ${formatNumber(computedAn)}`,
      });
    }
    if (input.Sn === undefined) {
      if (q === 1) {
        steps.push({
          law: "עבור q = 1 הסכום הוא Sₙ = n·a₁",
          expr: `S${n} = ${formatNumber(n)}·${formatNumber(a1)} = ${formatNumber(computedSn)}`,
        });
      } else {
        steps.push({
          law: "הצבה בנוסחת הסכום Sₙ = a₁·(qⁿ - 1)/(q - 1)",
          expr: `S${n} = ${formatNumber(a1)}·(${formatNumber(q)}^${formatNumber(n)} - 1)/(${formatNumber(q)} - 1) = ${formatNumber(computedSn)}`,
        });
      }
    }

    const kind = classifyGeoSequence(a1, q);
    const generalTermExpr = geoGeneralTermExpression(a1, q);

    let foundTerm: { index: number; value: number } | undefined;
    if (findIndex !== undefined) {
      const k = validateN(findIndex, "שדה 'מצא איבר n'");
      const value = a1 * Math.pow(q, k - 1);
      foundTerm = { index: k, value };
      steps.push({
        law: `מציאת האיבר ה-${k}: הצבת n = ${k} בנוסחת האיבר הכללי aₙ = a₁·qⁿ⁻¹`,
        expr: `a${k} = ${formatNumber(a1)}·${formatNumber(q)}^${k - 1} = ${formatNumber(value)}`,
      });
    }

    steps.push({
      law: "תוצאה סופית",
      expr: `a₁ = ${formatNumber(a1)},  q = ${formatNumber(q)},  n = ${formatNumber(n)},  aₙ = ${formatNumber(computedAn)},  Sₙ = ${formatNumber(computedSn)}  |  ${generalTermExpr}`,
    });

    const termsCount = Math.min(n, 10);
    const terms: number[] = [];
    for (let k = 1; k <= termsCount; k++) terms.push(a1 * Math.pow(q, k - 1));

    return {
      type: "result",
      a1,
      q,
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
      message: err instanceof GeoSequenceError ? err.message : "שגיאה בעיבוד הנתונים",
    };
  }
}
