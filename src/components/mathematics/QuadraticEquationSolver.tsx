"use client";

import { useState } from "react";
import { Radical } from "lucide-react";
import { solveQuadratic, type QuadraticResult } from "@/lib/quadraticSolver";
import QuadraticGraph from "@/components/mathematics/QuadraticGraph";

const EXAMPLES = ["x^2 - 5x + 6 = 0", "x^2 + 5x = -6", "x^2 - 4x + 4 = 0", "x^2 + 2x + 5 = 0", "2x^2 - 8 = 0"];

export default function QuadraticEquationSolver() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<QuadraticResult | null>(null);

  function handleSolve() {
    setResult(solveQuadratic(input));
  }

  function handleExample(example: string) {
    setInput(example);
    setResult(solveQuadratic(example));
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <label htmlFor="quadratic-input" className="block text-right text-sm font-bold text-slate-600">
        הזינו משוואה ריבועית (למשל x^2 + 5x = -6)
      </label>
      <input
        id="quadratic-input"
        type="text"
        dir="ltr"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSolve();
        }}
        placeholder="x^2 - 5x + 6 = 0"
        aria-label="משוואה ריבועית לפתרון"
        className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
      />

      <button
        type="button"
        onClick={handleSolve}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
      >
        <Radical className="size-5" strokeWidth={2} />
        פתור
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

      {result?.type === "result" && !result.hasParams && (
        <>
          <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
            {result.roots.length === 0 && <p className="text-lg font-extrabold">אין פתרון ממשי (D &lt; 0)</p>}
            {result.roots.length === 1 && (
              <p dir="ltr" className="text-2xl font-extrabold">
                {result.variable} = {result.roots[0].toLocaleString("en-US", { maximumFractionDigits: 6 })}
              </p>
            )}
            {result.roots.length === 2 && (
              <p dir="ltr" className="text-2xl font-extrabold">
                {result.variable}₁ = {result.roots[1].toLocaleString("en-US", { maximumFractionDigits: 6 })} ,{" "}
                {result.variable}₂ = {result.roots[0].toLocaleString("en-US", { maximumFractionDigits: 6 })}
              </p>
            )}
          </div>

          <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
            <p className="text-right text-sm font-extrabold text-black">דרך הפתרון:</p>
            <ol className="mt-2 space-y-2">
              {result.steps.map((step, index) => (
                <li key={index} className="flex flex-row-reverse items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2F6FED] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="text-right text-xs font-bold text-orange-500">{step.label}</span>
                    <span dir="ltr" className="font-mono text-base font-bold text-slate-700">
                      {step.expr}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <QuadraticGraph a={result.a} b={result.b} c={result.c} roots={result.roots} variable={result.variable} />
        </>
      )}

      {result?.type === "result" && result.hasParams && (
        <>
          <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
            <p dir="ltr" className="text-lg font-extrabold">
              {result.rootsExpr}
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
            <p className="text-right text-sm font-extrabold text-black">דרך הפתרון:</p>
            <ol className="mt-2 space-y-2">
              {result.steps.map((step, index) => (
                <li key={index} className="flex flex-row-reverse items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2F6FED] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="text-right text-xs font-bold text-orange-500">{step.label}</span>
                    <span dir="ltr" className="font-mono text-base font-bold text-slate-700">
                      {step.expr}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
