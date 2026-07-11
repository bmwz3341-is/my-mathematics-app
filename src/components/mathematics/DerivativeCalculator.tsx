"use client";

import { useState } from "react";
import { ChartLine } from "lucide-react";
import { differentiate, type DerivativeResult } from "@/lib/derivative";
import DerivativeGraph from "@/components/mathematics/DerivativeGraph";

const EXAMPLES = ["x^3 + 2x^2", "x^4 - x^2 + 5", "3x^2 - 4x + 1", "x^2", "2x^5 - 3x^3 + x"];

export default function DerivativeCalculator() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<DerivativeResult | null>(null);

  function handleSolve() {
    setResult(differentiate(input));
  }

  function handleExample(example: string) {
    setInput(example);
    setResult(differentiate(example));
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <label htmlFor="derivative-input" className="block text-right text-sm font-bold text-slate-600">
        הזינו פונקציה פולינומית לגזירה (למשל x^3 + 2x^2 - 5x + 4)
      </label>
      <input
        id="derivative-input"
        type="text"
        dir="ltr"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSolve();
        }}
        placeholder="x^3 + 2x^2"
        aria-label="פונקציה לגזירה"
        className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
      />

      <button
        type="button"
        onClick={handleSolve}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
      >
        <ChartLine className="size-5" strokeWidth={2} />
        גזור פונקציה
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
            <p className="text-sm font-bold leading-relaxed">
              הנגזרת של{" "}
              <bdi dir="ltr" className="font-mono">
                f({result.variable}) = {result.originalExpr}
              </bdi>{" "}
              היא
            </p>
            <p dir="ltr" className="mt-1 text-2xl font-extrabold">
              f&apos;({result.variable}) = {result.derivativeExpr}
            </p>
          </div>

          {result.steps.length > 0 && (
            <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
              <p className="text-right text-sm font-extrabold text-black">דרך הגזירה:</p>
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

          <DerivativeGraph
            originalTerms={result.originalTerms}
            derivativeTerms={result.derivativeTerms}
            originalExpr={result.originalExpr}
            derivativeExpr={result.derivativeExpr}
            variable={result.variable}
          />
        </>
      )}
    </div>
  );
}
