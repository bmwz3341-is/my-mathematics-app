"use client";

import type { ArgandPoint } from "@/lib/complexSolver";

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4;
  const clean = Object.is(rounded, -0) ? 0 : rounded;
  return clean.toLocaleString("en-US", { maximumFractionDigits: 4 });
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

interface ArgandDiagramProps {
  points: ArgandPoint[];
  /** Optional circle |z| = r, useful for roots and for showing the modulus. */
  circleRadius?: number;
}

export default function ArgandDiagram({ points, circleRadius }: ArgandDiagramProps) {
  const W = 340;
  const H = 300;
  const P = 36;

  // Symmetric square range around the origin so angles are not distorted.
  const magnitudes = points.flatMap((p) => [Math.abs(p.re), Math.abs(p.im)]);
  if (circleRadius) magnitudes.push(circleRadius);
  const extent = Math.max(1, ...magnitudes) * 1.25;

  const size = Math.min(W, H) - 2 * P;
  const cx = W / 2;
  const cy = H / 2;
  const sx = (v: number) => cx + (v / extent) * (size / 2 + P / 2);
  const sy = (v: number) => cy - (v / extent) * (size / 2 + P / 2);
  const scale = (size / 2 + P / 2) / extent;

  return (
    <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
      <p className="text-right text-sm font-extrabold text-black">מישור גאוס (Argand Diagram):</p>

      <div dir="ltr" className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {points.map((p, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="font-mono text-xs font-bold text-slate-700">
              {p.label} = ({formatNumber(p.re)}, {formatNumber(p.im)})
            </span>
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="מישור גאוס — הצגת המספרים המרוכבים כנקודות במישור"
        className="mx-auto mt-2 w-full max-w-sm"
        style={{ direction: "ltr" }}
      >
        <line x1={8} y1={cy} x2={W - 8} y2={cy} stroke="#94a3b8" strokeWidth="1" />
        <line x1={cx} y1={8} x2={cx} y2={H - 8} stroke="#94a3b8" strokeWidth="1" />
        <text x={W - 10} y={cy - 6} fontSize="11" fontWeight="700" fill="#64748b" textAnchor="end">
          Re
        </text>
        <text x={cx + 6} y={16} fontSize="11" fontWeight="700" fill="#64748b">
          Im
        </text>

        {ticks(-extent, extent).map((v) => (
          <g key={`tx-${v}`}>
            <line x1={sx(v)} y1={cy - 3} x2={sx(v)} y2={cy + 3} stroke="#94a3b8" strokeWidth="1" />
            <text x={sx(v)} y={cy + 14} fontSize="9" fill="#64748b" textAnchor="middle">
              {formatNumber(v)}
            </text>
          </g>
        ))}
        {ticks(-extent, extent).map((v) => (
          <g key={`ty-${v}`}>
            <line x1={cx - 3} y1={sy(v)} x2={cx + 3} y2={sy(v)} stroke="#94a3b8" strokeWidth="1" />
            <text x={cx - 6} y={sy(v) + 3} fontSize="9" fill="#64748b" textAnchor="end">
              {formatNumber(v)}
            </text>
          </g>
        ))}

        {circleRadius ? (
          <circle
            cx={cx}
            cy={cy}
            r={circleRadius * scale}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ) : null}

        {points.map((p, i) => (
          <g key={`v-${i}`}>
            {/* dashed projections onto the axes */}
            <line
              x1={sx(p.re)}
              y1={sy(p.im)}
              x2={sx(p.re)}
              y2={cy}
              stroke={p.color}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.5"
            />
            <line
              x1={sx(p.re)}
              y1={sy(p.im)}
              x2={cx}
              y2={sy(p.im)}
              stroke={p.color}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.5"
            />
            {/* vector from the origin */}
            <line x1={cx} y1={cy} x2={sx(p.re)} y2={sy(p.im)} stroke={p.color} strokeWidth="2" />
            <circle cx={sx(p.re)} cy={sy(p.im)} r="5" fill={p.color} stroke="#ffffff" strokeWidth="1.5" />
            <text
              x={sx(p.re) + (p.re >= 0 ? 8 : -8)}
              y={sy(p.im) + (p.im >= 0 ? -8 : 14)}
              fontSize="11"
              fontWeight="800"
              fill={p.color}
              textAnchor={p.re >= 0 ? "start" : "end"}
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>

      <p className="mt-2 text-right text-xs font-medium leading-relaxed text-slate-700">
        כל מספר מרוכב a + bi מוצג כנקודה (a, b): הציר האופקי (Re) הוא החלק הממשי והציר האנכי (Im) הוא החלק המדומה.
        החץ מהראשית לנקודה מייצג את הווקטור של המספר, והקווים המקווקווים מראים את ההיטלים על הצירים.
      </p>
    </div>
  );
}
