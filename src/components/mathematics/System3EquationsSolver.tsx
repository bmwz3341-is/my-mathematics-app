"use client";

import { useState } from "react";
import { Layers3 } from "lucide-react";
import { solveSystem3, type System3Result } from "@/lib/system3Equations";
import System3EquationsGraph from "@/components/mathematics/System3EquationsGraph";

const EXAMPLES: { eq1: string; eq2: string; eq3: string }[] = [
  { eq1: "x + y + z = 6", eq2: "2x - y + z = 3", eq3: "x + 2y - z = 2" },
  { eq1: "2x + y - z = 3", eq2: "x - y + 2z = 8", eq3: "3x + 2y + z = 7" },
  { eq1: "x + y + z = 3", eq2: "2x + 2y + 2z = 6", eq3: "x - y + z = 1" },
  { eq1: "x + y + z = 1", eq2: "x + y + z = 4", eq3: "2x + y - z = 0" },
];

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export default function System3EquationsSolver() {
  const [eq1Input, setEq1Input] = useState("");
  const [eq2Input, setEq2Input] = useState("");
  const [eq3Input, setEq3Input] = useState("");
  const [result, setResult] = useState<System3Result | null>(null);

  function handleSolve(e1 = eq1Input, e2 = eq2Input, e3 = eq3Input) {
    setResult(solveSystem3(e1, e2, e3));
  }

  function handleExample(example: { eq1: string; eq2: string; eq3: string }) {
    setEq1Input(example.eq1);
    setEq2Input(example.eq2);
    setEq3Input(example.eq3);
    handleSolve(example.eq1, example.eq2, example.eq3);
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <label htmlFor="sys3-eq1-input" className="block text-right text-sm font-bold text-slate-600">
        משוואה ראשונה (למשל x + y + z = 6)
      </label>
      <input
        id="sys3-eq1-input"
        type="text"
        dir="ltr"
        value={eq1Input}
        onChange={(e) => setEq1Input(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSolve();
        }}
        placeholder="x + y + z = 6"
        aria-label="המשוואה הראשונה במערכת"
        className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
      />

      <label htmlFor="sys3-eq2-input" className="mt-3 block text-right text-sm font-bold text-slate-600">
        משוואה שנייה (למשל 2x - y + z = 3)
      </label>
      <input
        id="sys3-eq2-input"
        type="text"
        dir="ltr"
        value={eq2Input}
        onChange={(e) => setEq2Input(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSolve();
        }}
        placeholder="2x - y + z = 3"
        aria-label="המשוואה השנייה במערכת"
        className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
      />

      <label htmlFor="sys3-eq3-input" className="mt-3 block text-right text-sm font-bold text-slate-600">
        משוואה שלישית (למשל x + 2y - z = 2)
      </label>
      <input
        id="sys3-eq3-input"
        type="text"
        dir="ltr"
        value={eq3Input}
        onChange={(e) => setEq3Input(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSolve();
        }}
        placeholder="x + 2y - z = 2"
        aria-label="המשוואה השלישית במערכת"
        className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
      />

      <button
        type="button"
        onClick={() => handleSolve()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
      >
        <Layers3 className="size-5" strokeWidth={2} />
        פתור בשיטת הדירוג (גאוס)
      </button>

      <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={`${example.eq1}|${example.eq2}|${example.eq3}`}
            type="button"
            dir="ltr"
            onClick={() => handleExample(example)}
            className="rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-white/70"
          >
            {example.eq1} , {example.eq2} , {example.eq3}
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
              x = {formatNumber(result.x)} , y = {formatNumber(result.y)} , z = {formatNumber(result.z)}
            </p>
          </div>

          <SolutionSteps steps={result.steps} />
          <System3EquationsGraph x={result.x} y={result.y} z={result.z} />
        </>
      )}

      {result?.type === "none" && (
        <>
          <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
            <p className="text-lg font-extrabold">אין פתרון למערכת — שלושת המישורים אינם נחתכים בנקודה משותפת</p>
          </div>

          <SolutionSteps steps={result.steps} />
        </>
      )}

      {result?.type === "infinite" && (
        <>
          <div className="mt-5 rounded-xl border border-amber-300/70 bg-amber-50/70 px-4 py-4 text-center text-amber-800">
            <p className="text-lg font-extrabold">אינסוף פתרונות — המערכת תלויה</p>
            <p dir="ltr" className="mt-1 font-mono text-sm font-bold">
              {result.paramExpr}
            </p>
          </div>

          <SolutionSteps steps={result.steps} />
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
