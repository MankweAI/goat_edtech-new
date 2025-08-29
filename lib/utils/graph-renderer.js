/**
 * Graph Rendering Service (Phase 2: Core Graphs)
 * GOAT Bot 2.0
 * Updated: 2025-08-29 10:05:00 UTC
 * Developer: DithetoMokgabudi
 *
 * Scope (Phase 2):
 * - Detect "graph" prompts and extract one function definition from text
 * - Support: linear (y=mx+c), quadratic (y=ax^2+bx+c), hyperbola (y=k/x), exponential (y=a*b^x)
 * - Render a clean, high-contrast SVG with axes, ticks, and the curve
 * - Return base64 SVG for WhatsApp upload
 */

function needsGraphRendering(text = "") {
  const t = (text || "").toLowerCase();
  if (!t) return false;
  const mentionsGraph =
    /(sketch|draw|plot).*(graph|curve)|graph\s+of|sketch\s+the\s+graph/.test(t);
  const hasFunction = /(y\s*=|f\s*\(\s*x\s*\)\s*=)/.test(t);
  return mentionsGraph && hasFunction;
}

function extractFunctionDefinition(text = "") {
  // Try f(x) = ...
  const fx = text.match(/f\s*\(\s*x\s*\)\s*=\s*([^\n;]+)/i);
  if (fx && fx[1]) {
    return normalizeFunction(fx[1]);
  }
  // Try y = ...
  const yx = text.match(/y\s*=\s*([^\n;]+)/i);
  if (yx && yx[1]) {
    return normalizeFunction(yx[1]);
  }
  return null;
}

function normalizeFunction(exprRaw) {
  const expr = exprRaw.replace(/\s+/g, "");

  // Quadratic: ax^2+bx+c
  const quad = expr.match(
    /^([+\-]?\d*\.?\d*)?x\^?2(?:([+\-]\d*\.?\d*)x)?(?:([+\-]\d*\.?\d*))?$/
  );
  if (quad) {
    const a = parseFloat(quad[1] || "1") || (quad[1] === "-" ? -1 : 1);
    const b = parseFloat((quad[2] || "").replace("+", "") || "0") || 0;
    const c = parseFloat((quad[3] || "").replace("+", "") || "0") || 0;
    return { type: "quadratic", a, b, c, expr: `y=${expr}` };
  }

  // Linear: mx+c
  const lin = expr.match(/^([+\-]?\d*\.?\d*)?x(?:([+\-]\d*\.?\d*))?$/);
  if (lin) {
    const m =
      parseFloat((lin[1] || "").replace("+", "") || "1") ||
      (lin[1] === "-" ? -1 : 1);
    const c = parseFloat((lin[2] || "").replace("+", "") || "0") || 0;
    return { type: "linear", m, c, expr: `y=${expr}` };
  }

  // Hyperbola: k/x
  const hyp = expr.match(/^([+\-]?\d*\.?\d*)?\/x$/);
  if (hyp) {
    const k =
      parseFloat((hyp[1] || "").replace("+", "") || "1") ||
      (hyp[1] === "-" ? -1 : 1);
    return { type: "hyperbola", k, expr: `y=${expr}` };
  }

  // Exponential: a*b^x or b^x (+ c not supported in phase 2)
  const exp1 = expr.match(
    /^([+\-]?\d*\.?\d*)?\*?([+\-]?\d*\.?\d+)\^x(?:([+\-]\d*\.?\d*))?$/
  );
  if (exp1) {
    const a = parseFloat((exp1[1] || "1").replace("+", "")) || 1;
    const b = parseFloat(exp1[2]);
    const c = parseFloat((exp1[3] || "0").replace("+", "")) || 0;
    return { type: "exponential", a, b, c, expr: `y=${expr}` };
  }

  return null;
}

function makeEvaluator(def) {
  if (!def) return null;

  switch (def.type) {
    case "quadratic":
      return (x) => def.a * x * x + def.b * x + def.c;
    case "linear":
      return (x) => def.m * x + def.c;
    case "hyperbola":
      return (x) => (x === 0 ? NaN : def.k / x);
    case "exponential":
      return (x) => def.a * Math.pow(def.b, x) + (def.c || 0);
    default:
      return null;
  }
}

