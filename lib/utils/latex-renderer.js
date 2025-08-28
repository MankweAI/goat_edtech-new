/**
 * LaTeX Rendering Service (Simplified)
 * GOAT Bot 2.0
 * Updated: 2025-08-25 12:46:52 UTC
 * Developer: DithetoMokgabudi
 */

const crypto = require("crypto");

// Cache rendered images to avoid regenerating the same content
const imageCache = new Map();
const MAX_CACHE_SIZE = 200; // Maximum number of cached images

/**
 * Generate a hash for a LaTeX expression
 * @param {string} latex - LaTeX expression
 * @returns {string} - Hash of the expression
 */
function hashLatex(latex, options = {}) {
  const content = JSON.stringify({ latex, options });
  return crypto.createHash("md5").update(content).digest("hex");
}

/**
 * Simplified text-only fallback renderer
 * @param {string} latex - LaTeX expression
 * @returns {Promise<object>} - Base64 encoded placeholder
 */
async function renderTextOnly(latex, options = {}) {
  console.log("📄 Using text-only LaTeX renderer");

  // Simple text representation
  const formattedLatex = latex
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ");

  // Return base64 representation of a placeholder image
  return {
    data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", // 1x1 transparent PNG
    format: "png",
    width: 100,
    height: 50,
    text: formattedLatex,
  };
}

/**
 * Check if content is complex and needs LaTeX rendering
 * @param {string} text - Content to check
 * @returns {boolean} - True if content needs LaTeX
 */
function needsLatexRendering(text) {
  if (!text) return false;

  // Define patterns that indicate complex math
  const complexPatterns = [
    /\\\[.*?\\\]/s, // Display math mode: \[ ... \]
    /\\\(.*?\\\)/s, // Inline math mode: \( ... \)
    /\$\$.*?\$\$/s, // Display math mode: $$ ... $$
    /\$.*?\$/g, // Inline math mode: $ ... $
    /\\begin\{(equation|align|matrix|pmatrix|bmatrix|cases|array)/, // LaTeX environments
    /\\frac\{.*?\}\{.*?\}/, // Fractions: \frac{}{}
    /\\sqrt\{.*?\}/, // Square roots: \sqrt{}
    /\\int/, // Integrals
    /\\sum/, // Summations
    /\\lim/, // Limits
    /\\left|\\right/, // Delimiters
    /\^{[^}]+}/, // Complex superscripts
    /_{[^}]+}/, // Complex subscripts
    /\\overline\{.*?\}/, // Overlines
    /\\underline\{.*?\}/, // Underlines
    /\\vec\{.*?\}/, // Vectors
    /\\hat\{.*?\}/, // Hats
    /\\cdot/, // Multiplication dot
    /\\times/, // Multiplication times
    /\\div/, // Division
    /\\sin|\\cos|\\tan|\\log/, // Common functions
    /\\\\/, // Newlines in arrays
    /&=/, // Alignment in equations
    /\\alpha|\\beta|\\gamma|\\theta|\\pi/, // Greek letters
  ];

  return complexPatterns.some((pattern) => pattern.test(text));
}

/**
 * Main function to "render" LaTeX as image (simplified)
 * @param {string} latex - LaTeX expression or content with LaTeX
 * @returns {Promise<object>} - Text representation
 */
async function renderLatexImage(latex, options = {}) {
  // Skip if empty
  if (!latex) {
    throw new Error("No LaTeX content provided");
  }

  // Generate a cache key
  const cacheKey = hashLatex(latex, options);

  // Check cache first
  if (imageCache.has(cacheKey)) {
    console.log(`🔄 Using cached LaTeX: ${cacheKey.substring(0, 8)}`);
    return imageCache.get(cacheKey);
  }

  try {
    // Always use text-only renderer for now
    const result = await renderTextOnly(latex, options);

    // Cache the result
    if (imageCache.size >= MAX_CACHE_SIZE) {
      const firstKey = imageCache.keys().next().value;
      imageCache.delete(firstKey);
    }

    imageCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error("❌ LaTeX rendering error:", error);
    return renderTextOnly(latex, options);
  }
}

/**
 * Process text with LaTeX expressions
 * @param {string} text - Text with LaTeX expressions
 * @returns {Promise<object>} - Object with extracted data
 */
async function processTextWithLatex(text, options = {}) {
  if (!needsLatexRendering(text)) {
    return {
      needsRendering: false,
      text,
      hasComplexContent: false,
    };
  }

  try {
    // For now, we just indicate that there's complex content
    // but don't try to render it
    return {
      needsRendering: false,
      text,
      hasComplexContent: true,
      message:
        "Complex mathematical content detected but rendering is disabled",
    };
  } catch (error) {
    console.error("❌ Failed to process text with LaTeX:", error);
    return {
      needsRendering: false,
      text,
      hasComplexContent: true,
      error: error.message,
    };
  }
}

module.exports = {
  renderLatexImage,
  needsLatexRendering,
  processTextWithLatex,
};
