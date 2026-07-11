"use client";

const POINT_COLOR = "#2F6FED";
const STEM_COLOR = "rgba(47,111,237,0.35)";
const TREND_COLOR = "#f97316";

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

interface SequenceTermsGraphProps {
  terms: number[];
  n: number;
  kindText: string;
}

export default function SequenceTermsGraph({ terms, n, kindText }: SequenceTermsGraphProps) {
  if (terms.length === 0) return null;

  const W = 340;
  const H = 240;
  const P = 36;

  let yMin = Math.min(...terms, 0);
  let yMax = Math.max(...terms, 0);
  if (yMax - yMin < 1e-6) {
    yMin -= 1;
    yMax += 1;
  }
  const padY = (yMax - yMin) * 0.15;
  yMin -= padY;
  yMax += padY;

  const count = terms.length;
  const sx = (k: number) => P + ((k - 1) / Math.max(count - 1, 1)) * (W - 2 * P);
  const sy = (v: number) => H - P - ((v - yMin) / (yMax - yMin)) * (H - 2 * P);

  const trendD = terms
    .map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i + 1).toFixed(1)} ${sy(v).toFixed(1)}`)
    .join(" ");

  return (
    <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
      <p className="text-right text-sm font-extrabold text-black">הצגה גרפית:</p>

      <div dir="ltr" className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: POINT_COLOR }} />
          <span className="font-mono text-xs font-bold text-slate-700">aₖ</span>
        </span>
        <span className="text-xs font-bold text-slate-700">{kindText}</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`גרף איברי הסדרה, ${kindText}`}
        className="mx-auto mt-2 w-full max-w-sm"
        style={{ direction: "ltr" }}
      >
        <line x1={P - 6} y1={sy(0)} x2={W - P + 6} y2={sy(0)} stroke="#94a3b8" strokeWidth="1" />
        <line x1={P - 2} y1={P - 6} x2={P - 2} y2={H - P + 6} stroke="#94a3b8" strokeWidth="1" />
        <text x={W - P + 10} y={sy(0) + 4} fontSize="11" fontWeight="700" fill="#64748b">
          n
        </text>
        <text x={P - 6} y={P - 10} fontSize="11" fontWeight="700" fill="#64748b" textAnchor="end">
          aₙ
        </text>

        <path d={trendD} fill="none" stroke={TREND_COLOR} strokeWidth="1.5" strokeDasharray="4 3" />

        {terms.map((v, i) => (
          <g key={i}>
            <line x1={sx(i + 1)} y1={sy(0)} x2={sx(i + 1)} y2={sy(v)} stroke={STEM_COLOR} strokeWidth="2" />
            <circle cx={sx(i + 1)} cy={sy(v)} r="4" fill={POINT_COLOR} stroke="#ffffff" strokeWidth="1.5" />
            <text x={sx(i + 1)} y={sy(0) + 14} fontSize="8" fill="#64748b" textAnchor="middle">
              {i + 1}
            </text>
            <text
              x={sx(i + 1)}
              y={sy(v) + (v >= 0 ? -8 : 14)}
              fontSize="8"
              fontWeight="800"
              fill={POINT_COLOR}
              textAnchor="middle"
            >
              {formatNumber(v)}
            </text>
          </g>
        ))}
      </svg>

      <p className="mt-2 text-right text-xs font-medium leading-relaxed text-slate-700">
        {terms.length < n
          ? `מוצגים ${terms.length} האיברים הראשונים מתוך ${n}; הקו הכתום המקווקו מראה את מגמת הסדרה.`
          : "כל איברי הסדרה מוצגים; הקו הכתום המקווקו מראה את מגמת הסדרה."}
      </p>
    </div>
  );
}