function computeRange(def) {
  // Default viewing window
  let xmin = -10,
    xmax = 10,
    ymin = -10,
    ymax = 10;

  // Slightly adapt based on function type
  if (def.type === "quadratic") {
    // Vertex near -b/(2a) if a!=0
    const xv = def.a !== 0 ? -def.b / (2 * def.a) : 0;
    xmin = Math.min(-10, Math.floor(xv - 6));
    xmax = Math.max(10, Math.ceil(xv + 6));
    // y-range heuristic based on a, c
    ymin = -12;
    ymax = 12;
  } else if (def.type === "linear") {
    ymin = -12;
    ymax = 12;
  } else if (def.type === "hyperbola") {
    ymin = -12;
    ymax = 12;
  } else if (def.type === "exponential") {
    ymin = -2;
    ymax = 12;
  }

  return { xmin, xmax, ymin, ymax };
}

function renderGraphSvg(def, options = {}) {
  const width = options.width || 900;
  const height = options.height || 600;
  const padding = 48;

  const evalFn = makeEvaluator(def);
  const { xmin, xmax, ymin, ymax } = computeRange(def);

  const xToPx = (x) =>
    padding + ((x - xmin) / (xmax - xmin)) * (width - 2 * padding);
  const yToPx = (y) =>
    height - padding - ((y - ymin) / (ymax - ymin)) * (height - 2 * padding);

  // Build axes and grid
  const gridLines = [];
  const ticks = [];
  const step = 1;

  for (let x = Math.ceil(xmin); x <= Math.floor(xmax); x += step) {
    const px = xToPx(x);
    const isAxis = Math.abs(x) < 1e-9;
    gridLines.push(
      `<line x1="${px}" y1="${padding}" x2="${px}" y2="${
        height - padding
      }" stroke="${isAxis ? "#333" : "#eee"}" stroke-width="${
        isAxis ? 2 : 1
      }"/>`
    );
    if (!isAxis) {
      ticks.push(
        `<text x="${px}" y="${
          yToPx(0) + 16
        }" text-anchor="middle" font-size="12" fill="#555">${x}</text>`
      );
    }
  }

  for (let y = Math.ceil(ymin); y <= Math.floor(ymax); y += step) {
    const py = yToPx(y);
    const isAxis = Math.abs(y) < 1e-9;
    gridLines.push(
      `<line x1="${padding}" y1="${py}" x2="${
        width - padding
      }" y2="${py}" stroke="${isAxis ? "#333" : "#eee"}" stroke-width="${
        isAxis ? 2 : 1
      }"/>`
    );
    if (!isAxis) {
      ticks.push(
        `<text x="${xToPx(0) - 10}" y="${
          py + 4
        }" text-anchor="end" font-size="12" fill="#555">${y}</text>`
      );
    }
  }

  // Plot curve
  const points = [];
  const samples = 400;
  for (let i = 0; i <= samples; i++) {
    const x = xmin + (i / samples) * (xmax - xmin);
    const y = evalFn(x);
    if (!isFinite(y)) {
      points.push("M"); // reset segment on discontinuity
      continue;
    }
    const px = xToPx(x);
    const py = yToPx(y);
    points.push(`${i === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)}`);
  }

  const curvePath = `<path d="${points.join(
    " "
  )}" fill="none" stroke="#0B84F3" stroke-width="3"/>`;

  // Labels
  const label = `<text x="${width - padding}" y="${
    padding - 12
  }" text-anchor="end" font-size="16" fill="#111">${def.expr}</text>`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#FFFFFF"/>
  <!-- Grid & Axes -->
  ${gridLines.join("\n  ")}
  <!-- Curve -->
  ${curvePath}
  <!-- Ticks -->
  <g font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'">
    ${ticks.join("\n    ")}
  </g>
  <!-- Label -->
  ${label}
</svg>`;

  return {
    data: Buffer.from(svg, "utf8").toString("base64"),
    format: "svg",
    width,
    height,
    alt: `Graph of ${def.expr}`,
  };
}

// Public API
async function processTextForGraph(text, options = {}) {
  if (!needsGraphRendering(text)) {
    return { needsRendering: false, text };
  }

  const def = extractFunctionDefinition(text);
  if (!def) return { needsRendering: false, text };

  try {
    const image = renderGraphSvg(def, options);
    return {
      needsRendering: true,
      image,
      definition: def,
    };
  } catch (e) {
    console.error("Graph rendering failed:", e.message);
    return { needsRendering: false, text, error: e.message };
  }
}

module.exports = {
  needsGraphRendering,
  extractFunctionDefinition,
  processTextForGraph,
};

