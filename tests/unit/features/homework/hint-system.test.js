/**
 * Unit Tests for Homework Hint System
 * GOAT Bot 2.0
 * Created: 2025-08-23 16:07:47 UTC
 * Developer: DithetoMokgabudi
 */

const {
  generateQuickHint,
  generateDynamicHint,
} = require("../../../../lib/features/homework/hint-system");

describe("Homework Hint System Tests", () => {
  test("generateQuickHint provides appropriate hints for linear equations", () => {
    const questionType = "linear_equation";
    const struggleType = "formula_knowledge";

    const hint = generateQuickHint(questionType, struggleType);

    expect(hint).toBeDefined();
    expect(hint.hint).toContain("Formula");
    expect(hint.example).toContain("2x + 5 = 15");
    expect(hint.type).toBe("instant");
  });

  test("generateQuickHint customizes hints based on struggle type", () => {
    const questionType = "triangle_area";

    const conceptualHint = generateQuickHint(questionType, "conceptual");
    const calculationHint = generateQuickHint(questionType, "calculation");

    expect(conceptualHint.hint).toContain("Concept");
    expect(calculationHint.example).toContain("Step-by-step");
  });

  test("generateQuickHint returns null for unknown question types", () => {
    const questionType = "unknown_type";
    const hint = generateQuickHint(questionType, "general");

    expect(hint).toBeNull();
  });

  test("generateDynamicHint creates context-specific hints for equations", () => {
    const question = {
      text: "Solve for x: 2x + 3 = 9",
      type: "linear_equation",
    };
    const struggle = "I don't know how to solve for x";

    const hint = generateDynamicHint(question, struggle);

    expect(hint).toBeDefined();
    expect(hint.hint).toContain("Isolate the variable");
    expect(hint.source).toBe("dynamic");
  });

  test("generateDynamicHint provides generic hints for unclear struggles", () => {
    const question = {
      text: "A random math question",
      type: "general_math",
    };
    const struggle = "I'm confused";

    const hint = generateDynamicHint(question, struggle);

    expect(hint).toBeDefined();
    expect(hint.hint).toContain("Break the problem into smaller steps");
  });
});

