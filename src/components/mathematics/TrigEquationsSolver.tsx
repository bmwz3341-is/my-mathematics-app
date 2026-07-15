"use client";

import { useState } from "react";
import { SquareFunction } from "lucide-react";
import {
  solveTrigEquation,
  type AngleUnit,
  type EquationForm,
  type TrigEquationInput,
  type TrigEquationResult,
  type TrigFunc,
} from "@/lib/trigEquations";

const TWO_PI = 2 * Math.PI;

interface FormState {
  form: EquationForm;
  func: TrigFunc;
  unit: AngleUnit;
  m: string;
  c: string;
  v: string;
  a: string;
  b: string;
  d: string;
  rangeFrom: string;
  rangeTo: string;
}

const DEFAULT_STATE: FormState = {
  form: "basic",
  func: "sin",
  unit: "rad",
  m: "1",
  c: "0",
  v: "0.5",
  a: "2",
  b: "-1",
  d: "-1",
  rangeFrom: "0",
  rangeTo: String(TWO_PI),
};

interface Example {
  label: string;
  values: Partial<FormState>;
}

const EXAMPLES: Example[] = [
  { label: "sin(x)=0.5", values: { form: "basic", func: "sin", unit: "rad", m: "1", c: "0", v: "0.5", rangeFrom: "0", rangeTo: String(TWO_PI) } },
  { label: "cos(x)=0 (°)", values: { form: "basic", func: "cos", unit: "deg", m: "1", c: "0", v: "0", rangeFrom: "0", rangeTo: "360" } },
  { label: "2sin²x-sinx-1=0", values: { form: "quadratic", func: "sin", unit: "rad", m: "1", c: "0", a: "2", b: "-1", d: "-1", rangeFrom: "0", rangeTo: String(TWO_PI) } },
  { label: "sinx=cosx", values: { form: "linearCombo", unit: "rad", m: "1", c: "0", a: "1", b: "-1", v: "0", rangeFrom: "0", rangeTo: String(TWO_PI) } },
  { label: "sinx+cosx=1", values: { form: "linearCombo", unit: "rad", m: "1", c: "0", a: "1", b: "1", v: "1", rangeFrom: "0", rangeTo: String(TWO_PI) } },
];

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4 || 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function formula(form: EquationForm, func: TrigFunc): string {
  if (form === "basic") return `${func}(mx + c) = v`;
  if (form === "quadratic") return `a·${func}(mx + c)² + b·${func}(mx + c) + d = 0`;
  return `a·sin(mx + c) + b·cos(mx + c) = v`;
}

