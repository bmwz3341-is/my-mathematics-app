// Expression engine for the scientific calculator (Casio FX-991ES PLUS style).
// Parses a token string produced by the calculator keys and evaluates it with
// Casio-compatible precedence: +/- < ×/÷ (incl. implicit mult) < nPr/nCr <
// unary minus < ^ and ×10^ < postfix (! % ² ³ ⁻¹) < functions/atoms.

export type AngleMode = "DEG" | "RAD";

export class CalcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalcError";
  }
}

const SYNTAX_ERROR = "שגיאת תחביר";
const MATH_ERROR = "שגיאה מתמטית";

type Token =
  | { kind: "num"; value: number }
  | { kind: "op"; value: "+" | "-" | "×" | "÷" | "^" | "×10^" | "nPr" | "nCr" }
  | { kind: "post"; value: "!" | "%" | "²" | "³" | "⁻¹" }
  | { kind: "func"; value: string }
  | { kind: "const"; value: "π" | "e" | "Ans" }
  | { kind: "lparen" }
  | { kind: "rparen" };

const FUNC_NAMES = [
  "sin⁻¹",
  "cos⁻¹",
  "tan⁻¹",
  "sinh",
  "cosh",
  "tanh",
  "sin",
  "cos",
  "tan",
  "log",
  "ln",
  "√",
  "∛",
  "Abs",
] as const;

function lex(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    const num = rest.match(/^(\d+\.?\d*|\.\d+)/);
    if (num) {
      tokens.push({ kind: "num", value: parseFloat(num[0]) });
      i += num[0].length;
      continue;
    }
    if (rest.startsWith("×10^")) {
      tokens.push({ kind: "op", value: "×10^" });
      i += 4;
      continue;
    }
    if (rest.startsWith("nPr") || rest.startsWith("nCr")) {
      tokens.push({ kind: "op", value: rest.slice(0, 3) as "nPr" | "nCr" });
      i += 3;
      continue;
    }
    if (rest.startsWith("Ans")) {
      tokens.push({ kind: "const", value: "Ans" });
      i += 3;
      continue;
    }
    const func = FUNC_NAMES.find((f) => rest.startsWith(f));
    if (func) {
      tokens.push({ kind: "func", value: func });
      i += func.length;
      continue;
    }
    const ch = rest[0];
    if ("+-×÷^".includes(ch)) {
      tokens.push({ kind: "op", value: ch as "+" | "-" | "×" | "÷" | "^" });
    } else if (ch === "!" || ch === "%" || ch === "²" || ch === "³") {
      tokens.push({ kind: "post", value: ch });
    } else if (rest.startsWith("⁻¹")) {
      tokens.push({ kind: "post", value: "⁻¹" });
      i += 2;
      continue;
    } else if (ch === "π" || ch === "e") {
      tokens.push({ kind: "const", value: ch });
    } else if (ch === "(") {
      tokens.push({ kind: "lparen" });
    } else if (ch === ")") {
      tokens.push({ kind: "rparen" });
    } else if (ch === " ") {
      // skip
    } else {
      throw new CalcError(SYNTAX_ERROR);
    }
    i += 1;
  }
  return tokens;
}

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n) || n > 170) throw new CalcError(MATH_ERROR);
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

function permutations(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
    throw new CalcError(MATH_ERROR);
  }
  let result = 1;
  for (let k = n - r + 1; k <= n; k++) result *= k;
  return result;
}

class Parser {
  private pos = 0;

