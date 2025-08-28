/**
 * Diagnostic Questions System
 * GOAT Bot 2.0
 * Created: 2025-08-25 11:22:19 UTC
 * Developer: DithetoMokgabudi
 */

const { SUBJECT_PROBING_DATABASE } = require("../../data/subject-database");
const { generateExamQuestions } = require("./questions");

/**
 * Get a diagnostic question for a specific subject and topic
 * @param {string} subject - The academic subject
 * @param {string} topic - The specific topic
 * @returns {Promise<object>} - A diagnostic question with solution
 */
async function getDiagnosticQuestion(subject, topic) {
  // Try to get a pre-defined diagnostic question
  const diagnosticQuestion = getPreDefinedDiagnostic(subject, topic);
  if (diagnosticQuestion) {
    return {
      questionText: diagnosticQuestion.questionText,
      solution: diagnosticQuestion.solution,
      purpose: diagnosticQuestion.purpose,
      source: "predefined_diagnostic",
    };
  }

  // If no pre-defined question, generate one
  try {
    const mockProfile = {
      grade: 10, // Default grade
      subject: subject || "Mathematics",
      topic_struggles: topic || "general",
      specific_failure: `understanding basic ${topic} concepts`,
      assessment_type: "diagnostic",
    };

    const generatedQuestion = await generateExamQuestions(mockProfile, 1);

    if (generatedQuestion.questions && generatedQuestion.questions.length > 0) {
      return {
        ...generatedQuestion.questions[0],
        purpose: "diagnostic",
        source: "ai_diagnostic",
      };
    }

    throw new Error("No diagnostic question generated");
  } catch (error) {
    // Return a generic fallback question
    return getGenericDiagnosticQuestion(subject, topic);
  }
}

// Update generateDiagnosticQuestion to show personalization
async function generateDiagnosticQuestion(user) {
  const { subject, grade, topic_struggles } = user.context.painpoint_profile;
  console.log(`🔍 Generating diagnostic question for ${subject} - ${topic_struggles}`);

  try {
    // Get a diagnostic question
    const diagnosticQuestion = await getDiagnosticQuestion(subject, topic_struggles);
    
    // Add personalization marker
    const hasHistory = user.preferences?.painpoint_history?.length > 0;
    const personalizationNote = hasHistory ? 
      "\n\n📊 **Question tailored to your learning pattern**" : 
      "";

    // Store in user context
    user.context.diagnostic_question = diagnosticQuestion;
    user.context.ai_intel_state = AI_INTEL_STATES.AI_DIAGNOSTIC_ANALYSIS;

    const content = `📝 **Let me understand your specific challenge better.**

Here's a ${subject} question about ${topic_struggles}:

${diagnosticQuestion.questionText}${personalizationNote}

**Please attempt this question so I can identify exactly where you're getting stuck.**`;

    const menu = `1️⃣ ➡️ I can't solve this
2️⃣ 📝 Skip diagnostic
3️⃣ 🔄 Switch topics
4️⃣ 🏠 Main Menu`;

    return formatResponseWithEnhancedSeparation(content, menu, user.preferences.device_type);
  } catch (error) {
    console.error("Diagnostic question error:", error);

    // Fallback
    user.context.ai_intel_state = AI_INTEL_STATES.AI_MICRO_TARGETING;
    return handleMicroTargeting(user, "I'm not sure exactly what I'm struggling with");
  }
}

/**
 * Get a pre-defined diagnostic question from the subject database
 * @param {string} subject - The academic subject
 * @param {string} topic - The specific topic
 * @returns {object|null} - Diagnostic question or null
 */
function getPreDefinedDiagnostic(subject, topic) {
  const subjectData = SUBJECT_PROBING_DATABASE[subject];
  if (!subjectData) return null;

  // Look for direct topic match
  const topicData = subjectData[topic.toLowerCase()];
  if (topicData && topicData.diagnostic_question) {
    return topicData.diagnostic_question;
  }

  // Try to find partial match
  for (const [key, data] of Object.entries(subjectData)) {
    if (
      (topic.toLowerCase().includes(key) ||
        key.includes(topic.toLowerCase())) &&
      data.diagnostic_question
    ) {
      return data.diagnostic_question;
    }
  }

  return null;
}

/**
 * Create a generic diagnostic question as fallback
 * @param {string} subject - The academic subject
 * @param {string} topic - The specific topic
 * @returns {object} - A generic diagnostic question
 */
function getGenericDiagnosticQuestion(subject, topic) {
  // Different templates based on subject
  const templates = {
    Mathematics: {
      questionText: `Solve the following ${topic} problem and show your working:\n\n[Basic ${topic} problem appropriate for Grade 10]`,
      solution: `Step-by-step solution would be shown here.`,
      purpose: "Basic concept check",
    },
    "Mathematical Literacy": {
      questionText: `Analyze the following scenario related to ${topic}:\n\n[Real-world scenario applying ${topic}]`,
      solution: `The solution would involve practical application of math literacy concepts.`,
      purpose: "Real-world application",
    },
    "Physical Sciences": {
      questionText: `Calculate the following for this ${topic} problem:\n\n[Basic physics/chemistry problem related to ${topic}]`,
      solution: `Step-by-step solution using appropriate formulas.`,
      purpose: "Formula application",
    },
    "Life Sciences": {
      questionText: `Explain the process of ${topic} with reference to the following diagram:\n\n[Description of biological process]`,
      solution: `Explanation would include key biological principles and terminology.`,
      purpose: "Process understanding",
    },
    Geography: {
      questionText: `Analyze the following geographic feature related to ${topic}:\n\n[Description of geographic phenomenon]`,
      solution: `Analysis would include geographic principles and terminology.`,
      purpose: "Geographic analysis",
    },
    History: {
      questionText: `Using Source A and Source B, explain the significance of ${topic} in South African history:\n\n[Historical sources about ${topic}]`,
      solution: `Historical analysis with reference to sources and historical context.`,
      purpose: "Source-based analysis",
    },
  };

  return templates[subject] || templates["Mathematics"];
}

