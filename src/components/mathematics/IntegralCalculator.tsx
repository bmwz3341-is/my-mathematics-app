"use client";

import { useState } from "react";
import { ChartArea } from "lucide-react";
import { integrate, type IntegralMode, type IntegralResult } from "@/lib/integral";
import IntegralGraph from "@/components/mathematics/IntegralGraph";

const EXAMPLES = ["x^2", "x^3 - 2x + 1", "sin(x)", "cos(x) + x", "e^x - x^2"];

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export default function IntegralCalculator() {
  const [mode, setMode] = useState<IntegralMode>("indefinite");
  const [input, setInput] = useState("");
  const [aInput, setAInput] = useState("0");
  const [bInput, setBInput] = useState("2");
  const [result, setResult] = useState<IntegralResult | null>(null);

  function solve(fn: string, m: IntegralMode) {
    setResult(integrate(fn, m, aInput, bInput));
  }

  function handleSolve() {
    solve(input, mode);
  }

  function handleExample(example: string) {
    setInput(example);
    solve(example, mode);
  }

  function handleModeChange(m: IntegralMode) {
    setMode(m);
    if (input.trim()) solve(input, m);
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <div className="flex flex-row-reverse gap-2">
        <button
          type="button"
          onClick={() => handleModeChange("indefinite")}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
            mode === "indefinite"
              ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
              : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
          }`}
        >
          אינטגרל לא מסוים
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("definite")}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
            mode === "definite"
              ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
              : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
          }`}
        >
          אינטגרל מסוים
        </button>
      </div>

      <label htmlFor="integral-input" className="mt-4 block text-right text-sm font-bold text-slate-600">
        הזינו פונקציה לאינטגרציה (למשל x^3 + 2x - sin(x))
      </label>
      <input
        id="integral-input"
        type="text"
        dir="ltr"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSolve();
        }}
        placeholder="x^2 + sin(x)"
        aria-label="פונקציה לאינטגרציה"
        className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
      />

      {mode === "definite" && (
        <div className="mt-3 flex flex-row-reverse gap-3">
          <div className="flex-1">
            <label htmlFor="integral-a" className="block text-right text-xs font-bold text-slate-600">
              גבול תחתון (a)
            </label>
            <input
              id="integral-a"
              type="text"
              dir="ltr"
              value={aInput}
              onChange={(e) => setAInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSolve();
              }}
              aria-label="גבול תחתון a"
              className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="integral-b" className="block text-right text-xs font-bold text-slate-600">
              גבול עליון (b)
            </label>
            <input
              id="integral-b"
              type="text"
              dir="ltr"
              value={bInput}
              onChange={(e) => setBInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSolve();
              }}
              aria-label="גבול עליון b"
              className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleSolve}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
      >
        <ChartArea className="size-5" strokeWidth={2} />
        חשב אינטגרל
      </button>

      <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            dir="ltr"
            onClick={() => handleExample(example)}
            className="rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-white/70"
          >
            {example}
          </button>
        ))}
      </div>

      {result?.type === "error" && (
        <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
          <p className="text-sm font-bold">{result.message}</p>
        </div>
      )}

      {result?.type === "result" && (
        <>
          <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
            {result.mode === "indefinite" ? (
              <>
                <p className="text-sm font-bold leading-relaxed">
                  האינטגרל הלא מסוים של{" "}
                  <bdi dir="ltr" className="font-mono">
                    f({result.variable}) = {result.originalExpr}
                  </bdi>{" "}
                  הוא
                </p>
                <p dir="ltr" className="mt-1 text-2xl font-extrabold">
                  ∫f({result.variable})d{result.variable} = {result.antiderivativeExpr}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold leading-relaxed">
                  האינטגרל המסוים של{" "}
                  <bdi dir="ltr" className="font-mono">
                    f({result.variable}) = {result.originalExpr}
                  </bdi>{" "}
                  בין {result.a} ל-{result.b} הוא
                </p>
                <p dir="ltr" className="mt-1 text-2xl font-extrabold">
                  ∫[{result.a}, {result.b}] f({result.variable})d{result.variable} = {formatNumber(result.definiteValue ?? 0)}
                </p>
              </>
            )}
          </div>

          {result.steps.length > 0 && (
            <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
              <p className="text-right text-sm font-extrabold text-black">דרך הפתרון:</p>
              <ol className="mt-2 space-y-2">
                {result.steps.map((step, index) => (
                  <li key={index} className="flex flex-row-reverse items-start gap-2">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2F6FED] text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="text-right text-xs font-bold text-orange-500">{step.law}</span>
                      <span dir="ltr" className="font-mono text-base font-bold text-slate-700">
                        {step.expr}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <IntegralGraph
            terms={result.originalTerms}
            variable={result.variable}
            expr={result.originalExpr}
            mode={result.mode}
            a={result.a}
            b={result.b}
            definiteValue={result.definiteValue}
          />
        </>
      )}
    </div>
  );
}