  constructor(
    private tokens: Token[],
    private angleMode: AngleMode,
    private ans: number,
  ) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }

  parse(): number {
    if (this.tokens.length === 0) throw new CalcError(SYNTAX_ERROR);
    const value = this.parseExpr();
    if (this.pos < this.tokens.length) throw new CalcError(SYNTAX_ERROR);
    if (!Number.isFinite(value)) throw new CalcError(MATH_ERROR);
    return value;
  }

  private parseExpr(): number {
    let left = this.parseTerm();
    for (;;) {
      const t = this.peek();
      if (t?.kind === "op" && (t.value === "+" || t.value === "-")) {
        this.next();
        const right = this.parseTerm();
        left = t.value === "+" ? left + right : left - right;
      } else return left;
    }
  }

  private startsFactor(t: Token | undefined): boolean {
    if (!t) return false;
    return t.kind === "num" || t.kind === "const" || t.kind === "func" || t.kind === "lparen";
  }

  private parseTerm(): number {
    let left = this.parseNpr();
    for (;;) {
      const t = this.peek();
      if (t?.kind === "op" && (t.value === "×" || t.value === "÷")) {
        this.next();
        const right = this.parseNpr();
        if (t.value === "÷") {
          if (right === 0) throw new CalcError(MATH_ERROR);
          left /= right;
        } else left *= right;
      } else if (this.startsFactor(t)) {
        left *= this.parseNpr(); // implicit multiplication: 2π, 3(1+2), 2sin(30)
      } else return left;
    }
  }

  private parseNpr(): number {
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek();
      if (t?.kind === "op" && (t.value === "nPr" || t.value === "nCr")) {
        this.next();
        const right = this.parseUnary();
        const perms = permutations(left, right);
        left = t.value === "nPr" ? perms : perms / factorial(right);
      } else return left;
    }
  }

  private parseUnary(): number {
    const t = this.peek();
    if (t?.kind === "op" && (t.value === "-" || t.value === "+")) {
      this.next();
      const value = this.parseUnary();
      return t.value === "-" ? -value : value;
    }
    return this.parsePower();
  }

  private parsePower(): number {
    const base = this.parsePostfix();
    const t = this.peek();
    if (t?.kind === "op" && (t.value === "^" || t.value === "×10^")) {
      this.next();
      const exponent = this.parseUnary(); // right-assoc, allows 2^-3
      if (t.value === "×10^") return base * Math.pow(10, exponent);
      const result = Math.pow(base, exponent);
      if (Number.isNaN(result)) throw new CalcError(MATH_ERROR);
      return result;
    }
    return base;
  }

  private parsePostfix(): number {
    let value = this.parseAtom();
    for (;;) {
      const t = this.peek();
      if (t?.kind !== "post") return value;
      this.next();
      switch (t.value) {
        case "!":
          value = factorial(value);
          break;
        case "%":
          value /= 100;
          break;
        case "²":
          value *= value;
          break;
        case "³":
          value = value * value * value;
          break;
        case "⁻¹":
          if (value === 0) throw new CalcError(MATH_ERROR);
          value = 1 / value;
          break;
      }
    }
  }

  private toRad(x: number): number {
    return this.angleMode === "DEG" ? (x * Math.PI) / 180 : x;
  }

  private fromRad(x: number): number {
    return this.angleMode === "DEG" ? (x * 180) / Math.PI : x;
  }

  private applyFunc(name: string, x: number): number {
    switch (name) {
      case "sin":
        return Math.sin(this.toRad(x));
      case "cos":
        return Math.cos(this.toRad(x));
      case "tan": {
        const r = Math.tan(this.toRad(x));
        if (Math.abs(r) > 1e15) throw new CalcError(MATH_ERROR); // tan(90°)
        return r;
      }
      case "sin⁻¹":
        if (x < -1 || x > 1) throw new CalcError(MATH_ERROR);
        return this.fromRad(Math.asin(x));
      case "cos⁻¹":
        if (x < -1 || x > 1) throw new CalcError(MATH_ERROR);
        return this.fromRad(Math.acos(x));
      case "tan⁻¹":
        return this.fromRad(Math.atan(x));
      case "sinh":
        return Math.sinh(x);
      case "cosh":
        return Math.cosh(x);
      case "tanh":
        return Math.tanh(x);
      case "log":
        if (x <= 0) throw new CalcError(MATH_ERROR);
        return Math.log10(x);
      case "ln":
        if (x <= 0) throw new CalcError(MATH_ERROR);
        return Math.log(x);
      case "√":
        if (x < 0) throw new CalcError(MATH_ERROR);
        return Math.sqrt(x);
      case "∛":
        return Math.cbrt(x);
      case "Abs":
        return Math.abs(x);
      default:
        throw new CalcError(SYNTAX_ERROR);
    }
  }

  private parseAtom(): number {
    const t = this.next();
    if (!t) throw new CalcError(SYNTAX_ERROR);
    if (t.kind === "num") return t.value;
    if (t.kind === "const") {
      if (t.value === "π") return Math.PI;
      if (t.value === "e") return Math.E;
      return this.ans;
    }
    if (t.kind === "lparen") {
      const value = this.parseExpr();
      this.consumeRparen();
      return value;
    }
    if (t.kind === "func") {
      const open = this.next();
      if (open?.kind !== "lparen") throw new CalcError(SYNTAX_ERROR);
      const arg = this.parseExpr();
      this.consumeRparen();
      return this.applyFunc(t.value, arg);
    }
    throw new CalcError(SYNTAX_ERROR);
  }

  // Casio tolerates unclosed parentheses at the end of the expression.
  private consumeRparen(): void {
    const t = this.peek();
    if (t?.kind === "rparen") this.next();
    else if (t !== undefined) throw new CalcError(SYNTAX_ERROR);
  }
}

export function evaluateExpression(src: string, angleMode: AngleMode, ans: number): number {
  return new Parser(lex(src), angleMode, ans).parse();
}

// Casio-style output: 10 significant digits, ×10^n notation outside [1e-9, 1e10).
export function formatCalcNumber(n: number): string {
  if (!Number.isFinite(n)) throw new CalcError(MATH_ERROR);
  if (n === 0) return "0";
  const rounded = parseFloat(n.toPrecision(10));
  const abs = Math.abs(rounded);
  if (abs >= 1e10 || abs < 1e-9) {
    const [mantissa, exp] = rounded.toExponential(9).split("e");
    const trimmed = parseFloat(mantissa).toString();
    return `${trimmed}×10^${parseInt(exp, 10)}`;
  }
  const str = rounded.toString();
  if (str.includes("e")) {
    const [mantissa, exp] = str.split("e");
    return `${mantissa}×10^${parseInt(exp, 10)}`;
  }
  return str;
}
