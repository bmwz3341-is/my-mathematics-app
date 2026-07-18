import { describe, expect, it } from "vitest";
import { analyzeCircle, solveTangentLine } from "./circleGeometry";

describe("analyzeCircle: general form", () => {
  it("identifies center and radius via completing the square", () => {
    // x^2+y^2-4x+6y-3=0 -> (x-2)^2+(y+3)^2 = 4+9+3 = 16 -> center (2,-3), R=4
    const r = analyzeCircle("x^2+y^2-4x+6y-3=0");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.circle.centerX).toBeCloseTo(2, 9);
    expect(r.circle.centerY).toBeCloseTo(-3, 9);
    expect(r.circle.radius).toBeCloseTo(4, 9);
  });

  it("handles a circle centered at the origin", () => {
    const r = analyzeCircle("x^2+y^2-9=0");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.circle.centerX).toBeCloseTo(0, 9);
    expect(r.circle.centerY).toBeCloseTo(0, 9);
    expect(r.circle.radius).toBeCloseTo(3, 9);
  });

  it("normalizes a leading coefficient other than 1", () => {
    // 2x^2+2y^2-8x+12y-6=0 is the same circle as x^2+y^2-4x+6y-3=0
    const r = analyzeCircle("2x^2+2y^2-8x+12y-6=0");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.circle.centerX).toBeCloseTo(2, 6);
    expect(r.circle.centerY).toBeCloseTo(-3, 6);
    expect(r.circle.radius).toBeCloseTo(4, 6);
  });

  it("includes a completing-the-square step for x and for y", () => {
    const r = analyzeCircle("x^2+y^2-4x+6y-3=0");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.steps.some((s) => s.law.includes("השלמה לריבוע") && s.expr.includes("x"))).toBe(true);
    expect(r.steps.some((s) => s.law.includes("השלמה לריבוע") && s.expr.includes("y"))).toBe(true);
  });

  it("rejects unequal x^2/y^2 coefficients (not a circle)", () => {
    expect(analyzeCircle("2x^2+y^2-4=0").type).toBe("error");
  });

  it("rejects a missing x^2 or y^2 term", () => {
    expect(analyzeCircle("x^2-4x+3=0").type).toBe("error");
  });

  it("rejects a negative R^2 (not a real circle)", () => {
    // x^2+y^2-4x+6y+50=0 -> R^2 = 4+9-50 < 0
    expect(analyzeCircle("x^2+y^2-4x+6y+50=0").type).toBe("error");
  });

  it("rejects an xy cross term", () => {
    expect(analyzeCircle("x^2+y^2+xy-4=0").type).toBe("error");
  });
});

describe("analyzeCircle: canonical form", () => {
  it("reads center and radius directly", () => {
    const r = analyzeCircle("(x-2)^2+(y+3)^2=16");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.circle.centerX).toBeCloseTo(2, 9);
    expect(r.circle.centerY).toBeCloseTo(-3, 9);
    expect(r.circle.radius).toBeCloseTo(4, 9);
  });

  it("handles the origin-centered case with bare x^2/y^2", () => {
    const r = analyzeCircle("x^2+(y-3)^2=25");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.circle.centerX).toBeCloseTo(0, 9);
    expect(r.circle.centerY).toBeCloseTo(3, 9);
    expect(r.circle.radius).toBeCloseTo(5, 9);
  });

  it("handles y-term first", () => {
    const r = analyzeCircle("(y+1)^2+(x-4)^2=9");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.circle.centerX).toBeCloseTo(4, 9);
    expect(r.circle.centerY).toBeCloseTo(-1, 9);
    expect(r.circle.radius).toBeCloseTo(3, 9);
  });

  it("round-trips general -> canonical -> general to the same circle", () => {
    const general = analyzeCircle("x^2+y^2-4x+6y-3=0");
    expect(general.type).toBe("result");
    if (general.type !== "result") return;
    const canonical = analyzeCircle(general.canonicalExpr);
    expect(canonical.type).toBe("result");
    if (canonical.type !== "result") return;
    expect(canonical.circle.centerX).toBeCloseTo(general.circle.centerX, 6);
    expect(canonical.circle.centerY).toBeCloseTo(general.circle.centerY, 6);
    expect(canonical.circle.radius).toBeCloseTo(general.circle.radius, 6);
  });

  it("rejects R^2 <= 0", () => {
    expect(analyzeCircle("(x-1)^2+(y-1)^2=0").type).toBe("error");
    expect(analyzeCircle("(x-1)^2+(y-1)^2=-4").type).toBe("error");
  });
});

describe("analyzeCircle: malformed input", () => {
  it("rejects empty input", () => {
    expect(analyzeCircle("").type).toBe("error");
  });
  it("rejects input without an equals sign", () => {
    expect(analyzeCircle("x^2+y^2-4").type).toBe("error");
  });
  it("rejects general form not equal to zero", () => {
    expect(analyzeCircle("x^2+y^2-4x=5").type).toBe("error");
  });
});

describe("solveTangentLine", () => {
  it("finds the tangent at a point in a generic position (positive slope radius)", () => {
    // circle x^2+y^2=25, point (3,4) on it. m_OP = 4/3, m_tangent = -3/4.
    // tangent: y-4 = -3/4(x-3) -> y = -0.75x + 6.25
    const r = solveTangentLine("x^2+y^2-25=0", "3,4");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.slope).toBeCloseTo(-0.75, 9);
    // verify algebraically: y = mx+c should equal 4 at x=3
    expect(-0.75 * 3 + (4 - -0.75 * 3)).toBeCloseTo(4, 9);
  });

  it("finds a horizontal tangent when the radius is vertical", () => {
    // circle centered at origin, point (0,5) -> radius vertical -> tangent horizontal y=5
    const r = solveTangentLine("x^2+y^2-25=0", "0,5");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.slope).toBe(0);
    expect(r.tangentExpr).toContain("y = 5");
  });

  it("finds a vertical tangent when the radius is horizontal", () => {
    // circle centered at origin, point (5,0) -> radius horizontal -> tangent vertical x=5
    const r = solveTangentLine("x^2+y^2-25=0", "5,0");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.slope).toBeNull();
    expect(r.tangentExpr).toContain("x = 5");
  });

  it("works with an off-origin circle", () => {
    // (x-2)^2+(y+3)^2=16, center (2,-3), R=4. Point on circle: (2, 1) [top of circle, 1=-3+4]
    // radius is vertical (x0=a=2) -> tangent horizontal y=1
    const r = solveTangentLine("(x-2)^2+(y+3)^2=16", "2,1");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.slope).toBe(0);
    expect(r.tangentExpr).toContain("y = 1");
  });

  it("rejects a point not on the circle", () => {
    const r = solveTangentLine("x^2+y^2-25=0", "1,1");
    expect(r.type).toBe("error");
  });

  it("includes the circle-identification steps followed by tangent-specific steps", () => {
    const r = solveTangentLine("x^2+y^2-25=0", "3,4");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.steps.some((s) => s.law.includes("רדיוס"))).toBe(true);
    expect(r.steps.some((s) => s.law.includes("מאונכות"))).toBe(true);
  });

  it("propagates an invalid circle equation as an error", () => {
    const r = solveTangentLine("x^2+y^2+xy-4=0", "1,1");
    expect(r.type).toBe("error");
  });

  it("rejects a malformed point", () => {
    expect(solveTangentLine("x^2+y^2-25=0", "").type).toBe("error");
    expect(solveTangentLine("x^2+y^2-25=0", "abc").type).toBe("error");
  });
});
