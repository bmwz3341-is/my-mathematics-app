"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalcError,
  evaluateExpression,
  formatCalcNumber,
  type AngleMode,
} from "@/lib/scientificCalc";

type KeyVariant = "digit" | "op" | "func" | "shift" | "equals" | "danger" | "memory";

interface KeyDef {
  label: string;
  insert?: string; // token appended to the expression
  shiftLabel?: string;
  shiftInsert?: string;
  action?: "shift" | "angle" | "del" | "ac" | "equals" | "mc" | "mr" | "mplus" | "mminus";
  variant?: KeyVariant;
  span?: number;
}

const KEYS: KeyDef[] = [
  { label: "SHIFT", action: "shift", variant: "shift" },
  { label: "DEG", action: "angle", variant: "memory" },
  { label: "MC", action: "mc", variant: "memory" },
  { label: "MR", action: "mr", variant: "memory" },
  { label: "M+", action: "mplus", variant: "memory" },
  { label: "M−", action: "mminus", variant: "memory" },

  { label: "sin", insert: "sin(", shiftLabel: "sin⁻¹", shiftInsert: "sin⁻¹(", variant: "func" },
  { label: "cos", insert: "cos(", shiftLabel: "cos⁻¹", shiftInsert: "cos⁻¹(", variant: "func" },
  { label: "tan", insert: "tan(", shiftLabel: "tan⁻¹", shiftInsert: "tan⁻¹(", variant: "func" },
  { label: "ln", insert: "ln(", shiftLabel: "eˣ", shiftInsert: "e^(", variant: "func" },
  { label: "log", insert: "log(", shiftLabel: "10ˣ", shiftInsert: "10^(", variant: "func" },
  { label: "√", insert: "√(", shiftLabel: "∛", shiftInsert: "∛(", variant: "func" },

  { label: "x²", insert: "²", shiftLabel: "x³", shiftInsert: "³", variant: "func" },
  { label: "xʸ", insert: "^", shiftLabel: "sinh", shiftInsert: "sinh(", variant: "func" },
  { label: "n!", insert: "!", shiftLabel: "x⁻¹", shiftInsert: "⁻¹", variant: "func" },
  { label: "π", insert: "π", shiftLabel: "e", shiftInsert: "e", variant: "func" },
  { label: "(", insert: "(", variant: "func" },
  { label: ")", insert: ")", variant: "func" },

  { label: "7", insert: "7" },
  { label: "8", insert: "8" },
  { label: "9", insert: "9" },
  { label: "DEL", action: "del", variant: "danger" },
  { label: "AC", action: "ac", variant: "danger", span: 2 },

  { label: "4", insert: "4" },
  { label: "5", insert: "5" },
  { label: "6", insert: "6" },
  { label: "×", insert: "×", variant: "op" },
  { label: "÷", insert: "÷", variant: "op" },
  { label: "%", insert: "%", variant: "op" },

  { label: "1", insert: "1" },
  { label: "2", insert: "2" },
  { label: "3", insert: "3" },
  { label: "+", insert: "+", variant: "op" },
  { label: "−", insert: "-", variant: "op" },
  { label: "nPr", insert: "nPr", shiftLabel: "nCr", shiftInsert: "nCr", variant: "op" },

  { label: "0", insert: "0" },
  { label: ".", insert: "." },
  { label: "×10ˣ", insert: "×10^", variant: "func" },
  { label: "Ans", insert: "Ans", variant: "func" },
  { label: "=", action: "equals", variant: "equals", span: 2 },
];

