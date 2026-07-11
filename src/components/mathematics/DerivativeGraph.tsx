"use client";

import { evalPolynomial, type Term } from "@/lib/derivative";

const ORIGINAL_COLOR = "#2F6FED";
const DERIVATIVE_COLOR = "#d95926";
const MARKER_COLOR = "#dc2626";

export interface GraphCriticalPoint {
  x: number;
  y: number;
  kind: "max" | "min" | "unknown";
}

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function niceStep(range: number): number {
  const raw = range / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  for (const m of [1, 2, 5, 10]) {
    if (raw <= m * mag) return m * mag;
  }
  return 10 * mag;
}

function ticks(min: number, max: number): number[] {
  const step = niceStep(max - min);
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) {
    const val = Math.abs(v) < 1e-9 ? 0 : v;
    if (val === 0) continue;
    out.push(val);
  }
  return out;
}

function maxPower(terms: Term[]): number {
  return terms.reduce((m, t) => Math.max(m, t.power), 0);
}

function domainForDegree(deg: number): number {
  if (deg <= 1) return 8;
  if (deg === 2) return 6;
  if (deg === 3) return 4.5;
  return 3;
}

interface CurvePlotProps {
  terms: Term[];
  color: string;
  xMin: number;
  xMax: number;
  label: string;
  ariaLabel: string;
  markers?: { x: number; y: number; label: string }[];
}

function CurvePlot({ terms, color, xMin, xMax, label, ariaLabel, markers }: CurvePlotProps) {
  const W = 300;
  const H = 220;
  const P = 30;
  const SAMPLES = 120;

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const x = xMin + ((xMax - xMin) * i) / SAMPLES;
    const y = evalPolynomial(terms, x);
    if (Number.isFinite(y)) points.push({ x, y });
  }

  const ys = points.map((p) => p.y).concat(0, ...(markers?.map((m) => m.y) ?? []));
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);
  if (yMax - yMin < 1e-6) {
    yMin -= 1;
    yMax += 1;
  }
  const padY = (yMax - yMin) * 0.12;
  yMin -= padY;
  yMax += padY;

  const sx = (v: number) => P + ((v - xMin) / (xMax - xMin)) * (W - 2 * P);
  const sy = (v: number) => H - P - ((v - yMin) / (yMax - yMin)) * (H - 2 * P);

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`)
    .join(" ");

  return (
    <div className="flex-1 rounded-xl border border-white/60 bg-white/50 px-3 py-3">
      <p dir="ltr" className="text-center text-xs font-extrabold text-slate-700">
        {label}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={ariaLabel}
        className="mx-auto mt-1 w-full max-w-xs"
        style={{ direction: "ltr" }}
      >
        <line x1={P - 6} y1={sy(0)} x2={W - P + 6} y2={sy(0)} stroke="#94a3b8" strokeWidth="1" />
        <line x1={sx(0)} y1={P - 6} x2={sx(0)} y2={H - P + 6} stroke="#94a3b8" strokeWidth="1" />
        <text x={W - P + 8} y={sy(0) + 4} fontSize="10" fontWeight="700" fill="#64748b">
          x
        </text>
        <text x={sx(0) - 4} y={P - 8} fontSize="10" fontWeight="700" fill="#64748b" textAnchor="end">
          y
        </text>

        {ticks(xMin, xMax).map((v) => (
          <g key={`tx-${v}`}>
            <line x1={sx(v)} y1={sy(0) - 3} x2={sx(v)} y2={sy(0) + 3} stroke="#94a3b8" strokeWidth="1" />
            <text x={sx(v)} y={sy(0) + 13} fontSize="8" fill="#64748b" textAnchor="middle">
              {formatNumber(v)}
            </text>
          </g>
        ))}
        {ticks(yMin, yMax).map((v) => (
          <g key={`ty-${v}`}>
            <line x1={sx(0) - 3} y1={sy(v)} x2={sx(0) + 3} y2={sy(v)} stroke="#94a3b8" strokeWidth="1" />
            <text x={sx(0) - 5} y={sy(v) + 3} fontSize="8" fill="#64748b" textAnchor="end">
              {formatNumber(v)}
            </text>
          </g>
        ))}

        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {markers?.map((m, i) => (
          <g key={`marker-${i}`}>
            <circle cx={sx(m.x)} cy={sy(m.y)} r="4.5" fill={MARKER_COLOR} stroke="#ffffff" strokeWidth="1.5" />
            <text x={sx(m.x)} y={sy(m.y) - 9} fontSize="8" fontWeight="800" fill={MARKER_COLOR} textAnchor="middle">
              {m.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

interface DerivativeGraphProps {
  originalTerms: Term[];
  derivativeTerms: Term[];
  originalExpr: string;
  derivativeExpr: string;
  variable: string;
  criticalPoints?: GraphCriticalPoint[];
}

function kindLabel(kind: GraphCriticalPoint["kind"]): string {
  return kind === "max" ? "מקס" : kind === "min" ? "מין" : "?";
}

export default function DerivativeGraph({
  originalTerms,
  derivativeTerms,
  originalExpr,
  derivativeExpr,
  variable,
  criticalPoints,
}: DerivativeGraphProps) {
  const baseRange = domainForDegree(maxPower(originalTerms));
  const widestX = criticalPoints?.reduce((m, p) => Math.max(m, Math.abs(p.x)), 0) ?? 0;
  const range = Math.max(baseRange, widestX * 1.25);
  const xMin = -range;
  const xMax = range;

  const originalMarkers = criticalPoints?.map((p) => ({ x: p.x, y: p.y, label: kindLabel(p.kind) }));
  const derivativeMarkers = criticalPoints?.map((p) => ({ x: p.x, y: 0, label: kindLabel(p.kind) }));

  return (
    <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
      <p className="text-right text-sm font-extrabold text-black">הצגה גרפית:</p>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <CurvePlot
          terms={originalTerms}
          color={ORIGINAL_COLOR}
          xMin={xMin}
          xMax={xMax}
          label={`f(${variable})`}
          ariaLabel={`גרף הפונקציה f(${variable}) = ${originalExpr}`}
          markers={originalMarkers}
        />
        <CurvePlot
          terms={derivativeTerms}
          color={DERIVATIVE_COLOR}
          xMin={xMin}
          xMax={xMax}
          label={`f'(${variable})`}
          ariaLabel={`גרף הנגזרת f'(${variable}) = ${derivativeExpr}`}
          markers={derivativeMarkers}
        />
      </div>

      <div className="mt-3 flex flex-col items-end gap-1">
        <p dir="ltr" className="font-mono text-sm font-bold" style={{ color: ORIGINAL_COLOR }}>
          f({variable}) = {originalExpr}
        </p>
        <p dir="ltr" className="font-mono text-sm font-bold" style={{ color: DERIVATIVE_COLOR }}>
          f&apos;({variable}) = {derivativeExpr}
        </p>
      </div>
    </div>
  );
}
