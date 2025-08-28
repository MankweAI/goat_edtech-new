/**
 * Question Personalization System
 * GOAT Bot 2.0
 * Created: 2025-08-25 11:36:53 UTC
 * Developer: DithetoMokgabudi
 */

const {
  getPersonalizedRecommendations,
  getPopularTopics,
} = require("../../utils/analytics");

/**
 * Personalize question generation for user
 * @param {object} profile - Base profile with subject, grade, etc.
 * @param {string} userId - User identifier
 * @returns {Promise<object>} - Enhanced profile with personalization
 */
async function personalizeQuestionProfile(profile, userId) {
  if (!userId) return profile;

  try {
    // Get personalized recommendations
    const recommendations = await getPersonalizedRecommendations(userId, {
      subject: profile.subject,
      topic: profile.topic_struggles,
    });

    // Create a copy of the profile
    const enhancedProfile = { ...profile };

    // Apply personalization based on recommendations

    // 1. Visual preference
    enhancedProfile.visual_preference = recommendations.visual_preference;

    // 2. Learning pattern
    enhancedProfile.learning_pattern = recommendations.learning_pattern;

    // 3. Difficulty preference
    enhancedProfile.difficulty = recommendations.difficulty_preference;

    // 4. Next best topic suggestion
    if (recommendations.next_best_topic) {
      enhancedProfile.related_topic = recommendations.next_best_topic;
    }

    return enhancedProfile;
  } catch (error) {
    console.error(
      `❌ Error personalizing question profile for ${userId}:`,
      error
    );
    return profile;
  }
}

/**
 * Enhance topic suggestions with popular choices
 * @param {string} subject - Academic subject
 * @param {Array<string>} baseTopics - Base topic suggestions
 * @returns {Promise<Array<string>>} - Enhanced topic suggestions
 */
async function enhanceTopicSuggestions(subject, baseTopics = []) {
  try {
    // Get popular topics for this subject
    const popularTopics = await getPopularTopics(subject);

    // Combine base topics with popular topics
    const combinedTopics = new Set([...baseTopics]);

    // Add popular topics but limit total to 8
    for (const topic of popularTopics) {
      if (combinedTopics.size < 8) {
        combinedTopics.add(`${topic} (Popular)`);
      } else {
        break;
      }
    }

    return Array.from(combinedTopics);
  } catch (error) {
    console.error(
      `❌ Error enhancing topic suggestions for ${subject}:`,
      error
    );
    return baseTopics;
  }
}

/**
 * Generate personalized feedback for a question
 * @param {object} question - Question object
 * @param {object} userContext - User context
 * @returns {string} - Personalized feedback
 */
function generatePersonalizedFeedback(question, userContext) {
  // Default feedback
  let feedback = "Great job attempting this question!";

  // Personalize based on learning pattern
  const pattern = userContext.preferences?.learning_pattern || "sequential";

  if (pattern === "comprehensive") {
    feedback =
      "Let's understand this step by step, ensuring a solid foundation.";
  } else if (pattern === "practice-focused") {
    feedback = "Here's the key approach to master this concept quickly.";
  }

  // Add subject-specific encouragement
  const subject = userContext.painpoint_profile?.subject;
  if (subject === "Mathematics") {
    feedback +=
      " Remember that math is about the process, not just the answer.";
  } else if (subject === "Physical Sciences") {
    feedback += " Connecting the theory to practical applications is key.";
  } else if (subject === "Geography") {
    feedback +=
      " Think about how these concepts connect to real places you know.";
  }

  return feedback;
}

/**
 * Adjust question difficulty based on user profile
 * @param {object} question - Question object
 * @param {object} userProfile - User profile
 * @returns {object} - Adjusted question
 */
