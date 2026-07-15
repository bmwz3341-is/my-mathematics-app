"use client";

import { useState } from "react";
import { Box } from "lucide-react";
import {
  solvePointGeometry,
  solveSolid,
  type GeoStep,
  type Point3,
  type PointGeoResult,
  type PointOp,
  type SolidKind,
  type SolidResult,
} from "@/lib/spaceGeometry";
import SolidGeometryGraph from "@/components/mathematics/SolidGeometryGraph";

type Tab = "points" | "solids";
type Triple = [string, string, string];

const AXES = ["x", "y", "z"] as const;

const POINT_OPS: { id: PointOp; label: string; needsC: boolean; needsRatio: boolean }[] = [
  { id: "distance", label: "מרחק AB", needsC: false, needsRatio: false },
  { id: "midpoint", label: "אמצע קטע", needsC: false, needsRatio: false },
  { id: "vectorAB", label: "וקטור AB", needsC: false, needsRatio: false },
  { id: "collinear", label: "קולינאריות A,B,C", needsC: true, needsRatio: false },
  { id: "divideRatio", label: "חלוקת קטע ביחס", needsC: false, needsRatio: true },
];

const SOLIDS: { id: SolidKind; label: string; dims: { key: "a" | "b" | "c" | "h"; label: string }[] }[] = [
  {
    id: "box",
    label: "תיבה",
    dims: [
      { key: "a", label: "a (אורך)" },
      { key: "b", label: "b (רוחב)" },
      { key: "c", label: "c (גובה)" },
    ],
  },
  { id: "cube", label: "קובייה", dims: [{ key: "a", label: "a (מקצוע)" }] },
  {
    id: "squarePyramid",
    label: "פירמידה מרובעת ישרה",
    dims: [
      { key: "a", label: "a (צלע הבסיס)" },
      { key: "h", label: "h (גובה)" },
    ],
  },
];

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4 || 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function StepsList({ steps }: { steps: GeoStep[] }) {
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
              <span dir="ltr" className="text-right font-mono text-sm font-bold text-slate-700">
                {step.expr}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function SpaceGeometrySolver() {
  const [tab, setTab] = useState<Tab>("points");

  const [pointOp, setPointOp] = useState<PointOp>("distance");
  const [formA, setFormA] = useState<Triple>(["", "", ""]);
  const [formB, setFormB] = useState<Triple>(["", "", ""]);
  const [formC, setFormC] = useState<Triple>(["", "", ""]);
  const [ratioM, setRatioM] = useState("");
  const [ratioN, setRatioN] = useState("");
  const [pointResult, setPointResult] = useState<PointGeoResult | null>(null);

  const [solidKind, setSolidKind] = useState<SolidKind>("box");
  const [dims, setDims] = useState<Record<"a" | "b" | "c" | "h", string>>({ a: "", b: "", c: "", h: "" });
  const [solidResult, setSolidResult] = useState<SolidResult | null>(null);
  const [solvedDims, setSolvedDims] = useState<{ a: number; b?: number; c?: number; h?: number } | null>(null);

  const opDef = POINT_OPS.find((o) => o.id === pointOp)!;
  const solidDef = SOLIDS.find((s) => s.id === solidKind)!;

  function parsePoint(form: Triple, name: string): Point3 | { error: string } {
    const out: number[] = [];
    for (let i = 0; i < 3; i++) {
      const num = parseFloat(form[i].trim());
      if (!Number.isFinite(num)) return { error: `הרכיב ${AXES[i]} של הנקודה ${name} אינו מספר תקין` };
      out.push(num);
    }
    return out as Point3;
  }

  function handleSolvePoints() {
    const A = parsePoint(formA, "A");
    if ("error" in A) {
      setPointResult({ type: "error", message: A.error });
      return;
    }
    const B = parsePoint(formB, "B");
    if ("error" in B) {
      setPointResult({ type: "error", message: B.error });
      return;
    }
    let C: Point3 | undefined;
    if (opDef.needsC) {
      const parsed = parsePoint(formC, "C");
      if ("error" in parsed) {
        setPointResult({ type: "error", message: parsed.error });
        return;
      }
      C = parsed;
    }
    let m: number | undefined;
    let n: number | undefined;
    if (opDef.needsRatio) {
      m = parseFloat(ratioM.trim());
      n = parseFloat(ratioN.trim());
      if (!Number.isFinite(m) || !Number.isFinite(n)) {
        setPointResult({ type: "error", message: "היחס m:n חייב להיות שני מספרים תקינים" });
        return;
      }
    }
    setPointResult(solvePointGeometry(pointOp, A, B, C, m, n));
  }

  function handleSolveSolid() {
    const parsed: { a?: number; b?: number; c?: number; h?: number } = {};
    for (const dim of solidDef.dims) {
      const num = parseFloat(dims[dim.key].trim());
      if (!Number.isFinite(num)) {
        setSolidResult({ type: "error", message: `המידה ${dim.label} אינה מספר תקין` });
        return;
      }
      parsed[dim.key] = num;
    }
    setSolidResult(solveSolid(solidKind, parsed));
    setSolvedDims(parsed.a !== undefined ? { a: parsed.a, b: parsed.b, c: parsed.c, h: parsed.h } : null);
  }

  function pointInputs(name: string, form: Triple, setForm: (t: Triple) => void) {
    return (
      <div>
        <p className="text-right text-xs font-bold text-slate-600">
          נקודה <bdi dir="ltr">{name} = (x, y, z)</bdi>
        </p>
        <div className="mt-1 grid grid-cols-3 gap-3">
          {AXES.map((axis, i) => (
            <input
              key={axis}
              type="text"
              dir="ltr"
              value={form[i]}
              onChange={(e) => {
                const next: Triple = [...form] as Triple;
                next[i] = e.target.value;
                setForm(next);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSolvePoints();
              }}
              placeholder={axis}
              aria-label={`רכיב ${axis} של ${name}`}
              className="w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <div className="flex flex-row-reverse gap-2">
        <button
          type="button"
          onClick={() => setTab("points")}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
            tab === "points"
              ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
              : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
          }`}
        >
          נקודות במרחב
        </button>
        <button
          type="button"
          onClick={() => setTab("solids")}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
            tab === "solids"
              ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
              : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
          }`}
        >
          גופים במרחב
        </button>
      </div>

      {tab === "points" && (
        <>
          <p className="mt-4 text-right text-xs font-bold text-slate-600">פעולה</p>
          <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {POINT_OPS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setPointOp(o.id)}
                className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${
                  pointOp === o.id
                    ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
                    : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {pointInputs("A", formA, setFormA)}
            {pointInputs("B", formB, setFormB)}
            {opDef.needsC && pointInputs("C", formC, setFormC)}
            {opDef.needsRatio && (
              <div>
                <p className="text-right text-xs font-bold text-slate-600">היחס m:n (נמדד מ-A)</p>
                <div className="mt-1 grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    dir="ltr"
                    value={ratioM}
                    onChange={(e) => setRatioM(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSolvePoints();
                    }}
                    placeholder="m"
                    aria-label="m"
                    className="w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    value={ratioN}
                    onChange={(e) => setRatioN(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSolvePoints();
                    }}
                    placeholder="n"
                    aria-label="n"
                    className="w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSolvePoints}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
          >
            <Box className="size-5" strokeWidth={2} />
            חשב
          </button>

          {pointResult?.type === "error" && (
            <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
              <p className="text-sm font-bold">{pointResult.message}</p>
            </div>
          )}

          {pointResult?.type === "result" && (
            <>
              <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
                <p dir="ltr" className="text-2xl font-extrabold">
                  {pointResult.op === "collinear"
                    ? pointResult.collinear
                      ? "A, B, C על ישר אחד ✓"
                      : "A, B, C אינן על ישר אחד ✗"
                    : pointResult.point
                      ? `(${pointResult.point.map(formatNumber).join(", ")})`
                      : pointResult.vector
                        ? `[${pointResult.vector.map(formatNumber).join(", ")}]`
                        : formatNumber(pointResult.scalar ?? 0)}
                </p>
              </div>
              <StepsList steps={pointResult.steps} />
            </>
          )}
        </>
      )}

      {tab === "solids" && (
        <>
          <p className="mt-4 text-right text-xs font-bold text-slate-600">גוף</p>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {SOLIDS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSolidKind(s.id)}
                className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${
                  solidKind === s.id
                    ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
                    : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {solidDef.dims.map((dim) => (
              <div key={dim.key}>
                <label htmlFor={`solid-${dim.key}`} className="block text-right text-xs font-bold text-slate-600">
                  <bdi dir="ltr">{dim.label}</bdi>
                </label>
                <input
                  id={`solid-${dim.key}`}
                  type="text"
                  dir="ltr"
                  value={dims[dim.key]}
                  onChange={(e) => setDims({ ...dims, [dim.key]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSolveSolid();
                  }}
                  aria-label={dim.label}
                  className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSolveSolid}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
          >
            <Box className="size-5" strokeWidth={2} />
            חשב
          </button>

          {solidResult?.type === "error" && (
            <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
              <p className="text-sm font-bold">{solidResult.message}</p>
            </div>
          )}

          {solidResult?.type === "result" && (
            <>
              <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                  {solidResult.measures.map((m) => (
                    <p key={m.symbol} dir="ltr" className="text-center text-sm font-extrabold leading-relaxed">
                      {m.symbol} = {formatNumber(m.value)}
                      {m.symbol === "θ" || m.symbol === "α" || m.symbol === "β" ? "°" : ""}
                    </p>
                  ))}
                </div>
              </div>
              {solvedDims && <SolidGeometryGraph kind={solidResult.kind} {...solvedDims} />}
              <StepsList steps={solidResult.steps} />
            </>
          )}
        </>
      )}
    </div>
  );
}
