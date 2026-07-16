"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import {
  solvePlaneFromThreePoints,
  solvePlaneFromPointAndTwoDirections,
  lineRelationship,
  linePlaneRelationship,
  angleLinePlane,
  angleBetweenPlanes,
  distancePointToPlane,
  solveLineForm,
  type GeometryStep,
  type Line3,
  type Plane3,
} from "@/lib/planeLineGeometry";
import { type Vector3, formatVector3 } from "@/lib/vectorUtils";
import PlaneLineGraph from "@/components/mathematics/PlaneLineGraph";

type Triple = [string, string, string];
const AXES = ["x", "y", "z"] as const;
const EMPTY_TRIPLE: Triple = ["", "", ""];

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4 || 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function parseTriple(t: Triple, name: string): Vector3 | { error: string } {
  const out: number[] = [];
  for (let i = 0; i < 3; i++) {
    const num = parseFloat(t[i].trim());
    if (!Number.isFinite(num)) return { error: `הרכיב ${AXES[i]} של ${name} אינו מספר תקין` };
    out.push(num);
  }
  return out as Vector3;
}

function parseScalar(s: string, name: string): number | { error: string } {
  const num = parseFloat(s.trim());
  if (!Number.isFinite(num)) return { error: `${name} אינו מספר תקין` };
  return num;
}

interface GraphData {
  line?: Line3;
  secondLine?: Line3;
  plane?: Plane3;
  secondPlane?: Plane3;
  highlightPoint?: Vector3;
}

interface SolveOutcome {
  headline: string;
  steps: GeometryStep[];
  graph: GraphData;
}

type SolveAttempt = SolveOutcome | { error: string };

type FieldSlot = "ptA" | "ptB" | "ptC" | "vecA" | "vecB" | "scalarD";

interface FieldSpec {
  slot: FieldSlot;
  label: string;
}

interface Values {
  ptA: Triple;
  ptB: Triple;
  ptC: Triple;
  vecA: Triple;
  vecB: Triple;
  scalarD: string;
}

interface ModeDef {
  id: string;
  label: string;
  fields: FieldSpec[];
  example: Partial<Values>;
  run: (v: Values) => SolveAttempt;
}

