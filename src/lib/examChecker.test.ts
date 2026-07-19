import { describe, expect, it } from "vitest";
import { checkAnswer } from "./examChecker";
import { exams } from "./exams";

describe("checkAnswer — linearEquations (live-engine checker)", () => {
  it("accepts the correct root regardless of the stored expectedAnswer", () => {
    const r = checkAnswer("linearEquations", "2x + 3 = 7", "2", "wrong-on-purpose");
    expect(r.isCorrect).toBe(true);
    expect(r.verified).toBe(true);
    expect(r.steps.length).toBeGreaterThan(0);
  });

  it("rejects a wrong numeric answer", () => {
    const r = checkAnswer("linearEquations", "2x + 3 = 7", "3", "2");
    expect(r.isCorrect).toBe(false);
  });

  it("tolerates minor formatting (spaces, 'x=' prefix) via numeric parsing", () => {
    expect(checkAnswer("linearEquations", "4x - 5 = 11", " 4 ", "4").isCorrect).toBe(true);
    expect(checkAnswer("linearEquations", "4x - 5 = 11", "x=4", "4").isCorrect).toBe(true);
  });
});

describe("checkAnswer — quadraticEquations (live-engine checker)", () => {
  it("accepts both roots regardless of order, and 'x=.., y=..'-style formatting", () => {
    const r = checkAnswer("quadraticEquations", "x^2 - 5x + 6 = 0", "3, 2", "irrelevant");
    expect(r.isCorrect).toBe(true);
    expect(r.correctAnswer).toBe("2, 3");
  });

  it("rejects a partial answer (only one of two roots)", () => {
    expect(checkAnswer("quadraticEquations", "x^2 - 5x + 6 = 0", "2", "irrelevant").isCorrect).toBe(false);
  });

  it("accepts a Hebrew 'no real solution' phrasing when the discriminant is negative", () => {
    expect(checkAnswer("quadraticEquations", "x^2 + 4 = 0", "אין פתרון ממשי", "irrelevant").isCorrect).toBe(true);
  });
});

describe("checkAnswer — powersAlgebra (live-engine checker, headline-derived)", () => {
  it("accepts the simplified form regardless of case/spacing", () => {
    expect(checkAnswer("powersAlgebra", "x^2 * x^3", "x^5", "irrelevant").isCorrect).toBe(true);
    expect(checkAnswer("powersAlgebra", "(x^2)^3", "  X^6  ", "irrelevant").isCorrect).toBe(true);
  });

  it("rejects a wrong simplification", () => {
    expect(checkAnswer("powersAlgebra", "x^2 * x^3", "x^6", "irrelevant").isCorrect).toBe(false);
  });
});

describe("checkAnswer — logarithmicEquations (live-engine checker)", () => {
  it("accepts the correct numeric root, including a fraction typed as a/b", () => {
    expect(checkAnswer("logarithmicEquations", "log_2(x+3) + log_2(x-3) = 4", "5", "irrelevant").isCorrect).toBe(true);
    expect(checkAnswer("logarithmicEquations", "ln(x) + ln(x-2) = ln(3)", "3", "irrelevant").isCorrect).toBe(true);
    expect(checkAnswer("logarithmicEquations", "log(x+2) - log(x-1) = 1", "4/3", "irrelevant").isCorrect).toBe(true);
  });
});

describe("checkAnswer — functionAnalysis (live-engine checker)", () => {
  it("accepts the derivative typed with caret notation against the engine's unicode superscript form", () => {
    expect(checkAnswer("functionAnalysis", "x^3 - 3x^2", "3x^2 - 6x", "irrelevant").isCorrect).toBe(true);
    expect(checkAnswer("functionAnalysis", "x^4 - 4x^2", "4x^3-8x", "irrelevant").isCorrect).toBe(true);
  });

  it("rejects a wrong derivative", () => {
    expect(checkAnswer("functionAnalysis", "x^3 - 3x^2", "3x^2 - 5x", "irrelevant").isCorrect).toBe(false);
  });

  it("mode: extrema — accepts the (x, y) pairs of every critical point, in any order", () => {
    const r = checkAnswer("functionAnalysis", "x^3 - 3x^2", "irrelevant", "irrelevant", "extrema");
    expect(r.isCorrect).toBe(false); // "irrelevant" has no numbers
    expect(checkAnswer("functionAnalysis", "x^3 - 3x^2", "0, 0, 2, -4", "irrelevant", "extrema").isCorrect).toBe(true);
    expect(checkAnswer("functionAnalysis", "x^3 - 3x^2", "2, -4, 0, 0", "irrelevant", "extrema").isCorrect).toBe(true);
  });

  it("mode: extrema — rejects an incomplete or wrong set of points", () => {
    expect(checkAnswer("functionAnalysis", "x^3 - 3x^2", "0, 0", "irrelevant", "extrema").isCorrect).toBe(false);
    expect(checkAnswer("functionAnalysis", "x^3 - 3x^2", "1, 1, 2, -4", "irrelevant", "extrema").isCorrect).toBe(false);
  });
});

describe("checkAnswer — circleGeometry (live-engine checker)", () => {
  it("accepts center+radius in any reasonable formatting", () => {
    expect(checkAnswer("circleGeometry", "x^2+y^2-4x+6y-3=0", "2, -3, 4", "irrelevant").isCorrect).toBe(true);
    expect(checkAnswer("circleGeometry", "x^2+y^2-9=0", "center (0,0) radius 3", "irrelevant").isCorrect).toBe(true);
  });
});

describe("checkAnswer — systemOfEquations / systemOf3Equations (delimited expression)", () => {
  it("accepts x,y regardless of order or 'x=' labels", () => {
    expect(checkAnswer("systemOfEquations", "x + y = 5 | 2x - y = 1", "x=2, y=3", "irrelevant").isCorrect).toBe(true);
    expect(checkAnswer("systemOfEquations", "x - y = 2 | x + y = 8", "3, 5", "irrelevant").isCorrect).toBe(true);
  });

  it("accepts x,y,z for a 3-variable system", () => {
    expect(
      checkAnswer("systemOf3Equations", "x + y + z = 6 | 2x - y + z = 3 | x + 2y - z = 2", "1, 2, 3", "irrelevant")
        .isCorrect,
    ).toBe(true);
  });
});

describe("checkAnswer — fallback (unregistered subject)", () => {
  it("falls back to a comparison against expectedAnswer and reports verified:false", () => {
    const ok = checkAnswer("someUnregisteredSubject", "n/a", "42", "42");
    expect(ok.isCorrect).toBe(true);
    expect(ok.verified).toBe(false);
    expect(ok.steps).toEqual([]);
  });
});

describe("exams.json — every seeded question's expectedAnswer matches the live engine", () => {
  for (const exam of exams) {
    for (const question of exam.questions) {
      it(`${exam.id} / ${question.id}: "${question.expression}" -> "${question.expectedAnswer}"`, () => {
        const result = checkAnswer(
          exam.subject,
          question.expression,
          question.expectedAnswer,
          question.expectedAnswer,
          question.mode,
        );
        expect(result.verified).toBe(true);
        expect(result.isCorrect).toBe(true);
      });
    }
  }
});
