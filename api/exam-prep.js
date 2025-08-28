/**
 * Exam Preparation API Endpoint
 * GOAT Bot 2.0
 * Updated: 2025-08-25 21:40:00 UTC
 * Developer: DithetoMokgabudi
 * Changes: Move IMMEDIATE_FALLBACK handling after FSM; fix response scoping; ensure instant question delivery after confirmation
 */

const stateModule = require("../lib/core/state");
const userStates = stateModule.userStates;
const { persistUserState, getOrCreateUserState, AI_INTEL_STATES } = stateModule;
const { ManyCompatResponse } = require("../lib/core/responses");
const analyticsModule = require("../lib/utils/analytics");
const { detectDeviceType } = require("../lib/utils/device-detection");
const {
  startAIQuestionsMode,
  processQuestionsFlow,
} = require("../lib/features/exam-prep/intelligence");

// Update the main module.exports function
module.exports = async (req, res) => {
  try {
    const manyCompatRes = new ManyCompatResponse(res);
    const subscriberId =
      req.body.psid || req.body.subscriber_id || "default_user";
    const message = (req.body.message || req.body.user_input || "").trim();
    const userAgent = req.headers["user-agent"] || "";
    const entryTimestamp = Date.now();

    let user = await getOrCreateUserState(subscriberId);
    if (!user.preferences.device_type) {
      user.preferences.device_type = detectDeviceType(userAgent);
    }
    if (!user.current_menu || user.current_menu === "welcome") {
      user.current_menu = "exam_prep_conversation";
    }

    // Conversation history (short)
    if (message) {
      user.conversation_history = user.conversation_history || [];
      user.conversation_history.push({
        role: "user",
        message,
        timestamp: new Date().toISOString(),
      });
      if (user.conversation_history.length > 20) {
        user.conversation_history = user.conversation_history.slice(-20);
      }
    }

    let response;
    // Start “Exam/Test Questions” mode
    if (!user.context?.ai_intel_state) {
      response = await startAIQuestionsMode(user);
      analyticsModule
        .trackEvent(subscriberId, "exam_questions_mode_started", {
          mode: "text_only",
        })
        .catch(() => {});
    } else {
      response = await processQuestionsFlow(user, message);
    }

    // Append assistant response
    user.conversation_history = user.conversation_history || [];
    user.conversation_history.push({
      role: "assistant",
      message: response,
      timestamp: new Date().toISOString(),
    });

    // Persist
    userStates.set(subscriberId, user);
    persistUserState(subscriberId, user).catch(() => {});

    analyticsModule
      .trackEvent(subscriberId, "exam_prep_interaction", {
        ai_state: user.context?.ai_intel_state,
        response_time_ms: Date.now() - entryTimestamp,
      })
      .catch(() => {});

    return manyCompatRes.json({
      message: response,
      status: "success",
      debug_state: {
        menu: user.current_menu,
        ai_state: user.context?.ai_intel_state,
      },
    });
  } catch (error) {
    console.error("Exam/Test Questions error:", error);
    return res.json({
      message:
        "Sorry, I encountered an error with Exam/Test Questions. Please try again.",
      status: "error",
      echo: "Sorry, I encountered an error with Exam/Test Questions. Please try again.",
      error: error.message,
    });
  }
};

async function handleQuestionGeneration(user, userResponse) {
  // Update personalization preferences based on user interactions
  user.preferences.personalization = user.preferences.personalization || {
    difficulty: "adaptive",
    explanations: "detailed",
    examples: true,
    visualStyle: "clear",
  };

  // Add message about personalization
  const personalizationMsg = user.preferences.painpoint_history
    ? `\n\n📊 **Personalized for you** based on your learning patterns`
    : `\n\n📊 **Customized for your needs**`;

  // First send loading message
  const loadingMessage = `🎯 **Perfect! Generating your targeted question...**

I'm creating a practice question specifically for:
"${user.context.painpoint_profile.specific_failure}"
${personalizationMsg}

⏳ One moment please...

─────────────────────────────────

1️⃣ ➡️ Continue
2️⃣ 📝 Skip to Next Question
3️⃣ 🔄 Switch Topics  
4️⃣ 🏠 Main Menu`;

  // CRITICAL FIX: Set state to ensure immediate fallback if user requests again
  user.context.ai_intel_state = AI_INTEL_STATES.IMMEDIATE_FALLBACK;
  user.context.generation_started = Date.now();
  user.context.failureType = user.context.painpoint_profile.specific_failure;
  user.context.subjectArea = user.context.painpoint_profile.subject;

  return loadingMessage;
}

