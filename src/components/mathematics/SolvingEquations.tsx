"use client";

import { useState } from "react";
import { Sigma } from "lucide-react";
import { solveMathInput, type SolveResult } from "@/lib/equationSolver";

const EXAMPLES = ["2x + 3 = 7", "3*(x - 2) = 9", "12 / 4 + 5", "5x - 1 = 3x + 9"];

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e8) / 1e8;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

export default function SolvingEquations() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<SolveResult | null>(null);

  function handleSolve() {
    setResult(solveMathInput(input));
  }

  function handleExample(example: string) {
    setInput(example);
    setResult(solveMathInput(example));
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <label htmlFor="equation-input" className="block text-right text-sm font-bold text-slate-600">
        הזינו משוואה (למשל 2x + 3 = 7) או ביטוי חשבוני
      </label>
      <input
        id="equation-input"
        type="text"
        dir="ltr"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSolve();
        }}
        placeholder="2x + 3 = 7"
        aria-label="משוואה או ביטוי לפתרון"
        className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
      />

      <button
        type="button"
        onClick={handleSolve}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
      >
        <Sigma className="size-5" strokeWidth={2} />
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

      {result && (
        <div
          className={`mt-5 rounded-xl px-4 py-4 text-center ${
            result.type === "error"
              ? "border border-red-300/70 bg-red-50/70 text-red-700"
              : "bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
          }`}
        >
          {result.type === "equation" && (
            <p dir="ltr" className="text-2xl font-extrabold">
              {result.variable} = {formatNumber(result.x)}
            </p>
          )}
          {result.type === "value" && (
            <p dir="ltr" className="text-2xl font-extrabold">
              = {formatNumber(result.value)}
            </p>
          )}
          {result.type === "error" && <p className="text-sm font-bold">{result.message}</p>}
        </div>
      )}
    </div>
  );
}
