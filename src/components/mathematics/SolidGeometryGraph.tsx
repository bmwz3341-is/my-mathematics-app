"use client";

import type { SolidKind } from "@/lib/spaceGeometry";

interface Props {
  kind: SolidKind;
  a: number;
  b?: number;
  c?: number;
  h?: number;
}

const COS30 = Math.sqrt(3) / 2;

type Pt3 = [number, number, number];
type Pt2 = [number, number];

function project([x, y, z]: Pt3): Pt2 {
  return [(x - z) * COS30, (x + z) * 0.5 - y];
}

interface Edge {
  from: Pt3;
  to: Pt3;
  dashed?: boolean;
}

interface Highlight {
  from: Pt3;
  to: Pt3;
  label: string;
}

interface Label {
  text: string;
  at: Pt3;
}

function fit(points: Pt2[], width: number, height: number, pad: number) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY);
  return (p: Pt2): Pt2 => [
    (p[0] - minX) * scale + pad + (width - 2 * pad - spanX * scale) / 2,
    (p[1] - minY) * scale + pad + (height - 2 * pad - spanY * scale) / 2,
  ];
}

export default function SolidGeometryGraph({ kind, a, b, c, h }: Props) {
  const W = 320;
  const H = 260;

  let edges: Edge[] = [];
  let labels: Label[] = [];
  let highlight: Highlight | null = null;

  if (kind === "box" || kind === "cube") {
    const bb = kind === "cube" ? a : (b ?? a);
    const cc = kind === "cube" ? a : (c ?? a);
    const v0: Pt3 = [0, 0, 0];
    const v1: Pt3 = [a, 0, 0];
    const v2: Pt3 = [a, 0, bb];
    const v3: Pt3 = [0, 0, bb];
    const v4: Pt3 = [0, cc, 0];
    const v5: Pt3 = [a, cc, 0];
    const v6: Pt3 = [a, cc, bb];
    const v7: Pt3 = [0, cc, bb];
    edges = [
      { from: v0, to: v1, dashed: true },
      { from: v0, to: v3, dashed: true },
      { from: v0, to: v4, dashed: true },
      { from: v1, to: v2 },
      { from: v2, to: v3 },
      { from: v1, to: v5 },
      { from: v2, to: v6 },
      { from: v3, to: v7 },
      { from: v4, to: v5 },
      { from: v5, to: v6 },
      { from: v6, to: v7 },
      { from: v4, to: v7 },
    ];
    labels = [
      { text: kind === "cube" ? "a" : "a", at: [a / 2, 0, bb] },
      { text: kind === "cube" ? "a" : "b", at: [a, 0, bb / 2] },
      { text: kind === "cube" ? "a" : "c", at: [a, cc / 2, 0] },
    ];
    highlight = { from: v1, to: v7, label: "d" };
  } else {
    const half = a / 2;
    const p0: Pt3 = [-half, 0, -half];
    const p1: Pt3 = [half, 0, -half];
    const p2: Pt3 = [half, 0, half];
    const p3: Pt3 = [-half, 0, half];
    const apex: Pt3 = [0, h ?? 0, 0];
    const base: Pt3 = [0, 0, 0];
    edges = [
      { from: p0, to: p1, dashed: true },
      { from: p3, to: p0, dashed: true },
      { from: p1, to: p2 },
      { from: p2, to: p3 },
      { from: p0, to: apex, dashed: true },
      { from: p1, to: apex },
      { from: p2, to: apex },
      { from: p3, to: apex },
      { from: apex, to: base, dashed: true },
    ];
    labels = [
      { text: "a", at: [0, 0, half] },
      { text: "h", at: [0, (h ?? 0) / 2, 0] },
    ];
    highlight = { from: p2, to: apex, label: "l" };
  }

  const allPts = [...edges.flatMap((e) => [project(e.from), project(e.to)]), project(highlight.from), project(highlight.to)];
  const toScreen = fit(allPts, W, H, 34);

  return (
    <div className="mt-3 flex justify-center rounded-xl border border-white/60 bg-white/40 p-3">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`שרטוט ${kind}`}>
        {edges.map((e, i) => {
          const [x1, y1] = toScreen(project(e.from));
          const [x2, y2] = toScreen(project(e.to));
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#2F6FED"
              strokeWidth={e.dashed ? 1.3 : 2}
              strokeDasharray={e.dashed ? "5 4" : undefined}
              opacity={e.dashed ? 0.5 : 0.9}
            />
          );
        })}
        {highlight && (
          <>
            {(() => {
              const [x1, y1] = toScreen(project(highlight.from));
              const [x2, y2] = toScreen(project(highlight.to));
              const [lx, ly] = toScreen(
                project([
                  (highlight.from[0] + highlight.to[0]) / 2,
                  (highlight.from[1] + highlight.to[1]) / 2,
                  (highlight.from[2] + highlight.to[2]) / 2,
                ]),
              );
              return (
                <>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f97316" strokeWidth={1.6} strokeDasharray="4 3" />
                  <text x={lx + 8} y={ly} fontSize={12} fontWeight={800} fill="#f97316">
                    {highlight.label}
                  </text>
                </>
              );
            })()}
          </>
        )}
        {labels.map((l, i) => {
          const [x, y] = toScreen(project(l.at));
          return (
            <text key={i} x={x} y={y} textAnchor="middle" fontSize={13} fontWeight={800} fill="#334155">
              {l.text}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
