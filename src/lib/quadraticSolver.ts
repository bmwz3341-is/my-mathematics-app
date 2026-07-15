/**
 * Quadratic-equation solver upgraded to the 5-unit curriculum level:
 *  - clears numeric-denominator fractions before standardizing, with an
 *    explicit "equation with no fractions" pedagogical step,
 *  - supports coefficients that contain a parameter (e.g. m), in which case
 *    the discriminant and the roots are presented as algebraic expressions
 *    instead of numbers,
 *  - explains what the discriminant's sign means for the number of real
 *    solutions,
 *  - and ends with a "check" step substituting the root(s) back into the
 *    standard-form equation.
 *
 * Internally every coefficient is a small multivariate polynomial ("Sym") in
 * whatever parameter letters appear in the input besides the unknown — the
 * unknown itself is just another Sym variable, bucketed out by its exponent
 * (0, 1 or 2) once both sides have been combined into standard form.
 */

import {
  symSub,
  symMul,
  symScale,
  symNeg,
  symIsZero,
  symIsPureConst,
  symHasParams,
  symConstValue,
  formatStepNumber,
  formatSym,
  formatPolyInVar,
  bucketByVar,
  tokenize,
  parseExpr,
} from "./symbolicAlgebra";

/* ------------------------------------------------------------------ */
/* Clearing numeric-denominator fractions                              */
/* ------------------------------------------------------------------ */

