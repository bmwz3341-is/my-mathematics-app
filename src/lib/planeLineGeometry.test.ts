import { describe, expect, it } from "vitest";
import {
  solvePlaneFromThreePoints,
  solvePlaneFromPointAndTwoDirections,
  solveLineForm,
  lineRelationship,
  linePlaneRelationship,
  angleLinePlane,
  angleBetweenPlanes,
  distancePointToPlane,
  type Line3,
  type Plane3,
} from "./planeLineGeometry";
import type { Vector3 } from "./vectorUtils";

describe("solvePlaneFromThreePoints", () => {
  it("finds x + y + z = 1 through the three unit-axis points", () => {
    const result = solvePlaneFromThreePoints([1, 0, 0], [0, 1, 0], [0, 0, 1]);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.plane.normal).toEqual([1, 1, 1]);
    expect(result.plane.d).toBe(1);
    expect(result.equation).toBe("x + y + z = 1");
  });

  it("finds a plane through three general points that satisfies all three", () => {
    const result = solvePlaneFromThreePoints([1, 2, 3], [4, 0, 1], [2, 5, 0]);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    const { normal, d } = result.plane;
    const onPlane = (p: Vector3) => normal[0] * p[0] + normal[1] * p[1] + normal[2] * p[2];
    expect(onPlane([1, 2, 3])).toBeCloseTo(d);
    expect(onPlane([4, 0, 1])).toBeCloseTo(d);
    expect(onPlane([2, 5, 0])).toBeCloseTo(d);
  });

  it("rejects three collinear points (no unique plane)", () => {
    const result = solvePlaneFromThreePoints([0, 0, 0], [1, 1, 1], [2, 2, 2]);
    expect(result.type).toBe("error");
  });

  it("rejects two coincident points among the three", () => {
    const result = solvePlaneFromThreePoints([1, 1, 1], [1, 1, 1], [0, 2, 0]);
    expect(result.type).toBe("error");
  });

  it("records a step naming the cross product as the source of the normal", () => {
    const result = solvePlaneFromThreePoints([1, 0, 0], [0, 1, 0], [0, 0, 1]);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.steps.some((s) => s.law.includes("מכפלה וקטורית"))).toBe(true);
  });
});

describe("lineRelationship", () => {
  it("detects parallel (distinct) lines", () => {
    const l1: Line3 = { point: [0, 0, 0], direction: [1, 2, 3] };
    const l2: Line3 = { point: [1, 0, 0], direction: [2, 4, 6] }; // scalar multiple of l1's direction
    const result = lineRelationship(l1, l2);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.kind).toBe("parallel");
    expect(result.intersection).toBeUndefined();
  });

  it("detects coincident lines (same line, different parametrization)", () => {
    const l1: Line3 = { point: [0, 0, 0], direction: [1, 1, 1] };
    const l2: Line3 = { point: [2, 2, 2], direction: [2, 2, 2] }; // (2,2,2) lies on l1 at t=2
    const result = lineRelationship(l1, l2);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.kind).toBe("coincident");
  });

  it("detects intersecting lines and finds the intersection point", () => {
    const l1: Line3 = { point: [1, 0, 0], direction: [1, 1, 0] };
    const l2: Line3 = { point: [0, 1, 0], direction: [1, -1, 0] };
    const result = lineRelationship(l1, l2);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.kind).toBe("intersecting");
    expect(result.intersection?.[0]).toBeCloseTo(1);
    expect(result.intersection?.[1]).toBeCloseTo(0);
    expect(result.intersection?.[2]).toBeCloseTo(0);
  });

  it("detects skew lines (the classic non-parallel, non-coplanar example)", () => {
    const l1: Line3 = { point: [0, 0, 0], direction: [1, 0, 0] };
    const l2: Line3 = { point: [0, 0, 1], direction: [0, 1, 0] };
    const result = lineRelationship(l1, l2);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.kind).toBe("skew");
    expect(result.intersection).toBeUndefined();
  });

  it("shows the direction-vector comparison step for the parallel case", () => {
    const l1: Line3 = { point: [0, 0, 0], direction: [1, 2, 3] };
    const l2: Line3 = { point: [1, 0, 0], direction: [2, 4, 6] };
    const result = lineRelationship(l1, l2);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.steps.some((s) => s.law.includes("וקטורי הכיוון"))).toBe(true);
  });

  it("shows the two-equation system for the intersecting case", () => {
    const l1: Line3 = { point: [1, 0, 0], direction: [1, 1, 0] };
    const l2: Line3 = { point: [0, 1, 0], direction: [1, -1, 0] };
    const result = lineRelationship(l1, l2);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.steps.some((s) => s.law.includes("מערכת המשוואות"))).toBe(true);
  });
});

