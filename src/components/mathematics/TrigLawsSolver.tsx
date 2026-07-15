"use client";

import { useState } from "react";
import { Triangle } from "lucide-react";
import { solveTriangle, type LawMode, type TriangleInput, type TriangleResult } from "@/lib/trigLaws";

interface FieldDef {
  key: keyof TriangleInput;
  label: string;
  hint: string;
}

const SIDE_FIELDS: FieldDef[] = [
  { key: "a", label: "a", hint: "צלע מול α" },
  { key: "b", label: "b", hint: "צלע מול β" },
  { key: "c", label: "c", hint: "צלע מול γ" },
];

const ANGLE_FIELDS: FieldDef[] = [
  { key: "alpha", label: "α", hint: "זווית מול a (מעלות)" },
  { key: "beta", label: "β", hint: "זווית מול b (מעלות)" },
  { key: "gamma", label: "γ", hint: "זווית מול c (מעלות)" },
];

const EMPTY_FORM: Record<keyof TriangleInput, string> = { a: "", b: "", c: "", alpha: "", beta: "", gamma: "" };

const EXAMPLES: Record<LawMode, { label: string; values: Partial<Record<keyof TriangleInput, string>> }[]> = {
  sines: [
    { label: "a=10, α=40°, β=60°", values: { a: "10", alpha: "40", beta: "60" } },
    { label: "a=7, α=30°, b=10° (דו-משמעי)", values: { a: "7", alpha: "30", b: "10" } },
  ],
  cosines: [
    { label: "a=5, b=6, c=7 (SSS)", values: { a: "5", b: "6", c: "7" } },
    { label: "a=5, b=6, γ=50° (SAS)", values: { a: "5", b: "6", gamma: "50" } },
  ],
};

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export default function TrigLawsSolver({ initialLaw = "sines" }: { initialLaw?: LawMode }) {
  const [mode, setMode] = useState<LawMode>(initialLaw);
  const [form, setForm] = useState<Record<keyof TriangleInput, string>>(EMPTY_FORM);
  const [result, setResult] = useState<TriangleResult | null>(null);

  function buildInput(): TriangleInput | { error: string } {
    const input: TriangleInput = {};
    for (const field of [...SIDE_FIELDS, ...ANGLE_FIELDS]) {
      const raw = form[field.key].trim();
      if (raw === "") continue;
      const num = parseFloat(raw);
      if (!Number.isFinite(num)) return { error: `הערך של ${field.label} אינו מספר תקין` };
      input[field.key] = num;
    }
    return input;
  }

  function handleSolve() {
    const input = buildInput();
    if ("error" in input) {
      setResult({ type: "error", message: input.error });
      return;
    }
    setResult(solveTriangle(mode, input));
  }

  function handleExample(values: Partial<Record<keyof TriangleInput, string>>) {
    const next = { ...EMPTY_FORM, ...values };
    setForm(next);
    const input: TriangleInput = {};
    for (const field of [...SIDE_FIELDS, ...ANGLE_FIELDS]) {
      const raw = next[field.key].trim();
      if (raw !== "") input[field.key] = parseFloat(raw);
    }
    setResult(solveTriangle(mode, input));
  }

  function handleModeChange(m: LawMode) {
    setMode(m);
    setResult(null);
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <div className="flex flex-row-reverse gap-2">
        <button
          type="button"
          onClick={() => handleModeChange("sines")}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
            mode === "sines"
              ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
              : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
          }`}
        >
          משפט הסינוסים
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("cosines")}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
            mode === "cosines"
              ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
              : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
          }`}
        >
          משפט הקוסינוסים
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-center">
        <p dir="ltr" className="text-lg font-extrabold text-slate-800">
          {mode === "sines" ? "a/sin(α) = b/sin(β) = c/sin(γ)" : "a² = b² + c² − 2bc·cos(α)"}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          {mode === "sines"
            ? "דרוש: זוג צלע-זווית-נגדית שלם, ועוד זווית (פתרון יחיד) או עוד צלע (מקרה דו-משמעי)"
            : "דרוש: שלוש צלעות (SSS), או שתי צלעות והזווית הכלואה ביניהן (SAS)"}
        </p>
      </div>

      <p className="mt-4 text-right text-xs font-bold text-slate-600">צלעות</p>
      <div className="mt-1 grid grid-cols-3 gap-3">
        {SIDE_FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={`trig-${field.key}`} className="block text-right text-xs font-bold text-slate-600">
              <bdi dir="ltr">{field.label}</bdi> — {field.hint}
            </label>
            <input
              id={`trig-${field.key}`}
              type="text"
              dir="ltr"
              value={form[field.key]}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSolve();
              }}
              aria-label={field.hint}
              className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
            />
          </div>
        ))}
      </div>

      <p className="mt-3 text-right text-xs font-bold text-slate-600">זוויות (במעלות)</p>
      <div className="mt-1 grid grid-cols-3 gap-3">
        {ANGLE_FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={`trig-${field.key}`} className="block text-right text-xs font-bold text-slate-600">
              <bdi dir="ltr">{field.label}</bdi> — {field.hint}
            </label>
            <input
              id={`trig-${field.key}`}
              type="text"
              dir="ltr"
              value={form[field.key]}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSolve();
              }}
              aria-label={field.hint}
              className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSolve}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
      >
        <Triangle className="size-5" strokeWidth={2} />
        חשב
      </button>

      <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
        {EXAMPLES[mode].map((example) => (
          <button
            key={example.label}
            type="button"
            dir="ltr"
            onClick={() => handleExample(example.values)}
            className="rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-white/70"
          >
            {example.label}
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
          {result.ambiguous && (
            <div className="mt-5 rounded-xl border border-amber-300/70 bg-amber-50/70 px-4 py-3 text-center text-amber-800">
              <p className="text-sm font-bold">
                מקרה דו-משמעי (SSA): נמצאו {result.solutions.length} משולשים תקפים עם הנתונים שהוזנו
              </p>
            </div>
          )}

          {result.solutions.map((solution, index) => (
            <div key={index} className={result.solutions.length > 1 ? "mt-4 border-t-2 border-dashed border-white/60 pt-4" : ""}>
              {result.solutions.length > 1 && (
                <p className="text-right text-sm font-extrabold text-slate-700">פתרון {index + 1}:</p>
              )}
              <div className="mt-2 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
                <p dir="ltr" className="text-base font-extrabold leading-relaxed">
                  a={formatNumber(solution.a)}  b={formatNumber(solution.b)}  c={formatNumber(solution.c)}
                </p>
                <p dir="ltr" className="mt-1 text-base font-extrabold leading-relaxed">
                  α={formatNumber(solution.alpha)}°  β={formatNumber(solution.beta)}°  γ={formatNumber(solution.gamma)}°
                </p>
              </div>

              {solution.steps.length > 0 && (
                <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
                  <p className="text-right text-sm font-extrabold text-black">דרך הפתרון:</p>
                  <ol className="mt-2 space-y-2">
                    {solution.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex flex-row-reverse items-start gap-2">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2F6FED] text-xs font-bold text-white">
                          {stepIndex + 1}
                        </span>
                        <span className="flex flex-col items-end gap-0.5">
                          <span className="text-right text-xs font-bold text-orange-500">{step.law}</span>
                          <span dir="ltr" className="text-right font-mono text-sm font-bold text-slate-700">
                            {step.expr}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
