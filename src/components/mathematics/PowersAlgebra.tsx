"use client";

import { useState } from "react";
import { Superscript } from "lucide-react";
import { solvePowerExpression, type PowerSolveResult } from "@/lib/powerLaws";

const EXAMPLES = [
  "x^2 * x^3",
  "(x^2)^3",
  "x^-2",
  "x^2 + 3x^2 - 5",
  "(x+1)*(x-1)",
  "(x+1)^3",
  "2x+3=7",
  "x^2=9",
  "x^3=8",
  "2^(X-4)",
  "2^(2X)+2^X-6=0",
  "sqrt(3^X) = 9",
];

const LAWS = [
  { formula: "aⁿ · aᵐ = aⁿ⁺ᵐ", title: "כפל בסיסים זהים" },
  { formula: "aⁿ : aᵐ = aⁿ⁻ᵐ", title: "חילוק בסיסים זהים" },
  { formula: "(aⁿ)ᵐ = aⁿ·ᵐ", title: "חזקה של חזקה" },
  { formula: "a⁻ⁿ = 1/aⁿ", title: "חזקה שלילית ושברים" },
  { formula: "a⁰ = 1", title: "חזקת אפס" },
  { formula: "(a·b)ⁿ = aⁿ·bⁿ", title: "חזקת מכפלה" },
  { formula: "(a/b)ⁿ = aⁿ/bⁿ", title: "חזקת מנה" },
];

export default function PowersAlgebra() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<PowerSolveResult | null>(null);

  function handleSolve() {
    setResult(solvePowerExpression(input));
  }

  function handleExample(example: string) {
    setInput(example);
    setResult(solvePowerExpression(example));
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <label htmlFor="power-input" className="block text-right text-sm font-bold text-slate-600">
        הזינו ביטוי חזקות, פולינום, משוואה או שורש (למשל x^2 * x^3, x^2=9 או sqrt(3^X)=9)
      </label>
      <input
        id="power-input"
        type="text"
        dir="ltr"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSolve();
        }}
        placeholder="x^2 * x^3"
        aria-label="ביטוי חזקות לפישוט"
        className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
      />

      <button
        type="button"
        onClick={handleSolve}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
      >
        <Superscript className="size-5" strokeWidth={2} />
        פשט חזקה
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
          {result.type === "result" && (
            <>
              <p dir="ltr" className="text-2xl font-extrabold">
                {result.headline}
              </p>
              {result.note && <p className="mt-2 text-xs font-bold text-white/90">{result.note}</p>}
            </>
          )}
          {result.type === "error" && <p className="text-sm font-bold">{result.message}</p>}
        </div>
      )}

      {result?.type === "result" && result.steps.length > 0 && (
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

      <div className="mt-5 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
        <p className="text-right text-sm font-extrabold text-black">חוקי החזקות</p>
        <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {LAWS.map((law) => (
            <div
              key={law.formula}
              className="flex items-center justify-between gap-2 rounded-lg bg-white/50 px-3 py-1.5"
            >
              <span dir="ltr" className="font-mono text-sm font-bold text-[#2F6FED]">
                {law.formula}
              </span>
              <span className="text-xs font-bold text-slate-600">{law.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
