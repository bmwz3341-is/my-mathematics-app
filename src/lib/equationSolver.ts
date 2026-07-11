/**
 * Safe linear-equation solver. No `eval`/`Function` is ever used — expressions
 * are tokenized and parsed by hand, and every term is tracked as `a*x + b`
 * so only genuinely linear equations can produce a result.
 */

type Token =
  | { type: "num"; value: number }
  | { type: "var" }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "lparen" }
  | { type: "rparen" };

/** Represents the linear form `a*x + b`. */
export interface Linear {
  a: number;
  b: number;
}

export type SolveResult =
  | {
      type: "equation";
      variable: string;
      x: number;
      steps: string[];
      left: Linear;
      right: Linear;
    }
  | { type: "value"; value: number }
  | { type: "error"; message: string };

const VARIABLE_PATTERN = /^[a-zA-Z]$/;

function tokenize(expr: string, variable: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      const value = parseFloat(num);
      if (Number.isNaN(value)) throw new Error("מספר לא תקין בביטוי");
      tokens.push({ type: "num", value });
      continue;
    }
    if (ch.toLowerCase() === variable) {
      tokens.push({ type: "var" });
      i++;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      throw new Error(`המשתנה "${ch}" אינו נתמך, נא להשתמש ב-${variable}`);
    }
    if (ch === "(") {
      tokens.push({ type: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen" });
      i++;
      continue;
    }
    if ("+-*/^".includes(ch)) {
      tokens.push({ type: "op", value: ch as "+" | "-" | "*" | "/" | "^" });
      i++;
      continue;
    }
    throw new Error(`תו לא חוקי בביטוי: "${ch}"`);
  }
  return tokens;
}

const CONST = (b: number): Linear => ({ a: 0, b });

function add(l1: Linear, l2: Linear): Linear {
  return { a: l1.a + l2.a, b: l1.b + l2.b };
}

function sub(l1: Linear, l2: Linear): Linear {
  return { a: l1.a - l2.a, b: l1.b - l2.b };
}

function negate(l: Linear): Linear {
  return { a: -l.a, b: -l.b };
}

function mul(l1: Linear, l2: Linear): Linear {
  if (l1.a !== 0 && l2.a !== 0) {
    throw new Error("המשוואה אינה לינארית (מכפלת שני איברים עם המשתנה)");
  }
  return { a: l1.a * l2.b + l2.a * l1.b, b: l1.b * l2.b };
}

function divide(l1: Linear, l2: Linear): Linear {
  if (l2.a !== 0) {
    throw new Error("המשוואה אינה לינארית (חלוקה במשתנה)");
  }
  if (l2.b === 0) {
    throw new Error("חלוקה באפס");
  }
  return { a: l1.a / l2.b, b: l1.b / l2.b };
}

function power(base: Linear, exponent: Linear): Linear {
  if (exponent.a !== 0) {
    throw new Error("המשוואה אינה לינארית (חזקה עם משתנה)");
  }
  if (!Number.isInteger(exponent.b)) {
    throw new Error("נתמכות רק חזקות שלמות");
  }
  if (base.a !== 0 && exponent.b !== 1) {
    if (exponent.b === 0) return CONST(1);
    throw new Error("נתמכות רק משוואות לינאריות (ללא חזקות של המשתנה)");
  }
  return CONST(Math.pow(base.b, exponent.b));
}

/** Parse result: the collected linear form plus the top-level additive terms
 * (each already expanded, e.g. "3(x-2)+4" -> [{a:3,b:-6},{a:0,b:4}]). */
interface ParsedSide {
  value: Linear;
  terms: Linear[];
}

function parseLinearExpression(tokens: Token[]): ParsedSide {
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parsePrimary(): Linear {
    const t = peek();
    if (!t) throw new Error("סוף בלתי צפוי של הביטוי");
    if (t.type === "num") {
      consume();
      return CONST(t.value);
    }
    if (t.type === "var") {
      consume();
      return { a: 1, b: 0 };
    }
    if (t.type === "op" && t.value === "-") {
      consume();
      return negate(parsePrimary());
    }
    if (t.type === "op" && t.value === "+") {
      consume();
      return parsePrimary();
    }
    if (t.type === "lparen") {
      consume();
      const value = parseAddSub();
      const close = consume();
      if (!close || close.type !== "rparen") throw new Error("חסר סוגר )");
      return value;
    }
    throw new Error("ביטוי לא תקין");
  }

  function parsePower(): Linear {
    const base = parsePrimary();
    const t = peek();
    if (t && t.type === "op" && t.value === "^") {
      consume();
      return power(base, parsePower());
    }
    return base;
  }

  function parseMulDiv(): Linear {
    let value = parsePower();
    while (true) {
      const t = peek();
      if (t && t.type === "op" && (t.value === "*" || t.value === "/")) {
        consume();
        const rhs = parsePower();
        value = t.value === "*" ? mul(value, rhs) : divide(value, rhs);
      } else if (t && (t.type === "var" || t.type === "lparen" || t.type === "num")) {
        // Implicit multiplication, e.g. "2x" or "2(x + 1)".
        const rhs = parsePower();
        value = mul(value, rhs);
      } else break;
    }
    return value;
  }

  function parseAddSub(collect?: Linear[]): Linear {
    let value = parseMulDiv();
    collect?.push(value);
    while (true) {
      const t = peek();
      if (t && t.type === "op" && (t.value === "+" || t.value === "-")) {
        consume();
        const rhs = parseMulDiv();
        value = t.value === "+" ? add(value, rhs) : sub(value, rhs);
        collect?.push(t.value === "+" ? rhs : negate(rhs));
      } else break;
    }
    return value;
  }

  const terms: Linear[] = [];
  const result = parseAddSub(terms);
  if (pos !== tokens.length) throw new Error("תווים מיותרים בסוף הביטוי");
  return { value: result, terms };
}

