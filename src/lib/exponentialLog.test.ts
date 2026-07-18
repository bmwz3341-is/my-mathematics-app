import { describe, expect, it } from "vitest";
import { solveExponentialEquation, computeGrowthDecay } from "./exponentialLog";

describe("solveExponentialEquation", () => {
  it("solves the simplest case: a^x = b (bare constant on the right)", () => {
    const r = solveExponentialEquation("3^x = 81");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.headline).toContain("x = 4");
  });

  it("solves a linear exponent on the left", () => {
    const r = solveExponentialEquation("2^(x-1) = 32");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.headline).toContain("x = 6");
  });

  it("solves different, unrelated bases on both sides (genuinely requires logs)", () => {
    // 2^x = 3^(x-1)  ⇒  x·ln2 = (x-1)·ln3  ⇒  x(ln2-ln3) = -ln3  ⇒  x = ln3/(ln3-ln2)
    const expected = Math.log(3) / (Math.log(3) - Math.log(2));
    const r = solveExponentialEquation("2^x = 3^(x-1)");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    const match = r.headline.match(/⇒\s*x\s*=\s*≈?(-?[\d.]+)/);
    expect(match).not.toBeNull();
    expect(parseFloat(match![1])).toBeCloseTo(expected, 4);
  });

  it("solves same base on both sides with linear exponents on each side", () => {
    // 5^x = 5^(3-x) ⇒ x = 3-x ⇒ 2x=3 ⇒ x=1.5
    const r = solveExponentialEquation("5^x = 5^(3-x)");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.headline).toContain("x = 3/2");
  });

  it("reports an identity when both sides are the same expression", () => {
    const r = solveExponentialEquation("2^x = 2^x");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.headline).toContain("מתקיים לכל x");
  });

  it("reports no solution when the linear coefficients cancel but constants differ", () => {
    // 3^x = 3^(x+1)  ⇒  x = x+1  ⇒  0 = 1  ⇒  no solution
    const r = solveExponentialEquation("3^x = 3^(x+1)");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.headline).toContain("∅");
  });

  it("includes a logarithm step and an isolation step in the trace", () => {
    const r = solveExponentialEquation("3^x = 81");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.steps.some((s) => /ln/.test(s.expr))).toBe(true);
    expect(r.steps.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects a non-positive base", () => {
    expect(solveExponentialEquation("-2^x = 8").type).toBe("error");
    expect(solveExponentialEquation("0^x = 8").type).toBe("error");
  });

  it("rejects a quadratic (non-linear) exponent", () => {
    expect(solveExponentialEquation("2^(x^2) = 8").type).toBe("error");
  });

  it("rejects malformed input", () => {
    expect(solveExponentialEquation("").type).toBe("error");
    expect(solveExponentialEquation("3^x = 81 = 3").type).toBe("error");
    expect(solveExponentialEquation("3^x").type).toBe("error");
  });
});

describe("computeGrowthDecay", () => {
  it("computes compound growth: 1000 at 5% for 3 periods", () => {
    const r = computeGrowthDecay({ initial: "1000", ratePercent: "5", time: "3", direction: "growth" });
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.finalAmount).toBeCloseTo(1157.625, 6);
    expect(r.factor).toBeCloseTo(1.05, 9);
  });

  it("computes decay: 1000 at 5% decay for 3 periods", () => {
    const r = computeGrowthDecay({ initial: "1000", ratePercent: "5", time: "3", direction: "decay" });
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.finalAmount).toBeCloseTo(857.375, 6);
    expect(r.factor).toBeCloseTo(0.95, 9);
  });

  it("returns the initial amount unchanged at time = 0", () => {
    const g = computeGrowthDecay({ initial: "500", ratePercent: "12", time: "0", direction: "growth" });
    const d = computeGrowthDecay({ initial: "500", ratePercent: "12", time: "0", direction: "decay" });
    expect(g.type === "result" && g.finalAmount).toBeCloseTo(500, 9);
    expect(d.type === "result" && d.finalAmount).toBeCloseTo(500, 9);
  });

  it("returns the initial amount unchanged when rate = 0", () => {
    const r = computeGrowthDecay({ initial: "777", ratePercent: "0", time: "10", direction: "growth" });
    expect(r.type === "result" && r.finalAmount).toBeCloseTo(777, 9);
  });

  it("supports fractional time", () => {
    const r = computeGrowthDecay({ initial: "100", ratePercent: "10", time: "2.5", direction: "growth" });
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.finalAmount).toBeCloseTo(100 * Math.pow(1.1, 2.5), 6);
  });

  it("includes a model-equation step and a substitution step", () => {
    const r = computeGrowthDecay({ initial: "1000", ratePercent: "5", time: "3", direction: "growth" });
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.steps.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects a non-positive initial amount", () => {
    expect(computeGrowthDecay({ initial: "0", ratePercent: "5", time: "3", direction: "growth" }).type).toBe("error");
    expect(computeGrowthDecay({ initial: "-10", ratePercent: "5", time: "3", direction: "growth" }).type).toBe("error");
  });

  it("rejects a negative rate (direction conveys sign, not the rate field)", () => {
    expect(computeGrowthDecay({ initial: "100", ratePercent: "-5", time: "3", direction: "growth" }).type).toBe("error");
  });

  it("rejects decay of 100% or more (would hit zero or go negative)", () => {
    expect(computeGrowthDecay({ initial: "100", ratePercent: "100", time: "3", direction: "decay" }).type).toBe("error");
    expect(computeGrowthDecay({ initial: "100", ratePercent: "150", time: "3", direction: "decay" }).type).toBe("error");
  });

  it("rejects empty or non-numeric input", () => {
    expect(computeGrowthDecay({ initial: "", ratePercent: "5", time: "3", direction: "growth" }).type).toBe("error");
    expect(computeGrowthDecay({ initial: "100", ratePercent: "abc", time: "3", direction: "growth" }).type).toBe("error");
    expect(computeGrowthDecay({ initial: "100", ratePercent: "5", time: "", direction: "growth" }).type).toBe("error");
  });
});
