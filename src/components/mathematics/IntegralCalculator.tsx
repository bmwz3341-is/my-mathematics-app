"use client";

import { useState } from "react";
import { ChartArea, AreaChart } from "lucide-react";
import { integrate, solveAreaBetweenFunctions, type IntegralMode, type IntegralResult, type AreaBetweenResult, type IntegralStep } from "@/lib/integral";
import IntegralGraph from "@/components/mathematics/IntegralGraph";
import AreaBetweenGraph from "@/components/mathematics/AreaBetweenGraph";

type Category = "indefinite" | "definite" | "areaBetween";

const EXAMPLES = ["x^2", "x^3 - 2x + 1", "sin(x)", "cos(x) + x", "e^x - x^2"];

const AREA_EXAMPLES: { f: string; g: string; label: string }[] = [
  { f: "x^2", g: "x+2", label: "x² ו-x+2" },
  { f: "4-x^2", g: "0", label: "4-x² ו-0" },
  { f: "x^3-4x", g: "0", label: "x³-4x ו-0 (3 חיתוכים)" },
];

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function StepsPanel({ steps }: { steps: IntegralStep[] }) {
  if (steps.length === 0) return null;
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
              <span className="text-right text-xs font-bold text-orange-500">{step.law}</span>
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

export default function IntegralCalculator() {
  const [category, setCategory] = useState<Category>("indefinite");

  // --- Tabs 1 & 2: indefinite / definite integral (existing, isolated from the new tab) ---
  const [mode, setMode] = useState<IntegralMode>("indefinite");
  const [input, setInput] = useState("");
  const [aInput, setAInput] = useState("0");
  const [bInput, setBInput] = useState("2");
  const [targetInput, setTargetInput] = useState("");
  const [result, setResult] = useState<IntegralResult | null>(null);

  // --- Tab 3: area between two functions (isolated state) ---
  const [fInput, setFInput] = useState("");
  const [gInput, setGInput] = useState("");
  const [areaResult, setAreaResult] = useState<AreaBetweenResult | null>(null);

  function solve(fn: string, m: IntegralMode) {
    setResult(integrate(fn, m, aInput, bInput, targetInput));
  }

  function handleSolve() {
    solve(input, mode);
  }

  function handleExample(example: string) {
    setInput(example);
    solve(example, mode);
  }

  function handleModeChange(m: IntegralMode) {
    setCategory(m);
    setMode(m);
    if (input.trim()) solve(input, m);
  }

  function handleAreaSolve() {
    setAreaResult(solveAreaBetweenFunctions(fInput, gInput));
  }

  function handleAreaExample(example: (typeof AREA_EXAMPLES)[number]) {
    setFInput(example.f);
    setGInput(example.g);
    setAreaResult(solveAreaBetweenFunctions(example.f, example.g));
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <div className="flex flex-row-reverse gap-2">
        <button
          type="button"
          onClick={() => handleModeChange("indefinite")}
          className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition sm:text-sm ${
            category === "indefinite"
              ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
              : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
          }`}
        >
          אינטגרל לא מסוים
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("definite")}
          className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition sm:text-sm ${
            category === "definite"
              ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
              : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
          }`}
        >
          אינטגרל מסוים
        </button>
        <button
          type="button"
          onClick={() => setCategory("areaBetween")}
          className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition sm:text-sm ${
            category === "areaBetween"
              ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
              : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
          }`}
        >
          שטח בין שתי פונקציות
        </button>
      </div>

      {/* ---------------- Indefinite / definite integral (existing) ---------------- */}
      {category !== "areaBetween" && (
        <>
          <label htmlFor="integral-input" className="mt-4 block text-right text-sm font-bold text-slate-600">
            הזינו פונקציה לאינטגרציה (למשל x^3 + 2x - sin(x))
          </label>
          <input
            id="integral-input"
            type="text"
            dir="ltr"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSolve();
            }}
            placeholder="x^2 + sin(x)"
            aria-label="פונקציה לאינטגרציה"
            className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
          />

          {mode === "definite" && (
            <>
              <div className="mt-3 flex flex-row-reverse gap-3">
                <div className="flex-1">
                  <label htmlFor="integral-a" className="block text-right text-xs font-bold text-slate-600">
                    גבול תחתון (a) — מספר או ביטוי בפרמטר, למשל 2a
                  </label>
                  <input
                    id="integral-a"
                    type="text"
                    dir="ltr"
                    value={aInput}
                    onChange={(e) => setAInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSolve();
                    }}
                    aria-label="גבול תחתון a"
                    className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="integral-b" className="block text-right text-xs font-bold text-slate-600">
                    גבול עליון (b) — מספר או ביטוי בפרמטר, למשל 3a
                  </label>
                  <input
                    id="integral-b"
                    type="text"
                    dir="ltr"
                    value={bInput}
                    onChange={(e) => setBInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSolve();
                    }}
                    aria-label="גבול עליון b"
                    className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label htmlFor="integral-target" className="block text-right text-xs font-bold text-slate-600">
                  ערך יעד (אופציונלי) — לפתרון עבור הפרמטר כאשר הגבולות מכילים אות (כגון a)
                </label>
                <input
                  id="integral-target"
                  type="text"
                  dir="ltr"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSolve();
                  }}
                  placeholder="7.5"
                  aria-label="ערך יעד לפתרון עבור הפרמטר"
                  className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
                />
              </div>
            </>
          )}

          <button
            type="button"
            onClick={handleSolve}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
          >
            <ChartArea className="size-5" strokeWidth={2} />
            חשב אינטגרל
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
                {result.mode === "indefinite" ? (
                  <>
                    <p className="text-sm font-bold leading-relaxed">
                      האינטגרל הלא מסוים של{" "}
                      <bdi dir="ltr" className="font-mono">
                        f({result.variable}) = {result.originalExpr}
                      </bdi>{" "}
                      הוא
                    </p>
                    <p dir="ltr" className="mt-1 text-2xl font-extrabold">
                      ∫f({result.variable})d{result.variable} = {result.antiderivativeExpr}
                    </p>
                  </>
                ) : result.parametric ? (
                  <>
                    <p className="text-sm font-bold leading-relaxed">
                      האינטגרל המסוים של{" "}
                      <bdi dir="ltr" className="font-mono">
                        f({result.variable}) = {result.originalExpr}
                      </bdi>{" "}
                      בין {result.parametric.aExpr} ל-{result.parametric.bExpr} הוא
                    </p>
                    <p dir="ltr" className="mt-1 text-2xl font-extrabold">
                      ∫[{result.parametric.aExpr}, {result.parametric.bExpr}] f({result.variable})d{result.variable} = {result.parametric.definiteExpr}
                    </p>
                    {result.parametric.equationExpr && (
                      <p dir="ltr" className="mt-2 text-lg font-extrabold">
                        {result.parametric.solutions && result.parametric.solutions.length > 0
                          ? `${result.parametric.paramName} = ${result.parametric.solutions.map((s) => formatNumber(s)).join(",  ")}`
                          : "אין פתרון ממשי עבור הפרמטר"}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold leading-relaxed">
                      האינטגרל המסוים של{" "}
                      <bdi dir="ltr" className="font-mono">
                        f({result.variable}) = {result.originalExpr}
                      </bdi>{" "}
                      בין {result.a} ל-{result.b} הוא
                    </p>
                    <p dir="ltr" className="mt-1 text-2xl font-extrabold">
                      ∫[{result.a}, {result.b}] f({result.variable})d{result.variable} = {formatNumber(result.definiteValue ?? 0)}
                    </p>
                  </>
                )}
              </div>

              <StepsPanel steps={result.steps} />

              <IntegralGraph
                terms={result.originalTerms}
                variable={result.variable}
                expr={result.originalExpr}
                mode={result.mode}
                a={result.a}
                b={result.b}
                definiteValue={result.definiteValue}
              />
            </>
          )}
        </>
      )}

      {/* ---------------- Area between two functions ---------------- */}
      {category === "areaBetween" && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="area-f" className="block text-right text-xs font-bold text-slate-600">
                <bdi dir="ltr">f(x)</bdi>
              </label>
              <input
                id="area-f"
                type="text"
                dir="ltr"
                value={fInput}
                onChange={(e) => setFInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAreaSolve();
                }}
                placeholder="x^2"
                aria-label="הפונקציה f(x)"
                className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="area-g" className="block text-right text-xs font-bold text-slate-600">
                <bdi dir="ltr">g(x)</bdi>
              </label>
              <input
                id="area-g"
                type="text"
                dir="ltr"
                value={gInput}
                onChange={(e) => setGInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAreaSolve();
                }}
                placeholder="x+2"
                aria-label="הפונקציה g(x)"
                className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAreaSolve}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
          >
            <AreaChart className="size-5" strokeWidth={2} />
            חשב שטח
          </button>

          <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
            {AREA_EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                dir="ltr"
                onClick={() => handleAreaExample(example)}
                className="rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-white/70"
              >
                {example.label}
              </button>
            ))}
          </div>

          {areaResult?.type === "error" && (
            <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
              <p className="text-sm font-bold">{areaResult.message}</p>
            </div>
          )}

          {areaResult?.type === "result" && (
            <>
              <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
                <p className="text-sm font-bold leading-relaxed">
                  השטח החסום בין{" "}
                  <bdi dir="ltr" className="font-mono">
                    f(x) = {areaResult.fExpr}
                  </bdi>{" "}
                  לבין{" "}
                  <bdi dir="ltr" className="font-mono">
                    g(x) = {areaResult.gExpr}
                  </bdi>{" "}
                  הוא
                </p>
                <p dir="ltr" className="mt-1 text-2xl font-extrabold">
                  S = {formatNumber(areaResult.totalArea)}
                </p>
              </div>

              <StepsPanel steps={areaResult.steps} />

              <AreaBetweenGraph
                fTerms={areaResult.fTerms}
                gTerms={areaResult.gTerms}
                variable={areaResult.variable}
                fExpr={areaResult.fExpr}
                gExpr={areaResult.gExpr}
                roots={areaResult.roots}
                totalArea={areaResult.totalArea}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