describe("linePlaneRelationship", () => {
  const plane: Plane3 = { normal: [1, 1, 1], d: 1 }; // x + y + z = 1

  it("detects a line fully contained in the plane", () => {
    const line: Line3 = { point: [1, 0, 0], direction: [1, -1, 0] }; // point on plane, direction ⟂ normal
    const result = linePlaneRelationship(line, plane);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.kind).toBe("contained");
    expect(result.intersection).toBeUndefined();
  });

  it("detects a line parallel to the plane with no common points", () => {
    const line: Line3 = { point: [2, 0, 0], direction: [1, -1, 0] }; // direction ⟂ normal, point off the plane
    const result = linePlaneRelationship(line, plane);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.kind).toBe("parallel");
    expect(result.intersection).toBeUndefined();
  });

  it("detects an intersecting line and solves for the intersection point", () => {
    const line: Line3 = { point: [0, 0, 0], direction: [1, 0, 0] };
    const result = linePlaneRelationship(line, plane);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.kind).toBe("intersecting");
    expect(result.intersection?.[0]).toBeCloseTo(1);
    expect(result.intersection?.[1]).toBeCloseTo(0);
    expect(result.intersection?.[2]).toBeCloseTo(0);
  });

  it("handles the special case of a line perpendicular to the plane (direction parallel to the normal)", () => {
    const line: Line3 = { point: [0, 0, 0], direction: [1, 1, 1] }; // direction is exactly the plane's normal
    const result = linePlaneRelationship(line, plane);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.kind).toBe("intersecting");
    expect(result.intersection?.[0]).toBeCloseTo(1 / 3);
    expect(result.intersection?.[1]).toBeCloseTo(1 / 3);
    expect(result.intersection?.[2]).toBeCloseTo(1 / 3);
  });

  it("shows the dot product of the direction and normal as the deciding step", () => {
    const line: Line3 = { point: [0, 0, 0], direction: [1, 0, 0] };
    const result = linePlaneRelationship(line, plane);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.steps.some((s) => s.law.includes("מכפלה סקלרית") && s.law.includes("נורמל"))).toBe(true);
  });
});

describe("angleLinePlane", () => {
  const xyPlane: Plane3 = { normal: [0, 0, 1], d: 0 };

  it("is 0° for a line parallel to the plane", () => {
    const result = angleLinePlane({ point: [0, 0, 0], direction: [1, 1, 0] }, xyPlane);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.angleDeg).toBeCloseTo(0);
  });

  it("is 45° for a line tilted evenly between the plane and its normal", () => {
    const result = angleLinePlane({ point: [0, 0, 0], direction: [1, 0, 1] }, xyPlane);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.angleDeg).toBeCloseTo(45);
  });

  it("is 90° for a line perpendicular to the plane (direction parallel to the normal)", () => {
    const result = angleLinePlane({ point: [0, 0, 0], direction: [0, 0, 5] }, xyPlane);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.angleDeg).toBeCloseTo(90);
  });

  it("names the sine formula in a step", () => {
    const result = angleLinePlane({ point: [0, 0, 0], direction: [1, 0, 1] }, xyPlane);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.steps.some((s) => s.law.includes("sin"))).toBe(true);
  });
});

describe("angleBetweenPlanes", () => {
  const xyPlane: Plane3 = { normal: [0, 0, 1], d: 0 };

  it("is 0° for parallel planes", () => {
    const result = angleBetweenPlanes(xyPlane, { normal: [0, 0, 2], d: 5 });
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.angleDeg).toBeCloseTo(0);
  });

  it("is 45° between the xy-plane and a plane tilted evenly", () => {
    const result = angleBetweenPlanes(xyPlane, { normal: [1, 0, 1], d: 3 });
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.angleDeg).toBeCloseTo(45);
  });

  it("is 90° for perpendicular planes", () => {
    const result = angleBetweenPlanes(xyPlane, { normal: [1, 0, 0], d: 0 });
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.angleDeg).toBeCloseTo(90);
  });

  it("names the cosine formula in a step", () => {
    const result = angleBetweenPlanes(xyPlane, { normal: [1, 0, 1], d: 3 });
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.steps.some((s) => s.law.includes("cos"))).toBe(true);
  });
});

