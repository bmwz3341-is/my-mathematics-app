"use client";

const AXIS_COLORS = { x: "#2F6FED", y: "#f97316", z: "#16a34a" };
const POINT_COLOR = "#0f172a";
const GUIDE_COLOR = "rgba(15,23,42,0.35)";

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

const COS30 = Math.sqrt(3) / 2;
const SIN30 = 0.5;

/** Isometric projection of a 3D point (x,y,z) onto the 2D plane. */
function project(px: number, py: number, pz: number): { ix: number; iy: number } {
  return { ix: (px - py) * COS30, iy: (px + py) * SIN30 - pz };
}

interface System3EquationsGraphProps {
  x: number;
  y: number;
  z: number;
}

export default function System3EquationsGraph({ x, y, z }: System3EquationsGraphProps) {
  const W = 340;
  const H = 280;
  const cx = W / 2;
  const cy = H * 0.58;

  const maxVal = Math.max(Math.abs(x), Math.abs(y), Math.abs(z), 1);
  const axisLen = maxVal * 1.35;
  const pxPerUnit = 100 / axisLen;

  const toScreen = (px: number, py: number, pz: number) => {
    const { ix, iy } = project(px, py, pz);
    return { sx: cx + ix * pxPerUnit, sy: cy - iy * pxPerUnit };
  };

  const origin = toScreen(0, 0, 0);
  const xAxisPos = toScreen(axisLen, 0, 0);
  const xAxisNeg = toScreen(-axisLen, 0, 0);
  const yAxisPos = toScreen(0, axisLen, 0);
  const yAxisNeg = toScreen(0, -axisLen, 0);
  const zAxisPos = toScreen(0, 0, axisLen);
  const zAxisNeg = toScreen(0, 0, -axisLen);

  const point = toScreen(x, y, z);
  const onX = toScreen(x, 0, 0);
  const onY = toScreen(0, y, 0);
  const onZ = toScreen(0, 0, z);

  return (
    <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
      <p className="text-right text-sm font-extrabold text-black">הצגה גרפית — נקודת הפתרון על הצירים:</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`נקודת הפתרון C(${formatNumber(x)}, ${formatNumber(y)}, ${formatNumber(z)}) במערכת צירים תלת-ממדית`}
        className="mx-auto mt-2 w-full max-w-sm"
        style={{ direction: "ltr" }}
      >
        {/* Axes */}
        <line x1={xAxisNeg.sx} y1={xAxisNeg.sy} x2={xAxisPos.sx} y2={xAxisPos.sy} stroke={AXIS_COLORS.x} strokeWidth="1.5" />
        <line x1={yAxisNeg.sx} y1={yAxisNeg.sy} x2={yAxisPos.sx} y2={yAxisPos.sy} stroke={AXIS_COLORS.y} strokeWidth="1.5" />
        <line x1={zAxisNeg.sx} y1={zAxisNeg.sy} x2={zAxisPos.sx} y2={zAxisPos.sy} stroke={AXIS_COLORS.z} strokeWidth="1.5" />

        <text x={xAxisPos.sx + 6} y={xAxisPos.sy + 4} fontSize="12" fontWeight="800" fill={AXIS_COLORS.x}>X</text>
        <text x={yAxisPos.sx + 6} y={yAxisPos.sy + 4} fontSize="12" fontWeight="800" fill={AXIS_COLORS.y}>Y</text>
        <text x={zAxisPos.sx} y={zAxisPos.sy - 8} fontSize="12" fontWeight="800" fill={AXIS_COLORS.z} textAnchor="middle">Z</text>
        <circle cx={origin.sx} cy={origin.sy} r="2" fill="#64748b" />
        <text x={origin.sx - 8} y={origin.sy + 14} fontSize="9" fill="#64748b" textAnchor="middle">0</text>

        {/* Dashed guide lines from the point to each axis */}
        <line x1={point.sx} y1={point.sy} x2={onX.sx} y2={onX.sy} stroke={GUIDE_COLOR} strokeWidth="1" strokeDasharray="3 3" />
        <line x1={point.sx} y1={point.sy} x2={onY.sx} y2={onY.sy} stroke={GUIDE_COLOR} strokeWidth="1" strokeDasharray="3 3" />
        <line x1={point.sx} y1={point.sy} x2={onZ.sx} y2={onZ.sy} stroke={GUIDE_COLOR} strokeWidth="1" strokeDasharray="3 3" />

        {/* Coordinate markers on each axis */}
        <circle cx={onX.sx} cy={onX.sy} r="3" fill={AXIS_COLORS.x} />
        <text x={onX.sx} y={onX.sy + 14} fontSize="9" fontWeight="700" fill={AXIS_COLORS.x} textAnchor="middle">{formatNumber(x)}</text>
        <circle cx={onY.sx} cy={onY.sy} r="3" fill={AXIS_COLORS.y} />
        <text x={onY.sx} y={onY.sy + 14} fontSize="9" fontWeight="700" fill={AXIS_COLORS.y} textAnchor="middle">{formatNumber(y)}</text>
        <circle cx={onZ.sx} cy={onZ.sy} r="3" fill={AXIS_COLORS.z} />
        <text x={onZ.sx - 10} y={onZ.sy + 3} fontSize="9" fontWeight="700" fill={AXIS_COLORS.z} textAnchor="end">{formatNumber(z)}</text>

        {/* The solution point */}
        <circle cx={point.sx} cy={point.sy} r="6" fill="#ffffff" />
        <circle cx={point.sx} cy={point.sy} r="4.5" fill={POINT_COLOR} />
        <text x={point.sx} y={point.sy - 12} fontSize="11" fontWeight="800" fill={POINT_COLOR} textAnchor="middle">
          C({formatNumber(x)}, {formatNumber(y)}, {formatNumber(z)})
        </text>
      </svg>

      <p className="mt-2 text-right text-xs font-medium leading-relaxed text-slate-700">
        הנקודה{" "}
        <bdi dir="ltr" className="font-mono font-bold text-slate-800">
          C({formatNumber(x)}, {formatNumber(y)}, {formatNumber(z)})
        </bdi>{" "}
        היא הפתרון היחיד המקיים את שלוש המשוואות בו-זמנית, מוצגת במערכת צירים תלת-ממדית X, Y, Z עם קווי הטלה מקווקווים לכל ציר.
      </p>
    </div>
  );
}
