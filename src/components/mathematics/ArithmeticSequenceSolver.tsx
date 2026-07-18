"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { kindLabel, solveSequence, type SequenceInput, type SequenceResult } from "@/lib/arithmeticSequence";
import SequenceTermsGraph from "@/components/mathematics/SequenceTermsGraph";
import { useDailyChallengeAutoFill } from "@/lib/useDailyChallengeAutoFill";
import { useTrackExercise } from "@/hooks/useTrackExercise";

interface FieldDef {
  key: keyof SequenceInput;
  label: string;
  hint: string;
}

const FIELDS: FieldDef[] = [
  { key: "a1", label: "a₁", hint: "איבר ראשון" },
  { key: "d", label: "d", hint: "הפרש" },
  { key: "n", label: "n", hint: "מספר איברים" },
  { key: "an", label: "aₙ", hint: "איבר אחרון" },
  { key: "Sn", label: "Sₙ", hint: "סכום" },
];

interface Example {
  label: string;
  values: Partial<Record<keyof SequenceInput, string>>;
}

const EXAMPLES: Example[] = [
  { label: "a₁=2, d=3, n=10", values: { a1: "2", d: "3", n: "10" } },
  { label: "a₁=2, a₅=10", values: { a1: "2", n: "5", an: "10" } },
  { label: "a₁=1, d=2, Sₙ=100", values: { a1: "1", d: "2", Sn: "100" } },
  { label: "a₁=20, d=-3, n=7", values: { a1: "20", d: "-3", n: "7" } },
  { label: "a₁=5, d=0, n=6", values: { a1: "5", d: "0", n: "6" } },
];

const EMPTY_FORM: Record<keyof SequenceInput, string> = { a1: "", d: "", n: "", an: "", Sn: "" };

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export default function ArithmeticSequenceSolver() {
  const [form, setForm] = useState<Record<keyof SequenceInput, string>>(EMPTY_FORM);
  const [findN, setFindN] = useState("");
  const [result, setResult] = useState<SequenceResult | null>(null);
  const track = useTrackExercise();

  useDailyChallengeAutoFill("arithmeticSequences", (challenge) => {
    const values = { ...EMPTY_FORM, ...(challenge.params ?? {}) } as Record<keyof SequenceInput, string>;
    setForm(values);
    solveWith(values);
  });

  function buildInput(values: Record<keyof SequenceInput, string>): SequenceInput | { error: string } {
    const input: SequenceInput = {};
    for (const field of FIELDS) {
      const raw = values[field.key].trim();
      if (raw === "") continue;
      const num = parseFloat(raw);
      if (!Number.isFinite(num)) return { error: `הערך של ${field.label} אינו מספר תקין` };
      input[field.key] = num;
    }
    return input;
  }

  function solveWith(values: Record<keyof SequenceInput, string>): SequenceResult {
    const input = buildInput(values);
    if ("error" in input) {
      const r: SequenceResult = { type: "error", message: input.error };
      setResult(r);
      return r;
    }
    let findIndex: number | undefined;
    const rawFindN = findN.trim();
    if (rawFindN !== "") {
      findIndex = parseFloat(rawFindN);
      if (!Number.isFinite(findIndex)) {
        const r: SequenceResult = { type: "error", message: "הערך בשדה 'מצא איבר n' אינו מספר תקין" };
        setResult(r);
        return r;
      }
    }
    const r = solveSequence(input, findIndex);
    setResult(r);
    return r;
  }

  function handleSolve() {
    const r = solveWith(form);
    if (r.type === "result") {
      const summary = FIELDS.filter((f) => form[f.key].trim() !== "")
        .map((f) => `${f.key}=${form[f.key]}`)
        .join(", ");
      track("arithmeticSequences", summary);
    }
  }

  function handleExample(example: Example) {
    const values = { ...EMPTY_FORM, ...example.values };
    setForm(values);
    solveWith(values);
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <p className="text-right text-sm font-bold text-slate-600">
        הזינו את הנתונים הידועים (לפחות שלושה) והשאירו ריקים את החסרים — המנוע ישלים אותם
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={`seq-${field.key}`} className="block text-right text-xs font-bold text-slate-600">
              <bdi dir="ltr">{field.label}</bdi> — {field.hint}
            </label>
            <input
              id={`seq-${field.key}`}
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
        <TrendingUp className="size-5" strokeWidth={2} />
        פתור סדרה
      </button>

      <div className="mt-3 flex flex-row-reverse items-center gap-3">
        <label htmlFor="seq-findN" className="text-right text-xs font-bold text-slate-600">
          מצא איבר n (לא חובה):
        </label>
        <input
          id="seq-findN"
          type="text"
          dir="ltr"
          value={findN}
          onChange={(e) => setFindN(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSolve();
          }}
          placeholder="12"
          aria-label="מצא איבר n"
          className="w-24 rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
        />
      </div>

      <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example.label}
            type="button"
            dir="ltr"
            onClick={() => handleExample(example)}
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
          <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
            <p className="text-sm font-bold leading-relaxed">{kindLabel(result.kind)}</p>
            <p dir="ltr" className="mt-1 text-2xl font-extrabold">
              {result.generalTermExpr}
            </p>
            <p dir="ltr" className="mt-2 text-sm font-bold leading-relaxed">
              a₁ = {formatNumber(result.a1)} | d = {formatNumber(result.d)} | n = {formatNumber(result.n)} | a
              {result.n} = {formatNumber(result.an)} | S{result.n} = {formatNumber(result.Sn)}
            </p>
            {result.foundTerm && (
              <p dir="ltr" className="mt-2 rounded-lg bg-white/20 px-3 py-2 text-xl font-extrabold">
                a{result.foundTerm.index} = {formatNumber(result.foundTerm.value)}
              </p>
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
                      <span dir="ltr" className="text-right font-mono text-sm font-bold text-slate-700">
                        {step.expr}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <SequenceTermsGraph terms={result.terms} n={result.n} kindText={kindLabel(result.kind)} />
        </>
      )}
    </div>
  );
}
