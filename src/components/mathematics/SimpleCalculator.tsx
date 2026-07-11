"use client";

import { useEffect, useState } from "react";

type Operator = "+" | "-" | "×" | "÷";

function operate(a: number, b: number, op: Operator): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return a / b;
  }
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "שגיאה";
  const rounded = Math.round(n * 1e9) / 1e9;
  return rounded.toString();
}

function withCommas(raw: string): string {
  if (raw === "שגיאה") return raw;
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [intPart, decPart] = unsigned.split(".");
  const grouped = Number(intPart || "0").toLocaleString("en-US");
  const result = decPart !== undefined ? `${grouped}.${decPart}` : grouped;
  return negative ? `-${result}` : result;
}

export default function SimpleCalculator() {
  const [display, setDisplay] = useState("0");
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [waitingForNew, setWaitingForNew] = useState(false);
  const [memory, setMemory] = useState(0);
  const [hasMemory, setHasMemory] = useState(false);

  const isError = display === "שגיאה";

  function inputDigit(d: string) {
    if (isError || waitingForNew) {
      setDisplay(d);
      setWaitingForNew(false);
      if (isError) {
        setPrevValue(null);
        setOperator(null);
      }
      return;
    }
    if (display.length >= 14) return;
    setDisplay(display === "0" ? d : display + d);
  }

  function inputDecimal() {
    if (isError || waitingForNew) {
      setDisplay("0.");
      setWaitingForNew(false);
      if (isError) {
        setPrevValue(null);
        setOperator(null);
      }
      return;
    }
    if (!display.includes(".")) setDisplay(display + ".");
  }

  function clearAll() {
    setDisplay("0");
    setPrevValue(null);
    setOperator(null);
    setWaitingForNew(false);
  }

  function toggleSign() {
    if (isError) return;
    setDisplay((d) => (d.startsWith("-") ? d.slice(1) : d === "0" ? d : "-" + d));
  }

  function inputPercent() {
    if (isError) return;
    setDisplay(formatNumber(parseFloat(display) / 100));
  }

  function inputSqrt() {
    if (isError) return;
    setDisplay(formatNumber(Math.sqrt(parseFloat(display))));
  }

  function performOperator(nextOperator: Operator) {
    if (isError) return;
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operator && !waitingForNew) {
      const result = operate(prevValue, inputValue, operator);
      setPrevValue(result);
      setDisplay(formatNumber(result));
    }

    setWaitingForNew(true);
    setOperator(nextOperator);
  }

  function handleEquals() {
    if (isError || operator === null || prevValue === null) return;
    const inputValue = parseFloat(display);
    const result = operate(prevValue, inputValue, operator);
    setDisplay(formatNumber(result));
    setPrevValue(null);
    setOperator(null);
    setWaitingForNew(true);
  }

  function memoryClear() {
    setMemory(0);
    setHasMemory(false);
  }

  function memoryRecall() {
    if (!hasMemory) return;
    setDisplay(formatNumber(memory));
    setWaitingForNew(true);
  }

  function memoryAdd() {
    if (isError) return;
    setMemory((m) => m + parseFloat(display));
    setHasMemory(true);
  }

  function memorySubtract() {
    if (isError) return;
    setMemory((m) => m - parseFloat(display));
    setHasMemory(true);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") inputDigit(e.key);
      else if (e.key === "." || e.key === ",") inputDecimal();
      else if (e.key === "+") performOperator("+");
      else if (e.key === "-") performOperator("-");
      else if (e.key === "*") performOperator("×");
      else if (e.key === "/") {
        e.preventDefault();
        performOperator("÷");
      } else if (e.key === "Enter" || e.key === "=") handleEquals();
      else if (e.key === "Escape") clearAll();
      else if (e.key === "%") inputPercent();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const pending = prevValue !== null && operator ? `${withCommas(formatNumber(prevValue))} ${operator}` : " ";

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <div className="rounded-xl bg-white/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">{hasMemory ? "M" : " "}</span>
          <div dir="ltr" className="text-sm font-bold text-slate-500">
            {pending}
          </div>
        </div>
        <div dir="ltr" className="mt-1 overflow-x-auto text-left text-4xl font-extrabold text-slate-800 sm:text-5xl">
          {withCommas(display)}
        </div>
      </div>

      <div dir="ltr" className="mt-4 flex gap-2">
        <CalcButton label="MC" variant="memory" onClick={memoryClear} className="flex-1" />
        <CalcButton label="MR" variant="memory" onClick={memoryRecall} className="flex-1" />
        <CalcButton label="M+" variant="memory" onClick={memoryAdd} className="flex-1" />
        <CalcButton label="M-" variant="memory" onClick={memorySubtract} className="flex-1" />
        <CalcButton label="√" variant="function" onClick={inputSqrt} className="flex-1" />
      </div>

      <div dir="ltr" className="mt-2 grid grid-cols-4 gap-2">
        <CalcButton label="AC" variant="function" onClick={clearAll} />
        <CalcButton label="±" variant="function" onClick={toggleSign} />
        <CalcButton label="%" variant="function" onClick={inputPercent} />
        <CalcButton label="÷" variant="operator" onClick={() => performOperator("÷")} />

        <CalcButton label="7" onClick={() => inputDigit("7")} />
        <CalcButton label="8" onClick={() => inputDigit("8")} />
        <CalcButton label="9" onClick={() => inputDigit("9")} />
        <CalcButton label="×" variant="operator" onClick={() => performOperator("×")} />

        <CalcButton label="4" onClick={() => inputDigit("4")} />
        <CalcButton label="5" onClick={() => inputDigit("5")} />
        <CalcButton label="6" onClick={() => inputDigit("6")} />
        <CalcButton label="−" variant="operator" onClick={() => performOperator("-")} />

        <CalcButton label="1" onClick={() => inputDigit("1")} />
        <CalcButton label="2" onClick={() => inputDigit("2")} />
        <CalcButton label="3" onClick={() => inputDigit("3")} />
        <CalcButton label="+" variant="operator" onClick={() => performOperator("+")} />

        <CalcButton label="0" wide onClick={() => inputDigit("0")} />
        <CalcButton label="." onClick={inputDecimal} />
        <CalcButton label="=" variant="equals" onClick={handleEquals} />
      </div>
    </div>
  );
}

function CalcButton({
  label,
  onClick,
  variant = "digit",
  wide = false,
  className = "",
}: {
  label: string;
  onClick: () => void;
  variant?: "digit" | "operator" | "function" | "equals" | "memory";
  wide?: boolean;
  className?: string;
}) {
  const variants: Record<string, string> = {
    digit: "bg-white/50 text-slate-800 hover:bg-white/70",
    operator: "bg-[#2F6FED] text-white shadow-[0_0_14px_rgba(47,111,237,0.5)] hover:brightness-105",
    function: "bg-white/30 text-orange-600 hover:bg-white/50",
    equals: "bg-orange-500 text-white shadow-[0_0_14px_rgba(249,115,22,0.5)] hover:brightness-105",
    memory: "bg-white/25 text-xs text-slate-500 hover:bg-white/45",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-14 select-none items-center justify-center rounded-2xl text-xl font-bold transition active:scale-95 sm:h-16 ${
        variants[variant]
      } ${wide ? "col-span-2" : ""} ${className}`}
    >
      {label}
    </button>
  );
}
