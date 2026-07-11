/**
 * Quadratic-equation solver: accepts any (unarranged) polynomial equation up
 * to degree 2, e.g. "x^2 + 5x = -6", moves everything to one side, then
 * applies the discriminant/root formula with a full pedagogical step trace.
 */

import { type Term, detectVariable, parsePolynomial, formatPolynomial } from "@/lib/derivative";

export interface QuadraticStep {
  label: string;
  expr: string;
}

export type QuadraticResult =
  | {
      type: "result";
      variable: string;
      a: number;
      b: number;
      c: number;
      discriminant: number;
      roots: number[];
      standardExpr: string;
      steps: QuadraticStep[];
    }
  | { type: "error"; message: string };

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function combineLikeTerms(terms: Term[]): Term[] {
  const byPower = new Map<number, number>();
  for (const t of terms) byPower.set(t.power, (byPower.get(t.power) ?? 0) + t.coefficient);
  return Array.from(byPower.entries())
    .map(([power, coefficient]) => ({ power, coefficient }))
    .filter((t) => t.coefficient !== 0);
}

function coeffOf(terms: Term[], power: number): number {
  return terms.find((t) => t.power === power)?.coefficient ?? 0;
}

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
    const leftTerms = parsePolynomial(rawLeft, variable);
    const rightTerms = parsePolynomial(rawRight, variable);
    const negatedRight = rightTerms.map((t) => ({ coefficient: -t.coefficient, power: t.power }));
    const combined = combineLikeTerms([...leftTerms, ...negatedRight]);

    const degree = combined.reduce((m, t) => Math.max(m, t.power), 0);
    if (degree > 2) {
      return { type: "error", message: "נתמכות רק משוואות ריבועיות (עד חזקה 2)" };
    }

    const a = coeffOf(combined, 2);
    const b = coeffOf(combined, 1);
    const c = coeffOf(combined, 0);

    if (a === 0) {
      return {
        type: "error",
        message: "המקדם a חייב להיות שונה מאפס במשוואה ריבועית — עבור a=0 זו משוואה לינארית",
      };
    }

    const standardExpr = `${formatPolynomial(
      [
        { coefficient: a, power: 2 },
        { coefficient: b, power: 1 },
        { coefficient: c, power: 0 },
      ],
      variable,
    )} = 0`;

    const steps: QuadraticStep[] = [
      {
        label: "שלב 1: סידור המשוואה לצורה הסטנדרטית",
        expr: `${rawLeft.trim()} = ${rawRight.trim()}  ⇒  ${standardExpr}`,
      },
      {
        label: "שלב 2: זיהוי המקדמים",
        expr: `a = ${formatNumber(a)},  b = ${formatNumber(b)},  c = ${formatNumber(c)}`,
      },
    ];

    const discriminant = b * b - 4 * a * c;
    steps.push({
      label: "שלב 3: חישוב הדיסקרימיננטה",
      expr: `D = b² - 4ac = (${formatNumber(b)})² - 4·(${formatNumber(a)})·(${formatNumber(c)}) = ${formatNumber(discriminant)}`,
    });

    let roots: number[] = [];
    if (discriminant < 0) {
      steps.push({ label: "שלב 4: הצבה בנוסחת השורשים", expr: "D < 0  ⇒  אין שורש ריבועי ממשי ל-D" });
      steps.push({ label: "שלב 5: תוצאה סופית", expr: "אין פתרון ממשי למשוואה (∅)" });
    } else if (discriminant === 0) {
      const x0 = -b / (2 * a);
      steps.push({
        label: "שלב 4: הצבה בנוסחת השורשים",
        expr: `${variable} = -b / 2a = ${formatNumber(-b)} / ${formatNumber(2 * a)} = ${formatNumber(x0)}`,
      });
      steps.push({ label: "שלב 5: תוצאה סופית", expr: `${variable} = ${formatNumber(x0)} (פתרון יחיד, D = 0)` });
      roots = [x0];
    } else {
      const sq = Math.sqrt(discriminant);
      const x1 = (-b + sq) / (2 * a);
      const x2 = (-b - sq) / (2 * a);
      steps.push({
        label: "שלב 4: הצבה בנוסחת השורשים",
        expr: `${variable} = (-b ± √D) / 2a = (${formatNumber(-b)} ± √${formatNumber(discriminant)}) / ${formatNumber(2 * a)}`,
      });
      roots = [x1, x2].sort((p, q) => p - q);
      steps.push({
        label: "שלב 5: תוצאה סופית",
        expr: `${variable}₁ = ${formatNumber(roots[1])},  ${variable}₂ = ${formatNumber(roots[0])}`,
      });
    }

    return { type: "result", variable, a, b, c, discriminant, roots, standardExpr, steps };
  } catch (err) {
    return { type: "error", message: err instanceof Error ? err.message : "שגיאה בעיבוד המשוואה" };
  }
}
