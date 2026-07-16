/**
 * Pure 3D-vector primitives shared by the space-geometry solvers (planes, lines,
 * distances, angles). Deliberately free of pedagogical-step/formatting concerns —
 * those live in the solver layer (e.g. planeLineGeometry.ts) so this file stays a
 * plain, unit-testable math library. Vector3 is a tuple (not {x,y,z}) to match the
 * convention already used by algebraicVectors.ts and spaceGeometry.ts.
 */

export type Vector3 = [number, number, number];

const DEFAULT_TOLERANCE = 1e-9;

export function vecAdd(u: Vector3, v: Vector3): Vector3 {
  return [u[0] + v[0], u[1] + v[1], u[2] + v[2]];
}

export function vecSub(u: Vector3, v: Vector3): Vector3 {
  return [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
}

export function vecScale(u: Vector3, k: number): Vector3 {
  return [k * u[0], k * u[1], k * u[2]];
}

export function dot(u: Vector3, v: Vector3): number {
  return u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
}

export function cross(u: Vector3, v: Vector3): Vector3 {
  return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
}

export function magnitude(u: Vector3): number {
  return Math.sqrt(dot(u, u));
}

export function isZeroVector(u: Vector3, tolerance = DEFAULT_TOLERANCE): boolean {
  return magnitude(u) < tolerance;
}

/** Returns null for the zero vector (normalization is undefined) instead of throwing — callers decide how to report that. */
export function normalize(u: Vector3, tolerance = DEFAULT_TOLERANCE): Vector3 | null {
  const m = magnitude(u);
  if (m < tolerance) return null;
  return vecScale(u, 1 / m);
}

/** Two vectors are parallel iff their cross product is (approximately) the zero vector. */
export function areParallel(u: Vector3, v: Vector3, tolerance = DEFAULT_TOLERANCE): boolean {
  return isZeroVector(cross(u, v), tolerance);
}

function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4 || 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function formatVector3(u: Vector3): string {
  return `(${u.map(formatNumber).join(", ")})`;
}
