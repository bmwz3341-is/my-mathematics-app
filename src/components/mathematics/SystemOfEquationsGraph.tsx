"use client";

import type { StandardEquation } from "@/lib/systemOfEquations";

const LINE1_COLOR = "#2F6FED";
const LINE2_COLOR = "#f97316";
const POINT_COLOR = "#dc2626";

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

function collectFinite(values: (number | null | undefined)[]): number[] {
  return values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
}

function xIntercept(eq: StandardEquation): number | null {
  return eq.a !== 0 ? eq.c / eq.a : null;
}

function yIntercept(eq: StandardEquation): number | null {
  return eq.b !== 0 ? eq.c / eq.b : null;
}

/** Endpoints of the line clipped to the given box, for straight-line SVG rendering. */
function lineEndpoints(
  eq: StandardEquation,
  xMin: number,
  xMax: number,
): { x1: number; y1: number; x2: number; y2: number } {
  if (eq.b === 0) {
    const x0 = eq.c / eq.a;
    return { x1: x0, y1: xMin, x2: x0, y2: xMax };
  }
  const yAt = (x: number) => (eq.c - eq.a * x) / eq.b;
  return { x1: xMin, y1: yAt(xMin), x2: xMax, y2: yAt(xMax) };
}

interface SystemOfEquationsGraphProps {
  eq1: StandardEquation;
  eq2: StandardEquation;
  solution: { x: number; y: number } | null;
}

export default function SystemOfEquationsGraph({ eq1, eq2, solution }: SystemOfEquationsGraphProps) {
  const xs = collectFinite([solution?.x, xIntercept(eq1), xIntercept(eq2), 0]);
  const ys = collectFinite([solution?.y, yIntercept(eq1), yIntercept(eq2), 0]);

  let xMin = Math.min(...xs);
  let xMax = Math.max(...xs);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);

  if (xMax - xMin < 4) {
    const mid = (xMax + xMin) / 2;
    xMin = mid - 2;
    xMax = mid + 2;
  }
  if (yMax - yMin < 4) {
    const mid = (yMax + yMin) / 2;
    yMin = mid - 2;
    yMax = mid + 2;
  }
  const padX = (xMax - xMin) * 0.25;
  xMin -= padX;
  xMax += padX;
  const padY = (yMax - yMin) * 0.25;
  yMin -= padY;
  yMax += padY;

  const W = 340;
  const H = 260;
  const P = 36;

  const sx = (v: number) => P + ((v - xMin) / (xMax - xMin)) * (W - 2 * P);
  const sy = (v: number) => H - P - ((v - yMin) / (yMax - yMin)) * (H - 2 * P);

  const l1 = lineEndpoints(eq1, xMin, xMax);
  const l2 = lineEndpoints(eq2, xMin, xMax);

  return (
    <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
      <p className="text-right text-sm font-extrabold text-black">הצגה גרפית:</p>

      <div dir="ltr" className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: LINE1_COLOR }} />
          <span className="font-mono text-xs font-bold text-slate-700">{eq1.raw}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: LINE2_COLOR }} />
          <span className="font-mono text-xs font-bold text-slate-700">{eq2.raw}</span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`גרף הישרים ${eq1.raw} ו-${eq2.raw}`}
        className="mx-auto mt-2 w-full max-w-sm"
        style={{ direction: "ltr" }}
      >
        <defs>
          <clipPath id="system-plot-clip">
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

        <g clipPath="url(#system-plot-clip)">
          <line
            x1={sx(l1.x1)}
            y1={sy(l1.y1)}
            x2={sx(l1.x2)}
            y2={sy(l1.y2)}
            stroke={LINE1_COLOR}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1={sx(l2.x1)}
            y1={sy(l2.y1)}
            x2={sx(l2.x2)}
            y2={sy(l2.y2)}
            stroke={LINE2_COLOR}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>

        {solution && (
          <g>
            <circle cx={sx(solution.x)} cy={sy(solution.y)} r="5" fill={POINT_COLOR} stroke="#ffffff" strokeWidth="1.5" />
            <text
              x={sx(solution.x)}
              y={sy(solution.y) - 10}
              fontSize="10"
              fontWeight="800"
              fill={POINT_COLOR}
              textAnchor="middle"
            >
              ({formatNumber(solution.x)}, {formatNumber(solution.y)})
            </text>
          </g>
        )}
      </svg>

      <p className="mt-2 text-right text-xs font-medium leading-relaxed text-slate-700">
        {solution
          ? "הקו הכחול והקו הכתום הם שני הישרים, והנקודה האדומה היא נקודת החיתוך ביניהם — פתרון המערכת."
          : "הקו הכחול והקו הכתום הם שני הישרים; אין ביניהם נקודת חיתוך יחידה."}
      </p>
    </div>
  );
}
