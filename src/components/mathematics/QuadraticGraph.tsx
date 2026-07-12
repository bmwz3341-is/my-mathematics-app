"use client";

import { evalPolynomial, type Term } from "@/lib/derivative";

const CURVE_COLOR = "#2F6FED";
const ROOT_COLOR = "#dc2626";
const YINT_COLOR = "#16a34a";
const VERTEX_COLOR = "#7c3aed";

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

interface QuadraticGraphProps {
  a: number;
  b: number;
  c: number;
  roots: number[];
  variable: string;
}

export default function QuadraticGraph({ a, b, c, roots, variable }: QuadraticGraphProps) {
  const vertexX = -b / (2 * a);
  const spread = Math.max(4, Math.abs(vertexX) * 0.2 + 3, ...roots.map((r) => Math.abs(r - vertexX) * 1.6));
  const xMin = vertexX - spread;
  const xMax = vertexX + spread;

  const terms: Term[] = [
    { coefficient: a, power: 2 },
    { coefficient: b, power: 1 },
    { coefficient: c, power: 0 },
  ];
  const vertexY = evalPolynomial(terms, vertexX);

  const W = 340;
  const H = 260;
  const P = 36;
  const SAMPLES = 140;

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const x = xMin + ((xMax - xMin) * i) / SAMPLES;
    points.push({ x, y: evalPolynomial(terms, x) });
  }

  const ys = points.map((p) => p.y).concat(0, c);
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

  const bSign = b >= 0 ? "+" : "-";
  const cSign = c >= 0 ? "+" : "-";
  const equationLabel = `y = ${formatNumber(a)}${variable}^2 ${bSign} ${formatNumber(Math.abs(b))}${variable} ${cSign} ${formatNumber(Math.abs(c))}`;

  return (
    <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
      <p className="text-right text-sm font-extrabold text-black">הצגה גרפית:</p>

      <div dir="ltr" className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: CURVE_COLOR }} />
          <span className="font-mono text-xs font-bold text-slate-700">{equationLabel}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: VERTEX_COLOR }} />
          <span className="font-mono text-xs font-bold text-slate-700">
            קודקוד ({formatNumber(vertexX)}, {formatNumber(vertexY)})
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`גרף הפרבולה ${equationLabel} עם נקודות החיתוך עם הצירים וקודקוד הפרבולה`}
        className="mx-auto mt-2 w-full max-w-sm"
        style={{ direction: "ltr" }}
      >
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

        <path d={pathD} fill="none" stroke={CURVE_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        <line
          x1={sx(vertexX)}
          y1={sy(vertexY)}
          x2={sx(vertexX)}
          y2={sy(0)}
          stroke={VERTEX_COLOR}
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <circle cx={sx(vertexX)} cy={sy(vertexY)} r="5" fill={VERTEX_COLOR} stroke="#ffffff" strokeWidth="1.5" />
        <text
          x={sx(vertexX)}
          y={sy(vertexY) + (vertexY >= (yMin + yMax) / 2 ? 18 : -10)}
          fontSize="10"
          fontWeight="800"
          fill={VERTEX_COLOR}
          textAnchor="middle"
        >
          קודקוד ({formatNumber(vertexX)}, {formatNumber(vertexY)})
        </text>

        <circle cx={sx(0)} cy={sy(c)} r="4.5" fill={YINT_COLOR} stroke="#ffffff" strokeWidth="1.5" />
        <text x={sx(0) + 8} y={sy(c) - 6} fontSize="9" fontWeight="800" fill={YINT_COLOR}>
          (0, {formatNumber(c)})
        </text>

        {roots.map((r, i) => (
          <g key={`root-${i}`}>
            <circle cx={sx(r)} cy={sy(0)} r="5" fill={ROOT_COLOR} stroke="#ffffff" strokeWidth="1.5" />
            <text x={sx(r)} y={sy(0) + 24} fontSize="10" fontWeight="800" fill={ROOT_COLOR} textAnchor="middle">
              {variable} = {formatNumber(r)}
            </text>
          </g>
        ))}
      </svg>

      <p className="mt-2 text-right text-xs font-medium leading-relaxed text-slate-700">
        הקו הכחול הוא הפרבולה של הפונקציה, הנקודות האדומות הן החיתוך עם ציר ה-X (פתרונות המשוואה), הנקודה הירוקה היא החיתוך עם ציר ה-Y, והנקודה הסגולה היא קודקוד הפרבולה.
      </p>
    </div>
  );
}
