/**
 * Probability & statistics engine covering the full high-school curriculum
 * (3-5 units): classical probability, conditional probability with a 2x2
 * joint table and Bayes' rule, the binomial (Bernoulli trials) distribution,
 * descriptive statistics for a raw list or a frequency table, and the normal
 * distribution (z-score + CDF via the Abramowitz-Stegun erf approximation).
 * Every solver records pedagogical steps ({ law, expr }) mirroring the style
 * used by the sequence solvers.
 */

export class StatsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StatsError";
  }
}

export interface CalcStep {
  law: string;
  expr: string;
}

export function formatNumber(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function formatPercent(value: number): string {
  return `${formatNumber(value * 100)}%`;
}

function isInt(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value - Math.round(value)) < 1e-9;
}

/* ---------------------------------------------------------------------- */
/* 1. Classical probability                                               */
/* ---------------------------------------------------------------------- */

export interface ClassicalProbabilityResult {
  type: "result";
  favorable: number;
  total: number;
  probability: number;
  steps: CalcStep[];
}

export type ClassicalProbabilityOutcome = ClassicalProbabilityResult | { type: "error"; message: string };

export function solveClassicalProbability(favorable: number, total: number): ClassicalProbabilityOutcome {
  try {
    if (!isInt(total) || total <= 0) throw new StatsError("מספר התוצאות האפשריות חייב להיות מספר שלם חיובי");
    if (!isInt(favorable) || favorable < 0) throw new StatsError("מספר התוצאות החיוביות חייב להיות מספר שלם אי-שלילי");
    if (favorable > total) throw new StatsError("מספר התוצאות החיוביות אינו יכול להיות גדול ממספר התוצאות האפשריות");

    const probability = favorable / total;
    const steps: CalcStep[] = [
      { law: "הגדרת ההסתברות הקלאסית", expr: "P(A) = מספר התוצאות החיוביות / מספר התוצאות האפשריות" },
      {
        law: "הצבת הנתונים",
        expr: `P(A) = ${formatNumber(favorable)}/${formatNumber(total)} = ${formatNumber(probability)} = ${formatPercent(probability)}`,
      },
    ];
    return { type: "result", favorable, total, probability, steps };
  } catch (err) {
    return { type: "error", message: err instanceof StatsError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}

/* ---------------------------------------------------------------------- */
/* 2. Conditional probability - 2x2 joint table + Bayes                   */
/* ---------------------------------------------------------------------- */

export interface JointTableInput {
  pAB: number; // P(A ∩ B)
  pAnotB: number; // P(A ∩ B')
  pnotAB: number; // P(A' ∩ B)
  pnotAnotB: number; // P(A' ∩ B')
}

export interface ConditionalProbabilityResult {
  type: "result";
  table: JointTableInput;
  pA: number;
  pNotA: number;
  pB: number;
  pNotB: number;
  pAGivenB: number;
  pBGivenA: number;
  pAGivenNotB: number;
  pNotAGivenB: number;
  independent: boolean;
  steps: CalcStep[];
}

export type ConditionalProbabilityOutcome = ConditionalProbabilityResult | { type: "error"; message: string };

export function solveConditionalProbability(table: JointTableInput): ConditionalProbabilityOutcome {
  try {
    const { pAB, pAnotB, pnotAB, pnotAnotB } = table;
    for (const [label, v] of [
      ["P(A ∩ B)", pAB],
      ["P(A ∩ B')", pAnotB],
      ["P(A' ∩ B)", pnotAB],
      ["P(A' ∩ B')", pnotAnotB],
    ] as const) {
      if (!Number.isFinite(v) || v < 0 || v > 1) throw new StatsError(`${label} חייב להיות מספר בין 0 ל-1`);
    }

    const sum = pAB + pAnotB + pnotAB + pnotAnotB;
    if (Math.abs(sum - 1) > 1e-6) {
      throw new StatsError(`סכום כל התאים בטבלה חייב להיות 1, אך התקבל ${formatNumber(sum)}`);
    }

    const pA = pAB + pAnotB;
    const pNotA = pnotAB + pnotAnotB;
    const pB = pAB + pnotAB;
    const pNotB = pAnotB + pnotAnotB;

    if (pB === 0) throw new StatsError("לא ניתן לחשב P(A|B) כאשר P(B) = 0");
    if (pA === 0) throw new StatsError("לא ניתן לחשב P(B|A) כאשר P(A) = 0");

    const pAGivenB = pAB / pB;
    const pBGivenA = pAB / pA;
    const pAGivenNotB = pNotB === 0 ? NaN : pAnotB / pNotB;
    const pNotAGivenB = pnotAB / pB;
    const independent = Math.abs(pAB - pA * pB) < 1e-6;

    const steps: CalcStep[] = [
      {
        law: "בדיקת שלמות הטבלה",
        expr: `P(A∩B) + P(A∩B') + P(A'∩B) + P(A'∩B') = ${formatNumber(pAB)} + ${formatNumber(pAnotB)} + ${formatNumber(pnotAB)} + ${formatNumber(pnotAnotB)} = ${formatNumber(sum)}`,
      },
      {
        law: "שוליים (Marginal Probabilities)",
        expr: `P(A) = ${formatNumber(pA)},  P(A') = ${formatNumber(pNotA)},  P(B) = ${formatNumber(pB)},  P(B') = ${formatNumber(pNotB)}`,
      },
      {
        law: "נוסחת בייס: P(A|B) = P(A ∩ B) / P(B)",
        expr: `P(A|B) = ${formatNumber(pAB)}/${formatNumber(pB)} = ${formatNumber(pAGivenB)}`,
      },
      {
        law: "נוסחת בייס: P(B|A) = P(A ∩ B) / P(A)",
        expr: `P(B|A) = ${formatNumber(pAB)}/${formatNumber(pA)} = ${formatNumber(pBGivenA)}`,
      },
      {
        law: "בדיקת אי-תלות: A ו-B בלתי-תלויים אם ורק אם P(A∩B) = P(A)·P(B)",
        expr: `P(A)·P(B) = ${formatNumber(pA)}·${formatNumber(pB)} = ${formatNumber(pA * pB)}  ${independent ? "= " : "≠ "}P(A∩B) = ${formatNumber(pAB)}  →  ${independent ? "המאורעות בלתי תלויים" : "המאורעות תלויים"}`,
      },
    ];

    return {
      type: "result",
      table,
      pA,
      pNotA,
      pB,
      pNotB,
      pAGivenB,
      pBGivenA,
      pAGivenNotB,
      pNotAGivenB,
      independent,
      steps,
    };
  } catch (err) {
    return { type: "error", message: err instanceof StatsError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}

/* ---------------------------------------------------------------------- */
/* 3. Binomial distribution (Bernoulli trials)                            */
/* ---------------------------------------------------------------------- */

export interface BinomialResult {
  type: "result";
  n: number;
  k: number;
  p: number;
  combinations: number;
  probability: number;
  mean: number;
  variance: number;
  stdev: number;
  steps: CalcStep[];
}

export type BinomialOutcome = BinomialResult | { type: "error"; message: string };

function combinations(n: number, k: number): number {
  let result = 1;
  const kk = Math.min(k, n - k);
  for (let i = 0; i < kk; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}

export function solveBinomial(n: number, k: number, p: number): BinomialOutcome {
  try {
    if (!isInt(n) || n <= 0) throw new StatsError("מספר הניסויים n חייב להיות מספר שלם חיובי");
    if (!isInt(k) || k < 0) throw new StatsError("מספר ההצלחות k חייב להיות מספר שלם אי-שלילי");
    if (k > n) throw new StatsError("מספר ההצלחות k אינו יכול להיות גדול ממספר הניסויים n");
    if (!Number.isFinite(p) || p < 0 || p > 1) throw new StatsError("ההסתברות להצלחה p חייבת להיות בין 0 ל-1");

    const c = combinations(n, k);
    const probability = c * Math.pow(p, k) * Math.pow(1 - p, n - k);
    const mean = n * p;
    const variance = n * p * (1 - p);
    const stdev = Math.sqrt(variance);

    const steps: CalcStep[] = [
      { law: "נוסחת ברנולי", expr: "P(X = k) = C(n,k) · p^k · (1-p)^(n-k)" },
      { law: "חישוב מקדם הבינום C(n,k)", expr: `C(${formatNumber(n)},${formatNumber(k)}) = ${formatNumber(n)}!/(${formatNumber(k)}!·(${formatNumber(n)}-${formatNumber(k)})!) = ${formatNumber(c)}` },
      {
        law: "הצבה בנוסחה",
        expr: `P(X = ${formatNumber(k)}) = ${formatNumber(c)} · ${formatNumber(p)}^${formatNumber(k)} · ${formatNumber(1 - p)}^${formatNumber(n - k)} = ${formatNumber(probability)} = ${formatPercent(probability)}`,
      },
      {
        law: "פרמטרי ההתפלגות (תוחלת ושונות)",
        expr: `E(X) = n·p = ${formatNumber(mean)},  Var(X) = n·p·(1-p) = ${formatNumber(variance)},  σ = ${formatNumber(stdev)}`,
      },
    ];

    return { type: "result", n, k, p, combinations: c, probability, mean, variance, stdev, steps };
  } catch (err) {
    return { type: "error", message: err instanceof StatsError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}

/* ---------------------------------------------------------------------- */
/* 4. Descriptive statistics (raw list or frequency table)                */
/* ---------------------------------------------------------------------- */

export interface FrequencyPair {
  value: number;
  freq: number;
}

export type DescriptiveStatsInput = { mode: "list"; values: number[] } | { mode: "freq"; pairs: FrequencyPair[] };

export interface DescriptiveStatsResult {
  type: "result";
  n: number;
  mean: number;
  median: number;
  modeValues: number[];
  variance: number;
  stdev: number;
  steps: CalcStep[];
}

export type DescriptiveStatsOutcome = DescriptiveStatsResult | { type: "error"; message: string };

export function solveDescriptiveStats(input: DescriptiveStatsInput): DescriptiveStatsOutcome {
  try {
    let expanded: number[];
    const steps: CalcStep[] = [];

    if (input.mode === "list") {
      if (input.values.length === 0) throw new StatsError("נא להזין לפחות ערך אחד");
      expanded = input.values;
      steps.push({ law: "רשימת הנתונים שהוזנה", expr: `{${input.values.map(formatNumber).join(", ")}}` });
    } else {
      if (input.pairs.length === 0) throw new StatsError("נא להזין לפחות שורה אחת בטבלת השכיחויות");
      for (const pair of input.pairs) {
        if (!isInt(pair.freq) || pair.freq <= 0) throw new StatsError("השכיחות של כל ערך חייבת להיות מספר שלם חיובי");
      }
      expanded = [];
      for (const pair of input.pairs) {
        for (let i = 0; i < pair.freq; i++) expanded.push(pair.value);
      }
      steps.push({
        law: "טבלת השכיחויות שהוזנה",
        expr: input.pairs.map((p) => `${formatNumber(p.value)}×${formatNumber(p.freq)}`).join(",  "),
      });
    }

    const n = expanded.length;
    const sum = expanded.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    steps.push({ law: "ממוצע: x̄ = Σx / n", expr: `x̄ = ${formatNumber(sum)}/${formatNumber(n)} = ${formatNumber(mean)}` });

    const sorted = [...expanded].sort((a, b) => a - b);
    let median: number;
    if (n % 2 === 1) {
      median = sorted[(n - 1) / 2];
      steps.push({ law: "חציון (n אי-זוגי): הערך האמצעי ברשימה הממוינת", expr: `חציון = ${formatNumber(median)}` });
    } else {
      const mid1 = sorted[n / 2 - 1];
      const mid2 = sorted[n / 2];
      median = (mid1 + mid2) / 2;
      steps.push({
        law: "חציון (n זוגי): ממוצע שני האיברים האמצעיים ברשימה הממוינת",
        expr: `חציון = (${formatNumber(mid1)} + ${formatNumber(mid2)})/2 = ${formatNumber(median)}`,
      });
    }

    const freqMap = new Map<number, number>();
    for (const v of expanded) freqMap.set(v, (freqMap.get(v) ?? 0) + 1);
    const maxFreq = Math.max(...freqMap.values());
    const modeValues = [...freqMap.entries()].filter(([, f]) => f === maxFreq).map(([v]) => v).sort((a, b) => a - b);
    steps.push({
      law: "שכיח (Mode): הערך/ים בעל השכיחות הגבוהה ביותר",
      expr:
        modeValues.length === freqMap.size
          ? "כל הערכים מופיעים באותה שכיחות — אין שכיח יחיד"
          : `שכיח = ${modeValues.map(formatNumber).join(", ")} (שכיחות ${formatNumber(maxFreq)})`,
    });

    const variance = expanded.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
    const stdev = Math.sqrt(variance);
    steps.push({
      law: "שונות וסטיית תקן (אוכלוסייה): σ² = Σ(x - x̄)² / n,  σ = √σ²",
      expr: `σ² = ${formatNumber(variance)}  →  σ = ${formatNumber(stdev)}`,
    });

    return { type: "result", n, mean, median, modeValues, variance, stdev, steps };
  } catch (err) {
    return { type: "error", message: err instanceof StatsError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}

/* ---------------------------------------------------------------------- */
/* 5. Normal distribution                                                 */
/* ---------------------------------------------------------------------- */

/** Abramowitz-Stegun rational approximation of the error function (max error ~1.5e-7). */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function standardNormalCDF(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export type NormalMode = "below" | "above" | "between";

export interface NormalDistributionInput {
  mu: number;
  sigma: number;
  mode: NormalMode;
  x: number;
  x2?: number; // only for "between"
}

export interface NormalDistributionResult {
  type: "result";
  mu: number;
  sigma: number;
  mode: NormalMode;
  x: number;
  x2?: number;
  z: number;
  z2?: number;
  probability: number;
  steps: CalcStep[];
}

export type NormalDistributionOutcome = NormalDistributionResult | { type: "error"; message: string };

export function solveNormalDistribution(input: NormalDistributionInput): NormalDistributionOutcome {
  try {
    const { mu, sigma, mode, x } = input;
    if (!Number.isFinite(mu)) throw new StatsError("יש להזין ממוצע μ תקין");
    if (!Number.isFinite(sigma) || sigma <= 0) throw new StatsError("סטיית התקן σ חייבת להיות מספר חיובי");
    if (!Number.isFinite(x)) throw new StatsError("יש להזין ערך X תקין");

    const z = (x - mu) / sigma;
    const steps: CalcStep[] = [
      { law: "מחשבון ציון תקן: Z = (X - μ) / σ", expr: `Z = (${formatNumber(x)} - ${formatNumber(mu)})/${formatNumber(sigma)} = ${formatNumber(z)}` },
    ];

    if (mode === "below") {
      const probability = standardNormalCDF(z);
      steps.push({
        law: "שימוש בטבלת ההתפלגות הנורמלית (CDF): P(X < x) = Φ(Z)",
        expr: `P(X < ${formatNumber(x)}) = Φ(${formatNumber(z)}) = ${formatNumber(probability)} = ${formatPercent(probability)}`,
      });
      return { type: "result", mu, sigma, mode, x, z, probability, steps };
    }

    if (mode === "above") {
      const probability = 1 - standardNormalCDF(z);
      steps.push({
        law: "שימוש בטבלת ההתפלגות הנורמלית (CDF): P(X > x) = 1 - Φ(Z)",
        expr: `P(X > ${formatNumber(x)}) = 1 - Φ(${formatNumber(z)}) = 1 - ${formatNumber(standardNormalCDF(z))} = ${formatNumber(probability)} = ${formatPercent(probability)}`,
      });
      return { type: "result", mu, sigma, mode, x, z, probability, steps };
    }

    // between
    const x2 = input.x2;
    if (x2 === undefined || !Number.isFinite(x2)) throw new StatsError("יש להזין גם ערך X2 עבור טווח בין שני ערכים");
    const z2 = (x2! - mu) / sigma;
    const lo = Math.min(z, z2);
    const hi = Math.max(z, z2);
    const probability = standardNormalCDF(hi) - standardNormalCDF(lo);
    steps.push({ law: "ציון תקן שני: Z2 = (X2 - μ)/σ", expr: `Z2 = (${formatNumber(x2!)} - ${formatNumber(mu)})/${formatNumber(sigma)} = ${formatNumber(z2)}` });
    steps.push({
      law: "שימוש בטבלת ההתפלגות הנורמלית (CDF): P(a < X < b) = Φ(Z_גבוה) - Φ(Z_נמוך)",
      expr: `P(${formatNumber(Math.min(x, x2!))} < X < ${formatNumber(Math.max(x, x2!))}) = Φ(${formatNumber(hi)}) - Φ(${formatNumber(lo)}) = ${formatNumber(probability)} = ${formatPercent(probability)}`,
    });
    return { type: "result", mu, sigma, mode, x, x2: x2!, z, z2, probability, steps };
  } catch (err) {
    return { type: "error", message: err instanceof StatsError ? err.message : "שגיאה בעיבוד הנתונים" };
  }
}
