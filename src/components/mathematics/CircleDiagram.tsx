"use client";

const CIRCLE_STROKE = "#2F6FED";
const CIRCLE_FILL = "#2F6FED14";
const RADIUS_STROKE = "#334155";
const POINT_COLOR = "#dc2626";
const TANGENT_COLOR = "#ea580c";

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4 || 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

interface CircleDiagramProps {
  centerX: number;
  centerY: number;
  radius: number;
  point?: { x: number; y: number };
  /** Present (including null for a vertical line) only when a tangent should be drawn through `point`. */
  tangentSlope?: number | null;
}

export default function CircleDiagram({ centerX, centerY, radius, point, tangentSlope }: CircleDiagramProps) {
  const W = 280;
  const H = 280;
  const P = 40;
  const range = radius * 1.35 || 1;
  const xMin = centerX - range;
  const xMax = centerX + range;
  const yMin = centerY - range;
  const yMax = centerY + range;
  // A single uniform scale for both axes (square viewBox + square domain) keeps the circle round.
  const scale = (W - 2 * P) / (2 * range);
  const sx = (v: number) => P + (v - xMin) * scale;
  const sy = (v: number) => H - P - (v - yMin) * scale;

  const showXAxis = yMin <= 0 && 0 <= yMax;
  const showYAxis = xMin <= 0 && 0 <= xMax;

  let tangentLine: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (point && tangentSlope !== undefined) {
    if (tangentSlope === null) {
      tangentLine = { x1: sx(point.x), y1: sy(yMin), x2: sx(point.x), y2: sy(yMax) };
    } else {
      const yAtXMin = point.y + tangentSlope * (xMin - point.x);
      const yAtXMax = point.y + tangentSlope * (xMax - point.x);
      tangentLine = { x1: sx(xMin), y1: sy(yAtXMin), x2: sx(xMax), y2: sy(yAtXMax) };
    }
  }

  return (
    <div className="mt-3 flex flex-col items-center rounded-xl border border-white/60 bg-white/50 py-4">
      <svg viewBox={`0 0 ${W} ${H}`} width={240} height={240}>
        <defs>
          <clipPath id="circle-diagram-clip">
            <rect x={P} y={P} width={W - 2 * P} height={H - 2 * P} />
          </clipPath>
        </defs>

        {showXAxis && <line x1={P} y1={sy(0)} x2={W - P} y2={sy(0)} stroke="#94a3b8" strokeWidth={1} />}
        {showYAxis && <line x1={sx(0)} y1={P} x2={sx(0)} y2={H - P} stroke="#94a3b8" strokeWidth={1} />}

        <g clipPath="url(#circle-diagram-clip)">
          {tangentLine && (
            <line x1={tangentLine.x1} y1={tangentLine.y1} x2={tangentLine.x2} y2={tangentLine.y2} stroke={TANGENT_COLOR} strokeWidth={2.5} />
          )}
          <circle cx={sx(centerX)} cy={sy(centerY)} r={radius * scale} fill={CIRCLE_FILL} stroke={CIRCLE_STROKE} strokeWidth={2.5} />
          {point ? (
            <line x1={sx(centerX)} y1={sy(centerY)} x2={sx(point.x)} y2={sy(point.y)} stroke={RADIUS_STROKE} strokeWidth={1.5} strokeDasharray="4 3" />
          ) : (
            <line x1={sx(centerX)} y1={sy(centerY)} x2={sx(centerX + radius)} y2={sy(centerY)} stroke={RADIUS_STROKE} strokeWidth={1.5} strokeDasharray="4 3" />
          )}
        </g>

        <circle cx={sx(centerX)} cy={sy(centerY)} r={3.5} fill={RADIUS_STROKE} />
        <text x={sx(centerX)} y={sy(centerY) - 8} fontSize={10} fontWeight={800} fill={RADIUS_STROKE} textAnchor="middle">
          ({formatNumber(centerX)}, {formatNumber(centerY)})
        </text>

        {point ? (
          <>
            <circle cx={sx(point.x)} cy={sy(point.y)} r={4} fill={POINT_COLOR} stroke="white" strokeWidth={1.5} />
            <text x={sx(point.x)} y={sy(point.y) - 10} fontSize={10} fontWeight={800} fill={POINT_COLOR} textAnchor="middle">
              P({formatNumber(point.x)}, {formatNumber(point.y)})
            </text>
          </>
        ) : (
          <text
            x={(sx(centerX) + sx(centerX + radius)) / 2}
            y={sy(centerY) - 6}
            fontSize={10}
            fontWeight={800}
            fill={RADIUS_STROKE}
            textAnchor="middle"
          >
            R={formatNumber(radius)}
          </text>
        )}
      </svg>

      <div dir="ltr" className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2" style={{ borderColor: CIRCLE_STROKE }} />
          <span className="font-mono text-xs font-bold text-slate-700">מעגל</span>
        </span>
        {point && (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: POINT_COLOR }} />
            <span className="font-mono text-xs font-bold text-slate-700">נקודת ההשקה P</span>
          </span>
        )}
        {tangentLine && (
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: TANGENT_COLOR }} />
            <span className="font-mono text-xs font-bold text-slate-700">משיק</span>
          </span>
        )}
      </div>
    </div>
  );
}
