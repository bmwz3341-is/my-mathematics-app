import { describe, expect, it } from "vitest";
import { vecAdd, vecSub, vecScale, dot, cross, magnitude, isZeroVector, normalize, areParallel, formatVector3 } from "./vectorUtils";

describe("vecAdd / vecSub", () => {
  it("adds component-wise", () => {
    expect(vecAdd([1, 2, 3], [4, -5, 6])).toEqual([5, -3, 9]);
  });
  it("subtracts component-wise", () => {
    expect(vecSub([1, 2, 3], [4, -5, 6])).toEqual([-3, 7, -3]);
  });
});

describe("vecScale", () => {
  it("scales every component", () => {
    expect(vecScale([1, -2, 3], 2)).toEqual([2, -4, 6]);
  });
  it("scaling by 0 gives the zero vector", () => {
    expect(vecScale([5, 5, 5], 0)).toEqual([0, 0, 0]);
  });
});

describe("dot", () => {
  it("computes the scalar product", () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
  });
  it("is zero for perpendicular vectors", () => {
    expect(dot([1, 0, 0], [0, 1, 0])).toBe(0);
  });
});

describe("cross", () => {
  it("computes the standard basis identities: i x j = k", () => {
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
  });
  it("j x k = i", () => {
    expect(cross([0, 1, 0], [0, 0, 1])).toEqual([1, 0, 0]);
  });
  it("k x i = j", () => {
    expect(cross([0, 0, 1], [1, 0, 0])).toEqual([0, 1, 0]);
  });
  it("is anti-commutative: v x u = -(u x v)", () => {
    const u: [number, number, number] = [2, -1, 3];
    const v: [number, number, number] = [0, 4, -2];
    const uv = cross(u, v);
    const vu = cross(v, u);
    expect(vu).toEqual([-uv[0], -uv[1], -uv[2]]);
  });
  it("is the zero vector for parallel inputs", () => {
    expect(cross([2, 4, 6], [1, 2, 3])).toEqual([0, 0, 0]);
  });
});

describe("magnitude", () => {
  it("computes the Euclidean length", () => {
    expect(magnitude([3, 4, 0])).toBe(5);
  });
  it("is zero for the zero vector", () => {
    expect(magnitude([0, 0, 0])).toBe(0);
  });
});

describe("isZeroVector", () => {
  it("is true for the exact zero vector", () => {
    expect(isZeroVector([0, 0, 0])).toBe(true);
  });
  it("is true within tolerance of zero", () => {
    expect(isZeroVector([1e-12, -1e-12, 0])).toBe(true);
  });
  it("is false for a non-zero vector", () => {
    expect(isZeroVector([0.01, 0, 0])).toBe(false);
  });
});

describe("normalize", () => {
  it("produces a unit vector in the same direction", () => {
    const n = normalize([3, 4, 0])!;
    expect(n[0]).toBeCloseTo(0.6);
    expect(n[1]).toBeCloseTo(0.8);
    expect(n[2]).toBeCloseTo(0);
    expect(magnitude(n)).toBeCloseTo(1);
  });
  it("returns null for the zero vector", () => {
    expect(normalize([0, 0, 0])).toBeNull();
  });
});

describe("areParallel", () => {
  it("is true for scalar multiples", () => {
    expect(areParallel([1, 2, 3], [-2, -4, -6])).toBe(true);
  });
  it("is false for non-parallel vectors", () => {
    expect(areParallel([1, 0, 0], [0, 1, 0])).toBe(false);
  });
});

describe("formatVector3", () => {
  it("renders as a parenthesized comma-separated triple", () => {
    expect(formatVector3([1, -2, 3])).toBe("(1, -2, 3)");
  });
  it("rounds to at most 4 decimal places", () => {
    expect(formatVector3([1 / 3, 0, 0])).toBe("(0.3333, 0, 0)");
  });
});
