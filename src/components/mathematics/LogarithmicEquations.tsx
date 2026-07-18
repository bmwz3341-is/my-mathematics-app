"use client";

import { useState } from "react";
import { Logs, Superscript, TrendingUp } from "lucide-react";
import { solveLogarithmicEquation, type LogSolveResult } from "@/lib/logarithmEquations";
import {
  solveExponentialEquation,
  computeGrowthDecay,
  type ExponentialEquationResult,
  type GrowthDecayResult,
  type GrowthDecayDirection,
} from "@/lib/exponentialLog";
import DailyChallengeBanner from "@/components/mathematics/DailyChallengeBanner";
import { useDailyChallengeAutoFill } from "@/lib/useDailyChallengeAutoFill";
import { useTrackExercise } from "@/hooks/useTrackExercise";

type Category = "logEquations" | "expEquations" | "growthDecay";

const CATEGORIES: { id: Category; label: string; icon: typeof Logs }[] = [
  { id: "logEquations", label: "משוואות לוגריתמיות", icon: Logs },
  { id: "expEquations", label: "משוואות מעריכיות", icon: Superscript },
  { id: "growthDecay", label: "גדילה ודעיכה", icon: TrendingUp },
];

const LOG_EXAMPLES = [
  "log_2(x+3) + log_2(x-3) = 4",
  "log(x+2) - log(x-1) = 1",
  "ln(x) + ln(x-2) = ln(3)",
  "log_3(x^2-1) = 2",
  "ln(x) = 2",
  "log_2(x-1) + log_2(x+1)",
  "ln(x^2-1)",
];

const LOG_LAWS = [
  { formula: "log_a(x)+log_a(y) = log_a(x·y)", title: "חוק המכפלה" },
  { formula: "log_a(x)-log_a(y) = log_a(x/y)", title: "חוק המנה" },
  { formula: "n·log_a(x) = log_a(xⁿ)", title: "חוק החזקה" },
  { formula: "log_a(x) = b ⇒ x = aᵇ", title: "מעבר לצורה מעריכית" },
  { formula: "ln(x) = log_e(x)", title: "לוגריתם טבעי" },
  { formula: "x > 0", title: "תנאי קיום (תחום הגדרה)" },
];

const EXP_EXAMPLES = ["3^x = 81", "2^(x-1) = 32", "5^x = 5^(3-x)", "2^x = 3^(x-1)"];

const EXP_LAWS = [
  { formula: "a^f(x) = b^g(x)  ⇒  f(x)·ln(a) = g(x)·ln(b)", title: "הפעלת ln על שני האגפים" },
  { formula: "a^m = a^n  ⇒  m = n  (a>0, a≠1)", title: "השוואת מעריכים (אותו בסיס)" },
  { formula: "a^x = b  ⇒  x = ln(b)/ln(a)", title: "בידוד x באמצעות לוגריתם" },
  { formula: "a^0 = 1", title: "חזקת אפס" },
];

const GROWTH_DECAY_LAWS = [
  { formula: "N(t) = N₀·(1 + r/100)^t", title: "נוסחת גדילה מעריכית" },
  { formula: "N(t) = N₀·(1 - r/100)^t", title: "נוסחת דעיכה מעריכית" },
  { formula: "0 ≤ r < 100", title: "תנאי תקינות לאחוז הדעיכה" },
];

