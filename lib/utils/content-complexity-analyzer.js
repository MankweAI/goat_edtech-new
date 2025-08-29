/**
 * Enhanced Content Complexity Analyzer
 * GOAT Bot 2.0
 * Updated: 2025-08-29 14:38:24 UTC
 * Developer: DithetoMokgabudi
 *
 * Automatically determines content complexity and optimal presentation format:
 * Priority: Tables/Matrices > Graphs > Complex LaTeX > Simple Unicode
 */

const {
  needsLatexRendering,
  isSimpleUnicodeMath,
} = require("./latex-renderer");
const { needsGraphRendering } = require("./graph-renderer");

class ContentComplexityAnalyzer {
  /**
   * Analyze content and determine optimal presentation format
   * @param {string} text - Content to analyze
   * @returns {object} Analysis result with format recommendations
   */
  analyzeContent(text) {
    if (!text || typeof text !== "string") {
      return this.createAnalysisResult("text_only", "empty_content");
    }

    const analysis = {
      hasComplexTables: this.detectComplexTables(text),
      hasGraphs: this.detectGraphContent(text),
      hasComplexMath: this.detectComplexMath(text),
      hasSimpleMath: this.detectSimpleMath(text),
      hasMatrixNotation: this.detectMatrixNotation(text),
      contentParts: this.splitContent(text),
      recommendedFormat: null,
    };

    // Determine optimal format based on priority
    analysis.recommendedFormat = this.determineOptimalFormat(text, analysis);

    return analysis;
  }

  /**
   * Detect complex tables requiring image representation
   * @param {string} text - Text to analyze
   * @returns {boolean} True if complex tables detected
   */
  detectComplexTables(text) {
    const tablePatterns = [
      // HTML-style tables
      /<table[\s\S]*?<\/table>/i,

      // ASCII tables with pipes and dashes
      /\|[\s\S]*?\|[\s\S]*?\|/,
      /\+[-=]+\+/,

      // Mathematical tables/arrays
      /\\\begin\{(array|tabular|matrix|pmatrix|bmatrix|vmatrix)\}/i,

      // Data tables (3+ columns with separators)
      /(\w+[\s]*[|\t,][\s]*\w+[\s]*[|\t,][\s]*\w+)/,

      // Truth tables
      /\b(true|false|T|F)\s*[|\t]\s*(true|false|T|F)/i,

      // Complex structured data (3+ rows, 2+ columns)
      /^[\s]*\w+[\s]*[|\t][\s]*\w+[\s]*$/m,
    ];

    // Check for table patterns
    const hasTableStructure = tablePatterns.some((pattern) =>
      pattern.test(text)
    );

    if (!hasTableStructure) return false;

    // Additional complexity checks
    const complexityIndicators = [
      // Mathematical expressions in table cells
      /[|\t][^|\t]*[\^_{}\\]/,

      // Multiple columns with math
      /[|\t][^|\t]*\d+[^|\t]*[|\t][^|\t]*\d+/,

      // 3+ columns
      /[|\t][^|\t]*[|\t][^|\t]*[|\t]/,

      // 4+ rows
      /([\r\n][^|\r\n]*[|\t][^|\r\n]*){3,}/,
    ];

    return complexityIndicators.some((pattern) => pattern.test(text));
  }

  /**
   * Detect matrix notation requiring image representation
   * @param {string} text - Text to analyze
   * @returns {boolean} True if matrix notation detected
   */
  detectMatrixNotation(text) {
    const matrixPatterns = [
      // LaTeX matrix environments
      /\\begin\{(matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\}/i,

      // Bracket notation with multiple rows
      /\[[\s]*[\d\w]+[\s]+[\d\w]+[\s]*\]/,

      // Determinant notation
      /\|\s*[\d\w]+\s+[\d\w]+\s*\|/,

      // Matrix multiplication notation
      /\[[\s\S]*?\]\s*\[[\s\S]*?\]/,

      // Augmented matrix notation
      /\[\s*[\d\w\s|]+\s*\]/,
    ];

    return matrixPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Detect graph content (enhanced from existing)
   * @param {string} text - Text to analyze
   * @returns {boolean} True if graph content detected
   */
  detectGraphContent(text) {
    return needsGraphRendering(text);
  }

  /**
   * Detect complex mathematical content
   * @param {string} text - Text to analyze
   * @returns {boolean} True if complex math detected
   */
  detectComplexMath(text) {
    return needsLatexRendering(text);
  }

  /**
   * Detect simple mathematical content
   * @param {string} text - Text to analyze
   * @returns {boolean} True if simple math detected
   */
  detectSimpleMath(text) {
    return isSimpleUnicodeMath(text);
  }

  /**
   * Split content into simple and complex parts
   * @param {string} text - Text to analyze
   * @returns {object} Content split analysis
   */
  splitContent(text) {
    const parts = {
      simpleText: [],
      complexSections: [],
      mixedSections: [],
    };

    // Split by paragraphs/sentences
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();
      if (!trimmed) return;

      const sentenceAnalysis = {
        index,
        text: trimmed,
        isComplex: false,
        complexity: this.assessSentenceComplexity(trimmed),
      };

      if (sentenceAnalysis.complexity.needsVisualization) {
        sentenceAnalysis.isComplex = true;
        parts.complexSections.push(sentenceAnalysis);
      } else if (sentenceAnalysis.complexity.hasAnyMath) {
        parts.mixedSections.push(sentenceAnalysis);
      } else {
        parts.simpleText.push(sentenceAnalysis);
      }
    });

    return parts;
  }

