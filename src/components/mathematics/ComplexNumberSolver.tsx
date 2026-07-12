"use client";

import { useState } from "react";
import { Orbit } from "lucide-react";
import {
  solveArithmetic,
  convertToTrig,
  convertToAlgebraic,
  solvePower,
  solveRoots,
  solveComplexEquation,
  type ArithmeticOp,
  type ComplexResult,
} from "@/lib/complexSolver";
import ArgandDiagram from "@/components/mathematics/ArgandDiagram";

type Mode = "arithmetic" | "conversion" | "deMoivre" | "equation";

const MODES: { id: Mode; label: string }[] = [
  { id: "arithmetic", label: "פעולות חשבון" },
  { id: "conversion", label: "המרות הצגה" },
  { id: "deMoivre", label: "חזקות ושורשים (דה-מואבר)" },
  { id: "equation", label: "משוואות עם z" },
];

const OPS: { id: ArithmeticOp; label: string }[] = [
  { id: "add", label: "+" },
  { id: "sub", label: "−" },
  { id: "mul", label: "×" },
  { id: "div", label: "÷" },
];

const ARITHMETIC_EXAMPLES: { z1: string; z2: string; op: ArithmeticOp; label: string }[] = [
  { z1: "3+2i", z2: "1-4i", op: "add", label: "(3+2i) + (1-4i)" },
  { z1: "5-i", z2: "2+3i", op: "sub", label: "(5-i) - (2+3i)" },
  { z1: "2+3i", z2: "4-i", op: "mul", label: "(2+3i)·(4-i)" },
  { z1: "3+4i", z2: "1-2i", op: "div", label: "(3+4i)÷(1-2i)" },
];

const TO_TRIG_EXAMPLES = ["1+i", "-3+3i", "4i", "-2-2i"];
const TO_ALG_EXAMPLES: { r: string; theta: string }[] = [
  { r: "2", theta: "60" },
  { r: "4", theta: "135" },
  { r: "5", theta: "270" },
];

const DEMOIVRE_EXAMPLES: { z: string; n: string; kind: "power" | "root"; label: string }[] = [
  { z: "1+i", n: "6", kind: "power", label: "(1+i)⁶" },
  { z: "2i", n: "4", kind: "power", label: "(2i)⁴" },
  { z: "8i", n: "3", kind: "root", label: "³√(8i)" },
  { z: "-16", n: "4", kind: "root", label: "⁴√(-16)" },
  { z: "1", n: "3", kind: "root", label: "³√1" },
];

const EQUATION_EXAMPLES = ["z^2 + 4z + 13 = 0", "z^2 + 9 = 0", "z^2 - 2z + 5 = 0", "2z^2 + 8 = 0", "z^2 - 5z + 6 = 0"];