const GROWTH_DECAY_PRESETS: { label: string; initial: string; ratePercent: string; time: string; direction: GrowthDecayDirection }[] = [
  { label: "אוכלוסיה: N₀=1000, r=3%, t=5 (גדילה)", initial: "1000", ratePercent: "3", time: "5", direction: "growth" },
  { label: "ריקבון רדיואקטיבי: N₀=500, r=8%, t=4 (דעיכה)", initial: "500", ratePercent: "8", time: "4", direction: "decay" },
];

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4 || 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function StepsPanel({ title, steps }: { title: string; steps: { title: string; expr: string }[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
      <p className="text-right text-sm font-extrabold text-black">{title}</p>
      <ol className="mt-2 space-y-2">
        {steps.map((step, index) => (
          <li key={index} className="flex flex-row-reverse items-start gap-2">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2F6FED] text-xs font-bold text-white">
              {index + 1}
            </span>
            <span className="flex flex-col items-end gap-0.5">
              <span className="text-right text-xs font-bold text-orange-500">{step.title}</span>
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

function LawsBox({ title, laws }: { title: string; laws: { formula: string; title: string }[] }) {
  return (
    <div className="mt-5 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
      <p className="text-right text-sm font-extrabold text-black">{title}</p>
      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {laws.map((law) => (
          <div key={law.formula} className="flex items-center justify-between gap-2 rounded-lg bg-white/50 px-3 py-1.5">
            <span dir="ltr" className="font-mono text-sm font-bold text-[#2F6FED]">
              {law.formula}
            </span>
            <span className="text-xs font-bold text-slate-600">{law.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LogarithmicEquations() {
  const [category, setCategory] = useState<Category>("logEquations");

  // --- Tab 1: logarithmic equations (isolated state) ---
  const [logInput, setLogInput] = useState("");
  const [logResult, setLogResult] = useState<LogSolveResult | null>(null);

  // --- Tab 2: exponential equations (isolated state) ---
  const [expInput, setExpInput] = useState("");
  const [expResult, setExpResult] = useState<ExponentialEquationResult | null>(null);

  // --- Tab 3: growth/decay (isolated state) ---
  const [gdInitial, setGdInitial] = useState("");
  const [gdRate, setGdRate] = useState("");
  const [gdTime, setGdTime] = useState("");
  const [gdDirection, setGdDirection] = useState<GrowthDecayDirection>("growth");
  const [gdResult, setGdResult] = useState<GrowthDecayResult | null>(null);
  const track = useTrackExercise();

  function handleLogSolve() {
    const r = solveLogarithmicEquation(logInput);
    setLogResult(r);
    if (r.type === "result") track("logarithmicEquations", logInput);
  }
  function handleLogExample(example: string) {
    setLogInput(example);
    setLogResult(solveLogarithmicEquation(example));
  }

  function handleExpSolve() {
    const r = solveExponentialEquation(expInput);
    setExpResult(r);
    if (r.type === "result") track("logarithmicEquations", expInput);
  }
  function handleExpExample(example: string) {
    setExpInput(example);
    setExpResult(solveExponentialEquation(example));
  }

  function handleGdSolve() {
    const r = computeGrowthDecay({ initial: gdInitial, ratePercent: gdRate, time: gdTime, direction: gdDirection });
    setGdResult(r);
    if (r.type === "result") track("logarithmicEquations", `N0=${gdInitial}, r=${gdRate}%, t=${gdTime}, ${gdDirection}`);
  }
  function handleGdPreset(preset: (typeof GROWTH_DECAY_PRESETS)[number]) {
    setGdInitial(preset.initial);
    setGdRate(preset.ratePercent);
    setGdTime(preset.time);
    setGdDirection(preset.direction);
    setGdResult(computeGrowthDecay(preset));
  }
  function handleGdDirectionChange(direction: GrowthDecayDirection) {
    setGdDirection(direction);
    setGdResult(null);
  }

  const dailyChallengeActive = useDailyChallengeAutoFill("logarithmicEquations", (challenge) => {
    if (challenge.params) {
      const direction: GrowthDecayDirection = challenge.params.direction === "decay" ? "decay" : "growth";
      const fields = {
        initial: challenge.params.initial ?? "",
        ratePercent: challenge.params.ratePercent ?? "",
        time: challenge.params.time ?? "",
        direction,
      };
      setCategory("growthDecay");
      setGdInitial(fields.initial);
      setGdRate(fields.ratePercent);
      setGdTime(fields.time);
      setGdDirection(direction);
      setGdResult(computeGrowthDecay(fields));
      return;
    }
    const equation = challenge.equation1 ?? "";
    if (/log|ln/i.test(equation)) {
      setCategory("logEquations");
      handleLogExample(equation);
    } else {
      setCategory("expEquations");
      handleExpExample(equation);
    }
  });

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <div className="flex flex-row-reverse gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-bold transition sm:text-sm ${
              category === c.id
                ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
                : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
            }`}
          >
            <c.icon className="size-4" strokeWidth={2} />
            {c.label}
          </button>
        ))}
      </div>

      {/* ---------------- Logarithmic equations ---------------- */}
      {category === "logEquations" && (
        <>
          <label htmlFor="log-input" className="mt-4 block text-right text-sm font-bold text-slate-600">
            הזינו משוואה לוגריתמית (log_2(x+3)+log_2(x-3)=4) או ביטוי בודד ללא סימן = (log(x-3))
          </label>
          <DailyChallengeBanner active={dailyChallengeActive} />
          <input
            id="log-input"
            type="text"
            dir="ltr"
            value={logInput}
            onChange={(e) => setLogInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogSolve();
            }}
            placeholder="log_2(x+3) + log_2(x-3) = 4"
            aria-label="משוואה לוגריתמית לפתרון"
            className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
          />

          <button
            type="button"
            onClick={handleLogSolve}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
          >
            <Logs className="size-5" strokeWidth={2} />
            פתור
          </button>

          <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
            {LOG_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                dir="ltr"
                onClick={() => handleLogExample(example)}
                className="rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-white/70"
              >
                {example}
              </button>
            ))}
          </div>

          {logResult && (
            <div
              className={`mt-5 rounded-xl px-4 py-4 text-center ${
                logResult.type === "error"
                  ? "border border-red-300/70 bg-red-50/70 text-red-700"
                  : "bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
              }`}
            >
              {logResult.type === "result" && logResult.mode === "equation" && (
                <>
                  <p dir="ltr" className="text-2xl font-extrabold">
                    {logResult.headline}
                  </p>
                  {logResult.note && <p className="mt-2 text-xs font-bold text-white/90">{logResult.note}</p>}
                </>
              )}
              {logResult.type === "result" && logResult.mode === "expression" && (
                <>
                  <p className="text-sm font-extrabold text-white/90">ניתוח ביטוי</p>
                  <p dir="ltr" className="mt-2 text-base font-bold">
                    תחום הגדרה: {logResult.domain}
                  </p>
                  <p dir="ltr" className="mt-1 text-xl font-extrabold">
                    {logResult.original} = {logResult.simplified}
                  </p>
                  {logResult.note && <p className="mt-2 text-xs font-bold text-white/90">{logResult.note}</p>}
                </>
              )}
              {logResult.type === "error" && <p className="text-sm font-bold">{logResult.message}</p>}
            </div>
          )}

          {logResult?.type === "result" && (
            <StepsPanel
              title={logResult.mode === "equation" ? "דרך הפתרון:" : "דרך הניתוח:"}
              steps={logResult.steps.map((s) => ({ title: s.label, expr: s.expr }))}
            />
          )}

          <LawsBox title="חוקי הלוגריתמים" laws={LOG_LAWS} />
        </>
      )}

      {/* ---------------- Exponential equations ---------------- */}
      {category === "expEquations" && (
        <>
          <label htmlFor="exp-input" className="mt-4 block text-right text-sm font-bold text-slate-600">
            הזינו משוואה מהצורה a^f(x) = b^g(x) (המעריך יכול להיות ליניארי, למשל 2^(x-1) = 32)
          </label>
          <DailyChallengeBanner active={dailyChallengeActive} />
          <input
            id="exp-input"
            type="text"
            dir="ltr"
            value={expInput}
            onChange={(e) => setExpInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleExpSolve();
            }}
            placeholder="2^(x-1) = 3^(2x+1)"
            aria-label="משוואה מעריכית לפתרון"
            className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
          />

          <button
            type="button"
            onClick={handleExpSolve}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
          >
            <Superscript className="size-5" strokeWidth={2} />
            פתור
          </button>

          <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
            {EXP_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                dir="ltr"
                onClick={() => handleExpExample(example)}
                className="rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-white/70"
              >
                {example}
              </button>
            ))}
          </div>

          {expResult?.type === "error" && (
            <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
              <p className="text-sm font-bold">{expResult.message}</p>
            </div>
          )}

          {expResult?.type === "result" && (
            <>
              <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
                <p dir="ltr" className="text-2xl font-extrabold">
                  {expResult.headline}
                </p>
              </div>
              <StepsPanel title="דרך הפתרון:" steps={expResult.steps.map((s) => ({ title: s.law, expr: s.expr }))} />
            </>
          )}

          <LawsBox title="חוקי החזקות והלוגריתמים" laws={EXP_LAWS} />
        </>
      )}

      {/* ---------------- Growth / decay ---------------- */}
      {category === "growthDecay" && (
        <>
          <DailyChallengeBanner active={dailyChallengeActive} />
          <div className="mt-4 flex flex-row-reverse gap-2">
            <button
              type="button"
              onClick={() => handleGdDirectionChange("growth")}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                gdDirection === "growth" ? "border-orange-500 bg-orange-500 text-white" : "border-white/60 bg-white/30 text-slate-600 hover:bg-white/60"
              }`}
            >
              גדילה (+)
            </button>
            <button
              type="button"
              onClick={() => handleGdDirectionChange("decay")}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                gdDirection === "decay" ? "border-orange-500 bg-orange-500 text-white" : "border-white/60 bg-white/30 text-slate-600 hover:bg-white/60"
              }`}
            >
              דעיכה (−)
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-center">
            <p dir="ltr" className="text-lg font-extrabold text-slate-800">
              N(t) = N₀ · (1 {gdDirection === "growth" ? "+" : "−"} r/100)^t
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="gd-initial" className="block text-right text-xs font-bold text-slate-600">
                <bdi dir="ltr">N₀</bdi> — כמות התחלתית
              </label>
              <input
                id="gd-initial"
                type="text"
                dir="ltr"
                value={gdInitial}
                onChange={(e) => setGdInitial(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleGdSolve();
                }}
                className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="gd-rate" className="block text-right text-xs font-bold text-slate-600">
                <bdi dir="ltr">r%</bdi> — אחוז שינוי
              </label>
              <input
                id="gd-rate"
                type="text"
                dir="ltr"
                value={gdRate}
                onChange={(e) => setGdRate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleGdSolve();
                }}
                className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="gd-time" className="block text-right text-xs font-bold text-slate-600">
                <bdi dir="ltr">t</bdi> — זמן
              </label>
              <input
                id="gd-time"
                type="text"
                dir="ltr"
                value={gdTime}
                onChange={(e) => setGdTime(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleGdSolve();
                }}
                className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGdSolve}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
          >
            <TrendingUp className="size-5" strokeWidth={2} />
            חשב
          </button>

          <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
            {GROWTH_DECAY_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleGdPreset(preset)}
                className="rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-white/70"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {gdResult?.type === "error" && (
            <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
              <p className="text-sm font-bold">{gdResult.message}</p>
            </div>
          )}

          {gdResult?.type === "result" && (
            <>
              <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
                <p dir="ltr" className="text-2xl font-extrabold">
                  N(t) = {formatNumber(gdResult.finalAmount)}
                </p>
              </div>
              <StepsPanel title="דרך החישוב:" steps={gdResult.steps.map((s) => ({ title: s.law, expr: s.expr }))} />
            </>
          )}

          <LawsBox title="נוסחאות גדילה ודעיכה" laws={GROWTH_DECAY_LAWS} />
        </>
      )}
    </div>
  );
}
