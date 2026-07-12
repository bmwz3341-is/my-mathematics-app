"use client";

import type { NormalMode } from "@/lib/probabilityStatistics";

const CURVE_COLOR = "#2F6FED";
const SHADE_COLOR = "rgba(249,115,22,0.45)";
const AXIS_COLOR = "#94a3b8";

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function gaussian(x: number, mu: number, sigma: number): number {
  return Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
}

interface NormalDistributionGraphProps {
  mu: number;
  sigma: number;
  mode: NormalMode;
  x: number;
  x2?: number;
}

export default function NormalDistributionGraph({ mu, sigma, mode, x, x2 }: NormalDistributionGraphProps) {
  const W = 340;
  const H = 200;
  const P = 30;

  const xMin = mu - 4 * sigma;
  const xMax = mu + 4 * sigma;
  const yMax = gaussian(mu, mu, sigma);

  const sx = (v: number) => P + ((v - xMin) / (xMax - xMin)) * (W - 2 * P);
  const sy = (v: number) => H - P - (v / yMax) * (H - 2 * P - 10);

  const SAMPLES = 80;
  const curvePoints: [number, number][] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const xv = xMin + (i / SAMPLES) * (xMax - xMin);
    curvePoints.push([xv, gaussian(xv, mu, sigma)]);
  }
  const curveD = curvePoints.map(([xv, yv], i) => `${i === 0 ? "M" : "L"} ${sx(xv).toFixed(1)} ${sy(yv).toFixed(1)}`).join(" ");

  let shadeLo: number;
  let shadeHi: number;
  if (mode === "below") {
    shadeLo = xMin;
    shadeHi = x;
  } else if (mode === "above") {
    shadeLo = x;
    shadeHi = xMax;
  } else {
    shadeLo = Math.min(x, x2 ?? x);
    shadeHi = Math.max(x, x2 ?? x);
  }
  shadeLo = Math.max(shadeLo, xMin);
  shadeHi = Math.min(shadeHi, xMax);

  const shadePoints: [number, number][] = [];
  const SHADE_SAMPLES = 50;
  for (let i = 0; i <= SHADE_SAMPLES; i++) {
    const xv = shadeLo + (i / SHADE_SAMPLES) * (shadeHi - shadeLo);
    shadePoints.push([xv, gaussian(xv, mu, sigma)]);
  }
  const shadeD =
    shadePoints.length > 1
      ? `M ${sx(shadeLo).toFixed(1)} ${sy(0).toFixed(1)} ` +
        shadePoints.map(([xv, yv]) => `L ${sx(xv).toFixed(1)} ${sy(yv).toFixed(1)}`).join(" ") +
        ` L ${sx(shadeHi).toFixed(1)} ${sy(0).toFixed(1)} Z`
      : "";

  return (
    <div className="mt-3 rounded-xl border border-white/60 bg-white/40 px-4 py-4">
      <p className="text-right text-sm font-extrabold text-black">הצגה גרפית — עקומת הפעמון:</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="גרף התפלגות נורמלית עם השטח המבוקש מוצבע"
        className="mx-auto mt-2 w-full max-w-sm"
        style={{ direction: "ltr" }}
      >
        <line x1={P - 6} y1={sy(0)} x2={W - P + 6} y2={sy(0)} stroke={AXIS_COLOR} strokeWidth="1" />
        {shadeD && <path d={shadeD} fill={SHADE_COLOR} stroke="none" />}
        <path d={curveD} fill="none" stroke={CURVE_COLOR} strokeWidth="2" />

        <line x1={sx(mu)} y1={sy(0)} x2={sx(mu)} y2={sy(yMax)} stroke={CURVE_COLOR} strokeWidth="1" strokeDasharray="3 2" />
        <text x={sx(mu)} y={H - P + 14} fontSize="9" fontWeight="800" fill={CURVE_COLOR} textAnchor="middle">
          μ = {formatNumber(mu)}
        </text>

        <line x1={sx(x)} y1={sy(0)} x2={sx(x)} y2={sy(gaussian(x, mu, sigma))} stroke="#f97316" strokeWidth="1.5" />
        <text x={sx(x)} y={H - P + 26} fontSize="9" fontWeight="800" fill="#ea580c" textAnchor="middle">
          x = {formatNumber(x)}
        </text>

        {mode === "between" && x2 !== undefined && (
          <>
            <line x1={sx(x2)} y1={sy(0)} x2={sx(x2)} y2={sy(gaussian(x2, mu, sigma))} stroke="#f97316" strokeWidth="1.5" />
            <text x={sx(x2)} y={H - P + 26} fontSize="9" fontWeight="800" fill="#ea580c" textAnchor="middle">
              x2 = {formatNumber(x2)}
            </text>
          </>
        )}
      </svg>

      <p className="mt-2 text-right text-xs font-medium leading-relaxed text-slate-700">
        השטח הכתום מתחת לעקומה מייצג את ההסתברות המבוקשת (שטח כולל מתחת לעקומה = 1).
      </p>
    </div>
  );
}
