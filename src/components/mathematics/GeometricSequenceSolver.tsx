"use client";

import { useState } from "react";
import { ChartSpline } from "lucide-react";
import {
  geoKindLabel,
  solveGeoSequenceFromText,
  type GeoSequenceInput,
  type GeoSequenceParamResult,
  type GeoSequenceResult,
} from "@/lib/geometricSequence";
import SequenceTermsGraph from "@/components/mathematics/SequenceTermsGraph";
import { useDailyChallengeAutoFill } from "@/lib/useDailyChallengeAutoFill";

interface FieldDef {
  key: keyof GeoSequenceInput;
  label: string;
  hint: string;
}

const FIELDS: FieldDef[] = [
  { key: "a1", label: "a₁", hint: "איבר ראשון (מספר או ביטוי בפרמטר, למשל k)" },
  { key: "q", label: "q", hint: "מנה (מספר או ביטוי בפרמטר, למשל 2k)" },
  { key: "n", label: "n", hint: "מספר איברים" },
  { key: "an", label: "aₙ", hint: "איבר אחרון (מספר בלבד)" },
  { key: "Sn", label: "Sₙ", hint: "סכום (מספר בלבד)" },
];

interface Example {
  label: string;
  values: Partial<Record<keyof GeoSequenceInput, string>>;
}

const EXAMPLES: Example[] = [
  { label: "a₁=3, q=2, n=8", values: { a1: "3", q: "2", n: "8" } },
  { label: "a₁=2, a₅=32", values: { a1: "2", n: "5", an: "32" } },
  { label: "a₁=1, q=3, Sₙ=121", values: { a1: "1", q: "3", Sn: "121" } },
  { label: "a₁=64, q=0.5, n=7", values: { a1: "64", q: "0.5", n: "7" } },
  { label: "a₁=5, q=-2, n=6", values: { a1: "5", q: "-2", n: "6" } },
  { label: "a₁=3, q=2k, a₃=48 → מצאו k", values: { a1: "3", q: "2k", n: "3", an: "48" } },
];

const EMPTY_FORM: Record<keyof GeoSequenceInput, string> = { a1: "", q: "", n: "", an: "", Sn: "" };

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function SequenceResultBlock({ result }: { result: Extract<GeoSequenceResult, { type: "result" }> }) {
  return (
    <>
      <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
        <p className="text-sm font-bold leading-relaxed">{geoKindLabel(result.kind)}</p>
        <p dir="ltr" className="mt-1 text-2xl font-extrabold">
          {result.generalTermExpr}
        </p>
        <p dir="ltr" className="mt-2 text-sm font-bold leading-relaxed">
          a₁ = {formatNumber(result.a1)} | q = {formatNumber(result.q)} | n = {formatNumber(result.n)} | a
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

      <SequenceTermsGraph terms={result.terms} n={result.n} kindText={geoKindLabel(result.kind)} />
    </>
  );
}

export default function GeometricSequenceSolver() {
  const [form, setForm] = useState<Record<keyof GeoSequenceInput, string>>(EMPTY_FORM);
  const [findN, setFindN] = useState("");
  const [result, setResult] = useState<GeoSequenceParamResult | null>(null);

  useDailyChallengeAutoFill("geometricSequences", (challenge) => {
    const values = { ...EMPTY_FORM, ...(challenge.params ?? {}) } as Record<keyof GeoSequenceInput, string>;
    setForm(values);
    solveWith(values);
  });

  function solveWith(values: Record<keyof GeoSequenceInput, string>) {
    let findIndex: number | undefined;
    const rawFindN = findN.trim();
    if (rawFindN !== "") {
      findIndex = parseFloat(rawFindN);
      if (!Number.isFinite(findIndex)) {
        setResult({ type: "error", message: "הערך בשדה 'מצא איבר n' אינו מספר תקין" });
        return;
      }
    }
    setResult(
      solveGeoSequenceFromText(
        { a1: values.a1, q: values.q, n: values.n, an: values.an, Sn: values.Sn },
        findIndex,
      ),
    );
  }

  function handleSolve() {
    solveWith(form);
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
            <label htmlFor={`geo-${field.key}`} className="block text-right text-xs font-bold text-slate-600">
              <bdi dir="ltr">{field.label}</bdi> — {field.hint}
            </label>
            <input
              id={`geo-${field.key}`}
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
        <ChartSpline className="size-5" strokeWidth={2} />
        פתור סדרה
      </button>

      <div className="mt-3 flex flex-row-reverse items-center gap-3">
        <label htmlFor="geo-findN" className="text-right text-xs font-bold text-slate-600">
          מצא איבר n (לא חובה):
        </label>
        <input
          id="geo-findN"
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

      {result?.type === "result" && <SequenceResultBlock result={result} />}

      {result?.type === "param-result" && (
        <>
          <div className="mt-5 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
            <p className="text-right text-sm font-extrabold text-black">פתרון עבור הפרמטר {result.paramName}:</p>
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

          {result.solutions.map((sol, index) => (
            <div key={index} className="mt-4 border-t-2 border-dashed border-white/60 pt-4">
              <p dir="ltr" className="text-right text-base font-extrabold text-slate-700">
                {result.paramName} = {formatNumber(sol.paramValue)}
              </p>
              <SequenceResultBlock result={sol.sequence as Extract<GeoSequenceResult, { type: "result" }>} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
