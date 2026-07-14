"use client";

import { useState } from "react";
import { ChartLine, Crosshair } from "lucide-react";
import { differentiate, type DerivativeResult } from "@/lib/derivative";
import { findExtrema, type FunctionAnalysisResult, type CriticalPoint } from "@/lib/functionAnalysis";
import DerivativeGraph from "@/components/mathematics/DerivativeGraph";
import DailyChallengeBanner from "@/components/mathematics/DailyChallengeBanner";
import { useDailyChallengeAutoFill } from "@/lib/useDailyChallengeAutoFill";

const EXAMPLES = ["x^3 - 3x^2", "x^3 - 3x + 1", "x^4 - 4x^2", "-x^2 + 4x", "x^3 - 6x^2 + 9x"];

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function kindLabel(kind: CriticalPoint["kind"]): string {
  return kind === "max" ? "נקודת מקסימום" : kind === "min" ? "נקודת מינימום" : "לא ניתן לקבוע";
}

export default function FunctionAnalysis() {
  const [input, setInput] = useState("");
  const [derivativeResult, setDerivativeResult] = useState<DerivativeResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FunctionAnalysisResult | null>(null);

  function handleSolve() {
    setDerivativeResult(differentiate(input));
    setAnalysisResult(null);
  }

  function handleExample(example: string) {
    setInput(example);
    setDerivativeResult(differentiate(example));
    setAnalysisResult(null);
  }

  function handleFindExtrema() {
    if (derivativeResult?.type !== "result") return;
    setAnalysisResult(findExtrema(derivativeResult.originalTerms, derivativeResult.variable));
  }

  const dailyChallengeActive = useDailyChallengeAutoFill("functionAnalysis", (challenge) => {
    handleExample(challenge.equation1 ?? "");
  });

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <label htmlFor="analysis-input" className="block text-right text-sm font-bold text-slate-600">
        הזינו פונקציה פולינומית לחקירה (למשל x^3 - 3x^2)
      </label>
      <DailyChallengeBanner active={dailyChallengeActive} />
      <input
        id="analysis-input"
        type="text"
        dir="ltr"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSolve();
        }}
        placeholder="x^3 - 3x^2"
        aria-label="פונקציה לחקירה"
        className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
      />

      <button
        type="button"
        onClick={handleSolve}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
      >
        <ChartLine className="size-5" strokeWidth={2} />
        גזור פונקציה
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

      {derivativeResult?.type === "error" && (
        <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
          <p className="text-sm font-bold">{derivativeResult.message}</p>
        </div>
      )}

      {derivativeResult?.type === "result" && (
        <>
          <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
            <p className="text-sm font-bold leading-relaxed">
              הנגזרת של{" "}
              <bdi dir="ltr" className="font-mono">
                f({derivativeResult.variable}) = {derivativeResult.originalExpr}
              </bdi>{" "}
              היא
            </p>
            <p dir="ltr" className="mt-1 text-2xl font-extrabold">
              f&apos;({derivativeResult.variable}) = {derivativeResult.derivativeExpr}
            </p>
          </div>

          {derivativeResult.steps.length > 0 && (
            <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
              <p className="text-right text-sm font-extrabold text-black">דרך הגזירה:</p>
              <ol className="mt-2 space-y-2">
                {derivativeResult.steps.map((step, index) => (
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

          <button
            type="button"
            onClick={handleFindExtrema}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(217,89,38,0.45)] transition hover:brightness-105 active:brightness-95"
          >
            <Crosshair className="size-5" strokeWidth={2} />
            מצא נקודות קיצון
          </button>

          {analysisResult?.type === "result" && (
            <>
              <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
                <p className="text-right text-sm font-extrabold text-black">
                  פתרון f&apos;({analysisResult.variable}) = 0:
                </p>
                <ol className="mt-2 space-y-2">
                  {analysisResult.steps.map((step, index) => (
                    <li key={index} className="flex flex-row-reverse items-start gap-2">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="flex flex-col items-end gap-0.5">
                        <span className="text-right text-xs font-bold text-orange-500">{step.law}</span>
                        <span dir="ltr" className="font-mono text-sm font-bold text-slate-700">
                          {step.expr}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-3 rounded-xl bg-red-600 px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(220,38,38,0.45)]">
                {analysisResult.criticalPoints.length === 0 ? (
                  <p className="text-sm font-bold">{analysisResult.note ?? "לא נמצאו נקודות קיצון"}</p>
                ) : (
                  <ul className="space-y-1">
                    {analysisResult.criticalPoints.map((cp, i) => (
                      <li key={i} dir="ltr" className="font-mono text-base font-extrabold">
                        {analysisResult.variable} = {formatNumber(cp.x)} — {kindLabel(cp.kind)} (f = {formatNumber(cp.y)})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <DerivativeGraph
            originalTerms={derivativeResult.originalTerms}
            derivativeTerms={derivativeResult.derivativeTerms}
            originalExpr={derivativeResult.originalExpr}
            derivativeExpr={derivativeResult.derivativeExpr}
            variable={derivativeResult.variable}
            criticalPoints={analysisResult?.type === "result" ? analysisResult.criticalPoints : undefined}
          />
        </>
      )}
    </div>
  );
}