export default function ComplexNumberSolver() {
  const [mode, setMode] = useState<Mode>("arithmetic");

  // arithmetic
  const [z1, setZ1] = useState("");
  const [z2, setZ2] = useState("");
  const [op, setOp] = useState<ArithmeticOp>("add");

  // conversion
  const [convDirection, setConvDirection] = useState<"toTrig" | "toAlgebraic">("toTrig");
  const [convZ, setConvZ] = useState("");
  const [convR, setConvR] = useState("");
  const [convTheta, setConvTheta] = useState("");

  // De Moivre
  const [dmKind, setDmKind] = useState<"power" | "root">("power");
  const [dmZ, setDmZ] = useState("");
  const [dmN, setDmN] = useState("");

  // equation
  const [equation, setEquation] = useState("");

  const [result, setResult] = useState<ComplexResult | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setResult(null);
  }

  function handleSolve() {
    switch (mode) {
      case "arithmetic":
        setResult(solveArithmetic(z1, z2, op));
        break;
      case "conversion":
        setResult(convDirection === "toTrig" ? convertToTrig(convZ) : convertToAlgebraic(convR, convTheta));
        break;
      case "deMoivre":
        setResult(dmKind === "power" ? solvePower(dmZ, dmN) : solveRoots(dmZ, dmN));
        break;
      case "equation":
        setResult(solveComplexEquation(equation));
        break;
    }
  }

  function onEnter(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSolve();
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-left text-lg font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none";
  const pillClass = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-bold transition ${
      active
        ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_12px_rgba(47,111,237,0.4)]"
        : "border-white/60 bg-white/30 text-slate-600 hover:bg-white/50"
    }`;
  const exampleClass =
    "rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-white/70";

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <div className="flex flex-row-reverse flex-wrap gap-2">
        {MODES.map((m) => (
          <button key={m.id} type="button" onClick={() => switchMode(m.id)} className={pillClass(mode === m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === "arithmetic" && (
        <div className="mt-5">
          <p className="text-right text-sm font-bold text-slate-600">
            הזינו שני מספרים מרוכבים בהצגה אלגברית (a+bi) ובחרו פעולה
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="complex-z1" className="block text-right text-xs font-bold text-slate-600">
                z₁
              </label>
              <input
                id="complex-z1"
                type="text"
                dir="ltr"
                value={z1}
                onChange={(e) => setZ1(e.target.value)}
                onKeyDown={onEnter}
                placeholder="3+2i"
                aria-label="המספר המרוכב הראשון"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="complex-z2" className="block text-right text-xs font-bold text-slate-600">
                z₂
              </label>
              <input
                id="complex-z2"
                type="text"
                dir="ltr"
                value={z2}
                onChange={(e) => setZ2(e.target.value)}
                onKeyDown={onEnter}
                placeholder="1-4i"
                aria-label="המספר המרוכב השני"
                className={inputClass}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-row-reverse gap-2">
            {OPS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOp(o.id)}
                aria-label={`פעולת ${o.label}`}
                className={`${pillClass(op === o.id)} min-w-12 text-lg`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
            {ARITHMETIC_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                dir="ltr"
                onClick={() => {
                  setZ1(ex.z1);
                  setZ2(ex.z2);
                  setOp(ex.op);
                  setResult(solveArithmetic(ex.z1, ex.z2, ex.op));
                }}
                className={exampleClass}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "conversion" && (
        <div className="mt-5">
          <div className="flex flex-row-reverse gap-2">
            <button type="button" onClick={() => setConvDirection("toTrig")} className={pillClass(convDirection === "toTrig")}>
              אלגברית ← טריגונומטרית
            </button>
            <button
              type="button"
              onClick={() => setConvDirection("toAlgebraic")}
              className={pillClass(convDirection === "toAlgebraic")}
            >
              טריגונומטרית ← אלגברית
            </button>
          </div>

          {convDirection === "toTrig" ? (
            <div className="mt-3">
              <label htmlFor="complex-conv-z" className="block text-right text-xs font-bold text-slate-600">
                z בהצגה אלגברית (a+bi)
              </label>
              <input
                id="complex-conv-z"
                type="text"
                dir="ltr"
                value={convZ}
                onChange={(e) => setConvZ(e.target.value)}
                onKeyDown={onEnter}
                placeholder="1+i"
                aria-label="מספר מרוכב להמרה להצגה טריגונומטרית"
                className={inputClass}
              />
              <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
                {TO_TRIG_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    dir="ltr"
                    onClick={() => {
                      setConvZ(ex);
                      setResult(convertToTrig(ex));
                    }}
                    className={exampleClass}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="complex-conv-r" className="block text-right text-xs font-bold text-slate-600">
                    r — הרדיוס (המודול)
                  </label>
                  <input
                    id="complex-conv-r"
                    type="text"
                    dir="ltr"
                    value={convR}
                    onChange={(e) => setConvR(e.target.value)}
                    onKeyDown={onEnter}
                    placeholder="2"
                    aria-label="הרדיוס של המספר המרוכב"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="complex-conv-theta" className="block text-right text-xs font-bold text-slate-600">
                    θ — הזווית במעלות
                  </label>
                  <input
                    id="complex-conv-theta"
                    type="text"
                    dir="ltr"
                    value={convTheta}
                    onChange={(e) => setConvTheta(e.target.value)}
                    onKeyDown={onEnter}
                    placeholder="60"
                    aria-label="הזווית של המספר המרוכב במעלות"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
                {TO_ALG_EXAMPLES.map((ex) => (
                  <button
                    key={`${ex.r}-${ex.theta}`}
                    type="button"
                    dir="ltr"
                    onClick={() => {
                      setConvR(ex.r);
                      setConvTheta(ex.theta);
                      setResult(convertToAlgebraic(ex.r, ex.theta));
                    }}
                    className={exampleClass}
                  >
                    {ex.r}·cis({ex.theta}°)
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "deMoivre" && (
        <div className="mt-5">
          <div className="flex flex-row-reverse gap-2">
            <button type="button" onClick={() => setDmKind("power")} className={pillClass(dmKind === "power")}>
              חזקה zⁿ
            </button>
            <button type="button" onClick={() => setDmKind("root")} className={pillClass(dmKind === "root")}>
              שורש ⁿ√z
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="complex-dm-z" className="block text-right text-xs font-bold text-slate-600">
                z בהצגה אלגברית (a+bi)
              </label>
              <input
                id="complex-dm-z"
                type="text"
                dir="ltr"
                value={dmZ}
                onChange={(e) => setDmZ(e.target.value)}
                onKeyDown={onEnter}
                placeholder="1+i"
                aria-label="המספר המרוכב"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="complex-dm-n" className="block text-right text-xs font-bold text-slate-600">
                {dmKind === "power" ? "n — המעריך (מספר שלם)" : "n — סדר השורש (2 עד 8)"}
              </label>
              <input
                id="complex-dm-n"
                type="text"
                dir="ltr"
                value={dmN}
                onChange={(e) => setDmN(e.target.value)}
                onKeyDown={onEnter}
                placeholder={dmKind === "power" ? "6" : "3"}
                aria-label={dmKind === "power" ? "המעריך" : "סדר השורש"}
                className={inputClass}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
            {DEMOIVRE_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                dir="ltr"
                onClick={() => {
                  setDmKind(ex.kind);
                  setDmZ(ex.z);
                  setDmN(ex.n);
                  setResult(ex.kind === "power" ? solvePower(ex.z, ex.n) : solveRoots(ex.z, ex.n));
                }}
                className={exampleClass}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "equation" && (
        <div className="mt-5">
          <label htmlFor="complex-equation" className="block text-right text-sm font-bold text-slate-600">
            הזינו משוואה עם הנעלם z — כולל משוואות ריבועיות עם דיסקרימיננטה שלילית
          </label>
          <input
            id="complex-equation"
            type="text"
            dir="ltr"
            value={equation}
            onChange={(e) => setEquation(e.target.value)}
            onKeyDown={onEnter}
            placeholder="z^2 + 4z + 13 = 0"
            aria-label="משוואה עם הנעלם z"
            className={inputClass}
          />
          <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
            {EQUATION_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                dir="ltr"
                onClick={() => {
                  setEquation(ex);
                  setResult(solveComplexEquation(ex));
                }}
                className={exampleClass}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleSolve}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
      >
        <Orbit className="size-5" strokeWidth={2} />
        פתור
      </button>

      {result?.type === "error" && (
        <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
          <p className="text-sm font-bold">{result.message}</p>
        </div>
      )}

      {result?.type === "result" && (
        <>
          <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
            <p dir="ltr" className="text-xl font-extrabold leading-relaxed sm:text-2xl">
              {result.resultText}
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
            <p className="text-right text-sm font-extrabold text-black">דרך הפתרון:</p>
            <ol className="mt-2 space-y-2">
              {result.steps.map((step, index) => (
                <li key={index} className="flex flex-row-reverse items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2F6FED] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="flex min-w-0 flex-col items-end gap-0.5">
                    <span className="text-right text-xs font-bold text-orange-500">{step.label}</span>
                    <span dir="ltr" className="max-w-full break-words font-mono text-sm font-bold text-slate-700 sm:text-base">
                      {step.expr}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <ArgandDiagram points={result.points} circleRadius={result.circleRadius} />
        </>
      )}
    </div>
  );
}
