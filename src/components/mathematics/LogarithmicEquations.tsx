"use client";

import { useState } from "react";
import { Logs } from "lucide-react";
import { solveLogarithmicEquation, type LogSolveResult } from "@/lib/logarithmEquations";

const EXAMPLES = [
  "log_2(x+3) + log_2(x-3) = 4",
  "log(x+2) - log(x-1) = 1",
  "ln(x) + ln(x-2) = ln(3)",
  "log_3(x^2-1) = 2",
  "ln(x) = 2",
  "log_2(x-1) + log_2(x+1)",
  "ln(x^2-1)",
];

const LAWS = [
  { formula: "log_a(x)+log_a(y) = log_a(x·y)", title: "חוק המכפלה" },
  { formula: "log_a(x)-log_a(y) = log_a(x/y)", title: "חוק המנה" },
  { formula: "n·log_a(x) = log_a(xⁿ)", title: "חוק החזקה" },
  { formula: "log_a(x) = b ⇒ x = aᵇ", title: "מעבר לצורה מעריכית" },
  { formula: "ln(x) = log_e(x)", title: "לוגריתם טבעי" },
  { formula: "x > 0", title: "תנאי קיום (תחום הגדרה)" },
];

export default function LogarithmicEquations() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<LogSolveResult | null>(null);

  function handleSolve() {
    setResult(solveLogarithmicEquation(input));
  }

  function handleExample(example: string) {
    setInput(example);
    setResult(solveLogarithmicEquation(example));
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <label htmlFor="log-input" className="block text-right text-sm font-bold text-slate-600">
        הזינו משוואה לוגריתמית (log_2(x+3)+log_2(x-3)=4) או ביטוי בודד ללא סימן = (log(x-3))
      </label>
      <input
        id="log-input"
        type="text"
        dir="ltr"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSolve();
        }}
        placeholder="log_2(x+3) + log_2(x-3) = 4"
        aria-label="משוואה לוגריתמית לפתרון"
        className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
      />

      <button
        type="button"
        onClick={handleSolve}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
      >
        <Logs className="size-5" strokeWidth={2} />
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
          {result.type === "result" && result.mode === "equation" && (
            <>
              <p dir="ltr" className="text-2xl font-extrabold">
                {result.headline}
              </p>
              {result.note && <p className="mt-2 text-xs font-bold text-white/90">{result.note}</p>}
            </>
          )}
          {result.type === "result" && result.mode === "expression" && (
            <>
              <p className="text-sm font-extrabold text-white/90">ניתוח ביטוי</p>
              <p dir="ltr" className="mt-2 text-base font-bold">
                תחום הגדרה: {result.domain}
              </p>
              <p dir="ltr" className="mt-1 text-xl font-extrabold">
                {result.original} = {result.simplified}
              </p>
              {result.note && <p className="mt-2 text-xs font-bold text-white/90">{result.note}</p>}
            </>
          )}
          {result.type === "error" && <p className="text-sm font-bold">{result.message}</p>}
        </div>
      )}

      {result?.type === "result" && result.steps.length > 0 && (
        <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
          <p className="text-right text-sm font-extrabold text-black">
            {result.mode === "equation" ? "דרך הפתרון:" : "דרך הניתוח:"}
          </p>
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
      )}

      <div className="mt-5 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
        <p className="text-right text-sm font-extrabold text-black">חוקי הלוגריתמים</p>
        <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {LAWS.map((law) => (
            <div key={law.formula} className="flex items-center justify-between gap-2 rounded-lg bg-white/50 px-3 py-1.5">
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
