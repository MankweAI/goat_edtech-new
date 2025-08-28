/**
 * Unit Tests for Formatting Utilities
 * GOAT Bot 2.0
 * Created: 2025-08-23 18:16:22 UTC
 * Developer: DithetoMokgabudi
 */

const {
  formatMathematicalExpression,
  formatStepByStep,
  enhanceVisualFormatting,
  getResponsiveSeparator,
  formatResponseWithEnhancedSeparation,
} = require("../../../lib/utils/formatting");

describe("Formatting Utilities Tests", () => {
  test("formatMathematicalExpression replaces exponents with superscripts", () => {
    const input = "x^2 + y^3 = z^4";
    const formatted = formatMathematicalExpression(input);

    expect(formatted).toBe("x² + y³ = z⁴");
  });

  test("formatMathematicalExpression handles square roots and constants", () => {
    const input = "sqrt(16) + pi = 4 + pi";
    const formatted = formatMathematicalExpression(input);

    expect(formatted).toBe("√(16) + π = 4 + π");
  });

  test("formatStepByStep adds bold formatting to steps", () => {
    const input = "Step 1: Add both sides\nStep 2: Divide by 2";
    const formatted = formatStepByStep(input);

    expect(formatted).toBe(
      "**Step 1:** Add both sides\n**Step 2:** Divide by 2"
    );
  });

  test("formatStepByStep handles different formats of steps", () => {
    const input = "1. First step\nGiven: x = 5\nAnswer: x = 10";
    const formatted = formatStepByStep(input);

    expect(formatted).toBe(
      "**1.** First step\n**Given:** x = 5\n**Answer:** x = 10"
    );
  });

  test("enhanceVisualFormatting applies all formatting enhancements", () => {
    const input =
      "Step 1: Calculate x^2\nStep 2: Divide 10 / 5\nTherefore: x = sqrt(4)";
    const formatted = enhanceVisualFormatting(input);

    expect(formatted).toContain("**Step 1:**");
    expect(formatted).toContain("x²");
    expect(formatted).toContain("10 ÷ 5");
    expect(formatted).toContain("√(4)");
    expect(formatted).toContain("**Therefore:**");
  });

  test("getResponsiveSeparator returns appropriate separator for device type", () => {
    const mobileSeparator = getResponsiveSeparator("mobile");
    const tabletSeparator = getResponsiveSeparator("tablet");

    expect(mobileSeparator.length).toBe(31);
    expect(tabletSeparator.length).toBe(45);
  });

  test("formatResponseWithEnhancedSeparation combines content with menu", () => {
    const content = "Test content with x^2";
    const menu = "1. Option One\n2. Option Two";
    const formatted = formatResponseWithEnhancedSeparation(
      content,
      menu,
      "mobile"
    );

    expect(formatted).toContain("Test content with x²");
    expect(formatted).toContain("─".repeat(31)); // Separator
    expect(formatted).toContain("1. Option One");
  });
});