function formatStepNumber(n: number): string {
  const rounded = Math.round(n * 1e8) / 1e8;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

/** Formats `a*x + b` as a readable expression, e.g. "2x + 3". */
export function formatLinear(l: Linear, variable: string): string {
  const parts: string[] = [];
  if (l.a !== 0) {
    if (l.a === 1) parts.push(variable);
    else if (l.a === -1) parts.push(`-${variable}`);
    else parts.push(`${formatStepNumber(l.a)}${variable}`);
  }
  if (l.b !== 0 || parts.length === 0) {
    if (parts.length === 0) parts.push(formatStepNumber(l.b));
    else parts.push(l.b > 0 ? `+ ${formatStepNumber(l.b)}` : `- ${formatStepNumber(-l.b)}`);
  }
  return parts.join(" ");
}

/** Formats expanded top-level terms before collection, e.g. "3x - 6 + 4". */
function formatTerms(terms: Linear[], variable: string): string {
  const atoms: number[] = [];
  const isVar: boolean[] = [];
  for (const t of terms) {
    if (t.a !== 0) {
      atoms.push(t.a);
      isVar.push(true);
    }
    if (t.b !== 0 || t.a === 0) {
      atoms.push(t.b);
      isVar.push(false);
    }
  }
  if (atoms.length === 0) return "0";
  let out = "";
  atoms.forEach((v, i) => {
    const abs = Math.abs(v);
    const body = isVar[i]
      ? abs === 1
        ? variable
        : `${formatStepNumber(abs)}${variable}`
      : formatStepNumber(abs);
    if (i === 0) out = v < 0 ? `-${body}` : body;
    else out += v < 0 ? ` - ${body}` : ` + ${body}`;
  });
  return out;
}

function buildSteps(
  rawLeft: string,
  rawRight: string,
  leftSide: ParsedSide,
  rightSide: ParsedSide,
  combined: Linear,
  variable: string,
  x: number,
): string[] {
  const left = leftSide.value;
  const right = rightSide.value;
  const steps: string[] = [`${rawLeft} = ${rawRight}`];
  const push = (s: string) => {
    if (s !== steps[steps.length - 1]) steps.push(s);
  };
  push(`${formatTerms(leftSide.terms, variable)} = ${formatTerms(rightSide.terms, variable)}`);
  push(`${formatLinear(left, variable)} = ${formatLinear(right, variable)}`);
  push(`${formatLinear({ a: combined.a, b: 0 }, variable)} = ${formatStepNumber(-combined.b)}`);
  if (combined.a !== 1) {
    push(`${variable} = ${formatStepNumber(-combined.b)} / ${formatStepNumber(combined.a)}`);
  }
  push(`${variable} = ${formatStepNumber(x)}`);
  return steps;
}

function detectVariable(input: string): string {
  const match = input.match(/[a-zA-Z]/);
  return match ? match[0].toLowerCase() : "x";
}

/**
 * Solves a linear equation (e.g. "2x + 3 = 7") or evaluates a plain
 * arithmetic expression (e.g. "2 * (3 + 4)"). Never uses `eval`.
 */
export function solveMathInput(input: string): SolveResult {
  const trimmed = input.trim();
  if (!trimmed) return { type: "error", message: "נא להזין ביטוי או משוואה" };

  const equalsCount = (trimmed.match(/=/g) ?? []).length;
  if (equalsCount > 1) {
    return { type: "error", message: "נתמך רק סימן שוויון (=) אחד" };
  }

  const variable = detectVariable(trimmed);
  if (!VARIABLE_PATTERN.test(variable)) {
    return { type: "error", message: "לא זוהה משתנה תקין" };
  }

  try {
    if (equalsCount === 1) {
      const [left, right] = trimmed.split("=");
      const leftSide = parseLinearExpression(tokenize(left, variable));
      const rightSide = parseLinearExpression(tokenize(right, variable));
      const combined = sub(leftSide.value, rightSide.value); // a*x + b = 0
      if (combined.a === 0) {
        if (combined.b === 0) {
          return { type: "error", message: "לכל x קיים פתרון (זהות)" };
        }
        return { type: "error", message: "אין פתרון למשוואה זו" };
      }
      const x = -combined.b / combined.a;
      return {
        type: "equation",
        variable,
        x,
        steps: buildSteps(left.trim(), right.trim(), leftSide, rightSide, combined, variable, x),
        left: leftSide.value,
        right: rightSide.value,
      };
    }

    const linear = parseLinearExpression(tokenize(trimmed, variable)).value;
    if (linear.a !== 0) {
      return { type: "error", message: "יש להזין ביטוי מספרי בלבד, או משוואה עם סימן =" };
    }
    if (!Number.isFinite(linear.b)) {
      return { type: "error", message: "התוצאה אינה מספר סופי" };
    }
    return { type: "value", value: linear.b };
  } catch (err) {
    return { type: "error", message: err instanceof Error ? err.message : "שגיאה בפתרון הביטוי" };
  }
}
