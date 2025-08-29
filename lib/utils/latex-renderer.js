/**
 * LaTeX Rendering Service (Phase 1: Formulas only)
 * GOAT Bot 2.0
 * Updated: 2025-08-29 08:52:00 UTC
 * Developer: DithetoMokgabudi
 *
 * Phase 1 implementation:
 * - Detect formula content reliably
 * - Render FIRST detected LaTeX/formula segment into an SVG image (text-based)
 * - Return base64 SVG suitable for WhatsApp upload via ManyChat
 * - Fail safe: if render fails, mark as complex but do not break flows
 */

const crypto = require("crypto");

// Cache rendered images to avoid regenerating the same content
const imageCache = new Map();
const MAX_CACHE_SIZE = 200; // Maximum number of cached images

function hashLatex(latex, options = {}) {
  const content = JSON.stringify({ latex, options });
  return crypto.createHash("md5").update(content).digest("hex");
}

// PHASE 1: simple robust detection of formula content
function needsLatexRendering(text) {
  if (!text) return false;

  const complexPatterns = [
    /\\\[.*?\\\]/s, // \[ ... \]
    /\\\(.*?\\\)/s, // \( ... \)
    /\$\$.*?\$\$/s, // $$ ... $$
    /\$[^$]+\$/s, // $ ... $
    /\\begin\{(equation|align|matrix|pmatrix|bmatrix|cases|array)/i,
    /\\frac\{.*?\}\{.*?\}/i,
    /\\sqrt\{.*?\}/i,
    /\\int|\\sum|\\lim/i,
    /\\left|\\right/i,
    /\^{[^}]+}/,
    /_{[^}]+}/,
    /\\overline\{.*?\}|\\underline\{.*?\}|\\vec\{.*?\}|\\hat\{.*?\}/i,
    /\\cdot|\\times|\\div/i,
    /\\sin|\\cos|\\tan|\\log|\\ln/i,
    /\\alpha|\\beta|\\gamma|\\theta|\\pi/i,
  ];

  return complexPatterns.some((pattern) => pattern.test(text));
}

// Extract the first latex expression or fallback to the whole text
function extractFirstLatexSegment(text) {
  if (!text) return null;

  // Search order: $$...$$, \[...\], \(...\), $...$
  const patterns = [
    { re: /\$\$([\s\S]+?)\$\$/m, strip: true },
    { re: /\\\[([\s\S]+?)\\\]/m, strip: true },
    { re: /\\\(([\s\S]+?)\\\)/m, strip: true },
    { re: /\$([^$]+)\$/m, strip: true },
  ];

  for (const { re } of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }

  // Fallback: if text still "needs rendering", limit preview segment length
  if (needsLatexRendering(text)) {
    const snippet = text.trim().slice(0, 240);
    return snippet;
  }

  return null;
}

// Sanitize LaTeX into display-safe inline text to embed in SVG
function sanitizeForSvgDisplay(latex = "") {
  let s = String(latex || "");

  // Minimal readability transforms
  s = s
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\pi\b/gi, "π")
    .replace(/\\theta\b/gi, "θ")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
    .replace(/\\left/g, "")
    .replace(/\\right/g, "")
    .replace(/\\overline\{([^}]+)\}/g, "‾$1")
    .replace(/\\underline\{([^}]+)\}/g, "$1")
    .replace(/\^{\s*([^}]+)\s*}/g, "^($1)")
    .replace(/_\{\s*([^}]+)\s*}/g, "_($1)")
    .replace(/\^2/g, "²")
    .replace(/\^3/g, "³")
    .replace(/<=/g, "≤")
    .replace(/>=/g, "≥")
    .replace(/\\\\/g, " ")
    .replace(/\s+/g, " ");

  // Escape XML entities
  s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return s.trim();
}

// Create a simple SVG with the formula text (centered, high-contrast)
function buildFormulaSvg(formulaText, options = {}) {
  const width = options.width || 900;
  const padding = 24;
  const fontSize = options.fontSize || 28;
  const lineHeight = Math.round(fontSize * 1.4);
  const maxCharsPerLine = Math.max(
    20,
    Math.floor((width - padding * 2) / (fontSize * 0.62))
  );

  // Soft wrap the text
  const words = formulaText.split(/\s+/);
  const lines = [];
  let current = "";

  for (const w of words) {
    if ((current + " " + w).length <= maxCharsPerLine) {
      current = current ? current + " " + w : w;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);

  const height = padding * 2 + lineHeight * lines.length;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img">
  <defs>
    <style>
      @media (prefers-color-scheme: dark) {
        .bg { fill: #0b0b0b; }
        .tx { fill: #FFFFFF; }
      }
    </style>
  </defs>
  <rect class="bg" x="0" y="0" width="${width}" height="${height}" fill="#FFFFFF" rx="8" ry="8"/>
  <g font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
     font-size="${fontSize}" fill="#000000">
    ${lines
      .map(
        (line, i) =>
          `<text class="tx" x="${Math.round(width / 2)}" y="${
            padding + (i + 1) * lineHeight - Math.round(lineHeight * 0.25)
          }" text-anchor="middle">${line}</text>`
      )
      .join("\n    ")}
  </g>
</svg>`;

  const base64 = Buffer.from(svg, "utf8").toString("base64");
  return {
    data: base64,
    format: "svg",
    width,
    height,
    alt: "Mathematical formula",
  };
}

/**
 * Render LaTeX-like content to an SVG "image" (Phase 1: formulas only)
 * @param {string} latex - Detected formula segment
 * @returns {Promise<object>} - { data, format, width, height, alt }
 */
async function renderLatexImage(latex, options = {}) {
  if (!latex) throw new Error("No LaTeX content provided");

  const cacheKey = hashLatex(latex, options);
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey);
  }

  const safeText = sanitizeForSvgDisplay(latex);
  const image = buildFormulaSvg(safeText, options);

  if (imageCache.size >= MAX_CACHE_SIZE) {
    const firstKey = imageCache.keys().next().value;
    imageCache.delete(firstKey);
  }
  imageCache.set(cacheKey, image);
  return image;
}

/**
 * Process text with LaTeX expressions
 * - If formulas detected, return image for the FIRST segment only.
 * - Keep text unchanged for WhatsApp message; image is sent separately.
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
    const segment = extractFirstLatexSegment(text) || text;
    const image = await renderLatexImage(segment, options);

    return {
      needsRendering: true,
      text, // keep original text for context
      hasComplexContent: true,
      image, // base64 svg
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