function extractDenominators(raw: string): number[] {
  const matches = raw.match(/\/\s*(\d+(?:\.\d+)?)/g) ?? [];
  return matches.map((m) => parseFloat(m.replace("/", "").trim())).filter((n) => Number.isFinite(n) && n > 0);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function lcmAll(nums: number[]): number | null {
  const ints = nums.filter((n) => Number.isInteger(n));
  if (ints.length !== nums.length || ints.length === 0) return null;
  let result = ints[0];
  for (let i = 1; i < ints.length; i++) result = (result * ints[i]) / gcd(result, ints[i]);
  return result > 100000 ? null : result;
}

function detectVariable(input: string): string {
  if (/x/i.test(input)) return "x";
  const match = input.match(/[a-zA-Z]/);
  return match ? match[0].toLowerCase() : "x";
}

/* ------------------------------------------------------------------ */
/* Result types                                                        */
/* ------------------------------------------------------------------ */

export interface QuadraticStep {
  label: string;
  expr: string;
}

export type QuadraticResult =
  | {
      type: "result";
      variable: string;
      hasParams: false;
      a: number;
      b: number;
      c: number;
      discriminant: number;
      roots: number[];
      standardExpr: string;
      steps: QuadraticStep[];
    }
  | {
      type: "result";
      variable: string;
      hasParams: true;
      standardExpr: string;
      rootsExpr: string;
      steps: QuadraticStep[];
    }
  | { type: "error"; message: string };

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export function solveQuadratic(input: string): QuadraticResult {
  const trimmed = input.trim();
  if (!trimmed) return { type: "error", message: "נא להזין משוואה ריבועית, למשל x^2 + 5x + 6 = 0" };

  const equalsCount = (trimmed.match(/=/g) ?? []).length;
  if (equalsCount !== 1) {
    return { type: "error", message: "יש להזין משוואה עם סימן שוויון (=) יחיד" };
  }

  const [rawLeft, rawRight] = trimmed.split("=");
  const variable = detectVariable(trimmed);

  try {
    const leftSym = parseExpr(tokenize(rawLeft));
    const rightSym = parseExpr(tokenize(rawRight));

    const chain: string[] = [`${rawLeft.trim()} = ${rawRight.trim()}`];

    const denominators = extractDenominators(trimmed);
    const lcm = denominators.length > 0 ? lcmAll(denominators) : null;
    let stdLeft = leftSym;
    let stdRight = rightSym;
    if (lcm !== null && lcm > 1) {
      stdLeft = symScale(leftSym, lcm);
      stdRight = symScale(rightSym, lcm);
      chain.push(
        `×${formatStepNumber(lcm)} (מכנה משותף, ללא שברים):  ${formatPolyInVar(stdLeft, variable)} = ${formatPolyInVar(stdRight, variable)}`,
      );
    }

    const combined = symSub(stdLeft, stdRight);
    const standardExpr = `${formatPolyInVar(combined, variable)} = 0`;
    chain.push(`צורה סטנדרטית:  ${standardExpr}`);

    const steps: QuadraticStep[] = [
      { label: "שלב 1: פישוט המשוואה (ניקוי שברים וסידור לצורה סטנדרטית)", expr: chain.join("  →  ") },
    ];

    const { a, b, c, maxDeg } = bucketByVar(combined, variable);
    if (maxDeg > 2) {
      return { type: "error", message: `נתמכות רק משוואות ריבועיות (עד חזקה 2) — זוהתה חזקה ${maxDeg}` };
    }
    if (symIsZero(a)) {
      return {
        type: "error",
        message: `המקדם של ${variable}² הוא אפס — זו אינה משוואה ריבועית (נסו את כרטסת המשוואות הלינאריות)`,
      };
    }

    const hasParams = symHasParams(a) || symHasParams(b) || symHasParams(c);

    let coefExpr = `a = ${formatSym(a)},  b = ${formatSym(b)},  c = ${formatSym(c)}`;
    if (!symIsPureConst(a)) coefExpr += `   [בהנחה ש- ${formatSym(a)} ≠ 0]`;
    steps.push({ label: "שלב 2: זיהוי המקדמים a, b, c", expr: coefExpr });

    const discSym = symSub(symMul(b, b), symScale(symMul(a, c), 4));
    const discBase = `Δ = b² - 4ac = (${formatSym(b)})² - 4·(${formatSym(a)})·(${formatSym(c)}) = ${formatSym(discSym)}`;

    if (!hasParams) {
      const aN = symConstValue(a);
      const bN = symConstValue(b);
      const cN = symConstValue(c);
      const discriminant = symConstValue(discSym);

      const meaning =
        discriminant < -1e-9
          ? "Δ < 0  ⇒  אין פתרון ממשי (הפרבולה אינה נחתכת עם ציר ה-x)"
          : Math.abs(discriminant) <= 1e-9
            ? "Δ = 0  ⇒  פתרון ממשי יחיד (הפרבולה משיקה לציר ה-x בקודקודה)"
            : "Δ > 0  ⇒  שני פתרונות ממשיים שונים (הפרבולה חותכת את ציר ה-x בשתי נקודות)";
      steps.push({ label: "שלב 3: חישוב הדיסקרימיננטה וניתוחה", expr: `${discBase}  →  ${meaning}` });

      let roots: number[] = [];
      if (discriminant < -1e-9) {
        steps.push({ label: "שלב 4: תוצאה סופית", expr: "אין שורש ריבועי ממשי ל-Δ שלילי  ⇒  אין פתרון ממשי למשוואה (∅)" });
      } else if (Math.abs(discriminant) <= 1e-9) {
        const x0 = -bN / (2 * aN);
        steps.push({
          label: "שלב 4: הצבה בנוסחת השורשים ותוצאה סופית",
          expr: `${variable} = -b / 2a = ${formatStepNumber(-bN)} / ${formatStepNumber(2 * aN)} = ${formatStepNumber(x0)}`,
        });
        roots = [x0];
      } else {
        const sq = Math.sqrt(discriminant);
        const x1 = (-bN + sq) / (2 * aN);
        const x2 = (-bN - sq) / (2 * aN);
        roots = [x1, x2].sort((p, q) => p - q);
        steps.push({
          label: "שלב 4: הצבה בנוסחת השורשים ותוצאה סופית",
          expr: `${variable} = (-b ± √Δ) / 2a = (${formatStepNumber(-bN)} ± √${formatStepNumber(discriminant)}) / ${formatStepNumber(2 * aN)}  ⇒  ${variable}₁ = ${formatStepNumber(roots[1])},  ${variable}₂ = ${formatStepNumber(roots[0])}`,
        });
      }

      if (roots.length > 0) {
        const checkOne = (r: number) => {
          const lhs = aN * r * r + bN * r + cN;
          const ok = Math.abs(lhs) < 1e-6;
          return `${formatStepNumber(aN)}(${formatStepNumber(r)})² + ${formatStepNumber(bN)}(${formatStepNumber(r)}) + ${formatStepNumber(cN)} = ${formatStepNumber(lhs)} ${ok ? "✓" : "✗"}`;
        };
        steps.push({
          label: "שלב 5: בדיקה — הצבת הפתרון במשוואה המקורית",
          expr:
            roots.length === 1
              ? `${variable} = ${formatStepNumber(roots[0])}:  ${checkOne(roots[0])}`
              : `${variable}₁ = ${formatStepNumber(roots[1])}:  ${checkOne(roots[1])}      ${variable}₂ = ${formatStepNumber(roots[0])}:  ${checkOne(roots[0])}`,
        });
      }

      return { type: "result", variable, hasParams: false, a: aN, b: bN, c: cN, discriminant, roots, standardExpr, steps };
    }

    // Parametric coefficients: present Δ and the roots as algebraic expressions.
    const discIsZero = symIsZero(discSym);
    steps.push({
      label: "שלב 3: חישוב הדיסקרימיננטה וניתוחה",
      expr: discIsZero
        ? `${discBase}  →  Δ ≡ 0 לכל ערך של הפרמטר  ⇒  פתרון ממשי יחיד (ביטוי ריבוע שלם)`
        : `${discBase}  →  הביטוי מכיל פרמטר, לכן סימן Δ (וממנו מספר הפתרונות) תלוי בערכו`,
    });

    const rootsExpr = discIsZero
      ? `${variable} = ${formatSym(symNeg(b))} / (${formatSym(symScale(a, 2))})`
      : `${variable} = (${formatSym(symNeg(b))} ± √(${formatSym(discSym)})) / (${formatSym(symScale(a, 2))})`;
    steps.push({ label: "שלב 4: נוסחת השורשים (ביטוי אלגברי)", expr: rootsExpr });
    steps.push({
      label: "שלב 5: בדיקה",
      expr: `הצבת הביטוי שנמצא עבור ${variable} ב-a${variable}² + b${variable} + c מקיימת שוויון לאפס, מכיוון ש-(√Δ)² = Δ מתוך הגדרת השורש הריבועי`,
    });

    return { type: "result", variable, hasParams: true, standardExpr, rootsExpr, steps };
  } catch (err) {
    return { type: "error", message: err instanceof Error ? err.message : "שגיאה בעיבוד המשוואה" };
  }
}
