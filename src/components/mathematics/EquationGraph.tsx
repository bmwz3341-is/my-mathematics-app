"use client";

import { formatNumericLinear, type NumericLinear } from "@/lib/equationSolver";

const LEFT_COLOR = "#2F6FED";
const RIGHT_COLOR = "#d95926";

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

/** A "nice" tick step (1/2/5 × 10^k) giving ~6 ticks across the range. */
function niceStep(range: number): number {
  const raw = range / 6;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) {
    if (raw <= m * mag) return m * mag;
  }
  return 10 * mag;
}

function ticks(min: number, max: number, avoid: number): number[] {
  const step = niceStep(max - min);
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) {
    const val = Math.abs(v) < 1e-9 ? 0 : v;
    if (val === 0) continue;
    if (Math.abs(val - avoid) < step * 0.4) continue;
    out.push(val);
  }
  return out;
}

interface EquationGraphProps {
  left: NumericLinear;
  right: NumericLinear;
  variable: string;
  x: number;
}

export default function EquationGraph({ left, right, variable, x }: EquationGraphProps) {
  const y = left.a * x + left.b;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const W = 340;
  const H = 250;
  const P = 34;

  const padX = Math.max(2, Math.abs(x) * 0.6);
  const xMin = Math.min(0, x) - padX;
  const xMax = Math.max(0, x) + padX;

  const yCandidates = [0, y].concat(
    [left, right].flatMap((l) => [l.a * xMin + l.b, l.a * xMax + l.b]),
  );
  let yMin = Math.min(...yCandidates);
  let yMax = Math.max(...yCandidates);
  const padY = Math.max(2, (yMax - yMin) * 0.15);
  yMin -= padY;
  yMax += padY;

  const sx = (v: number) => P + ((v - xMin) / (xMax - xMin)) * (W - 2 * P);
  const sy = (v: number) => H - P - ((v - yMin) / (yMax - yMin)) * (H - 2 * P);

  const leftLabel = `y = ${formatNumericLinear(left, variable)}`;
  const rightLabel = `y = ${formatNumericLinear(right, variable)}`;

  return (
    <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
      <p className="text-right text-sm font-extrabold text-black">הצגה גרפית:</p>

      <div dir="ltr" className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {[
          { color: LEFT_COLOR, label: leftLabel },
          { color: RIGHT_COLOR, label: rightLabel },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-mono text-xs font-bold text-slate-700">{label}</span>
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`גרף של ${leftLabel} ו-${rightLabel} עם נקודת חיתוך ב-${variable} = ${formatNumber(x)}`}
        className="mx-auto mt-2 w-full max-w-sm"
        style={{ direction: "ltr" }}
      >
        {/* Axes */}
        <line x1={P - 6} y1={sy(0)} x2={W - P + 6} y2={sy(0)} stroke="#94a3b8" strokeWidth="1" />
        <line x1={sx(0)} y1={P - 6} x2={sx(0)} y2={H - P + 6} stroke="#94a3b8" strokeWidth="1" />
        <text x={W - P + 10} y={sy(0) + 4} fontSize="11" fontWeight="700" fill="#64748b">
          x
        </text>
        <text x={sx(0) - 4} y={P - 10} fontSize="11" fontWeight="700" fill="#64748b" textAnchor="end">
          y
        </text>
        <text x={sx(0) - 4} y={sy(0) + 12} fontSize="9" fill="#64748b" textAnchor="end">
          0
        </text>

        {/* Numeric ticks along both axes */}
        {ticks(xMin, xMax, x).map((v) => (
          <g key={`tx-${v}`}>
            <line x1={sx(v)} y1={sy(0) - 3} x2={sx(v)} y2={sy(0) + 3} stroke="#94a3b8" strokeWidth="1" />
            <text x={sx(v)} y={sy(0) + 14} fontSize="9" fill="#64748b" textAnchor="middle">
              {formatNumber(v)}
            </text>
          </g>
        ))}
        {ticks(yMin, yMax, y).map((v) => (
          <g key={`ty-${v}`}>
            <line x1={sx(0) - 3} y1={sy(v)} x2={sx(0) + 3} y2={sy(v)} stroke="#94a3b8" strokeWidth="1" />
            <text x={sx(0) - 5} y={sy(v) + 3} fontSize="9" fill="#64748b" textAnchor="end">
              {formatNumber(v)}
            </text>
          </g>
        ))}

        {/* Dashed guides from the intersection to both axes */}
        <line
          x1={sx(x)}
          y1={sy(y)}
          x2={sx(x)}
          y2={sy(0)}
          stroke="#64748b"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <line
          x1={sx(x)}
          y1={sy(y)}
          x2={sx(0)}
          y2={sy(y)}
          stroke="#64748b"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* The two lines */}
        <line
          x1={sx(xMin)}
          y1={sy(left.a * xMin + left.b)}
          x2={sx(xMax)}
          y2={sy(left.a * xMax + left.b)}
          stroke={LEFT_COLOR}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1={sx(xMin)}
          y1={sy(right.a * xMin + right.b)}
          x2={sx(xMax)}
          y2={sy(right.a * xMax + right.b)}
          stroke={RIGHT_COLOR}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Intersection marker with a surface ring */}
        <circle cx={sx(x)} cy={sy(y)} r="6.5" fill="#ffffff" />
        <circle cx={sx(x)} cy={sy(y)} r="4.5" fill="#0f172a" />
        <text
          x={sx(x)}
          y={sy(y) - 12}
          fontSize="11"
          fontWeight="800"
          fill="#0f172a"
          textAnchor="middle"
        >
          ({formatNumber(x)}, {formatNumber(y)})
        </text>

        {/* Axis value ticks at the intersection projections */}
        {Math.abs(x) > 1e-9 && (
          <text x={sx(x)} y={sy(0) + 14} fontSize="10" fontWeight="700" fill="#334155" textAnchor="middle">
            {formatNumber(x)}
          </text>
        )}
        {Math.abs(y) > 1e-9 && (
          <text x={sx(0) - 4} y={sy(y) + 3} fontSize="10" fontWeight="700" fill="#334155" textAnchor="end">
            {formatNumber(y)}
          </text>
        )}
      </svg>

      <p className="mt-2 text-right text-xs font-medium leading-relaxed text-slate-700">
        כל אגף של המשוואה מצויר כקו ישר: הקו הכחול הוא <bdi dir="ltr" className="font-mono font-bold text-slate-800">{leftLabel}</bdi> והקו הכתום הוא <bdi dir="ltr" className="font-mono font-bold text-slate-800">{rightLabel}</bdi>, ושני הקווים נחתכים בנקודה אחת בלבד.
        <br />
        בנקודת החיתוך שני האגפים שווים בדיוק, ולכן שיעור ה-X שלה — <bdi dir="ltr" className="font-mono font-bold">{variable} = {formatNumber(x)}</bdi> — הוא פתרון המשוואה.
      </p>
    </div>
  );
}
