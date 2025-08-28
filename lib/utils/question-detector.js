/**
 * Enhanced Question Detection System
 * GOAT Bot 2.0
 * Updated: 2025-08-23 15:57:31 UTC
 * Developer: DithetoMokgabudi
 * BUGFIX: Added missing extractNumbers method
 */

class EnhancedQuestionDetector {
  detectQuestions(ocrText, confidence = 1.0) {
    console.log(
      `🔍 Detecting questions in text (${
        ocrText.length
      } chars, confidence=${confidence.toFixed(2)})`
    );

    const questions = [];

    // Try multiple detection patterns in order of reliability
    const detectionMethods = [
      () => this.detectNumberedQuestions(ocrText),
      () => this.detectLetteredQuestions(ocrText),
      () => this.detectKeywordQuestions(ocrText),
      () => this.detectSentenceQuestions(ocrText),
      () => this.createSingleQuestion(ocrText),
    ];

    for (const method of detectionMethods) {
      const detected = method();
      if (detected.length > 0) {
        console.log(
          `✅ Detected ${detected.length} questions using ${method.name}`
        );
        questions.push(...detected);
        break;
      }
    }

    // Validate and enhance detected questions
    const validatedQuestions = this.validateQuestions(questions, confidence);

    console.log(
      `📊 Final result: ${validatedQuestions.length} validated questions`
    );
    return validatedQuestions;
  }