function adjustQuestionDifficulty(question, userProfile) {
  // Clone the question to avoid modifying the original
  const adjustedQuestion = { ...question };

  // Get user's preferred difficulty
  const preferredDifficulty = userProfile.difficulty || "mixed";

  // Apply adjustments based on difficulty preference
  switch (preferredDifficulty) {
    case "challenging":
      adjustedQuestion.questionText +=
        "\n\n**Extension:** " +
        generateChallengeExtension(question, userProfile);
      break;

    case "simplified":
      adjustedQuestion.questionText = simplifyQuestion(
        question.questionText,
        userProfile
      );
      break;

    case "mixed":
    default:
      // No changes for mixed preference
      break;
  }

  return adjustedQuestion;
}

/**
 * Generate a challenge extension for advanced students
 * @param {object} question - Base question
 * @param {object} userProfile - User profile
 * @returns {string} - Challenge extension
 */
function generateChallengeExtension(question, userProfile) {
  const subject = userProfile.subject || "Mathematics";
  const topic = userProfile.topic_struggles || "";

  // Subject-specific challenge extensions
  const extensions = {
    Mathematics: {
      algebra: "Now generalize your approach for a system of three variables.",
      geometry: "Prove that this result holds for any similar configuration.",
      trigonometry:
        "Derive the same result using an alternative trigonometric identity.",
      calculus: "Find the rate of change at the critical points.",
      default: "Extend your solution to show a general case.",
    },
    "Physical Sciences": {
      mechanics:
        "How would the result change in a non-inertial reference frame?",
      electricity:
        "Derive the same result using an alternative approach (e.g., Gauss's Law).",
      chemistry: "Predict how changing temperature would affect this reaction.",
      default:
        "What additional factors would affect this in a real-world scenario?",
    },
    default: "Consider a more complex version of this problem.",
  };

  // Find the most specific extension available
  if (extensions[subject]) {
    for (const [subTopic, extension] of Object.entries(extensions[subject])) {
      if (topic.toLowerCase().includes(subTopic)) {
        return extension;
      }
    }
    return extensions[subject].default;
  }

  return extensions.default;
}

/**
 * Simplify a question for struggling students
 * @param {string} questionText - Original question
 * @param {object} userProfile - User profile
 * @returns {string} - Simplified question
 */
function simplifyQuestion(questionText, userProfile) {
  // Split into parts with a hint
  const simplified =
    questionText +
    "\n\n**Hint:** " +
    generateSimplificationHint(questionText, userProfile);

  return simplified;
}

/**
 * Generate a hint for simplified questions
 * @param {string} questionText - Question text
 * @param {object} userProfile - User profile
 * @returns {string} - Helpful hint
 */
function generateSimplificationHint(questionText, userProfile) {
  const subject = userProfile.subject || "Mathematics";
  const topic = userProfile.topic_struggles || "";

  // Subject-specific hints
  const hints = {
    Mathematics: {
      algebra: "Start by isolating the variable on one side of the equation.",
      geometry: "Draw a diagram and label all the given values.",
      trigonometry:
        "Recall the main trigonometric ratios: sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent.",
      calculus: "Remember the power rule: d/dx(xⁿ) = n·xⁿ⁻¹",
      default: "Break down the problem into smaller steps.",
    },
    "Physical Sciences": {
      mechanics: "Start by identifying all forces acting on the object.",
      electricity: "Recall Ohm's Law: V = IR",
      chemistry: "Look at the balance of atoms on both sides of the equation.",
      default: "Identify what information is given and what you need to find.",
    },
    default: "Start with what you know and work step-by-step.",
  };

  // Find the most specific hint available
  if (hints[subject]) {
    for (const [subTopic, hint] of Object.entries(hints[subject])) {
      if (topic.toLowerCase().includes(subTopic)) {
        return hint;
      }
    }
    return hints[subject].default;
  }

  return hints.default;
}

module.exports = {
  personalizeQuestionProfile,
  enhanceTopicSuggestions,
  generatePersonalizedFeedback,
  adjustQuestionDifficulty,
};