const MODES: ModeDef[] = [
  {
    id: "plane3points",
    label: "מישור מ-3 נקודות",
    fields: [
      { slot: "ptA", label: "נקודה A" },
      { slot: "ptB", label: "נקודה B" },
      { slot: "ptC", label: "נקודה C" },
    ],
    example: { ptA: ["1", "0", "0"], ptB: ["0", "1", "0"], ptC: ["0", "0", "1"] },
    run: (v) => {
      const a = parseTriple(v.ptA, "A");
      if ("error" in a) return { error: a.error };
      const b = parseTriple(v.ptB, "B");
      if ("error" in b) return { error: b.error };
      const c = parseTriple(v.ptC, "C");
      if ("error" in c) return { error: c.error };
      const result = solvePlaneFromThreePoints(a, b, c);
      if (result.type === "error") return { error: result.message };
      return { headline: `משוואת המישור היא: ${result.equation}`, steps: result.steps, graph: { plane: result.plane } };
    },
  },
  {
    id: "planePointDirs",
    label: "מישור מנקודה ו-2 כיוונים",
    fields: [
      { slot: "ptA", label: "נקודה P על המישור" },
      { slot: "vecA", label: "וקטור כיוון u" },
      { slot: "vecB", label: "וקטור כיוון v" },
    ],
    example: { ptA: ["0", "0", "0"], vecA: ["1", "0", "0"], vecB: ["0", "1", "0"] },
    run: (v) => {
      const p = parseTriple(v.ptA, "P");
      if ("error" in p) return { error: p.error };
      const u = parseTriple(v.vecA, "u");
      if ("error" in u) return { error: u.error };
      const dir2 = parseTriple(v.vecB, "v");
      if ("error" in dir2) return { error: dir2.error };
      const result = solvePlaneFromPointAndTwoDirections(p, u, dir2);
      if (result.type === "error") return { error: result.message };
      return { headline: `משוואת המישור היא: ${result.equation}`, steps: result.steps, graph: { plane: result.plane } };
    },
  },
  {
    id: "lineVsLine",
    label: "ישר מול ישר",
    fields: [
      { slot: "ptA", label: "נקודה על ישר 1 (P1)" },
      { slot: "vecA", label: "וקטור כיוון ישר 1 (d1)" },
      { slot: "ptB", label: "נקודה על ישר 2 (P2)" },
      { slot: "vecB", label: "וקטור כיוון ישר 2 (d2)" },
    ],
    example: { ptA: ["1", "0", "0"], vecA: ["1", "1", "0"], ptB: ["0", "1", "0"], vecB: ["1", "-1", "0"] },
    run: (v) => {
      const p1 = parseTriple(v.ptA, "P1");
      if ("error" in p1) return { error: p1.error };
      const d1 = parseTriple(v.vecA, "d1");
      if ("error" in d1) return { error: d1.error };
      const p2 = parseTriple(v.ptB, "P2");
      if ("error" in p2) return { error: p2.error };
      const d2 = parseTriple(v.vecB, "d2");
      if ("error" in d2) return { error: d2.error };
      const line1: Line3 = { point: p1, direction: d1 };
      const line2: Line3 = { point: p2, direction: d2 };
      const result = lineRelationship(line1, line2);
      if (result.type === "error") return { error: result.message };
      const headline =
        result.kind === "parallel"
          ? "הישרים מקבילים (ואינם מתלכדים) — אין ביניהם נקודות משותפות"
          : result.kind === "coincident"
            ? "הישרים מתלכדים — מדובר באותו ישר בדיוק"
            : result.kind === "skew"
              ? "הישרים מצטלבים (Skew) — אינם מקבילים ואינם נחתכים"
              : `הישרים נחתכים בנקודה ${formatVector3(result.intersection!)}`;
      return { headline, steps: result.steps, graph: { line: line1, secondLine: line2, highlightPoint: result.intersection } };
    },
  },
  {
    id: "lineVsPlane",
    label: "ישר מול מישור",
    fields: [
      { slot: "ptA", label: "נקודה על הישר (P0)" },
      { slot: "vecA", label: "וקטור כיוון הישר (d)" },
      { slot: "vecB", label: "וקטור נורמל למישור (n)" },
      { slot: "scalarD", label: "d (מהמשוואה n·r = d)" },
    ],
    example: { ptA: ["0", "0", "0"], vecA: ["1", "0", "0"], vecB: ["1", "1", "1"], scalarD: "1" },
    run: (v) => {
      const p0 = parseTriple(v.ptA, "P0");
      if ("error" in p0) return { error: p0.error };
      const dir = parseTriple(v.vecA, "d");
      if ("error" in dir) return { error: dir.error };
      const normal = parseTriple(v.vecB, "n");
      if ("error" in normal) return { error: normal.error };
      const d = parseScalar(v.scalarD, "d");
      if (typeof d !== "number") return { error: d.error };
      const line: Line3 = { point: p0, direction: dir };
      const plane: Plane3 = { normal, d };
      const result = linePlaneRelationship(line, plane);
      if (result.type === "error") return { error: result.message };
      const headline =
        result.kind === "contained"
          ? "הישר מוכל כולו במישור"
          : result.kind === "parallel"
            ? "הישר מקביל למישור — אין ביניהם נקודות משותפות"
            : `הישר חותך את המישור בנקודה ${formatVector3(result.intersection!)}`;
      return { headline, steps: result.steps, graph: { line, plane, highlightPoint: result.intersection } };
    },
  },
  {
    id: "angleLinePlane",
    label: "זווית בין ישר למישור",
    fields: [
      { slot: "vecA", label: "וקטור כיוון הישר (d)" },
      { slot: "vecB", label: "וקטור נורמל למישור (n)" },
    ],
    example: { vecA: ["1", "0", "1"], vecB: ["0", "0", "1"] },
    run: (v) => {
      const dir = parseTriple(v.vecA, "d");
      if ("error" in dir) return { error: dir.error };
      const normal = parseTriple(v.vecB, "n");
      if ("error" in normal) return { error: normal.error };
      const line: Line3 = { point: [0, 0, 0], direction: dir };
      const plane: Plane3 = { normal, d: 0 };
      const result = angleLinePlane(line, plane);
      if (result.type === "error") return { error: result.message };
      return { headline: `הזווית בין הישר למישור: θ = ${formatNumber(result.angleDeg)}°`, steps: result.steps, graph: { line, plane } };
    },
  },
  {
    id: "angleBetweenPlanes",
    label: "זווית בין 2 מישורים",
    fields: [
      { slot: "vecA", label: "וקטור נורמל למישור 1 (n1)" },
      { slot: "vecB", label: "וקטור נורמל למישור 2 (n2)" },
    ],
    example: { vecA: ["0", "0", "1"], vecB: ["1", "0", "1"] },
    run: (v) => {
      const n1 = parseTriple(v.vecA, "n1");
      if ("error" in n1) return { error: n1.error };
      const n2 = parseTriple(v.vecB, "n2");
      if ("error" in n2) return { error: n2.error };
      const plane1: Plane3 = { normal: n1, d: 0 };
      const plane2: Plane3 = { normal: n2, d: 0 };
      const result = angleBetweenPlanes(plane1, plane2);
      if (result.type === "error") return { error: result.message };
      return {
        headline: `הזווית בין שני המישורים: θ = ${formatNumber(result.angleDeg)}°`,
        steps: result.steps,
        graph: { plane: plane1, secondPlane: plane2 },
      };
    },
  },
  {
    id: "distancePointToPlane",
    label: "מרחק נקודה ממישור",
    fields: [
      { slot: "ptA", label: "הנקודה" },
      { slot: "vecA", label: "וקטור נורמל למישור (n)" },
      { slot: "scalarD", label: "d (מהמשוואה n·r = d)" },
    ],
    example: { ptA: ["1", "1", "1"], vecA: ["1", "1", "1"], scalarD: "1" },
    run: (v) => {
      const point = parseTriple(v.ptA, "הנקודה");
      if ("error" in point) return { error: point.error };
      const normal = parseTriple(v.vecA, "n");
      if ("error" in normal) return { error: normal.error };
      const d = parseScalar(v.scalarD, "d");
      if (typeof d !== "number") return { error: d.error };
      const plane: Plane3 = { normal, d };
      const result = distancePointToPlane(point, plane);
      if (result.type === "error") return { error: result.message };
      return {
        headline: `המרחק מהנקודה למישור: ${formatNumber(result.distance)}`,
        steps: result.steps,
        graph: { plane, highlightPoint: point },
      };
    },
  },
  {
    id: "lineForm",
    label: "צורת ישר (פרמטרית ⇄ סימטרית)",
    fields: [
      { slot: "ptA", label: "נקודה על הישר (P0)" },
      { slot: "vecA", label: "וקטור כיוון (d)" },
    ],
    example: { ptA: ["1", "2", "3"], vecA: ["2", "-1", "4"] },
    run: (v) => {
      const p0 = parseTriple(v.ptA, "P0");
      if ("error" in p0) return { error: p0.error };
      const dir = parseTriple(v.vecA, "d");
      if ("error" in dir) return { error: dir.error };
      const line: Line3 = { point: p0, direction: dir };
      const result = solveLineForm(line);
      if (result.type === "error") return { error: result.message };
      return {
        headline: `הצורה הפרמטרית: ${result.parametricText}\nהצורה הסימטרית: ${result.symmetricText}`,
        steps: result.steps,
        graph: { line },
      };
    },
  },
];

