"use client";

import { evalTerms, type Term } from "@/lib/integral";

const CURVE_COLOR = "#2F6FED";
const AREA_FILL = "rgba(34,197,94,0.35)";
const AREA_STROKE = "#16a34a";

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

function baseDomain(terms: Term[]): number {
  const hasExp = terms.some((t) => t.kind === "exp");
  const hasTrig = terms.some((t) => t.kind === "sin" || t.kind === "cos");
  const maxPower = terms.reduce((m, t) => (t.kind === "power" ? Math.max(m, t.power ?? 0) : m), 0);
  let d = 4;
  if (maxPower >= 4) d = 3;
  else if (maxPower === 3) d = 4.5;
  else if (maxPower <= 1) d = 6;
  if (hasTrig) d = Math.max(d, 6.5);
  if (hasExp) d = Math.min(d, 4);
  return d;
}

interface IntegralGraphProps {
  terms: Term[];
  variable: string;
  expr: string;
  mode: "indefinite" | "definite";
  a?: number;
  b?: number;
  definiteValue?: number;
}

export default function IntegralGraph({ terms, variable, expr, mode, a, b, definiteValue }: IntegralGraphProps) {
  const shaded = mode === "definite" && a !== undefined && b !== undefined && Number.isFinite(a) && Number.isFinite(b);
  const lo = shaded ? Math.min(a!, b!) : 0;
  const hi = shaded ? Math.max(a!, b!) : 0;

  let range = baseDomain(terms);
  if (shaded) range = Math.max(range, Math.abs(lo) * 1.3, Math.abs(hi) * 1.3, 1);
  const xMin = -range;
  const xMax = range;

  const W = 340;
  const H = 260;
  const P = 36;
  const SAMPLES = 160;

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const x = xMin + ((xMax - xMin) * i) / SAMPLES;
    const y = evalTerms(terms, x);
    if (Number.isFinite(y)) points.push({ x, y });
  }

  const areaPoints: { x: number; y: number }[] = [];
  if (shaded) {
    const AREA_SAMPLES = 80;
    for (let i = 0; i <= AREA_SAMPLES; i++) {
      const x = lo + ((hi - lo) * i) / AREA_SAMPLES;
      const y = evalTerms(terms, x);
      if (Number.isFinite(y)) areaPoints.push({ x, y });
    }
  }

  const ys = points.map((p) => p.y).concat(0, ...areaPoints.map((p) => p.y));
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);
  if (yMax - yMin < 1e-6) {
    yMin -= 1;
    yMax += 1;
  }
  const padY = (yMax - yMin) * 0.15;
  yMin -= padY;
  yMax += padY;

  const sx = (v: number) => P + ((v - xMin) / (xMax - xMin)) * (W - 2 * P);
  const sy = (v: number) => H - P - ((v - yMin) / (yMax - yMin)) * (H - 2 * P);

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(" ");

  const areaD = shaded
    ? [
        `M ${sx(lo).toFixed(1)} ${sy(0).toFixed(1)}`,
        ...areaPoints.map((p) => `L ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`),
        `L ${sx(hi).toFixed(1)} ${sy(0).toFixed(1)}`,
        "Z",
      ].join(" ")
    : "";

  return (
    <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
      <p className="text-right text-sm font-extrabold text-black">הצגה גרפית:</p>

      <div dir="ltr" className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: CURVE_COLOR }} />
          <span className="font-mono text-xs font-bold text-slate-700">
            f({variable}) = {expr}
          </span>
        </span>
        {shaded && (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: AREA_FILL }} />
            <span className="font-mono text-xs font-bold text-slate-700">
              שטח בין {formatNumber(lo)} ל-{formatNumber(hi)}
            </span>
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`גרף הפונקציה f(${variable}) = ${expr}`}
        className="mx-auto mt-2 w-full max-w-sm"
        style={{ direction: "ltr" }}
      >
        <defs>
          <clipPath id="integral-plot-clip">
            <rect x={P} y={P} width={W - 2 * P} height={H - 2 * P} />
          </clipPath>
        </defs>

        <line x1={P - 6} y1={sy(0)} x2={W - P + 6} y2={sy(0)} stroke="#94a3b8" strokeWidth="1" />
        <line x1={sx(0)} y1={P - 6} x2={sx(0)} y2={H - P + 6} stroke="#94a3b8" strokeWidth="1" />
        <text x={W - P + 10} y={sy(0) + 4} fontSize="11" fontWeight="700" fill="#64748b">
          x
        </text>
        <text x={sx(0) - 4} y={P - 10} fontSize="11" fontWeight="700" fill="#64748b" textAnchor="end">
          y
        </text>

        {ticks(xMin, xMax).map((v) => (
          <g key={`tx-${v}`}>
            <line x1={sx(v)} y1={sy(0) - 3} x2={sx(v)} y2={sy(0) + 3} stroke="#94a3b8" strokeWidth="1" />
            <text x={sx(v)} y={sy(0) + 14} fontSize="9" fill="#64748b" textAnchor="middle">
              {formatNumber(v)}
            </text>
          </g>
        ))}
        {ticks(yMin, yMax).map((v) => (
          <g key={`ty-${v}`}>
            <line x1={sx(0) - 3} y1={sy(v)} x2={sx(0) + 3} y2={sy(v)} stroke="#94a3b8" strokeWidth="1" />
            <text x={sx(0) - 5} y={sy(v) + 3} fontSize="9" fill="#64748b" textAnchor="end">
              {formatNumber(v)}
            </text>
          </g>
        ))}

        <g clipPath="url(#integral-plot-clip)">
          {shaded && <path d={areaD} fill={AREA_FILL} stroke={AREA_STROKE} strokeWidth="1" />}
          <path d={pathD} fill="none" stroke={CURVE_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {shaded && (
            <>
              <line x1={sx(lo)} y1={sy(0)} x2={sx(lo)} y2={sy(evalTerms(terms, lo))} stroke={AREA_STROKE} strokeWidth="1.5" strokeDasharray="3 3" />
              <line x1={sx(hi)} y1={sy(0)} x2={sx(hi)} y2={sy(evalTerms(terms, hi))} stroke={AREA_STROKE} strokeWidth="1.5" strokeDasharray="3 3" />
            </>
          )}
        </g>

        {shaded && (
          <>
            <text x={sx(lo)} y={H - P + 14} fontSize="9" fontWeight="800" fill={AREA_STROKE} textAnchor="middle">
              a={formatNumber(lo)}
            </text>
            <text x={sx(hi)} y={H - P + 14} fontSize="9" fontWeight="800" fill={AREA_STROKE} textAnchor="middle">
              b={formatNumber(hi)}
            </text>
          </>
        )}
      </svg>

      <p className="mt-2 text-right text-xs font-medium leading-relaxed text-slate-700">
        {shaded
          ? `השטח הצבוע בירוק מייצג את השטח הנמדד תחת הגרף בין x=${formatNumber(lo)} ל-x=${formatNumber(hi)}, ששווה לערך האינטגרל המסוים${
              definiteValue !== undefined ? ` (${formatNumber(definiteValue)})` : ""
            }.`
          : "הקו הכחול הוא גרף הפונקציה f(x)."}
      </p>
    </div>
  );
}
