const MATH_FUNCTIONS = new Set(["sin", "cos", "tan", "sqrt", "log", "ln", "abs"]);
const MATH_CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

type Token =
  | { type: "num"; value: number }
  | { type: "op"; value: string }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "func"; value: string }
  | { type: "const"; value: number };

export function looksLikeMathExpression(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || !/[0-9]/.test(trimmed)) return false;
  const stripped = trimmed.replace(/[a-zA-Z]+/g, (word) =>
    MATH_FUNCTIONS.has(word.toLowerCase()) || word.toLowerCase() in MATH_CONSTANTS ? "" : "\0",
  );
  return /^[0-9+\-*/^%().\s]+$/.test(stripped);
}

function tokenize(expr: string): Token[] {
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
      tokens.push({ type: "num", value: parseFloat(num) });
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let word = "";
      while (i < expr.length && /[a-zA-Z]/.test(expr[i])) {
        word += expr[i];
        i++;
      }
      const lower = word.toLowerCase();
      if (lower in MATH_CONSTANTS) {
        tokens.push({ type: "const", value: MATH_CONSTANTS[lower] });
      } else if (MATH_FUNCTIONS.has(lower)) {
        tokens.push({ type: "func", value: lower });
      } else {
        throw new Error(`Unknown identifier: ${word}`);
      }
      continue;
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
    if ("+-*/^%".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    throw new Error(`Invalid character: ${ch}`);
  }
  return tokens;
}

function evalFunc(name: string, arg: number): number {
  switch (name) {
    case "sin":
      return Math.sin((arg * Math.PI) / 180);
    case "cos":
      return Math.cos((arg * Math.PI) / 180);
    case "tan":
      return Math.tan((arg * Math.PI) / 180);
    case "sqrt":
      return Math.sqrt(arg);
    case "log":
      return Math.log10(arg);
    case "ln":
      return Math.log(arg);
    case "abs":
      return Math.abs(arg);
    default:
      throw new Error(`Unknown function: ${name}`);
  }
}

function parse(tokens: Token[]): number {
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parsePrimary(): number {
    const t = peek();
    if (!t) throw new Error("Unexpected end of expression");
    if (t.type === "num" || t.type === "const") {
      consume();
      return t.value;
    }
    if (t.type === "op" && t.value === "-") {
      consume();
      return -parsePrimary();
    }
    if (t.type === "op" && t.value === "+") {
      consume();
      return parsePrimary();
    }
    if (t.type === "func") {
      consume();
      const open = consume();
      if (!open || open.type !== "lparen") throw new Error("Expected (");
      const arg = parseAddSub();
      const close = consume();
      if (!close || close.type !== "rparen") throw new Error("Expected )");
      return evalFunc(t.value, arg);
    }
    if (t.type === "lparen") {
      consume();
      const value = parseAddSub();
      const close = consume();
      if (!close || close.type !== "rparen") throw new Error("Expected )");
      return value;
    }
    throw new Error("Unexpected token");
  }

  function parsePower(): number {
    const base = parsePrimary();
    const t = peek();
    if (t && t.type === "op" && t.value === "^") {
      consume();
      return Math.pow(base, parsePower());
    }
    return base;
  }

  function parseMulDiv(): number {
    let value = parsePower();
    while (true) {
      const t = peek();
      if (t && t.type === "op" && (t.value === "*" || t.value === "/" || t.value === "%")) {
        consume();
        const rhs = parsePower();
        if (t.value === "*") value *= rhs;
        else if (t.value === "/") value /= rhs;
        else value %= rhs;
      } else break;
    }
    return value;
  }

  function parseAddSub(): number {
    let value = parseMulDiv();
    while (true) {
      const t = peek();
      if (t && t.type === "op" && (t.value === "+" || t.value === "-")) {
        consume();
        const rhs = parseMulDiv();
        value = t.value === "+" ? value + rhs : value - rhs;
      } else break;
    }
    return value;
  }

  const result = parseAddSub();
  if (pos !== tokens.length) throw new Error("Unexpected trailing tokens");
  return result;
}

export function evaluateMathExpression(expr: string): number | null {
  try {
    const result = parse(tokenize(expr));
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}
