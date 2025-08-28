/**
 * Exam Preparation API Endpoint
 * GOAT Bot 2.0
 * Updated: 2025-08-25 21:40:00 UTC
 * Developer: DithetoMokgabudi
 * Changes: Move IMMEDIATE_FALLBACK handling after FSM; fix response scoping; ensure instant question delivery after confirmation
 */

const stateModule = require("../lib/core/state");
const userStates = stateModule.userStates;
const trackManyState = stateModule.trackManyState;
const {
  persistUserState,
  retrieveUserState,
  getOrCreateUserState,
  trackAnalytics,
  AI_INTEL_STATES, // CRITICAL FIX: Added missing import
} = stateModule;
const { ManyCompatResponse } = require("../lib/core/responses");
const {
  startAIIntelligenceGathering,
  processUserResponse,
} = require("../lib/features/exam-prep/intelligence");
const {
  generateExamQuestions,
} = require("../lib/features/exam-prep/questions");
const {
  formatResponseWithEnhancedSeparation,
} = require("../lib/utils/formatting");
const { detectDeviceType } = require("../lib/utils/device-detection");
const {
  sendImageViaManyChat,
  formatWithLatexImage,
} = require("../lib/utils/whatsapp-image");
const analyticsModule = require("../lib/utils/analytics");
const {
  generatePersonalizedFeedback,
} = require("../lib/features/exam-prep/personalization");

