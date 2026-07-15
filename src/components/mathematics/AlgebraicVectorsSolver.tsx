"use client";

import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { solveVectors, type Vec3, type VectorOp, type VectorResult } from "@/lib/algebraicVectors";

const OPS: { id: VectorOp; label: string; formula: string; needsV: boolean; needsScalar: boolean }[] = [
  { id: "add", label: "חיבור", formula: "u + v", needsV: true, needsScalar: false },
  { id: "sub", label: "חיסור", formula: "u - v", needsV: true, needsScalar: false },
  { id: "scalarMul", label: "כפל בסקלר", formula: "k·u", needsV: false, needsScalar: true },
  { id: "dot", label: "מכפלה סקלרית", formula: "u·v", needsV: true, needsScalar: false },
  { id: "magnitude", label: "אורך וקטור", formula: "|u|", needsV: false, needsScalar: false },
  { id: "angle", label: "זווית בין וקטורים", formula: "cosθ = u·v/(|u|·|v|)", needsV: true, needsScalar: false },
];

const AXES = ["x", "y", "z"] as const;

interface Example {
  label: string;
  op: VectorOp;
  u: [string, string, string];
  v?: [string, string, string];
  k?: string;
}

const EXAMPLES: Example[] = [
  { label: "u+v: [3,1,-2]+[-1,4,2]", op: "add", u: ["3", "1", "-2"], v: ["-1", "4", "2"] },
  { label: "k·u: -2·[3,1,-2]", op: "scalarMul", u: ["3", "1", "-2"], k: "-2" },
  { label: "u·v: [1,2,3]·[4,-5,6]", op: "dot", u: ["1", "2", "3"], v: ["4", "-5", "6"] },
  { label: "|u|: [3,4,0]", op: "magnitude", u: ["3", "4", "0"] },
  { label: "זווית: [1,1,0],[1,0,0]", op: "angle", u: ["1", "1", "0"], v: ["1", "0", "0"] },
];

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4 || 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

type Triple = [string, string, string];

export default function AlgebraicVectorsSolver() {
  const [op, setOp] = useState<VectorOp>("add");
  const [uForm, setUForm] = useState<Triple>(["", "", ""]);
  const [vForm, setVForm] = useState<Triple>(["", "", ""]);
  const [kForm, setKForm] = useState("");
  const [result, setResult] = useState<VectorResult | null>(null);

  const opDef = OPS.find((o) => o.id === op)!;

  function parseVec(form: Triple, name: string): Vec3 | { error: string } {
    const out: number[] = [];
    for (let i = 0; i < 3; i++) {
      const num = parseFloat(form[i].trim());
      if (!Number.isFinite(num)) return { error: `הרכיב ${AXES[i]} של הווקטור ${name} אינו מספר תקין` };
      out.push(num);
    }
    return out as Vec3;
  }

  function solveWith(nextOp: VectorOp, u: Triple, v: Triple, k: string) {
    const def = OPS.find((o) => o.id === nextOp)!;
    const uVec = parseVec(u, "u");
    if ("error" in uVec) {
      setResult({ type: "error", message: uVec.error });
      return;
    }
    let vVec: Vec3 | undefined;
    if (def.needsV) {
      const parsed = parseVec(v, "v");
      if ("error" in parsed) {
        setResult({ type: "error", message: parsed.error });
        return;
      }
      vVec = parsed;
    }
    let scalar: number | undefined;
    if (def.needsScalar) {
      scalar = parseFloat(k.trim());
      if (!Number.isFinite(scalar)) {
        setResult({ type: "error", message: "הסקלר k אינו מספר תקין" });
        return;
      }
    }
    setResult(solveVectors(nextOp, uVec, vVec, scalar));
  }

  function handleSolve() {
    solveWith(op, uForm, vForm, kForm);
  }

  function handleExample(example: Example) {
    setOp(example.op);
    setUForm(example.u);
    if (example.v) setVForm(example.v);
    if (example.k !== undefined) setKForm(example.k);
    solveWith(example.op, example.u, example.v ?? vForm, example.k ?? kForm);
  }

  function vecInputs(name: "u" | "v", form: Triple, setForm: (t: Triple) => void) {
    return (
      <div>
        <p className="text-right text-xs font-bold text-slate-600">
          וקטור <bdi dir="ltr">{name} = [x, y, z]</bdi>
        </p>
        <div className="mt-1 grid grid-cols-3 gap-3">
          {AXES.map((axis, i) => (
            <div key={axis}>
              <label htmlFor={`vec-${name}-${axis}`} className="block text-right text-xs font-bold text-slate-600">
                <bdi dir="ltr">{name}_{axis}</bdi>
              </label>
              <input
                id={`vec-${name}-${axis}`}
                type="text"
                dir="ltr"
                value={form[i]}
                onChange={(e) => {
                  const next: Triple = [...form] as Triple;
                  next[i] = e.target.value;
                  setForm(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSolve();
                }}
                aria-label={`רכיב ${axis} של ${name}`}
                className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <p className="text-right text-xs font-bold text-slate-600">פעולה</p>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {OPS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setOp(o.id)}
            className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${
              op === o.id
                ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
                : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-center">
        <p dir="ltr" className="text-lg font-extrabold text-slate-800">
          {opDef.formula}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {vecInputs("u", uForm, setUForm)}
        {opDef.needsV && vecInputs("v", vForm, setVForm)}
        {opDef.needsScalar && (
          <div>
            <label htmlFor="vec-k" className="block text-right text-xs font-bold text-slate-600">
              סקלר k
            </label>
            <input
              id="vec-k"
              type="text"
              dir="ltr"
              value={kForm}
              onChange={(e) => setKForm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSolve();
              }}
              aria-label="סקלר k"
              className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSolve}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
      >
        <ArrowRightLeft className="size-5" strokeWidth={2} />
        חשב
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
            <p dir="ltr" className="text-2xl font-extrabold">
              {result.vector
                ? `[${result.vector.map(formatNumber).join(", ")}]`
                : result.angleDeg !== undefined
                  ? `θ = ${formatNumber(result.angleDeg)}°`
                  : formatNumber(result.scalar ?? 0)}
            </p>
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