export default function PlaneLineSolver() {
  const [modeId, setModeId] = useState(MODES[0].id);
  const [values, setValues] = useState<Values>({ ptA: EMPTY_TRIPLE, ptB: EMPTY_TRIPLE, ptC: EMPTY_TRIPLE, vecA: EMPTY_TRIPLE, vecB: EMPTY_TRIPLE, scalarD: "" });
  const [outcome, setOutcome] = useState<SolveAttempt | null>(null);

  const mode = MODES.find((m) => m.id === modeId)!;
  const usesSlot = (slot: FieldSlot) => mode.fields.some((f) => f.slot === slot);

  function handleModeChange(next: ModeDef) {
    setModeId(next.id);
    setValues({ ptA: EMPTY_TRIPLE, ptB: EMPTY_TRIPLE, ptC: EMPTY_TRIPLE, vecA: EMPTY_TRIPLE, vecB: EMPTY_TRIPLE, scalarD: "" });
    setOutcome(null);
  }

  function handleSolve() {
    setOutcome(mode.run(values));
  }

  function handleExample() {
    const next: Values = { ptA: EMPTY_TRIPLE, ptB: EMPTY_TRIPLE, ptC: EMPTY_TRIPLE, vecA: EMPTY_TRIPLE, vecB: EMPTY_TRIPLE, scalarD: "", ...mode.example };
    setValues(next);
    setOutcome(mode.run(next));
  }

  function setTripleSlot(slot: FieldSlot, next: Triple) {
    setValues((prev) => ({ ...prev, [slot]: next }));
  }

  function tripleField(slot: FieldSlot, label: string) {
    const triple = values[slot] as Triple;
    return (
      <div key={slot}>
        <p className="text-right text-xs font-bold text-slate-600">{label}</p>
        <div dir="ltr" className="mt-1 grid grid-cols-3 gap-2">
          {AXES.map((axis, i) => (
            <input
              key={axis}
              type="text"
              dir="ltr"
              value={triple[i]}
              onChange={(e) => {
                const next: Triple = [...triple] as Triple;
                next[i] = e.target.value;
                setTripleSlot(slot, next);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSolve();
              }}
              placeholder={axis}
              aria-label={`רכיב ${axis} של ${label}`}
              className="w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 placeholder:text-slate-400 focus:border-[#2F6FED] focus:outline-none"
            />
          ))}
        </div>
      </div>
    );
  }

  function scalarField(label: string) {
    return (
      <div key="scalarD">
        <label htmlFor="scalar-d" className="block text-right text-xs font-bold text-slate-600">
          {label}
        </label>
        <input
          id="scalar-d"
          type="text"
          dir="ltr"
          value={values.scalarD}
          onChange={(e) => setValues((prev) => ({ ...prev, scalarD: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSolve();
          }}
          aria-label={label}
          className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <p className="text-right text-xs font-bold text-slate-600">סוג התרגיל</p>
      <div className="mt-1 grid grid-cols-2 gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => handleModeChange(m)}
            className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${
              modeId === m.id
                ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
                : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {usesSlot("ptA") && tripleField("ptA", mode.fields.find((f) => f.slot === "ptA")!.label)}
        {usesSlot("vecA") && tripleField("vecA", mode.fields.find((f) => f.slot === "vecA")!.label)}
        {usesSlot("ptB") && tripleField("ptB", mode.fields.find((f) => f.slot === "ptB")!.label)}
        {usesSlot("vecB") && tripleField("vecB", mode.fields.find((f) => f.slot === "vecB")!.label)}
        {usesSlot("ptC") && tripleField("ptC", mode.fields.find((f) => f.slot === "ptC")!.label)}
        {usesSlot("scalarD") && scalarField(mode.fields.find((f) => f.slot === "scalarD")!.label)}
      </div>

      <button
        type="button"
        onClick={handleSolve}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
      >
        <Layers className="size-5" strokeWidth={2} />
        חשב
      </button>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={handleExample}
          className="rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-white/70"
        >
          מלא דוגמה
        </button>
      </div>

      {outcome && "error" in outcome && (
        <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-right text-red-700">
          <p className="text-sm font-bold">{outcome.error}</p>
        </div>
      )}

      {outcome && !("error" in outcome) && (
        <>
          <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
            <p dir="ltr" className="whitespace-pre-line text-base font-extrabold leading-relaxed">
              {outcome.headline}
            </p>
          </div>

          {outcome.steps.length > 0 && (
            <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
              <p className="text-right text-sm font-extrabold text-black">שלבי הפתרון:</p>
              <ol className="mt-2 space-y-2">
                {outcome.steps.map((step, index) => (
                  <li key={index} className="flex flex-row-reverse items-start gap-2">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2F6FED] text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="text-right text-xs font-bold text-orange-500">{step.law}</span>
                      <span dir="ltr" className="whitespace-pre-line text-right font-mono text-sm font-bold text-slate-700">
                        {step.expr}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <PlaneLineGraph
            line={outcome.graph.line}
            secondLine={outcome.graph.secondLine}
            plane={outcome.graph.plane}
            secondPlane={outcome.graph.secondPlane}
            highlightPoint={outcome.graph.highlightPoint}
          />
        </>
      )}
    </div>
  );
}
