"use client";

import { useState } from "react";
import { Equal } from "lucide-react";
import { simplifyTrigExpression, collectArgumentMultipliers, type TrigIdentityResult } from "@/lib/trigIdentities";

const EXAMPLES = [
  "(1-cos(2x))/sin(2x)",
  "sin(x)^2+cos(x)^2",
  "sin(3x)*cos(2x)+cos(3x)*sin(2x)",
  "cos(x)*cos(2x)-sin(x)*sin(2x)",
  "sin(2x)/(2*cos(x))",
  "(1-cos(x))/sin(x)^2",
  "1-sin(x)^2",
];

type Mode = "simplify" | "prove";

/** Renders text with **marked** segments (the atom an identity step touched) bolded and colored. */
function renderHighlighted(text: string) {
  return text.split("**").map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="font-extrabold text-[#2F6FED]">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** Renders text with `backtick` segments isolated as LTR/monospace — keeps embedded math snippets from bidi-reordering inside an RTL sentence. */
function renderLtrSnippets(text: string) {
  return text.split("`").map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} dir="ltr" className="font-mono">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function SideResultPanel({ label, result }: { label?: string; result: TrigIdentityResult }) {
  if (result.type === "error") {
    return (
      <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-right text-red-700">
        {label && <p className="mb-1 text-xs font-extrabold text-red-500">{label}</p>}
        <p className="text-sm font-bold">{result.message}</p>
        {result.hint && <p className="mt-2 text-xs font-medium text-red-600/80">{renderLtrSnippets(result.hint)}</p>}
      </div>
    );
  }

  return (
    <div className="mt-5">
      {label && <p className="mb-1 text-right text-xs font-extrabold text-slate-500">{label}</p>}
      <div className="rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
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
                  <span className="text-right text-xs font-medium text-slate-500">{renderHighlighted(step.explanation)}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="mt-3 text-right text-xs font-medium text-slate-500">הביטוי כבר במצב הפשוט ביותר שנמצא.</p>
      )}
    </div>
  );
}

export default function TrigIdentitiesSolver() {
  const [mode, setMode] = useState<Mode>("simplify");

  const [input, setInput] = useState("");
  const [result, setResult] = useState<TrigIdentityResult | null>(null);

  const [leftInput, setLeftInput] = useState("");
  const [rightInput, setRightInput] = useState("");
  const [leftResult, setLeftResult] = useState<TrigIdentityResult | null>(null);
  const [rightResult, setRightResult] = useState<TrigIdentityResult | null>(null);

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

  function handleProve() {
    // Prove-mode-only bias: push both sides toward the *same* shared argument vocabulary
    // (the smaller multiple, e.g. x over 2x — our identities halve angles far more readily
    // than they combine them) so they land on the same final form instead of each drifting
    // toward the other's original notation. Plain "simplify" mode never computes this.
    const allArgs = new Set([...collectArgumentMultipliers(leftInput), ...collectArgumentMultipliers(rightInput)]);
    const sharedTarget = allArgs.size > 0 ? new Set([Math.min(...allArgs)]) : undefined;
    setLeftResult(simplifyTrigExpression(leftInput, sharedTarget));
    setRightResult(simplifyTrigExpression(rightInput, sharedTarget));
  }

  const proved =
    leftResult?.type === "result" && rightResult?.type === "result" && leftResult.simplified.trim() === rightResult.simplified.trim();

  const tabButtonClass = (active: boolean) =>
    `flex-1 rounded-xl py-2 text-sm font-bold transition ${
      active
        ? "bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
        : "bg-white/40 text-slate-600 hover:bg-white/70"
    }`;

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <div className="flex flex-row-reverse gap-2">
        <button type="button" onClick={() => setMode("simplify")} className={tabButtonClass(mode === "simplify")}>
          פישוט ביטוי
        </button>
        <button type="button" onClick={() => setMode("prove")} className={tabButtonClass(mode === "prove")}>
          הוכחת זהות
        </button>
      </div>

      {mode === "simplify" ? (
        <>
          <label htmlFor="trigid-input" className="mt-4 block text-right text-sm font-bold text-slate-600">
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
          <p className="mt-1.5 text-right text-xs font-medium text-slate-500">
            שימו לב: מכנה עם יותר מאיבר אחד חייב סוגריים — למשל (1-cos(x))/sin(x) ולא 1-cos(x)/sin(x).
          </p>

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

          {result && <SideResultPanel result={result} />}
        </>
      ) : (
        <>
          <label htmlFor="trigid-left" className="mt-4 block text-right text-sm font-bold text-slate-600">
            אגף שמאל
          </label>
          <input
            id="trigid-left"
            type="text"
            dir="ltr"
            value={leftInput}
            onChange={(e) => setLeftInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleProve();
            }}
            placeholder="sin(x)^2+cos(x)^2"
            aria-label="אגף שמאל"
            className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
          />

          <label htmlFor="trigid-right" className="mt-3 block text-right text-sm font-bold text-slate-600">
            אגף ימין
          </label>
          <input
            id="trigid-right"
            type="text"
            dir="ltr"
            value={rightInput}
            onChange={(e) => setRightInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleProve();
            }}
            placeholder="1"
            aria-label="אגף ימין"
            className="mt-2 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
          />
          <p className="mt-1.5 text-right text-xs font-medium text-slate-500">
            שימו לב: מכנה עם יותר מאיבר אחד חייב סוגריים — למשל (1-cos(x))/sin(x) ולא 1-cos(x)/sin(x).
          </p>

          <button
            type="button"
            onClick={handleProve}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
          >
            <Equal className="size-5" strokeWidth={2} />
            הוכח זהות
          </button>

          {leftResult && rightResult && (
            <div
              className={`mt-5 rounded-xl border px-4 py-4 text-center ${
                proved ? "border-green-300/70 bg-green-50/70 text-green-700" : "border-amber-300/70 bg-amber-50/70 text-amber-700"
              }`}
            >
              <p className="text-base font-extrabold">
                {proved ? "הזהות הוכחה בהצלחה!" : "התוצאות הסופיות שונות — הזהות לא הוכחה (או שהמנוע נעצר בצורות שקולות שונות)"}
              </p>
              {proved && leftResult && leftResult.type === "result" && (
                <p dir="ltr" className="mt-1 text-sm font-medium text-green-600">
                  הזהות הוכחה על ידי פישוט שני האגפים לצורה זהה: {leftResult.simplified}
                </p>
              )}
            </div>
          )}

          <div dir="ltr" className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {leftResult && <SideResultPanel label="אגף שמאל" result={leftResult} />}
            {rightResult && <SideResultPanel label="אגף ימין" result={rightResult} />}
          </div>
        </>
      )}
    </div>
  );
}