describe("distancePointToPlane", () => {
  const plane: Plane3 = { normal: [1, 1, 1], d: 1 }; // x + y + z = 1

  it("is 0 for a point on the plane", () => {
    const result = distancePointToPlane([1, 0, 0], plane);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.distance).toBeCloseTo(0);
  });

  it("matches the known distance for a point off the plane", () => {
    const result = distancePointToPlane([1, 1, 1], plane);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.distance).toBeCloseTo(2 / Math.sqrt(3));
  });

  it("gives a simple round distance for the axis-aligned plane z = 0", () => {
    const result = distancePointToPlane([0, 0, 5], { normal: [0, 0, 1], d: 0 });
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.distance).toBeCloseTo(5);
  });

  it("names the distance formula in a step", () => {
    const result = distancePointToPlane([1, 1, 1], plane);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.steps.some((s) => s.law.includes("מרחק"))).toBe(true);
  });
});

describe("solvePlaneFromPointAndTwoDirections", () => {
  it("finds z = 0 from the origin and the two standard-basis directions", () => {
    const result = solvePlaneFromPointAndTwoDirections([0, 0, 0], [1, 0, 0], [0, 1, 0]);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.plane.normal).toEqual([0, 0, 1]);
    expect(result.plane.d).toBe(0);
    expect(result.equation).toBe("z = 0");
  });

  it("produces a normal perpendicular to both given direction vectors", () => {
    const dir1: Vector3 = [1, 0, 1];
    const dir2: Vector3 = [0, 1, -1];
    const result = solvePlaneFromPointAndTwoDirections([1, 2, 3], dir1, dir2);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    const n = result.plane.normal;
    const dotWith = (v: Vector3) => n[0] * v[0] + n[1] * v[1] + n[2] * v[2];
    expect(dotWith(dir1)).toBeCloseTo(0);
    expect(dotWith(dir2)).toBeCloseTo(0);
  });

  it("rejects two parallel direction vectors (they don't span a unique plane)", () => {
    const result = solvePlaneFromPointAndTwoDirections([0, 0, 0], [1, 2, 3], [2, 4, 6]);
    expect(result.type).toBe("error");
  });

  it("records a step naming the cross product as the source of the normal", () => {
    const result = solvePlaneFromPointAndTwoDirections([0, 0, 0], [1, 0, 0], [0, 1, 0]);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.steps.some((s) => s.law.includes("מכפלה וקטורית"))).toBe(true);
  });
});

describe("solveLineForm", () => {
  it("round-trips: a parametric point on the line satisfies the symmetric-form ratios", () => {
    const line: Line3 = { point: [1, 2, 3], direction: [2, -1, 4] };
    const result = solveLineForm(line);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    const t = 2.5; // arbitrary parameter value
    const p: Vector3 = [
      result.point[0] + t * result.direction[0],
      result.point[1] + t * result.direction[1],
      result.point[2] + t * result.direction[2],
    ];
    const ratios = [0, 1, 2].map((i) => (p[i] - result.point[i]) / result.direction[i]);
    expect(ratios[0]).toBeCloseTo(ratios[1]);
    expect(ratios[1]).toBeCloseTo(ratios[2]);
  });

  it("handles a line with one zero direction component as a fixed coordinate", () => {
    const line: Line3 = { point: [5, 0, 0], direction: [0, 1, 2] };
    const result = solveLineForm(line);
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    const t = 3;
    const p: Vector3 = [
      result.point[0] + t * result.direction[0],
      result.point[1] + t * result.direction[1],
      result.point[2] + t * result.direction[2],
    ];
    expect(p[0]).toBeCloseTo(result.point[0]); // x stays fixed regardless of t
    const ratioY = (p[1] - result.point[1]) / result.direction[1];
    const ratioZ = (p[2] - result.point[2]) / result.direction[2];
    expect(ratioY).toBeCloseTo(ratioZ);
    expect(result.symmetricText).toContain("x = 5");
  });

  it("rejects a zero direction vector", () => {
    const result = solveLineForm({ point: [0, 0, 0], direction: [0, 0, 0] });
    expect(result.type).toBe("error");
  });

  it("shows both the parametric and symmetric forms in the step trail", () => {
    const result = solveLineForm({ point: [1, 2, 3], direction: [2, -1, 4] });
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.steps.some((s) => s.law.includes("פרמטרית"))).toBe(true);
    expect(result.steps.some((s) => s.law.includes("סימטרית"))).toBe(true);
  });
});