export default function ScientificCalculator() {
  const [tokens, setTokens] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const [ans, setAns] = useState(0);
  const [memory, setMemory] = useState(0);
  const [hasMemory, setHasMemory] = useState(false);
  const [shift, setShift] = useState(false);
  const [angleMode, setAngleMode] = useState<AngleMode>("DEG");

  const stateRef = useRef({ tokens, result, ans });
  stateRef.current = { tokens, result, ans };

  const expression = tokens.join("");

  function insertToken(token: string) {
    setError(null);
    setShift(false);
    const { tokens: cur, result: res } = stateRef.current;
    if (res !== null) {
      // After "=": an operator/postfix continues from Ans, anything else starts fresh
      const continues = ["+", "-", "×", "÷", "^", "×10^", "!", "%", "²", "³", "⁻¹", "nPr", "nCr"].includes(token);
      setResult(null);
      setTokens(continues ? ["Ans", token] : [token]);
      return;
    }
    setTokens([...cur, token]);
  }

  function evaluate() {
    const { tokens: cur, ans: curAns } = stateRef.current;
    if (cur.length === 0) return;
    setShift(false);
    try {
      const value = evaluateExpression(cur.join(""), angleMode, curAns);
      const formatted = formatCalcNumber(value);
      setAns(value);
      setResult(formatted);
      setHistory(`${cur.join("")} = ${formatted}`);
      setError(null);
    } catch (err) {
      setError(err instanceof CalcError ? err.message : "שגיאה");
      setResult(null);
    }
  }

  function currentValue(): number | null {
    const { result: res, tokens: cur, ans: curAns } = stateRef.current;
    if (res !== null) return curAns;
    if (cur.length === 0) return null;
    try {
      return evaluateExpression(cur.join(""), angleMode, curAns);
    } catch {
      return null;
    }
  }

  function handleAction(action: NonNullable<KeyDef["action"]>) {
    switch (action) {
      case "shift":
        setShift((s) => !s);
        break;
      case "angle":
        setAngleMode((m) => (m === "DEG" ? "RAD" : "DEG"));
        setShift(false);
        break;
      case "del":
        setError(null);
        if (stateRef.current.result !== null) {
          setResult(null);
        } else {
          setTokens((t) => t.slice(0, -1));
        }
        break;
      case "ac":
        setTokens([]);
        setResult(null);
        setError(null);
        setShift(false);
        break;
      case "equals":
        evaluate();
        break;
      case "mc":
        setMemory(0);
        setHasMemory(false);
        break;
      case "mr":
        if (hasMemory) insertToken(formatCalcNumber(memory));
        break;
      case "mplus":
      case "mminus": {
        const value = currentValue();
        if (value === null) return;
        setMemory((m) => (action === "mplus" ? m + value : m - value));
        setHasMemory(true);
        break;
      }
    }
  }

  function pressKey(key: KeyDef) {
    if (key.action) {
      handleAction(key.action);
      return;
    }
    const token = shift && key.shiftInsert ? key.shiftInsert : key.insert;
    if (token) insertToken(token);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") insertToken(e.key);
      else if (e.key === ".") insertToken(".");
      else if (e.key === "+") insertToken("+");
      else if (e.key === "-") insertToken("-");
      else if (e.key === "*") insertToken("×");
      else if (e.key === "/") {
        e.preventDefault();
        insertToken("÷");
      } else if (e.key === "^") insertToken("^");
      else if (e.key === "(") insertToken("(");
      else if (e.key === ")") insertToken(")");
      else if (e.key === "%") insertToken("%");
      else if (e.key === "Enter" || e.key === "=") evaluate();
      else if (e.key === "Backspace") handleAction("del");
      else if (e.key === "Escape") handleAction("ac");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angleMode, hasMemory]);

  return (
    <div className="rounded-3xl border border-slate-700/60 bg-slate-900/85 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-5">
      {/* Display */}
      <div className="rounded-2xl border border-slate-700/70 bg-gradient-to-b from-slate-800 to-slate-900 px-4 py-3">
        <div className="flex items-center justify-between text-[11px] font-bold tracking-widest">
          <span className={shift ? "text-orange-400" : "text-slate-600"}>SHIFT</span>
          <span className={hasMemory ? "text-cyan-300" : "text-slate-600"}>M</span>
          <span className="text-cyan-300">{angleMode}</span>
        </div>
        <div
          dir="ltr"
          className="mt-2 min-h-7 overflow-x-auto whitespace-nowrap text-left text-lg font-semibold text-slate-300"
        >
          {expression || <span className="text-slate-600">0</span>}
          {result === null && <span className="animate-pulse text-cyan-400">|</span>}
        </div>
        <div
          dir="ltr"
          className={`mt-1 min-h-10 overflow-x-auto whitespace-nowrap text-right text-3xl font-extrabold sm:text-4xl ${
            error ? "text-red-400 text-xl sm:text-2xl" : "text-white"
          }`}
        >
          {error ?? (result !== null ? `= ${result}` : " ")}
        </div>
        <div dir="ltr" className="mt-1 min-h-4 overflow-x-auto whitespace-nowrap text-right text-xs text-slate-500">
          {history ?? " "}
        </div>
      </div>

      {/* Keypad */}
      <div dir="ltr" className="mt-4 grid grid-cols-6 gap-2 sm:gap-2.5">
        {KEYS.map((key) => {
          const showShift = shift && key.shiftLabel;
          const label = showShift ? key.shiftLabel! : key.label;
          const displayLabel = key.action === "angle" ? angleMode : label;
          return (
            <button
              key={key.label}
              type="button"
              onClick={() => pressKey(key)}
              className={`${keyClasses(key, shift)} ${key.span === 2 ? "col-span-2" : ""}`}
            >
              {key.shiftLabel && !key.action ? (
                <span className="flex flex-col items-center leading-none">
                  <span className={`text-[11px] font-bold ${showShift ? "text-slate-500" : "text-orange-400/90"}`}>
                    {showShift ? key.label : key.shiftLabel}
                  </span>
                  <span className="mt-1">{label}</span>
                </span>
              ) : (
                displayLabel
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function keyClasses(key: KeyDef, shift: boolean): string {
  const base =
    "flex h-14 select-none items-center justify-center rounded-xl text-base font-bold transition active:scale-95 sm:h-16 sm:text-lg";
  switch (key.variant) {
    case "shift":
      return `${base} ${
        shift
          ? "bg-orange-500 text-white shadow-[0_0_14px_rgba(249,115,22,0.6)]"
          : "bg-slate-700/80 text-orange-400 hover:bg-slate-600/80"
      } text-sm sm:text-base`;
    case "memory":
      return `${base} bg-slate-800/80 text-sm text-cyan-300 hover:bg-slate-700/80 sm:text-base`;
    case "func":
      return `${base} bg-slate-700/70 text-slate-100 hover:bg-slate-600/70 text-sm sm:text-base`;
    case "op":
      return `${base} bg-[#2F6FED] text-white shadow-[0_0_12px_rgba(47,111,237,0.45)] hover:brightness-110`;
    case "equals":
      return `${base} bg-orange-500 text-xl text-white shadow-[0_0_14px_rgba(249,115,22,0.55)] hover:brightness-110 sm:text-2xl`;
    case "danger":
      return `${base} bg-rose-500/85 text-white hover:brightness-110 text-sm sm:text-base`;
    default:
      return `${base} bg-slate-100/95 text-slate-800 hover:bg-white`;
  }
}