/**
 * Analyze student's answer to diagnostic question
 * @param {string} studentAnswer - The student's answer text
 * @param {object} diagnosticQuestion - The diagnostic question object
 * @returns {object} - Analysis results
 */
async function analyzeDiagnosticAnswer(studentAnswer, diagnosticQuestion) {
  // Simple keyword analysis as fallback
  const keywordAnalysis = {
    confidence: 0,
    understanding: "unclear",
    specific_issues: [],
    feedback: "I need more information to determine your specific challenge.",
  };

  // Look for correct terminology
  if (diagnosticQuestion.solution) {
    const solutionTerms = extractKeyTerms(diagnosticQuestion.solution);
    const answerTerms = extractKeyTerms(studentAnswer);

    // Calculate how many solution terms are present in the answer
    const matchedTerms = solutionTerms.filter((term) =>
      answerTerms.some((aTerm) => aTerm.includes(term) || term.includes(aTerm))
    );

    // Calculate confidence based on term matching
    const termConfidence =
      solutionTerms.length > 0 ? matchedTerms.length / solutionTerms.length : 0;

    // Look for error patterns
    const errorPatterns = detectErrorPatterns(
      studentAnswer,
      diagnosticQuestion
    );

    // Update the analysis
    keywordAnalysis.confidence = Math.min(0.7, termConfidence);
    keywordAnalysis.understanding = getUnderstandingLevel(
      termConfidence,
      errorPatterns
    );
    keywordAnalysis.specific_issues = errorPatterns;
    keywordAnalysis.feedback = generateFeedback(
      keywordAnalysis.understanding,
      errorPatterns
    );
  }

  return keywordAnalysis;
}

/**
 * Extract key terms from text
 * @param {string} text - The text to analyze
 * @returns {Array<string>} - List of key terms
 */
function extractKeyTerms(text) {
  if (!text) return [];

  // Basic tokenization
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  // Filter out common words
  const commonWords = ["the", "and", "that", "this", "with", "for", "from"];
  return words.filter((w) => !commonWords.includes(w));
}

/**
 * Detect common error patterns in student answers
 * @param {string} answer - Student's answer
 * @param {object} question - The diagnostic question
 * @returns {Array<string>} - List of detected error patterns
 */
function detectErrorPatterns(answer, question) {
  const issues = [];
  const lowerAnswer = answer.toLowerCase();

  // Check for no calculation shown
  if (
    question.subject === "Mathematics" ||
    question.subject === "Physical Sciences"
  ) {
    if (
      !lowerAnswer.match(/\d+\s*[\+\-\*\/=]\s*\d+/) &&
      !lowerAnswer.includes("step")
    ) {
      issues.push("no_calculation_shown");
    }
  }

  // Check for very short answer
  if (lowerAnswer.split(/\s+/).length < 5) {
    issues.push("too_brief");
  }

  // Check for question restatement only
  if (
    lowerAnswer.includes("i don't know") ||
    lowerAnswer.includes("not sure") ||
    lowerAnswer.includes("can't solve")
  ) {
    issues.push("uncertainty_expressed");
  }

  return issues;
}

/**
 * Determine understanding level based on term matching and errors
 * @param {number} termConfidence - Confidence from term matching
 * @param {Array<string>} errorPatterns - Detected error patterns
 * @returns {string} - Understanding level
 */
function getUnderstandingLevel(termConfidence, errorPatterns) {
  if (termConfidence > 0.7 && errorPatterns.length === 0) {
    return "strong";
  } else if (termConfidence > 0.4 || errorPatterns.length <= 1) {
    return "partial";
  } else if (errorPatterns.includes("uncertainty_expressed")) {
    return "struggling";
  } else {
    return "unclear";
  }
}

/**
 * Generate feedback based on understanding level and errors
 * @param {string} understanding - Understanding level
 * @param {Array<string>} issues - Specific issues
 * @returns {string} - Feedback message
 */
function generateFeedback(understanding, issues) {
  switch (understanding) {
    case "strong":
      return "Based on your answer, you seem to understand the core concepts well.";
    case "partial":
      return "I see some understanding, but there may be gaps in your knowledge.";
    case "struggling":
      return "It looks like you're finding this challenging. Let's focus on the fundamentals.";
    case "unclear":
    default:
      if (issues.includes("too_brief")) {
        return "I need a more detailed answer to understand your specific challenge.";
      } else if (issues.includes("no_calculation_shown")) {
        return "Please show your working/calculations so I can see where you're getting stuck.";
      } else {
        return "Let me ask a different question to better understand your specific challenge.";
      }
  }
}

module.exports = {
  getDiagnosticQuestion,
  analyzeDiagnosticAnswer,
  getPreDefinedDiagnostic,
  getGenericDiagnosticQuestion,
};

