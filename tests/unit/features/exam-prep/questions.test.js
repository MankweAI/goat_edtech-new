/**
 * Unit Tests for Exam Question Generation
 * GOAT Bot 2.0
 * Created: 2025-08-23 16:07:47 UTC
 * Developer: DithetoMokgabudi
 */

const {
  generateFallbackQuestion,
} = require("../../../../lib/features/exam-prep/questions");

describe("Exam Question Generation Tests", () => {
  test("generateFallbackQuestion creates appropriate algebra questions", () => {
    const profile = {
      subject: "Mathematics",
      grade: "10",
      topic_struggles: "algebra",
      specific_failure: "solve for x",
    };

    const question = generateFallbackQuestion(profile);

    expect(question).toBeDefined();
    expect(question.questionText).toContain("Solve for x");
    expect(question.solution).toContain("Subtract 7");
    expect(question.source).toBe("fallback");
  });

  test("generateFallbackQuestion creates appropriate geometry questions", () => {
    const profile = {
      subject: "Mathematics",
      grade: "10",
      topic_struggles: "geometry",
      specific_failure: "finding area",
    };

    const question = generateFallbackQuestion(profile);

    expect(question).toBeDefined();
    expect(question.questionText).toContain("Find the area");
    expect(question.solution).toContain("Area = ½ × base × height");
  });

  test("generateFallbackQuestion provides generic question for unknown topics", () => {
    const profile = {
      subject: "Unknown",
      grade: "11",
      topic_struggles: "unknown",
      specific_failure: "general confusion",
    };

    const question = generateFallbackQuestion(profile);

    expect(question).toBeDefined();
    expect(question.questionText).toContain("Practice Question");
    expect(question.source).toBe("generic_fallback");
  });
});