// Generate fallback question when AI generation fails
function generateFallbackQuestion(failureType, subjectArea) {
  // Convert to lowercase for consistent matching
  const failure = (failureType || "").toLowerCase();
  const subject = (subjectArea || "Mathematics").toLowerCase();

  // Geometry-specific questions
  if (subject.includes("geometry")) {
    if (failure.includes("equation") || failure.includes("balanc")) {
      return {
        questionText: `In triangle ABC, angle A = 45° and angle B = 60°. Calculate the measure of angle C.

Remember to use the fact that the sum of all angles in a triangle equals 180°.`,
        solution: `**Step 1:** Set up the equation using the triangle angle sum property
A + B + C = 180°
45° + 60° + C = 180°
105° + C = 180°

**Step 2:** Solve for angle C
C = 180° - 105°
C = 75°

Therefore, angle C = 75°`,
      };
    }

    return {
      questionText: `Two lines intersect, forming angles. If one angle is 35°, find the measure of the adjacent angle.`,
      solution: `Adjacent angles formed by intersecting lines are supplementary (sum to 180°).

First angle = 35°
Adjacent angle = 180° - 35° = 145°

Therefore, the adjacent angle measures 145°.`,
    };
  }

  // Algebra-specific questions
  if (
    subject.includes("algebra") ||
    failure.includes("equation") ||
    failure.includes("balanc")
  ) {
    return {
      questionText: `Solve the following equation:
3x - 7 = 2x + 5

Show all your working steps.`,
      solution: `**Step 1:** Group like terms
3x - 2x = 5 + 7
x = 12

**Step 2:** Check your answer
3(12) - 7 = 2(12) + 5
36 - 7 = 24 + 5
29 = 29 ✓

Therefore, x = 12`,
    };
  }

  // Generic fallback for any math topic
  return {
    questionText: `If 2x + 3y = 12 and x = 3, find the value of y.

Show your working steps.`,
    solution: `**Step 1:** Substitute x = 3 into the equation
2(3) + 3y = 12
6 + 3y = 12

**Step 2:** Solve for y
3y = 12 - 6
3y = 6
y = 2

Therefore, y = 2`,
  };
}

// Handle mock exam generation endpoint
async function handleMockExamGeneration(req, res) {
  const {
    grade = 10,
    subject = "Mathematics",
    questionCount = 1,
    topics = "algebra",
    painpoint = "solving equations",
    confidence = "medium",
  } = req.query;

  try {
    // Create a mock profile for API testing
    const mockProfile = {
      grade: grade,
      subject: subject,
      topic_struggles: topics,
      specific_failure: painpoint,
      assessment_type: "test",
    };

    // Use our new questions module
    const examQuestions = await generateExamQuestions(
      mockProfile,
      parseInt(questionCount) || 1
    );

    // Format for API response
    const formattedQuestions = examQuestions.questions.map((q, index) => ({
      questionNumber: index + 1,
      questionText: q.questionText,
      solution: q.solution,
      marksAllocated: 5,
      targeted: true,
      painpoint: painpoint,
      source: q.source,
    }));

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      user: "sophoniagoat",
      mockExam: formattedQuestions,
      metadata: {
        ...examQuestions.metadata,
        modularized: true,
      },
    });
  } catch (error) {
    console.error("Mock exam generation error:", error);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      user: "sophoniagoat",
      error: "Failed to generate mock exam",
      message: error.message,
    });
  }
}
