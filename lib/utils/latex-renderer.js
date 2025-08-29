/**
 * LaTeX Rendering Service (Phase 1: Formulas only, refined)
 * GOAT Bot 2.0
 * Updated: 2025-08-29 10:05:00 UTC
 * Developer: DithetoMokgabudi
 *
 * Change:
 * - Do NOT render when the expression is simple and readable with plain text + unicode
 * - Keep LaTeX-only constructs (\\frac, \\sqrt, environments) rendering to SVG
 */

const crypto = require("crypto");

// Cache rendered images to avoid regenerating the same content
const imageCache = new Map();
const MAX_CACHE_SIZE = 200;

function hashLatex(latex, options = {}) {
  const content = JSON.stringify({ latex, options });
  return crypto.createHash("md5").update(content).digest("hex");
}

// Simple unicode math: readable as text in WhatsApp → no rendering
function isSimpleUnicodeMath(text) {
  if (!text) return false;

  const t = text.trim();

  // Contains only these characters: letters, digits, spaces, operators, comparisons, parentheses,
  // common unicode math glyphs and superscripts ² ³
  const allowed =
    /^[\s0-9a-zA-Z\+\-\*×÷=<>≤≥≠\(\)\[\]\{\}\.\,\:\;\/\|\^\u00B2\u00B3√πθ∞%±∓]+$/u.test(
      t
    );

  if (!allowed) return false;

  // Heuristic: if it has LaTeX backslashes or environments, it's not simple
  if (/(\\[a-z]+|\\begin\{|\\end\{)/i.test(t)) return false;

  // Very long "simple" expressions are still okay to keep as text (we avoid rendering)
  // If it’s short-to-medium length, we treat it as text-friendly
  return true;
}

// PHASE 1: robust detection of formula content
function needsLatexRendering(text) {
  if (!text) return false;

  // If the text is simple and unicode-friendly, do NOT render
  if (isSimpleUnicodeMath(text)) return false;

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

  const patterns = [
    { re: /\$\$([\s\S]+?)\$\$/m },
    { re: /\\\[([\s\S]+?)\\\]/m },
    { re: /\\\(([\s\S]+?)\\\)/m },
    { re: /\$([^$]+)\$/m },
  ];

  for (const { re } of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }

  if (needsLatexRendering(text)) {
    const snippet = text.trim().slice(0, 240);
    return snippet;
  }

  return null;
}

// Sanitize LaTeX into display-safe inline text to embed in SVG
function sanitizeForSvgDisplay(latex = "") {
  let s = String(latex || "");

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
  <rect x="0" y="0" width="${width}" height="${height}" fill="#FFFFFF" rx="8" ry="8"/>
  <g font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
     font-size="${fontSize}" fill="#000000">
    ${lines
      .map(
        (line, i) =>
          `<text x="${Math.round(width / 2)}" y="${
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
      text,
      hasComplexContent: true,
      image,
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
  isSimpleUnicodeMath,
};
