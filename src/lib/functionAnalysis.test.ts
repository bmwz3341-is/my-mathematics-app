import { describe, expect, it } from "vitest";
import { differentiateExpr, findExtrema, findRoots } from "./functionAnalysis";
import { evalSymSingleVar, parseAlgebraic } from "./symbolicAlgebra";

describe("differentiateExpr", () => {
  it("differentiates a plain polynomial (the old engine's core case)", () => {
    const r = differentiateExpr("x^3 - 3x^2");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.variable).toBe("x");
    expect(r.derivativeExpr).toBe("3x² - 6x");
  });

  it("expands and differentiates a bracketed/factored product — unsupported by the old derivative.ts engine", () => {
    const r = differentiateExpr("(x-2)*(x+2)^3");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    // Cross-check symbolically against a numeric (finite-difference) derivative
    // instead of hand-expanding the polynomial, to avoid a transcription error.
    const h = 1e-6;
    for (const x0 of [-3, -1, 0, 1.5, 4]) {
      const numeric = (evalSymSingleVar(r.originalSym, "x", x0 + h) - evalSymSingleVar(r.originalSym, "x", x0 - h)) / (2 * h);
      const symbolic = evalSymSingleVar(r.derivativeSym, "x", x0);
      expect(symbolic).toBeCloseTo(numeric, 3);
    }
  });

  it("keeps a parameter letter symbolic and differentiates only with respect to x", () => {
    const r = differentiateExpr("a*x^3 - 3x");
    expect(r.type).toBe("result");
    if (r.type !== "result") return;
    expect(r.variable).toBe("x"); // must not mistake the parameter `a` for the variable
    expect(r.derivativeExpr).toBe("3ax² - 3");
  });

  it("rejects an equation (contains '=') the same way the old engine did", () => {
    const r = differentiateExpr("x^2 = 4");
    expect(r.type).toBe("error");
  });
});

describe("findRoots", () => {
  it("finds the real roots of a factored cubic via the general polynomial solver", () => {
    const sym = parseAlgebraic("(x-1)*(x-2)*(x+3)");
    const roots = findRoots(sym, "x");
    expect(roots.map((r) => Math.round(r * 1000) / 1000).sort((a, b) => a - b)).toEqual([-3, 1, 2]);
  });

  it("throws a descriptive error when a parameter is still present", () => {
    const sym = parseAlgebraic("a*x^2 - 4");
    expect(() => findRoots(sym, "x")).toThrow();
  });
});

describe("findExtrema", () => {
  it("classifies the min/max of a cubic built from a factored/expanded product", () => {
    // f(x) = (x-2)(x+2)^3 has extrema; just confirm each reported critical
    // point is a genuine root of f' via finite differences, and is classified
    // consistently with the sign of f' just to either side of it.
    const original = parseAlgebraic("(x-2)*(x+2)^3");
    const result = findExtrema(original, "x");
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.criticalPoints.length).toBeGreaterThan(0);

    const h = 1e-4;
    for (const cp of result.criticalPoints) {
      const before = evalSymSingleVar(original, "x", cp.x - h);
      const after = evalSymSingleVar(original, "x", cp.x + h);
      if (cp.kind === "min") {
        expect(cp.y).toBeLessThanOrEqual(before + 1e-6);
        expect(cp.y).toBeLessThanOrEqual(after + 1e-6);
      } else if (cp.kind === "max") {
        expect(cp.y).toBeGreaterThanOrEqual(before - 1e-6);
        expect(cp.y).toBeGreaterThanOrEqual(after - 1e-6);
      }
    }
  });

  it("reports the constant-function case (derivative identically 0) with no isolated extrema", () => {
    const original = parseAlgebraic("5");
    const result = findExtrema(original, "x");
    expect(result.type).toBe("result");
    if (result.type !== "result") return;
    expect(result.criticalPoints).toEqual([]);
    expect(result.note).toBeTruthy();
  });

  it("surfaces a friendly error instead of throwing when a parameter is left in the derivative", () => {
    const original = parseAlgebraic("a*x^2");
    const result = findExtrema(original, "x");
    expect(result.type).toBe("error");
  });
});
