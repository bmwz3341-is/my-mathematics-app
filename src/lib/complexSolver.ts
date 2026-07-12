/**
 * Complex-number engine (5-unit level): arithmetic on a+bi, conversions
 * between algebraic and trigonometric (cis) form, De Moivre powers and
 * roots, and quadratic equations in z with a negative discriminant.
 * All numeric work is delegated to math.js to avoid rounding mistakes;
 * the step traces here are pedagogical.
 */

import { complex, add, subtract, multiply, divide, pow, type Complex } from "mathjs";
import { detectVariable, parsePolynomial, formatPolynomial, type Term } from "@/lib/derivative";

export interface ComplexStep {
  label: string;
  expr: string;
}

export interface ArgandPoint {
  re: number;
  im: number;
  label: string;
  color: string;
}

export type ComplexResult =
  | {
      type: "result";
      resultText: string;
      steps: ComplexStep[];
      points: ArgandPoint[];
      circleRadius?: number;
    }
  | { type: "error"; message: string };

export type ArithmeticOp = "add" | "sub" | "mul" | "div";

const RESULT_COLOR = "#dc2626";
const Z1_COLOR = "#2F6FED";
const Z2_COLOR = "#16a34a";
const ROOT_COLORS = ["#2F6FED", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#be185d", "#65a30d"];

function fmt(n: number): string {
  const rounded = Math.round(n * 1e6) / 1e6;
  // avoid "-0"
  const clean = Object.is(rounded, -0) ? 0 : rounded;
  return clean.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function fmtAngle(deg: number): string {
  const rounded = Math.round(deg * 1e4) / 1e4;
  const clean = Object.is(rounded, -0) ? 0 : rounded;
  return `${clean.toLocaleString("en-US", { maximumFractionDigits: 4 })}°`;
}

export function formatComplex(re: number, im: number): string {
  const r = Math.round(re * 1e6) / 1e6;
  const i = Math.round(im * 1e6) / 1e6;
  if (i === 0) return fmt(r);
  const imAbs = Math.abs(i);
  const imPart = imAbs === 1 ? "i" : `${fmt(imAbs)}i`;
  if (r === 0) return i > 0 ? imPart : `-${imPart}`;
  return `${fmt(r)} ${i > 0 ? "+" : "-"} ${imPart}`;
}

function formatCis(r: number, thetaDeg: number): string {
  return `${fmt(r)}·cis(${fmtAngle(thetaDeg)})`;
}

/** Angle of (re, im) in degrees, normalized to [0, 360). */
function angleDeg(re: number, im: number): number {
  let deg = (Math.atan2(im, re) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

function parseComplexInput(raw: string, name: string): Complex | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { error: `נא להזין את המספר המרוכב ${name} (למשל 3+2i)` };
  try {
    const z = complex(trimmed);
    if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) {
      return { error: `הערך של ${name} אינו מספר מרוכב תקין` };
    }
    return z;
  } catch {
    return { error: `לא ניתן לפרש את ${name} — השתמשו בצורה a+bi, למשל 3+2i` };
  }
}

/** Steps that derive r and θ for z = a+bi; returns { r, theta } (θ in degrees). */
function polarSteps(z: Complex, steps: ComplexStep[], startIndex: number): { r: number; theta: number } {
  const a = z.re;
  const b = z.im;
  const r = Math.hypot(a, b);
  const theta = angleDeg(a, b);

  steps.push({
    label: `שלב ${startIndex}: חישוב הרדיוס (המודול)`,
    expr: `r = √(a² + b²) = √((${fmt(a)})² + (${fmt(b)})²) = √${fmt(a * a + b * b)} = ${fmt(r)}`,
  });

  if (a === 0) {
    steps.push({
      label: `שלב ${startIndex + 1}: חישוב הזווית (הארגומנט)`,
      expr: `a = 0  ⇒  המספר על הציר המדומה  ⇒  θ = ${fmtAngle(theta)}`,
    });
  } else {
    const base = (Math.atan(b / a) * 180) / Math.PI;
    const needsAdjust = Math.abs(((base % 360) + 360) % 360 - theta) > 1e-9;
    let expr = `θ = arctan(b/a) = arctan(${fmt(b)}/${fmt(a)}) = ${fmtAngle(base)}`;
    if (needsAdjust) {
      const quadrant = a < 0 ? (b >= 0 ? "השני" : "השלישי") : "הרביעי";
      expr += `  ⇒  הנקודה ברביע ${quadrant}  ⇒  θ = ${fmtAngle(theta)}`;
    }
    steps.push({ label: `שלב ${startIndex + 1}: חישוב הזווית (הארגומנט)`, expr });
  }

  return { r, theta };
}

export function solveArithmetic(z1Raw: string, z2Raw: string, op: ArithmeticOp): ComplexResult {
  const z1 = parseComplexInput(z1Raw, "z₁");
  if ("error" in z1) return { type: "error", message: z1.error };
  const z2 = parseComplexInput(z2Raw, "z₂");
  if ("error" in z2) return { type: "error", message: z2.error };

  const a = z1.re, b = z1.im, c = z2.re, d = z2.im;
  const steps: ComplexStep[] = [
    {
      label: "שלב 1: זיהוי החלק הממשי והחלק המדומה",
      expr: `z₁ = ${formatComplex(a, b)}  (a = ${fmt(a)}, b = ${fmt(b)}),   z₂ = ${formatComplex(c, d)}  (c = ${fmt(c)}, d = ${fmt(d)})`,
    },
  ];

  let result: Complex;
  switch (op) {
    case "add": {
      result = add(z1, z2);
      steps.push({
        label: "שלב 2: חיבור החלקים הממשיים והמדומים בנפרד",
        expr: `(a + c) + (b + d)i = (${fmt(a)} + ${fmt(c)}) + (${fmt(b)} + ${fmt(d)})i`,
      });
      break;
    }
    case "sub": {
      result = subtract(z1, z2);
      steps.push({
        label: "שלב 2: חיסור החלקים הממשיים והמדומים בנפרד",
        expr: `(a - c) + (b - d)i = (${fmt(a)} - ${fmt(c)}) + (${fmt(b)} - ${fmt(d)})i`,
      });
      break;
    }
    case "mul": {
      result = multiply(z1, z2) as Complex;
      steps.push({
        label: "שלב 2: פתיחת סוגריים לפי חוק הפילוג",
        expr: `(${formatComplex(a, b)})·(${formatComplex(c, d)}) = ${fmt(a * c)} + ${fmt(a * d)}i + ${fmt(b * c)}i + ${fmt(b * d)}i²`,
      });
      steps.push({
        label: "שלב 3: הצבת i² = -1",
        expr: `${fmt(b * d)}i² = ${fmt(-b * d)}  ⇒  (${fmt(a * c)} - ${fmt(b * d)}) + (${fmt(a * d)} + ${fmt(b * c)})i`,
      });
      break;
    }
    case "div": {
      if (c === 0 && d === 0) return { type: "error", message: "לא ניתן לחלק באפס — z₂ חייב להיות שונה מ-0" };
      result = divide(z1, z2) as Complex;
      const conj = formatComplex(c, -d);
      const denom = c * c + d * d;
      steps.push({
        label: "שלב 2: הרחבת השבר בצמוד של המכנה",
        expr: `z̄₂ = ${conj}  ⇒  (${formatComplex(a, b)})·(${conj}) / (${formatComplex(c, d)})·(${conj})`,
      });
      steps.push({
        label: "שלב 3: חישוב המכנה עם i² = -1",
        expr: `(${formatComplex(c, d)})·(${conj}) = c² - d²·i² = ${fmt(c * c)} + ${fmt(d * d)} = ${fmt(denom)}`,
      });
      steps.push({
        label: "שלב 4: חישוב המונה עם i² = -1",
        expr: `(${formatComplex(a, b)})·(${conj}) = (ac + bd) + (bc - ad)i = ${formatComplex(a * c + b * d, b * c - a * d)}`,
      });
      steps.push({
        label: "שלב 5: חלוקת המונה במכנה",
        expr: `(${fmt(a * c + b * d)} / ${fmt(denom)}) + (${fmt(b * c - a * d)} / ${fmt(denom)})i`,
      });
      break;
    }
  }

  const resultText = formatComplex(result.re, result.im);
  steps.push({ label: `שלב ${steps.length + 1}: תוצאה סופית`, expr: `z = ${resultText}` });

  const opLabel = { add: "+", sub: "-", mul: "×", div: "÷" }[op];
  return {
    type: "result",
    resultText: `z₁ ${opLabel} z₂ = ${resultText}`,
    steps,
    points: [
      { re: a, im: b, label: "z₁", color: Z1_COLOR },
      { re: c, im: d, label: "z₂", color: Z2_COLOR },
      { re: result.re, im: result.im, label: "תוצאה", color: RESULT_COLOR },
    ],
  };
}

export function convertToTrig(zRaw: string): ComplexResult {
  const z = parseComplexInput(zRaw, "z");
  if ("error" in z) return { type: "error", message: z.error };
  if (z.re === 0 && z.im === 0) {
    return { type: "error", message: "למספר 0 אין הצגה טריגונומטרית מוגדרת (הזווית אינה מוגדרת)" };
  }

  const steps: ComplexStep[] = [
    {
      label: "שלב 1: זיהוי החלק הממשי והחלק המדומה",
      expr: `z = ${formatComplex(z.re, z.im)}  ⇒  a = ${fmt(z.re)}, b = ${fmt(z.im)}`,
    },
  ];
  const { r, theta } = polarSteps(z, steps, 2);
  steps.push({
    label: "שלב 4: כתיבת ההצגה הטריגונומטרית",
    expr: `z = r·cis(θ) = ${formatCis(r, theta)} = ${fmt(r)}·(cos(${fmtAngle(theta)}) + i·sin(${fmtAngle(theta)}))`,
  });

  return {
    type: "result",
    resultText: `z = ${formatCis(r, theta)}`,
    steps,
    points: [{ re: z.re, im: z.im, label: "z", color: Z1_COLOR }],
    circleRadius: r,
  };
}

export function convertToAlgebraic(rRaw: string, thetaRaw: string): ComplexResult {
  const r = parseFloat(rRaw.trim());
  const theta = parseFloat(thetaRaw.trim());
  if (!Number.isFinite(r)) return { type: "error", message: "הערך של הרדיוס r אינו מספר תקין" };
  if (!Number.isFinite(theta)) return { type: "error", message: "הערך של הזווית θ אינו מספר תקין (במעלות)" };
  if (r < 0) return { type: "error", message: "הרדיוס r חייב להיות אי-שלילי" };

  const rad = (theta * Math.PI) / 180;
  const a = r * Math.cos(rad);
  const b = r * Math.sin(rad);

  const steps: ComplexStep[] = [
    {
      label: "שלב 1: הנוסחה למעבר מהצגה טריגונומטרית לאלגברית",
      expr: `z = r·cis(θ) = r·cos(θ) + i·r·sin(θ)  ⇒  a = r·cos(θ), b = r·sin(θ)`,
    },
    {
      label: "שלב 2: חישוב החלק הממשי",
      expr: `a = ${fmt(r)}·cos(${fmtAngle(theta)}) = ${fmt(a)}`,
    },
    {
      label: "שלב 3: חישוב החלק המדומה",
      expr: `b = ${fmt(r)}·sin(${fmtAngle(theta)}) = ${fmt(b)}`,
    },
    {
      label: "שלב 4: כתיבת ההצגה האלגברית",
      expr: `z = ${formatComplex(a, b)}`,
    },
  ];

  return {
    type: "result",
    resultText: `z = ${formatComplex(a, b)}`,
    steps,
    points: [{ re: a, im: b, label: "z", color: Z1_COLOR }],
    circleRadius: r,
  };
}

export function solvePower(zRaw: string, nRaw: string): ComplexResult {
  const z = parseComplexInput(zRaw, "z");
  if ("error" in z) return { type: "error", message: z.error };
  const n = parseFloat(nRaw.trim());
  if (!Number.isInteger(n) || n < 2 || n > 50) {
    return { type: "error", message: "המעריך n חייב להיות מספר שלם בין 2 ל-50" };
  }
  if (z.re === 0 && z.im === 0) {
    return { type: "result", resultText: `zⁿ = 0`, steps: [{ label: "שלב 1: תוצאה", expr: "0 בכל חזקה הוא 0" }], points: [{ re: 0, im: 0, label: "z", color: Z1_COLOR }] };
  }

  const steps: ComplexStep[] = [
    {
      label: "שלב 1: מעבר להצגה טריגונומטרית",
      expr: `z = ${formatComplex(z.re, z.im)}  ⇒  a = ${fmt(z.re)}, b = ${fmt(z.im)}`,
    },
  ];
  const { r, theta } = polarSteps(z, steps, 2);
  steps.push({
    label: "שלב 4: משפט דה-מואבר",
    expr: `zⁿ = rⁿ·cis(n·θ)  ⇒  z^${n} = ${fmt(r)}^${n}·cis(${n}·${fmtAngle(theta)})`,
  });

  const rn = Math.pow(r, n);
  let nTheta = (n * theta) % 360;
  if (nTheta < 0) nTheta += 360;
  steps.push({
    label: "שלב 5: חישוב הרדיוס והזווית החדשים",
    expr: `rⁿ = ${fmt(rn)},   n·θ = ${fmtAngle(n * theta)}${Math.abs(n * theta - nTheta) > 1e-9 ? `  ⇒  (הפחתת סיבובים שלמים)  ${fmtAngle(nTheta)}` : ""}`,
  });

  const result = pow(z, n) as Complex;
  steps.push({
    label: "שלב 6: חזרה להצגה אלגברית",
    expr: `z^${n} = ${fmt(rn)}·(cos(${fmtAngle(nTheta)}) + i·sin(${fmtAngle(nTheta)})) = ${formatComplex(result.re, result.im)}`,
  });

  return {
    type: "result",
    resultText: `z^${n} = ${formatComplex(result.re, result.im)}`,
    steps,
    points: [
      { re: z.re, im: z.im, label: "z", color: Z1_COLOR },
      { re: result.re, im: result.im, label: `z^${n}`, color: RESULT_COLOR },
    ],
  };
}

export function solveRoots(zRaw: string, nRaw: string): ComplexResult {
  const z = parseComplexInput(zRaw, "z");
  if ("error" in z) return { type: "error", message: z.error };
  const n = parseFloat(nRaw.trim());
  if (!Number.isInteger(n) || n < 2 || n > 8) {
    return { type: "error", message: "סדר השורש n חייב להיות מספר שלם בין 2 ל-8" };
  }
  if (z.re === 0 && z.im === 0) {
    return { type: "error", message: "לשורש של 0 יש פתרון יחיד: z = 0 — הזינו מספר שונה מאפס" };
  }

  const steps: ComplexStep[] = [
    {
      label: "שלב 1: מעבר להצגה טריגונומטרית",
      expr: `z = ${formatComplex(z.re, z.im)}  ⇒  a = ${fmt(z.re)}, b = ${fmt(z.im)}`,
    },
  ];
  const { r, theta } = polarSteps(z, steps, 2);

  const rootR = Math.pow(r, 1 / n);
  steps.push({
    label: "שלב 4: נוסחת השורשים (דה-מואבר הפוך)",
    expr: `wₖ = ⁿ√r · cis((θ + 360°·k)/n),  k = 0, 1, ..., ${n - 1}`,
  });
  steps.push({
    label: "שלב 5: חישוב הרדיוס של השורשים",
    expr: `ⁿ√r = ${fmt(r)}^(1/${n}) = ${fmt(rootR)}`,
  });

  const points: ArgandPoint[] = [];
  const rootTexts: string[] = [];
  for (let k = 0; k < n; k++) {
    const angK = (theta + 360 * k) / n;
    const rad = (angK * Math.PI) / 180;
    const re = rootR * Math.cos(rad);
    const im = rootR * Math.sin(rad);
    steps.push({
      label: `שלב ${6 + k}: השורש עבור k = ${k}`,
      expr: `w${toSubscript(k)} = ${formatCis(rootR, angK)} = ${formatComplex(re, im)}`,
    });
    points.push({ re, im, label: `w${toSubscript(k)}`, color: ROOT_COLORS[k % ROOT_COLORS.length] });
    rootTexts.push(formatComplex(re, im));
  }

  return {
    type: "result",
    resultText: rootTexts.map((t, k) => `w${toSubscript(k)} = ${t}`).join(" ,  "),
    steps,
    points,
    circleRadius: rootR,
  };
}

function toSubscript(n: number): string {
  const subs = "₀₁₂₃₄₅₆₇₈₉";
  return String(n)
    .split("")
    .map((d) => subs[parseInt(d, 10)])
    .join("");
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

export function solveComplexEquation(input: string): ComplexResult {
  const trimmed = input.trim();
  if (!trimmed) return { type: "error", message: "נא להזין משוואה עם הנעלם z, למשל z^2 + 4z + 13 = 0" };

  const equalsCount = (trimmed.match(/=/g) ?? []).length;
  if (equalsCount !== 1) return { type: "error", message: "יש להזין משוואה עם סימן שוויון (=) יחיד" };

  const [rawLeft, rawRight] = trimmed.split("=");
  const variable = detectVariable(trimmed);

  try {
    const leftTerms = parsePolynomial(rawLeft, variable);
    const rightTerms = parsePolynomial(rawRight, variable);
    const negatedRight = rightTerms.map((t) => ({ coefficient: -t.coefficient, power: t.power }));
    const combined = combineLikeTerms([...leftTerms, ...negatedRight]);

    const degree = combined.reduce((m, t) => Math.max(m, t.power), 0);
    if (degree > 2) return { type: "error", message: "נתמכות משוואות עד חזקה 2 (לינאריות וריבועיות)" };

    const a = coeffOf(combined, 2);
    const b = coeffOf(combined, 1);
    const c = coeffOf(combined, 0);

    const standardExpr = `${formatPolynomial(combined.length ? combined : [{ coefficient: 0, power: 0 }], variable)} = 0`;
    const steps: ComplexStep[] = [
      {
        label: "שלב 1: סידור המשוואה לצורה הסטנדרטית",
        expr: `${rawLeft.trim()} = ${rawRight.trim()}  ⇒  ${standardExpr}`,
      },
    ];

    // Linear case: bz + c = 0
    if (a === 0) {
      if (b === 0) return { type: "error", message: "במשוואה אין את הנעלם — בדקו את הקלט" };
      const z0 = -c / b;
      steps.push({
        label: "שלב 2: בידוד הנעלם",
        expr: `${fmt(b)}${variable} = ${fmt(-c)}  ⇒  ${variable} = ${fmt(-c)} / ${fmt(b)} = ${fmt(z0)}`,
      });
      return {
        type: "result",
        resultText: `${variable} = ${fmt(z0)}`,
        steps,
        points: [{ re: z0, im: 0, label: variable, color: RESULT_COLOR }],
      };
    }

    steps.push({
      label: "שלב 2: זיהוי המקדמים",
      expr: `a = ${fmt(a)},  b = ${fmt(b)},  c = ${fmt(c)}`,
    });

    const discriminant = b * b - 4 * a * c;
    steps.push({
      label: "שלב 3: חישוב הדיסקרימיננטה",
      expr: `D = b² - 4ac = (${fmt(b)})² - 4·(${fmt(a)})·(${fmt(c)}) = ${fmt(discriminant)}`,
    });

    if (discriminant > 0) {
      const sq = Math.sqrt(discriminant);
      const z1 = (-b + sq) / (2 * a);
      const z2 = (-b - sq) / (2 * a);
      steps.push({
        label: "שלב 4: D > 0 — שני פתרונות ממשיים",
        expr: `${variable} = (-b ± √D) / 2a = (${fmt(-b)} ± ${fmt(sq)}) / ${fmt(2 * a)}`,
      });
      steps.push({
        label: "שלב 5: תוצאה סופית",
        expr: `${variable}₁ = ${fmt(z1)},  ${variable}₂ = ${fmt(z2)}`,
      });
      return {
        type: "result",
        resultText: `${variable}₁ = ${fmt(z1)} ,  ${variable}₂ = ${fmt(z2)}`,
        steps,
        points: [
          { re: z1, im: 0, label: `${variable}₁`, color: Z1_COLOR },
          { re: z2, im: 0, label: `${variable}₂`, color: RESULT_COLOR },
        ],
      };
    }

    if (discriminant === 0) {
      const z0 = -b / (2 * a);
      steps.push({
        label: "שלב 4: D = 0 — פתרון ממשי יחיד",
        expr: `${variable} = -b / 2a = ${fmt(-b)} / ${fmt(2 * a)} = ${fmt(z0)}`,
      });
      return {
        type: "result",
        resultText: `${variable} = ${fmt(z0)}`,
        steps,
        points: [{ re: z0, im: 0, label: variable, color: RESULT_COLOR }],
      };
    }

    // D < 0 — complex conjugate roots
    const sqAbs = Math.sqrt(-discriminant);
    steps.push({
      label: "שלב 4: D < 0 — מעבר למספרים מרוכבים עם i² = -1",
      expr: `√D = √(${fmt(discriminant)}) = √(${fmt(-discriminant)})·√(-1) = ${fmt(sqAbs)}i`,
    });
    const rePart = -b / (2 * a);
    const imPart = sqAbs / (2 * a);
    steps.push({
      label: "שלב 5: הצבה בנוסחת השורשים",
      expr: `${variable} = (-b ± √D) / 2a = (${fmt(-b)} ± ${fmt(sqAbs)}i) / ${fmt(2 * a)}`,
    });
    const z1Text = formatComplex(rePart, Math.abs(imPart));
    const z2Text = formatComplex(rePart, -Math.abs(imPart));
    steps.push({
      label: "שלב 6: תוצאה סופית — זוג פתרונות צמודים",
      expr: `${variable}₁ = ${z1Text},  ${variable}₂ = ${z2Text}`,
    });

    return {
      type: "result",
      resultText: `${variable}₁ = ${z1Text} ,  ${variable}₂ = ${z2Text}`,
      steps,
      points: [
        { re: rePart, im: Math.abs(imPart), label: `${variable}₁`, color: Z1_COLOR },
        { re: rePart, im: -Math.abs(imPart), label: `${variable}₂`, color: RESULT_COLOR },
      ],
    };
  } catch (err) {
    return { type: "error", message: err instanceof Error ? err.message : "שגיאה בעיבוד המשוואה" };
  }
}