export default function TrigEquationsSolver() {
  const [state, setState] = useState<FormState>(DEFAULT_STATE);
  const [result, setResult] = useState<TrigEquationResult | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function buildInput(s: FormState): TrigEquationInput | { error: string } {
    const num = (raw: string, label: string): number | { error: string } => {
      const v = parseFloat(raw.trim());
      if (!Number.isFinite(v)) return { error: `הערך של ${label} אינו מספר תקין` };
      return v;
    };

    const m = num(s.m, "m");
    if (typeof m !== "number") return m;
    const c = num(s.c, "c");
    if (typeof c !== "number") return c;
    const rangeFrom = num(s.rangeFrom, "תחילת הטווח");
    if (typeof rangeFrom !== "number") return rangeFrom;
    const rangeTo = num(s.rangeTo, "סוף הטווח");
    if (typeof rangeTo !== "number") return rangeTo;

    const input: TrigEquationInput = { form: s.form, func: s.func, m, c, unit: s.unit, rangeFrom, rangeTo };

    if (s.form === "basic") {
      const v = num(s.v, "v");
      if (typeof v !== "number") return v;
      input.v = v;
    } else if (s.form === "quadratic") {
      const a = num(s.a, "a");
      if (typeof a !== "number") return a;
      const b = num(s.b, "b");
      if (typeof b !== "number") return b;
      const d = num(s.d, "d");
      if (typeof d !== "number") return d;
      input.a = a;
      input.b = b;
      input.d = d;
    } else {
      const a = num(s.a, "a");
      if (typeof a !== "number") return a;
      const b = num(s.b, "b");
      if (typeof b !== "number") return b;
      const v = num(s.v, "v");
      if (typeof v !== "number") return v;
      input.a = a;
      input.b = b;
      input.v = v;
    }
    return input;
  }

  function solveWith(s: FormState) {
    const input = buildInput(s);
    if ("error" in input) {
      setResult({ type: "error", message: input.error });
      return;
    }
    setResult(solveTrigEquation(input));
  }

  function handleSolve() {
    solveWith(state);
  }

  function handleExample(example: Example) {
    const next = { ...state, ...example.values };
    setState(next);
    solveWith(next);
  }

  const su = state.unit === "deg" ? "°" : "";

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <p className="text-right text-xs font-bold text-slate-600">צורת המשוואה</p>
      <div className="mt-1 flex flex-row-reverse gap-2">
        {(
          [
            ["basic", "בסיסית"],
            ["quadratic", "ריבועית"],
            ["linearCombo", "צירוף לינארי"],
          ] as [EquationForm, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => set("form", value)}
            className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition ${
              state.form === value
                ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
                : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {state.form !== "linearCombo" && (
        <>
          <p className="mt-3 text-right text-xs font-bold text-slate-600">פונקציה</p>
          <div className="mt-1 flex flex-row-reverse gap-2">
            {(["sin", "cos", "tan"] as TrigFunc[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => set("func", f)}
                className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition ${
                  state.func === f
                    ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
                    : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-3 rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-center">
        <p dir="ltr" className="text-lg font-extrabold text-slate-800">
          {formula(state.form, state.func)}
        </p>
      </div>

      <p className="mt-3 text-right text-xs font-bold text-slate-600">יחידות זווית</p>
      <div className="mt-1 flex flex-row-reverse gap-2">
        <button
          type="button"
          onClick={() => set("unit", "rad")}
          className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition ${
            state.unit === "rad"
              ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
              : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
          }`}
        >
          רדיאנים
        </button>
        <button
          type="button"
          onClick={() => set("unit", "deg")}
          className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition ${
            state.unit === "deg"
              ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
              : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
          }`}
        >
          מעלות
        </button>
      </div>

      <p className="mt-3 text-right text-xs font-bold text-slate-600">ארגומנט: θ = m·x + c</p>
      <div className="mt-1 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="trigeq-m" className="block text-right text-xs font-bold text-slate-600">m</label>
          <input
            id="trigeq-m"
            type="text"
            dir="ltr"
            value={state.m}
            onChange={(e) => set("m", e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="trigeq-c" className="block text-right text-xs font-bold text-slate-600">c ({su})</label>
          <input
            id="trigeq-c"
            type="text"
            dir="ltr"
            value={state.c}
            onChange={(e) => set("c", e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
          />
        </div>
      </div>

      <p className="mt-3 text-right text-xs font-bold text-slate-600">מקדמים</p>
      <div className="mt-1 grid grid-cols-3 gap-3">
        {state.form === "basic" && (
          <div className="col-span-3">
            <label htmlFor="trigeq-v" className="block text-right text-xs font-bold text-slate-600">v</label>
            <input
              id="trigeq-v"
              type="text"
              dir="ltr"
              value={state.v}
              onChange={(e) => set("v", e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
            />
          </div>
        )}
        {state.form === "quadratic" && (
          <>
            <div>
              <label htmlFor="trigeq-a" className="block text-right text-xs font-bold text-slate-600">a</label>
              <input id="trigeq-a" type="text" dir="ltr" value={state.a} onChange={(e) => set("a", e.target.value)} className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none" />
            </div>
            <div>
              <label htmlFor="trigeq-b" className="block text-right text-xs font-bold text-slate-600">b</label>
              <input id="trigeq-b" type="text" dir="ltr" value={state.b} onChange={(e) => set("b", e.target.value)} className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none" />
            </div>
            <div>
              <label htmlFor="trigeq-d" className="block text-right text-xs font-bold text-slate-600">d</label>
              <input id="trigeq-d" type="text" dir="ltr" value={state.d} onChange={(e) => set("d", e.target.value)} className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none" />
            </div>
          </>
        )}
        {state.form === "linearCombo" && (
          <>
            <div>
              <label htmlFor="trigeq-a2" className="block text-right text-xs font-bold text-slate-600">a</label>
              <input id="trigeq-a2" type="text" dir="ltr" value={state.a} onChange={(e) => set("a", e.target.value)} className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none" />
            </div>
            <div>
              <label htmlFor="trigeq-b2" className="block text-right text-xs font-bold text-slate-600">b</label>
              <input id="trigeq-b2" type="text" dir="ltr" value={state.b} onChange={(e) => set("b", e.target.value)} className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none" />
            </div>
            <div>
              <label htmlFor="trigeq-v2" className="block text-right text-xs font-bold text-slate-600">v</label>
              <input id="trigeq-v2" type="text" dir="ltr" value={state.v} onChange={(e) => set("v", e.target.value)} className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none" />
            </div>
          </>
        )}
      </div>

      <p className="mt-3 text-right text-xs font-bold text-slate-600">טווח ({su})</p>
      <div className="mt-1 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="trigeq-from" className="block text-right text-xs font-bold text-slate-600">מ-</label>
          <input
            id="trigeq-from"
            type="text"
            dir="ltr"
            value={state.rangeFrom}
            onChange={(e) => set("rangeFrom", e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="trigeq-to" className="block text-right text-xs font-bold text-slate-600">עד</label>
          <input
            id="trigeq-to"
            type="text"
            dir="ltr"
            value={state.rangeTo}
            onChange={(e) => set("rangeTo", e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSolve}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
      >
        <SquareFunction className="size-5" strokeWidth={2} />
        פתור
      </button>

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
            {result.solutions.length > 0 ? (
              <p dir="ltr" className="text-base font-extrabold leading-relaxed">
                {result.solutions.map((s) => `x=${formatNumber(s.x)}${result.unit === "deg" ? "°" : ""}`).join("   ")}
              </p>
            ) : (
              <p className="text-sm font-bold">אין פתרון בטווח הנתון</p>
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
        </>
      )}
    </div>
  );
}
