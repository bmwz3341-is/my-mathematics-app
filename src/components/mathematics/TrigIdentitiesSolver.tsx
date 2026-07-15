"use client";

import { useState } from "react";
import { Equal } from "lucide-react";
import { simplifyTrigExpression, type TrigIdentityResult } from "@/lib/trigIdentities";

const EXAMPLES = [
  "(1-cos(2x))/sin(2x)",
  "sin(x)^2+cos(x)^2",
  "sin(3x)*cos(2x)+cos(3x)*sin(2x)",
  "cos(x)*cos(2x)-sin(x)*sin(2x)",
  "sin(2x)/(2*cos(x))",
  "1-sin(x)^2",
];

export default function TrigIdentitiesSolver() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<TrigIdentityResult | null>(null);

  function solve(expr: string) {
    setResult(simplifyTrigExpression(expr));
  }

  function handleSolve() {
    solve(input);
  }

  function handleExample(example: string) {
    setInput(example);
    solve(example);
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <label htmlFor="trigid-input" className="block text-right text-sm font-bold text-slate-600">
        הזינו ביטוי טריגונומטרי לפישוט (sin, cos, tan עם ארגומנט לינארי ב-x)
      </label>
      <input
        id="trigid-input"
        type="text"
        dir="ltr"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSolve();
        }}
        placeholder="(1-cos(2x))/sin(2x)"
        aria-label="ביטוי טריגונומטרי לפישוט"
        className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
      />

      <button
        type="button"
        onClick={handleSolve}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
      >
        <Equal className="size-5" strokeWidth={2} />
        פשט
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
            <p dir="ltr" className="text-base font-bold leading-relaxed opacity-90">
              {result.original}
            </p>
            <p dir="ltr" className="mt-1 text-2xl font-extrabold">
              = {result.simplified}
            </p>
          </div>

          {result.steps.length > 0 ? (
            <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
              <p className="text-right text-sm font-extrabold text-black">שלבי הפישוט:</p>
              <ol className="mt-2 space-y-3">
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
                      <span className="text-right text-xs font-medium text-slate-500">{step.explanation}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="mt-3 text-right text-xs font-medium text-slate-500">הביטוי כבר במצב הפשוט ביותר שנמצא.</p>
          )}
        </>
      )}
    </div>
  );
}