  detectNumberedQuestions(text) {
    const questions = [];

    // Pattern for numbered questions: 1. 2. 3. or 1) 2) 3)
    const numberedPattern = /(\d+)[\.\)]\s*([^]*?)(?=\d+[\.\)]|$)/g;
    let match;

    while ((match = numberedPattern.exec(text)) !== null) {
      const questionNumber = parseInt(match[1]);
      const questionText = match[2].trim();

      if (this.isValidQuestionText(questionText)) {
        questions.push({
          number: questionNumber,
          text: questionText,
          type: this.classifyQuestion(questionText),
          numbers: this.extractNumbers(questionText),
          detectionMethod: "numbered",
          confidence: this.calculateQuestionConfidence(questionText),
        });
      }
    }

    return this.sortQuestionsByNumber(questions);
  }

  detectLetteredQuestions(text) {
    const questions = [];

    // Pattern for lettered questions: a) b) c) or a. b. c.
    const letteredPattern = /([a-z])[\.\)]\s*([^]*?)(?=[a-z][\.\)]|$)/gi;
    let match;
    let letterIndex = 1;

    while ((match = letteredPattern.exec(text)) !== null) {
      const questionLetter = match[1].toLowerCase();
      const questionText = match[2].trim();

      if (this.isValidQuestionText(questionText)) {
        questions.push({
          number: letterIndex++,
          letter: questionLetter,
          text: questionText,
          type: this.classifyQuestion(questionText),
          numbers: this.extractNumbers(questionText),
          detectionMethod: "lettered",
          confidence: this.calculateQuestionConfidence(questionText),
        });
      }
    }

    return questions;
  }

  detectKeywordQuestions(text) {
    const questions = [];

    // Pattern for keyword-based questions: "Question 1:", "Problem 2:", etc.
    const keywordPattern =
      /(question|problem|exercise)\s+(\d+)[:\.]?\s*([^]*?)(?=question|problem|exercise|\d+[\.\)]|$)/gi;
    let match;

    while ((match = keywordPattern.exec(text)) !== null) {
      const questionType = match[1].toLowerCase();
      const questionNumber = parseInt(match[2]);
      const questionText = match[3].trim();

      if (this.isValidQuestionText(questionText)) {
        questions.push({
          number: questionNumber,
          text: questionText,
          type: this.classifyQuestion(questionText),
          numbers: this.extractNumbers(questionText),
          detectionMethod: "keyword",
          confidence: this.calculateQuestionConfidence(questionText),
          questionLabel: `${questionType} ${questionNumber}`,
        });
      }
    }

    return this.sortQuestionsByNumber(questions);
  }

  detectSentenceQuestions(text) {
    const questions = [];

    // Try to split by sentence patterns that look like separate problems
    const sentencePattern = /([^.!?]*[.!?])/g;
    let match;
    let questionIndex = 1;

    while ((match = sentencePattern.exec(text)) !== null) {
      const sentence = match[1].trim();

      if (this.looksLikeHomeworkQuestion(sentence)) {
        questions.push({
          number: questionIndex++,
          text: sentence,
          type: this.classifyQuestion(sentence),
          numbers: this.extractNumbers(sentence),
          detectionMethod: "sentence",
          confidence: this.calculateQuestionConfidence(sentence),
        });
      }
    }

    return questions.slice(0, 5); // Limit to prevent over-segmentation
  }

  createSingleQuestion(text) {
    // Fallback: treat entire text as single question
    if (this.isValidQuestionText(text)) {
      return [
        {
          number: 1,
          text: text.trim(),
          type: this.classifyQuestion(text),
          numbers: this.extractNumbers(text),
          detectionMethod: "single",
          confidence: this.calculateQuestionConfidence(text),
        },
      ];
    }

    return [];
  }

  isValidQuestionText(text) {
    if (!text || text.length < 10) return false;
    if (text.length > 500) return false; // Too long for a single question

    // Must contain some meaningful content
    const meaningfulContent = /[a-zA-Z]{3,}|[\d\+\-\*\/=]{2,}/;
    return meaningfulContent.test(text);
  }

  looksLikeHomeworkQuestion(sentence) {
    const questionIndicators = [
      /solve|find|calculate|determine|evaluate/i,
      /what\s+is|how\s+much|how\s+many/i,
      /area|perimeter|volume|circumference/i,
      /\d+\s*[x-z]|[x-z]\s*\d+/i,
      /=\s*\d+|\d+\s*=/,
      /triangle|circle|rectangle|square/i,
    ];

    return (
      questionIndicators.some((pattern) => pattern.test(sentence)) &&
      sentence.length > 15
    );
  }

  calculateQuestionConfidence(questionText) {
    let confidence = 0.5; // Base confidence

    // Boost confidence for mathematical content
    if (this.detectMathematicalContent(questionText)) confidence += 0.3;

    // Boost confidence for question words
    if (/\b(find|solve|calculate|determine|what|how)\b/i.test(questionText))
      confidence += 0.2;

    // Boost confidence for numbers
    if (/\d+/.test(questionText)) confidence += 0.1;

    // Reduce confidence for very short text
    if (questionText.length < 20) confidence -= 0.2;

    // Reduce confidence for very long text (might be multiple questions)
    if (questionText.length > 200) confidence -= 0.1;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  validateQuestions(questions, overallConfidence) {
    return questions
      .filter((q) => q.confidence > 0.3) // Remove low-confidence questions
      .map((q) => ({
        ...q,
        adjustedConfidence: q.confidence * overallConfidence,
        displayText: this.generateDisplayText(q),
      }))
      .slice(0, 10); // Limit to reasonable number
  }

  generateDisplayText(question) {
    const maxLength = 80;
    let displayText = question.text;

    if (displayText.length > maxLength) {
      displayText = displayText.substring(0, maxLength - 3) + "...";
    }

    return displayText;
  }

  sortQuestionsByNumber(questions) {
    return questions.sort((a, b) => {
      if (typeof a.number === "number" && typeof b.number === "number") {
        return a.number - b.number;
      }
      return 0;
    });
  }

  classifyQuestion(questionText) {
    const text = questionText.toLowerCase();

    const classifications = {
      // Mathematics
      linear_equation: /solve.*x|find.*x|x\s*=|\d*x[\+\-]/,
      quadratic_equation: /x\^?2|x²|quadratic|ax²/,
      triangle_area: /area.*triangle|triangle.*area/,
      circle_area: /area.*circle|circle.*area|πr²/,
      rectangle_area: /area.*rectangle|rectangle.*area|length.*width/,
      perimeter: /perimeter|around|border/,
      factoring: /factor|factorise|factorize/,
      simplifying: /simplify|reduce|combine/,
      trigonometry: /sin|cos|tan|sine|cosine|tangent/,
      geometry_angles: /angle|triangle.*angle|degrees/,

      // Calculus
      calculus_derivative:
        /\bderivative\b|\bd\/dx\b|\bd dy\/dx\b|\brate of change\b|\bdifferen(tiation|tiate)\b/,

      // Statistics & probability
      statistics: /mean|average|median|mode|standard deviation/,
      probability: /probability|chance|odds/,

      // General science/biology concepts
      biology_concept:
        /photosynthesis|respiration|cell|mitosis|meiosis|ecosystem|ecology|chlorophyll|enzyme|digestion|osmosis|diffusion/,
      definition:
        /\bwhat is\b|\bdefine\b|\bexplain\b|\bdescribe\b|\bdifference between\b/,
    };

    for (const [type, pattern] of Object.entries(classifications)) {
      if (pattern.test(text)) {
        return type;
      }
    }

    return "general_academic";
  }

  // BUGFIX: Added missing extractNumbers function
  extractNumbers(text) {
    const numbers = {};

    const patterns = {
      base: /base\s*[=:]\s*(\d+)/i,
      height: /height\s*[=:]\s*(\d+)/i,
      length: /length\s*[=:]\s*(\d+)/i,
      width: /width\s*[=:]\s*(\d+)/i,
      radius: /radius\s*[=:]\s*(\d+)/i,
      area: /area\s*[=:]\s*(\d+)/i,
      coefficient: /(\d+)x/,
      constant: /[\+\-]\s*(\d+)(?!\s*x)/,
      equals: /=\s*(\d+)/,
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        numbers[key] = parseFloat(match[1]);
      }
    }

    return numbers;
  }

  detectMathematicalContent(text) {
    const mathPatterns = [
      /\d+\s*[x-z]\s*[\+\-\*\/]/i,
      /[x-z]\s*[\+\-\*\/]\s*\d+/i,
      /=\s*\d+/,
      /area|perimeter|volume|circumference/i,
      /sin|cos|tan|sine|cosine|tangent/i,
      /factor|simplify|expand/i,
      /\^\d+|²|³/,
      /√|\bsqrt\b/i,
      /π|pi\b/i,
      /triangle|circle|rectangle|square/i,
    ];

    return mathPatterns.some((pattern) => pattern.test(text));
  }
}

// Export singleton
const questionDetector = new EnhancedQuestionDetector();
module.exports = { questionDetector };
