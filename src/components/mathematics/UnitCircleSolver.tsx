"use client";

import { useState } from "react";
import { Compass } from "lucide-react";
import {
  convertAngle,
  computeUnitCircleValues,
  computeIdentityDemo,
  IDENTITY_KINDS,
  type AngleUnit,
  type IdentityKind,
  type ConversionResult,
  type UnitCircleResult,
  type IdentityResult,
} from "@/lib/unitCircle";

type Category = "convert" | "values" | "identities";

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4 || 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

/* ------------------------------------------------------------------ */
/* Unit-circle diagram                                                 */
/* ------------------------------------------------------------------ */

interface DiagramPoint {
  rawDeg: number;
  color: string;
  arcR: number;
}

/** Draws the arc from angle 0 to `deg`, preserving sign/magnitude (not normalized) so a
 * negative angle sweeps the short way clockwise instead of the long way counterclockwise. */
function describeArc(cx: number, cy: number, r: number, deg: number): string {
  const d = Math.max(-360, Math.min(360, deg));
  const rad = (d * Math.PI) / 180;
  const sx = cx + r;
  const sy = cy;
  const ex = cx + r * Math.cos(rad);
  const ey = cy - r * Math.sin(rad);
  const largeArc = Math.abs(d) > 180 ? 1 : 0;
  const sweep = d >= 0 ? 0 : 1;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} ${sweep} ${ex} ${ey}`;
}

function UnitCircleDiagram({ points, showProjections }: { points: DiagramPoint[]; showProjections?: boolean }) {
  const cx = 130;
  const cy = 130;
  const R = 95;
  return (
    <div className="mt-3 flex justify-center rounded-xl border border-white/60 bg-white/50 py-3">
      <svg viewBox="0 0 260 260" width={230} height={230}>
        <line x1={15} y1={cy} x2={245} y2={cy} stroke="#94a3b8" strokeWidth={1} />
        <line x1={cx} y1={15} x2={cx} y2={245} stroke="#94a3b8" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={R} fill="#2F6FED0d" stroke="#334155" strokeWidth={1.5} />

        {points.map((p, idx) => {
          const rad = (p.rawDeg * Math.PI) / 180;
          const sx = cx + R * Math.cos(rad);
          const sy = cy - R * Math.sin(rad);
          return (
            <g key={idx}>
              <path d={describeArc(cx, cy, p.arcR, p.rawDeg)} fill="none" stroke={p.color} strokeWidth={1.5} strokeDasharray="3 3" />
              <line x1={cx} y1={cy} x2={sx} y2={sy} stroke={p.color} strokeWidth={2.5} />
              {showProjections && (
                <>
                  <line x1={sx} y1={sy} x2={sx} y2={cy} stroke={p.color} strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
                  <line x1={sx} y1={sy} x2={cx} y2={sy} stroke={p.color} strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
                </>
              )}
              <circle cx={sx} cy={sy} r={5} fill={p.color} stroke="white" strokeWidth={1.5} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Solver                                                               */
/* ------------------------------------------------------------------ */

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "convert", label: "המרה" },
  { id: "values", label: "חישוב ערכים" },
  { id: "identities", label: "זהויות בסיסיות" },
];

const CONVERT_EXAMPLES: Record<AngleUnit, string[]> = {
  deg: ["180", "270", "45", "120"],
  rad: ["π/3", "3π/4", "π", "5π/6"],
};

const VALUE_EXAMPLES: Record<AngleUnit, string[]> = {
  deg: ["60", "135", "-60", "300"],
  rad: ["π/6", "5π/6", "π/2", "4π/3"],
};

export default function UnitCircleSolver() {
  const [category, setCategory] = useState<Category>("convert");

  const [convertUnit, setConvertUnit] = useState<AngleUnit>("deg");
  const [convertInput, setConvertInput] = useState("");
  const [convertResult, setConvertResult] = useState<ConversionResult | null>(null);

  const [valueUnit, setValueUnit] = useState<AngleUnit>("deg");
  const [valueInput, setValueInput] = useState("");
  const [valueResult, setValueResult] = useState<UnitCircleResult | null>(null);

  const [identityUnit, setIdentityUnit] = useState<AngleUnit>("deg");
  const [identityInput, setIdentityInput] = useState("");
  const [identityKind, setIdentityKind] = useState<IdentityKind>("negative");
  const [identityResult, setIdentityResult] = useState<IdentityResult | null>(null);

  function handleCategoryChange(c: Category) {
    setCategory(c);
  }

  function handleConvert() {
    setConvertResult(convertAngle(convertInput, convertUnit));
  }
  function handleConvertExample(ex: string) {
    setConvertInput(ex);
    setConvertResult(convertAngle(ex, convertUnit));
  }
  function handleConvertUnitChange(u: AngleUnit) {
    setConvertUnit(u);
    setConvertInput("");
    setConvertResult(null);
  }

  function handleValues() {
    setValueResult(computeUnitCircleValues(valueInput, valueUnit));
  }
  function handleValueExample(ex: string) {
    setValueInput(ex);
    setValueResult(computeUnitCircleValues(ex, valueUnit));
  }
  function handleValueUnitChange(u: AngleUnit) {
    setValueUnit(u);
    setValueResult(null);
  }

  function handleIdentity() {
    setIdentityResult(computeIdentityDemo(identityInput, identityUnit, identityKind));
  }
  function handleIdentityKindChange(k: IdentityKind) {
    setIdentityKind(k);
    if (identityInput.trim()) setIdentityResult(computeIdentityDemo(identityInput, identityUnit, k));
  }
  function handleIdentityUnitChange(u: AngleUnit) {
    setIdentityUnit(u);
    setIdentityResult(null);
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/35 p-5 backdrop-blur-xl backdrop-saturate-150">
      <div className="flex flex-row-reverse gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => handleCategoryChange(c.id)}
            className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition sm:text-sm ${
              category === c.id
                ? "border-[#2F6FED] bg-[#2F6FED] text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]"
                : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* ---------------- Convert ---------------- */}
      {category === "convert" && (
        <>
          <div className="mt-4 flex flex-row-reverse gap-2">
            <button
              type="button"
              onClick={() => handleConvertUnitChange("deg")}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                convertUnit === "deg" ? "border-orange-500 bg-orange-500 text-white" : "border-white/60 bg-white/30 text-slate-600 hover:bg-white/60"
              }`}
            >
              ממעלות לרדיאנים
            </button>
            <button
              type="button"
              onClick={() => handleConvertUnitChange("rad")}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                convertUnit === "rad" ? "border-orange-500 bg-orange-500 text-white" : "border-white/60 bg-white/30 text-slate-600 hover:bg-white/60"
              }`}
            >
              מרדיאנים למעלות
            </button>
          </div>

          <div className="mt-4">
            <label htmlFor="convert-input" className="block text-right text-xs font-bold text-slate-600">
              {convertUnit === "deg" ? "זווית במעלות (למשל 180)" : "זווית ברדיאנים — אפשר גם ביטוי עם π (למשל 2π/3)"}
            </label>
            <input
              id="convert-input"
              type="text"
              dir="ltr"
              value={convertInput}
              onChange={(e) => setConvertInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConvert();
              }}
              placeholder={convertUnit === "deg" ? "180" : "π/3"}
              className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleConvert}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
          >
            <Compass className="size-5" strokeWidth={2} />
            המר
          </button>

          <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
            {CONVERT_EXAMPLES[convertUnit].map((ex) => (
              <button
                key={ex}
                type="button"
                dir="ltr"
                onClick={() => handleConvertExample(ex)}
                className="rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-white/70"
              >
                {ex}
                {convertUnit === "deg" ? "°" : ""}
              </button>
            ))}
          </div>

          {convertResult?.type === "error" && (
            <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
              <p className="text-sm font-bold">{convertResult.message}</p>
            </div>
          )}

          {convertResult?.type === "result" && (
            <>
              <div className="mt-5 rounded-xl bg-[#2F6FED] px-4 py-4 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
                <p dir="ltr" className="text-xl font-extrabold leading-relaxed">
                  {formatNumber(convertResult.fromValue)}
                  {convertResult.fromUnit === "deg" ? "°" : " rad"} = {convertResult.toExact}
                </p>
              </div>
              <StepsPanel steps={convertResult.steps} />
            </>
          )}
        </>
      )}

      {/* ---------------- Values ---------------- */}
      {category === "values" && (
        <>
          <div className="mt-4 flex flex-row-reverse gap-2">
            <button
              type="button"
              onClick={() => handleValueUnitChange("deg")}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                valueUnit === "deg" ? "border-orange-500 bg-orange-500 text-white" : "border-white/60 bg-white/30 text-slate-600 hover:bg-white/60"
              }`}
            >
              מעלות
            </button>
            <button
              type="button"
              onClick={() => handleValueUnitChange("rad")}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                valueUnit === "rad" ? "border-orange-500 bg-orange-500 text-white" : "border-white/60 bg-white/30 text-slate-600 hover:bg-white/60"
              }`}
            >
              רדיאנים
            </button>
          </div>

          <div className="mt-4">
            <label htmlFor="value-input" className="block text-right text-xs font-bold text-slate-600">
              <bdi dir="ltr">θ</bdi> — {valueUnit === "deg" ? "הזווית במעלות" : "הזווית ברדיאנים (אפשר ביטוי עם π)"}
            </label>
            <input
              id="value-input"
              type="text"
              dir="ltr"
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleValues();
              }}
              placeholder={valueUnit === "deg" ? "60" : "π/6"}
              className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleValues}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
          >
            <Compass className="size-5" strokeWidth={2} />
            חשב
          </button>

          <div className="mt-4 flex flex-row-reverse flex-wrap gap-2">
            {VALUE_EXAMPLES[valueUnit].map((ex) => (
              <button
                key={ex}
                type="button"
                dir="ltr"
                onClick={() => handleValueExample(ex)}
                className="rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-white/70"
              >
                {ex}
                {valueUnit === "deg" ? "°" : ""}
              </button>
            ))}
          </div>

          {valueResult?.type === "error" && (
            <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
              <p className="text-sm font-bold">{valueResult.message}</p>
            </div>
          )}

          {valueResult?.type === "result" && (
            <>
              <UnitCircleDiagram points={[{ rawDeg: valueResult.point.rawDeg, color: "#2F6FED", arcR: 34 }]} showProjections />

              <div className="mt-3 grid grid-cols-3 gap-2">
                {(
                  [
                    ["sin", valueResult.point.sin.exact],
                    ["cos", valueResult.point.cos.exact],
                    ["tan", valueResult.point.tan.exact],
                  ] as const
                ).map(([fn, val]) => (
                  <div key={fn} className="rounded-xl bg-[#2F6FED] px-2 py-3 text-center text-white shadow-[0_0_18px_rgba(47,111,237,0.5)]">
                    <p dir="ltr" className="text-xs font-bold opacity-80">
                      {fn}(θ)
                    </p>
                    <p dir="ltr" className="mt-1 text-base font-extrabold">
                      {val}
                    </p>
                  </div>
                ))}
              </div>

              <StepsPanel steps={valueResult.steps} />
            </>
          )}
        </>
      )}

      {/* ---------------- Identities ---------------- */}
      {category === "identities" && (
        <>
          <div className="mt-4 flex flex-row-reverse gap-2">
            <button
              type="button"
              onClick={() => handleIdentityUnitChange("deg")}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                identityUnit === "deg" ? "border-orange-500 bg-orange-500 text-white" : "border-white/60 bg-white/30 text-slate-600 hover:bg-white/60"
              }`}
            >
              מעלות
            </button>
            <button
              type="button"
              onClick={() => handleIdentityUnitChange("rad")}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                identityUnit === "rad" ? "border-orange-500 bg-orange-500 text-white" : "border-white/60 bg-white/30 text-slate-600 hover:bg-white/60"
              }`}
            >
              רדיאנים
            </button>
          </div>

          <div className="mt-2 flex flex-row-reverse flex-wrap gap-2">
            {IDENTITY_KINDS.map((idn) => (
              <button
                key={idn.kind}
                type="button"
                onClick={() => handleIdentityKindChange(idn.kind)}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                  identityKind === idn.kind ? "border-orange-500 bg-orange-500 text-white" : "border-white/60 bg-white/30 text-slate-600 hover:bg-white/60"
                }`}
              >
                {idn.label}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-center">
            <p dir="ltr" className="text-base font-extrabold text-slate-800">
              {IDENTITY_KINDS.find((i) => i.kind === identityKind)?.formulaSin}
            </p>
            <p dir="ltr" className="mt-1 text-base font-extrabold text-slate-800">
              {IDENTITY_KINDS.find((i) => i.kind === identityKind)?.formulaCos}
            </p>
          </div>

          <div className="mt-4">
            <label htmlFor="identity-input" className="block text-right text-xs font-bold text-slate-600">
              <bdi dir="ltr">θ</bdi> — {identityUnit === "deg" ? "הזווית במעלות" : "הזווית ברדיאנים (אפשר ביטוי עם π)"}
            </label>
            <input
              id="identity-input"
              type="text"
              dir="ltr"
              value={identityInput}
              onChange={(e) => setIdentityInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleIdentity();
              }}
              placeholder={identityUnit === "deg" ? "40" : "π/5"}
              className="mt-1 w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left font-bold text-slate-800 focus:border-[#2F6FED] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleIdentity}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6FED] py-3 text-lg font-bold text-white shadow-[0_0_18px_rgba(47,111,237,0.5)] transition hover:brightness-105 active:brightness-95"
          >
            <Compass className="size-5" strokeWidth={2} />
            הצג
          </button>

          {identityResult?.type === "error" && (
            <div className="mt-5 rounded-xl border border-red-300/70 bg-red-50/70 px-4 py-4 text-center text-red-700">
              <p className="text-sm font-bold">{identityResult.message}</p>
            </div>
          )}

          {identityResult?.type === "result" && (
            <>
              <UnitCircleDiagram
                points={[
                  { rawDeg: identityResult.base.rawDeg, color: "#2F6FED", arcR: 30 },
                  { rawDeg: identityResult.transformed.rawDeg, color: "#ea580c", arcR: 44 },
                ]}
              />
              <div className="mt-2 flex flex-row-reverse justify-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-[#2F6FED]">
                  <span className="size-2.5 rounded-full bg-[#2F6FED]" />
                  <bdi dir="ltr">θ = {formatNumber(identityResult.base.angleDeg)}°</bdi>
                </span>
                <span className="flex items-center gap-1.5 text-orange-600">
                  <span className="size-2.5 rounded-full bg-orange-600" />
                  <bdi dir="ltr">
                    {IDENTITY_KINDS.find((i) => i.kind === identityKind)?.angleExpr} = {formatNumber(identityResult.transformed.angleDeg)}°
                  </bdi>
                </span>
              </div>

              <StepsPanel steps={identityResult.steps} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function StepsPanel({ steps }: { steps: { law: string; expr: string }[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
      <p className="text-right text-sm font-extrabold text-black">דרך הפתרון:</p>
      <ol className="mt-2 space-y-2">
        {steps.map((step, stepIndex) => (
          <li key={stepIndex} className="flex flex-row-reverse items-start gap-2">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2F6FED] text-xs font-bold text-white">
              {stepIndex + 1}
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
