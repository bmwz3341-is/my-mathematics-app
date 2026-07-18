"use client";

import { useState } from "react";
import { GitMerge } from "lucide-react";
import { solveSystem, type SystemMethod, type SystemResult } from "@/lib/systemOfEquations";
import SystemOfEquationsGraph from "@/components/mathematics/SystemOfEquationsGraph";
import DailyChallengeBanner from "@/components/mathematics/DailyChallengeBanner";
import { useDailyChallengeAutoFill } from "@/lib/useDailyChallengeAutoFill";
import { useTrackExercise } from "@/hooks/useTrackExercise";

const EXAMPLES: { eq1: string; eq2: string }[] = [
  { eq1: "x + y = 5", eq2: "2x - y = 1" },
  { eq1: "2x + 3y = 12", eq2: "x - y = 1" },
  { eq1: "x + y = 4", eq2: "2x + 2y = 8" },
  { eq1: "x + y = 3", eq2: "x + y = 7" },
];

const METHODS: { id: SystemMethod; label: string }[] = [
  { id: "elimination", label: "השוואת מקדמים" },
  { id: "substitution", label: "הצבה" },
];

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export default function SystemOfEquationsSolver() {
  const [eq1Input, setEq1Input] = useState("");
  const [eq2Input, setEq2Input] = useState("");
  const [method, setMethod] = useState<SystemMethod>("elimination");
  const [result, setResult] = useState<SystemResult | null>(null);
  const track = useTrackExercise();

  function handleSolve(e1 = eq1Input, e2 = eq2Input, m = method) {
    const r = solveSystem(e1, e2, m);
    setResult(r);
    if (r.type !== "error") track("systemOfEquations", `${e1} | ${e2}`);
  }

  function handleExample(example: { eq1: string; eq2: string }) {
    setEq1Input(example.eq1);
    setEq2Input(example.eq2);
    handleSolve(example.eq1, example.eq2, method);
  }

  function handleMethodChange(m: SystemMethod) {
    setMethod(m);
    if (result && result.type !== "error") handleSolve(eq1Input, eq2Input, m);
  }

  const dailyChallengeActive = useDailyChallengeAutoFill("systemOfEquations", (challenge) => {
    handleExample({ eq1: challenge.equation1 ?? "", eq2: challenge.equation2 ?? "" });
  });

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <label htmlFor="sys-eq1-input" className="block text-right text-sm font-bold text-slate-600">
        משוואה ראשונה (למשל x + y = 5)
      </label>
      <DailyChallengeBanner active={dailyChallengeActive} />
      <input
        id="sys-eq1-input"
        type="text"
        dir="ltr"
        value={eq1Input}
        onChange={(e) => setEq1Input(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSolve();
        }}
        placeholder="x + y = 5"
        aria-label="המשוואה הראשונה במערכת"
        className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
      />

      <label htmlFor="sys-eq2-input" className="mt-3 block text-right text-sm font-bold text-slate-600">
        משוואה שנייה (למשל 2x - y = 1)
      </label>
      <input
        id="sys-eq2-input"
        type="text"
        dir="ltr"
        value={eq2Input}
        onChange={(e) => setEq2Input(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSolve();
        }}
        placeholder="2x - y = 1"
        aria-label="המשוואה השנייה במערכת"
        className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
      />

      <p className="mt-4 text-right text-sm font-bold text-slate-600">שיטת הפתרון:</p>
      <div className="mt-2 flex flex-row-reverse gap-2">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => handleMethodChange(m.id)}
            aria-pressed={method === m.id}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
              method === m.id
                ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_14px_rgba(47,111,237,0.4)]"
                : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => handleSolve()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
      >
        <GitMerge className="size-5" strokeWidth={2} />
        פתור
      </button>

      <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={`${example.eq1}|${example.eq2}`}
            type="button"
            dir="ltr"
            onClick={() => handleExample(example)}
            className="rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-white/70"
          >
            {example.eq1} , {example.eq2}
          </button>
        ))}
      </div>

      {result?.type === "error" && (
        <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
          <p className="text-sm font-bold">{result.message}</p>
        </div>
      )}

      {result?.type === "unique" && (
        <>
          <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
            <p dir="ltr" className="text-2xl font-extrabold">
              x = {formatNumber(result.x)} , y = {formatNumber(result.y)}
            </p>
          </div>

          <SolutionSteps steps={result.steps} />
          <SystemOfEquationsGraph eq1={result.eq1} eq2={result.eq2} solution={{ x: result.x, y: result.y }} />
        </>
      )}

      {result?.type === "none" && (
        <>
          <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
            <p className="text-lg font-extrabold">אין פתרון למערכת — הישרים מקבילים ואינם נחתכים</p>
          </div>

          <SolutionSteps steps={result.steps} />
          <SystemOfEquationsGraph eq1={result.eq1} eq2={result.eq2} solution={null} />
        </>
      )}

      {result?.type === "infinite" && (
        <>
          <div className="mt-5 rounded-xl border border-amber-300/70 bg-amber-50/70 px-4 py-4 text-center text-amber-800">
            <p className="text-lg font-extrabold">אינסוף פתרונות — הישרים מתלכדים</p>
            <p dir="ltr" className="mt-1 font-mono text-sm font-bold">
              {result.paramExpr}
            </p>
          </div>

          <SolutionSteps steps={result.steps} />
          <SystemOfEquationsGraph eq1={result.eq1} eq2={result.eq2} solution={null} />
        </>
      )}
    </div>
  );
}

function SolutionSteps({ steps }: { steps: { label: string; expr: string }[] }) {
  return (
    <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
      <p className="text-right text-sm font-extrabold text-black">דרך הפתרון:</p>
      <ol className="mt-2 space-y-2">
        {steps.map((step, index) => (
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
  );
}
