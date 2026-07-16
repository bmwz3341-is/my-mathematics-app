"use client";

import { useEffect, useRef, useState } from "react";
import { type Vector3, cross, normalize, dot } from "@/lib/vectorUtils";
import type { Line3, Plane3 } from "@/lib/planeLineGeometry";

interface Props {
  /** Up to two lines (a single line, or a pair for line-vs-line visualizations). */
  line?: Line3;
  secondLine?: Line3;
  /** Up to two planes (a single plane, or a pair for angle-between-planes visualizations). */
  plane?: Plane3;
  secondPlane?: Plane3;
  /** A point to mark distinctly, e.g. an intersection point. */
  highlightPoint?: Vector3;
}

const W = 340;
const H = 280;
const SCALE = 34;
const AXIS_LEN = 3.5;
const PLANE_HALF = 2.4;
const LINE_HALF_RANGE = 3.2;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;

/** Rotates a point: yaw around the Y axis, then pitch around the (new) X axis. */
function rotate(p: Vector3, yawRad: number, pitchRad: number): Vector3 {
  const [x, y, z] = p;
  const x1 = x * Math.cos(yawRad) + z * Math.sin(yawRad);
  const z1 = -x * Math.sin(yawRad) + z * Math.cos(yawRad);
  const y2 = y * Math.cos(pitchRad) - z1 * Math.sin(pitchRad);
  const z2 = y * Math.sin(pitchRad) + z1 * Math.cos(pitchRad);
  return [x1, y2, z2];
}

interface Screen {
  x: number;
  y: number;
  depth: number;
}

function toScreen(p: Vector3, yawRad: number, pitchRad: number, zoom: number): Screen {
  const [x, y, z] = rotate(p, yawRad, pitchRad);
  return { x: W / 2 + x * SCALE * zoom, y: H / 2 - y * SCALE * zoom, depth: z };
}

/** Two unit vectors spanning the plane (perpendicular to its normal), for drawing a finite patch. */
function planeBasis(normal: Vector3): [Vector3, Vector3] {
  const n = normalize(normal) ?? [0, 0, 1];
  const helper: Vector3 = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = normalize(cross(n, helper)) ?? [1, 0, 0];
  const v = cross(n, u);
  return [u, v];
}

/** Point on the plane closest to the origin — a natural anchor for the rendered patch. */
function planeAnchor(plane: Plane3): Vector3 {
  const denom = dot(plane.normal, plane.normal) || 1;
  const k = plane.d / denom;
  return [plane.normal[0] * k, plane.normal[1] * k, plane.normal[2] * k];
}

export default function PlaneLineGraph({ line, secondLine, plane, secondPlane, highlightPoint }: Props) {
  const [yawDeg, setYawDeg] = useState(35);
  const [pitchDeg, setPitchDeg] = useState(20);
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; startYaw: number; startPitch: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Non-passive wheel listener so we can preventDefault (React's onWheel is passive by default).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z - e.deltaY * 0.001)));
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, startYaw: yawDeg, startPitch: pitchDeg };
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setYawDeg(drag.startYaw + dx * 0.5);
    setPitchDeg(Math.min(89, Math.max(-89, drag.startPitch - dy * 0.5)));
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }

  const yawRad = (yawDeg * Math.PI) / 180;
  const pitchRad = (pitchDeg * Math.PI) / 180;
  const project = (p: Vector3) => toScreen(p, yawRad, pitchRad, zoom);

  type Drawable =
    | { kind: "axis"; from: Vector3; to: Vector3; color: string; label?: string }
    | { kind: "line"; from: Vector3; to: Vector3; color: string }
    | { kind: "plane"; corners: Vector3[]; color: string }
    | { kind: "point"; at: Vector3; color: string };

  const drawables: Drawable[] = [
    { kind: "axis", from: [-AXIS_LEN, 0, 0], to: [AXIS_LEN, 0, 0], color: "#dc2626", label: "x" },
    { kind: "axis", from: [0, -AXIS_LEN, 0], to: [0, AXIS_LEN, 0], color: "#16a34a", label: "y" },
    { kind: "axis", from: [0, 0, -AXIS_LEN], to: [0, 0, AXIS_LEN], color: "#2563eb", label: "z" },
  ];

  const pushPlane = (pl: Plane3 | undefined, color: string) => {
    if (!pl) return;
    const [u, v] = planeBasis(pl.normal);
    const anchor = planeAnchor(pl);
    const corner = (su: number, sv: number): Vector3 => [
      anchor[0] + su * PLANE_HALF * u[0] + sv * PLANE_HALF * v[0],
      anchor[1] + su * PLANE_HALF * u[1] + sv * PLANE_HALF * v[1],
      anchor[2] + su * PLANE_HALF * u[2] + sv * PLANE_HALF * v[2],
    ];
    drawables.push({
      kind: "plane",
      corners: [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)],
      color,
    });
  };
  pushPlane(plane, "#2F6FED");
  pushPlane(secondPlane, "#eab308");

  const pushLine = (l: Line3 | undefined, color: string) => {
    if (!l) return;
    const dir = normalize(l.direction) ?? [1, 0, 0];
    const from: Vector3 = [l.point[0] - dir[0] * LINE_HALF_RANGE, l.point[1] - dir[1] * LINE_HALF_RANGE, l.point[2] - dir[2] * LINE_HALF_RANGE];
    const to: Vector3 = [l.point[0] + dir[0] * LINE_HALF_RANGE, l.point[1] + dir[1] * LINE_HALF_RANGE, l.point[2] + dir[2] * LINE_HALF_RANGE];
    drawables.push({ kind: "line", from, to, color });
  };
  pushLine(line, "#f97316");
  pushLine(secondLine, "#a855f7");

  if (highlightPoint) {
    drawables.push({ kind: "point", at: highlightPoint, color: "#dc2626" });
  }

  const depthOf = (d: Drawable): number => {
    if (d.kind === "plane") return d.corners.reduce((sum, c) => sum + project(c).depth, 0) / d.corners.length;
    if (d.kind === "point") return project(d.at).depth;
    return (project(d.from).depth + project(d.to).depth) / 2;
  };
  const ordered = [...drawables].sort((a, b) => depthOf(a) - depthOf(b));

  return (
    <div className="mt-3 flex flex-col items-center gap-1 rounded-xl border border-white/60 bg-white/40 p-3">
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="שרטוט תלת-ממדי של ישר ו/או מישור"
        className="touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {ordered.map((d, i) => {
          if (d.kind === "axis") {
            const p1 = project(d.from);
            const p2 = project(d.to);
            return (
              <g key={i}>
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={d.color} strokeWidth={1.3} opacity={0.55} />
                <text x={p2.x} y={p2.y} dy={-4} fontSize={12} fontWeight={800} fill={d.color}>
                  {d.label}
                </text>
              </g>
            );
          }
          if (d.kind === "line") {
            const p1 = project(d.from);
            const p2 = project(d.to);
            return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={d.color} strokeWidth={2.6} strokeLinecap="round" />;
          }
          if (d.kind === "plane") {
            const pts = d.corners.map((c) => project(c));
            return (
              <polygon
                key={i}
                points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                fill={d.color}
                fillOpacity={0.22}
                stroke={d.color}
                strokeWidth={1.4}
              />
            );
          }
          const p = project(d.at);
          return <circle key={i} cx={p.x} cy={p.y} r={4.5} fill={d.color} stroke="white" strokeWidth={1.2} />;
        })}
      </svg>
      <p className="text-center text-xs font-medium text-slate-500">גררו לסיבוב, גלגלו לזום</p>
    </div>
  );
}