  /**
   * Assess complexity of individual sentence
   * @param {string} sentence - Sentence to analyze
   * @returns {object} Complexity assessment
   */
  assessSentenceComplexity(sentence) {
    return {
      hasSimpleMath: this.detectSimpleMath(sentence),
      hasComplexMath: this.detectComplexMath(sentence),
      hasTable: this.detectComplexTables(sentence),
      hasMatrix: this.detectMatrixNotation(sentence),
      hasGraph: this.detectGraphContent(sentence),
      needsVisualization:
        this.detectComplexTables(sentence) ||
        this.detectMatrixNotation(sentence) ||
        this.detectGraphContent(sentence) ||
        this.detectComplexMath(sentence),
      hasAnyMath:
        this.detectSimpleMath(sentence) || this.detectComplexMath(sentence),
    };
  }

  /**
   * Determine optimal format based on content analysis
   * @param {string} text - Original text
   * @param {object} analysis - Content analysis
   * @returns {string} Recommended format
   */
  determineOptimalFormat(text, analysis) {
    // Priority 1: Tables/Matrices (highest complexity)
    if (analysis.hasComplexTables || analysis.hasMatrixNotation) {
      return "table_image";
    }

    // Priority 2: Graphs
    if (analysis.hasGraphs) {
      return "graph_image";
    }

    // Priority 3: Complex Math
    if (analysis.hasComplexMath) {
      return "math_image";
    }

    // Priority 4: Simple Math with Unicode
    if (analysis.hasSimpleMath) {
      return "text_with_unicode";
    }

    // Default: Plain text
    return "text_only";
  }

  /**
   * Create standardized analysis result
   * @param {string} format - Recommended format
   * @param {string} reason - Reason for format choice
   * @returns {object} Analysis result
   */
  createAnalysisResult(format, reason) {
    return {
      recommendedFormat: format,
      reason,
      hasComplexTables: false,
      hasGraphs: false,
      hasComplexMath: false,
      hasSimpleMath: false,
      hasMatrixNotation: false,
      contentParts: { simpleText: [], complexSections: [], mixedSections: [] },
      needsHybridResponse: format === "hybrid_text_image",
    };
  }

  /**
   * Generate hybrid response recommendation
   * @param {object} analysis - Content analysis
   * @returns {object} Hybrid response structure
   */
  generateHybridResponse(analysis) {
    const response = {
      textParts: [],
      imageParts: [],
      sequence: [],
    };

    analysis.contentParts.simpleText.forEach((part) => {
      response.textParts.push(part.text);
      response.sequence.push({ type: "text", content: part.text });
    });

    analysis.contentParts.complexSections.forEach((part) => {
      response.imageParts.push(part.text);
      response.sequence.push({ type: "image", content: part.text });
    });

    analysis.contentParts.mixedSections.forEach((part) => {
      // For mixed content, prefer text unless very complex
      if (part.complexity.needsVisualization) {
        response.imageParts.push(part.text);
        response.sequence.push({ type: "image", content: part.text });
      } else {
        response.textParts.push(part.text);
        response.sequence.push({ type: "text", content: part.text });
      }
    });

    return response;
  }
}

module.exports = {
  ContentComplexityAnalyzer,
  createContentAnalyzer: () => new ContentComplexityAnalyzer(),
};

