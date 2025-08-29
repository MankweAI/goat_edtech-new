/**
 * Text Formatting Utilities
 * GOAT Bot 2.0
 * Updated: 2025-08-23 14:58:19 UTC
 */

// Extract these functions from index.js:
function formatMathematicalExpression(expression) {
  return (
    expression
      .replace(/\^2/g, "²")
      .replace(/\^3/g, "³")
      .replace(/\^4/g, "⁴")
      .replace(/\^5/g, "⁵")
      .replace(/sqrt\(([^)]+)\)/g, "√($1)")
      .replace(/\+\-/g, "±")
      // Only replace standalone math terms, not parts of words like "Topic"
      .replace(/\binfinity\b/gi, "∞")
      .replace(/\bpi\b/gi, "π")
      .replace(/\btheta\b/gi, "θ")
  );
}

function formatStepByStep(content) {
  return content
    .replace(/Step (\d+):/g, "**Step $1:**")
    .replace(/Step (\d+)\./g, "**Step $1:**")
    .replace(/(\d+)\.\s/g, "**$1.** ")
    .replace(/Given:/g, "**Given:**")
    .replace(/Solution:/g, "**Solution:**")
    .replace(/Answer:/g, "**Answer:**")
    .replace(/Therefore:/g, "**Therefore:**");
}

function enhanceVisualFormatting(content) {
  let enhanced = content;
  enhanced = formatMathematicalExpression(enhanced);
  enhanced = formatStepByStep(enhanced);

  enhanced = enhanced
    .replace(/\s\/\s/g, " ÷ ")
    .replace(/<=/g, "≤")
    .replace(/>=/g, "≥")
    .replace(/\+\-/g, "±")
    .replace(/\-\+/g, "∓");

  return enhanced;
}

// RESPONSIVE SEPARATOR FUNCTION
function getResponsiveSeparator(deviceWidth = "mobile") {
  const separators = {
    mobile: "─".repeat(20),
    tablet: "─".repeat(45),
    desktop: "─".repeat(60),
  };
  return separators[deviceWidth] || separators.mobile;
}

// Format response with separator
function formatResponseWithEnhancedSeparation(
  content,
  menuOptions,
  deviceType = "mobile"
) {
  const separator = getResponsiveSeparator(deviceType);
  const enhancedContent = enhanceVisualFormatting(content);

  return `${enhancedContent}\n\n${separator}\n\n${menuOptions}`;
}

module.exports = {
  formatMathematicalExpression,
  formatStepByStep,
  enhanceVisualFormatting,
  getResponsiveSeparator,
  formatResponseWithEnhancedSeparation,
};
