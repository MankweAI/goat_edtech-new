/**
 * Enhanced Question Generation with Content Complexity Analysis
 * GOAT Bot 2.0
 * Updated: 2025-08-29 14:38:24 UTC
 * Developer: DithetoMokgabudi
 */

const {
  ContentComplexityAnalyzer,
} = require("../../utils/content-complexity-analyzer");
const { generateExamQuestions } = require("./questions");
const latexRenderer = require("../../utils/latex-renderer");
const graphRenderer = require("../../utils/graph-renderer");

/**
 * Enhanced question generator with automatic complexity analysis
 */
class EnhancedQuestionGenerator {
  constructor() {
    this.complexityAnalyzer = new ContentComplexityAnalyzer();
  }

  /**
   * Generate questions with automatic content complexity handling
   * @param {object} profile - Question generation profile
   * @param {number} count - Number of questions
   * @param {string} userId - User ID
   * @returns {Promise<object>} Enhanced question result
   */
  async generateEnhancedQuestions(profile, count = 1, userId = null) {
    console.log(
      `📝 Generating ${count} enhanced questions with complexity analysis`
    );

    // Generate base questions
    const baseResult = await generateExamQuestions(profile, count, userId);

    // Enhance each question with complexity analysis
    const enhancedQuestions = await Promise.all(
      baseResult.questions.map((question) =>
        this.enhanceQuestionWithComplexity(question)
      )
    );

    return {
      ...baseResult,
      questions: enhancedQuestions,
      metadata: {
        ...baseResult.metadata,
        complexity_analyzed: true,
        enhancement_timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Enhance a single question with complexity analysis
   * @param {object} question - Base question object
   * @returns {Promise<object>} Enhanced question
   */
  async enhanceQuestionWithComplexity(question) {
    console.log(
      `🔍 Analyzing complexity for question: ${question.questionText?.substring(
        0,
        50
      )}...`
    );

    // Analyze question content
    const questionAnalysis = this.complexityAnalyzer.analyzeContent(
      question.questionText
    );

    // Analyze solution content
    const solutionAnalysis = this.complexityAnalyzer.analyzeContent(
      question.solution
    );

    // Apply rendering based on complexity analysis
    const enhancedQuestion = await this.applyComplexityBasedRendering(
      question,
      questionAnalysis,
      solutionAnalysis
    );

    // Add analysis metadata
    enhancedQuestion.complexityAnalysis = {
      question: questionAnalysis,
      solution: solutionAnalysis,
      analysisTimestamp: new Date().toISOString(),
    };

    return enhancedQuestion;
  }

  /**
   * Apply rendering based on complexity analysis
   * @param {object} question - Base question
   * @param {object} questionAnalysis - Question complexity analysis
   * @param {object} solutionAnalysis - Solution complexity analysis
   * @returns {Promise<object>} Question with appropriate rendering
   */
  async applyComplexityBasedRendering(
    question,
    questionAnalysis,
    solutionAnalysis
  ) {
    const enhanced = { ...question };

    // Question rendering (Priority: Tables > Graphs > Complex Math > Simple Unicode)
    if (questionAnalysis.recommendedFormat === "table_image") {
      enhanced.hasComplexTable = true;
      enhanced.tableImage = await this.renderTableContent(
        question.questionText
      );
    } else if (questionAnalysis.recommendedFormat === "graph_image") {
      try {
        const graphResult = await graphRenderer.processTextForGraph(
          question.questionText
        );
        if (graphResult.needsRendering) {
          enhanced.hasGraph = true;
          enhanced.graphImage = graphResult.image;
        }
      } catch (error) {
        console.error("Graph rendering failed:", error);
      }
    } else if (questionAnalysis.recommendedFormat === "math_image") {
      try {
        const latexResult = await latexRenderer.processTextWithLatex(
          question.questionText
        );
        if (latexResult.needsRendering) {
          enhanced.hasLatex = true;
          enhanced.latexImage = latexResult.image;
        }
      } catch (error) {
        console.error("LaTeX rendering failed:", error);
      }
    } else if (questionAnalysis.recommendedFormat === "text_with_unicode") {
      enhanced.hasSimpleUnicode = true;
      enhanced.questionText = this.enhanceWithUnicode(question.questionText);
    }

    // Solution rendering (only LaTeX and tables, avoid graphs in solutions)
    if (solutionAnalysis.recommendedFormat === "table_image") {
      enhanced.hasSolutionTable = true;
      enhanced.solutionTableImage = await this.renderTableContent(
        question.solution
      );
    } else if (solutionAnalysis.recommendedFormat === "math_image") {
      try {
        const latexResult = await latexRenderer.processTextWithLatex(
          question.solution
        );
        if (latexResult.needsRendering) {
          enhanced.hasSolutionLatex = true;
          enhanced.solutionLatexImage = latexResult.image;
        }
      } catch (error) {
        console.error("Solution LaTeX rendering failed:", error);
      }
    } else if (solutionAnalysis.recommendedFormat === "text_with_unicode") {
      enhanced.solution = this.enhanceWithUnicode(question.solution);
    }

    return enhanced;
  }

  /**
   * Render table content as image
   * @param {string} content - Content containing table
   * @returns {Promise<object>} Table image data
   */
  async renderTableContent(content) {
    // For now, use LaTeX-style rendering for tables
    // Future enhancement: dedicated table renderer
    try {
      const latexResult = await latexRenderer.processTextWithLatex(content);
      if (latexResult.needsRendering) {
        return {
          ...latexResult.image,
          type: "table",
          alt: "Table or matrix",
        };
      }
    } catch (error) {
      console.error("Table rendering failed:", error);
    }

    return null;
  }

  /**
   * Enhance text with Unicode mathematical symbols
   * @param {string} text - Text to enhance
   * @returns {string} Enhanced text with Unicode
   */
  enhanceWithUnicode(text) {
    return text
      .replace(/\^2/g, "²")
      .replace(/\^3/g, "³")
      .replace(/\^4/g, "⁴")
      .replace(/sqrt\(([^)]+)\)/g, "√($1)")
      .replace(/\bpi\b/gi, "π")
      .replace(/\btheta\b/gi, "θ")
      .replace(/infinity/gi, "∞")
      .replace(/\+\-/g, "±")
      .replace(/\-\+/g, "∓")
      .replace(/<=/g, "≤")
      .replace(/>=/g, "≥")
      .replace(/!=/g, "≠")
      .replace(/\*/g, "×")
      .replace(/\bsum\b/gi, "∑")
      .replace(/\bintegral\b/gi, "∫");
  }

  /**
   * Generate hybrid text+image response
   * @param {object} question - Enhanced question
   * @returns {object} Hybrid response structure
   */
  generateHybridResponse(question) {
    const response = {
      textParts: [],
      imageParts: [],
      sequence: [],
      hasHybridContent: false,
    };

    // Question part
    if (question.hasGraph || question.hasLatex || question.hasComplexTable) {
      response.textParts.push("Question:");
      response.sequence.push({ type: "text", content: "Question:" });

      response.imageParts.push({
        type: question.hasGraph
          ? "graph"
          : question.hasComplexTable
          ? "table"
          : "math",
        image:
          question.graphImage || question.latexImage || question.tableImage,
        description: question.questionText,
      });
      response.sequence.push({
        type: "image",
        contentType: question.hasGraph
          ? "graph"
          : question.hasComplexTable
          ? "table"
          : "math",
      });

      response.hasHybridContent = true;
    } else {
      response.textParts.push(question.questionText);
      response.sequence.push({ type: "text", content: question.questionText });
    }

    return response;
  }
}

module.exports = {
  EnhancedQuestionGenerator,
  createEnhancedGenerator: () => new EnhancedQuestionGenerator(),
};