// Update the main module.exports function
module.exports = async (req, res) => {
  try {
    const manyCompatRes = new ManyCompatResponse(res);
    const subscriberId =
      req.body.psid || req.body.subscriber_id || "default_user";
    const message = req.body.message || req.body.user_input || "";
    const userAgent = req.headers["user-agent"] || "";
    const sessionId = req.body.session_id || `sess_${Date.now()}`;

    // DEBUG: Log the incoming message and existing state
    console.log(
      `🔍 DEBUG - Exam-prep request from ${subscriberId}: "${message}"`
    );
    const existingState = userStates.get(subscriberId);
    console.log(
      `🔍 DEBUG - Existing state menu: ${existingState?.current_menu || "none"}`
    );
    console.log(
      `🔍 DEBUG - Existing AI state: ${
        existingState?.context?.ai_intel_state || "none"
      }`
    );

    const entryTimestamp = Date.now();
    console.log(
      `📝 Exam prep request from ${subscriberId}: "${message?.substring(
        0,
        50
      )}${message?.length > 50 ? "..." : ""}"`
    );

    // Retrieve user state with persistence
    let user = await getOrCreateUserState(subscriberId);

    // NOW that user is initialized, we can log the updated state
    console.log(`🔍 DEBUG - Updated state menu: ${user.current_menu}`);
    console.log(`🔍 DEBUG - Updated AI state: ${user.context?.ai_intel_state}`);

    // Update device detection if not already set
    if (!user.preferences.device_type) {
      user.preferences.device_type = detectDeviceType(userAgent);
    }

    // Set default menu if not already in exam prep
    if (!user.current_menu || user.current_menu === "welcome") {
      user.current_menu = "exam_prep_conversation";
    }

    // Track menu position on entry
    trackManyState(subscriberId, {
      type: "exam_prep_conversation",
      current_menu: "exam_prep_conversation",
    });

    // NEW: More comprehensive analytics tracking
    analyticsModule
      .trackEvent(subscriberId, "exam_prep_interaction", {
        message_length: message?.length || 0,
        session_id: sessionId,
        device_type: user.preferences.device_type,
        entry_state: user.context?.ai_intel_state || "initial",
        had_context: Boolean(user.context?.painpoint_profile),
      })
      .catch((err) => console.error("Analytics error:", err));

    if (req.query.endpoint === "mock-exam") {
      return await handleMockExamGeneration(req, manyCompatRes);
    }

    // Store incoming message in conversation history
    if (message) {
      user.conversation_history = user.conversation_history || [];
      user.conversation_history.push({
        role: "user",
        message,
        timestamp: new Date().toISOString(),
      });

      // Limit history size
      if (user.conversation_history.length > 20) {
        user.conversation_history = user.conversation_history.slice(-20);
      }
    }

    // Handle user response based on current state
    let response;
    if (user.context?.ai_intel_state) {
      // Run FSM first
      response = await processUserResponse(user, message);

      // POST-FSM: Generate an immediate fallback question in the SAME request if we're in IMMEDIATE_FALLBACK
      const txt = (message || "").trim().toLowerCase();
      const isMenuCommand =
        txt === "1" ||
        txt === "2" ||
        txt === "3" ||
        txt === "4" ||
        txt === "solution" ||
        txt === "next" ||
        txt === "switch" ||
        txt === "menu";

      if (
        user.context?.ai_intel_state === AI_INTEL_STATES.IMMEDIATE_FALLBACK &&
        !isMenuCommand
      ) {
        // Generate fallback question immediately
        const fallbackQuestion = generateFallbackQuestion(
          user.context.failureType,
          user.context.subjectArea
        );

        user.context.ai_intel_state = AI_INTEL_STATES.GUIDED_DISCOVERY;
        user.context.current_question = fallbackQuestion;

        // Replace response with the actual question
        response = `**Practice Question for ${user.context.painpoint_profile.topic_struggles}**
📊 **Targeted to your specific challenge**

${fallbackQuestion.questionText}

─────────────────────────────────

1️⃣ 📚 View Solution
2️⃣ ➡️ Try Another Question  
3️⃣ 🔄 Switch Topics
4️⃣ 🏠 Main Menu`;
      }

      // Track question generation if reached that state
      if (user.context.ai_intel_state === "ai_question_generation") {
        analyticsModule
          .trackEvent(subscriberId, "exam_question_generated", {
            subject: user.context.painpoint_profile?.subject,
            grade: user.context.painpoint_profile?.grade,
            topic: user.context.painpoint_profile?.topic_struggles,
            painpoint: user.context.painpoint_profile?.specific_failure,
            elapsed_ms: Date.now() - entryTimestamp,
          })
          .catch((err) => console.error("Analytics error:", err));

        // NEW: Track the specific question content
        if (user.context.current_question?.contentId) {
          analyticsModule
            .trackEvent(subscriberId, "content_shown", {
              content_id: user.context.current_question.contentId,
              subject: user.context.painpoint_profile?.subject,
              content_type: "exam_question",
              has_latex: Boolean(user.context.current_question.hasLatex),
            })
            .catch((err) => console.error("Analytics error:", err));
        }
      }

      // Track solution viewing
      if (txt === "1" || txt === "solution") {
        analyticsModule
          .trackEvent(subscriberId, "solution_viewed", {
            subject: user.context.painpoint_profile?.subject,
            topic: user.context.painpoint_profile?.topic_struggles,
            content_id: user.context.current_question?.contentId,
          })
          .catch((err) => console.error("Analytics error:", err));
      }
    } else {
      // Initial entry point - start intelligence gathering
      response = await startAIIntelligenceGathering(user);

      // Track conversation start
      analyticsModule
        .trackEvent(subscriberId, "exam_prep_started", {
          session_id: sessionId,
          entry_type: "new_session",
        })
        .catch((err) => console.error("Analytics error:", err));
    }

    // Store bot response in conversation history
    user.conversation_history.push({
      role: "assistant",
      message: response,
      timestamp: new Date().toISOString(),
    });

    // Update user state in memory
    userStates.set(subscriberId, user);

    // Persist user state to database (don't await - fire and forget)
    persistUserState(subscriberId, user).catch((err) => {
      console.error(`❌ State persistence error for ${subscriberId}:`, err);
    });

    // Only ask for rating when there's an actual question shown
    if (user.context?.current_question && Math.random() < 0.2) {
      response +=
        "\n\n**Was this question helpful for your exam prep? Rate 1-5**";
    }

    // NEW: Track API response time
    analyticsModule
      .trackEvent(subscriberId, "api_performance", {
        endpoint: "exam_prep",
        response_time_ms: Date.now() - entryTimestamp,
        message_length: response?.length || 0,
      })
      .catch((err) => console.error("Analytics error:", err));

    return manyCompatRes.json({
      message: response,
      status: "success",
      debug_state: {
        menu: user.current_menu,
        ai_state: user.context?.ai_intel_state,
      },
    });
  } catch (error) {
    console.error("Exam prep error:", error);
    return res.json({
      message:
        "Sorry, I encountered an error with exam prep. Please try again.",
      status: "error",
      echo: "Sorry, I encountered an error with exam prep. Please try again.",
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
