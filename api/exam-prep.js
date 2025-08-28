// api/exam-prep.js
/**
 * Exam Preparation API Endpoint - Image Intelligence Mode
 * GOAT Bot 2.0
 * Updated: 2025-08-28 15:25:00 UTC
 * Developer: DithetoMokgabudi
 *
 * UX Enhancements (no feature changes):
 * - Consistent headers, separators, and emojis
 * - Standardized interactive menu (1 Hint • 2 Different problem • 3 Main Menu)
 * - Wrapped messages with formatResponseWithEnhancedSeparation
 */

const stateModule = require("../lib/core/state");
const userStates = stateModule.userStates;
const trackManyState = stateModule.trackManyState;
const { persistUserState, getOrCreateUserState } = stateModule;
const { ManyCompatResponse } = require("../lib/core/responses");
const { extractImageData } = require("../lib/core/commands");
const {
  ExamPrepImageIntelligence,
} = require("../lib/features/exam-prep/image-intelligence");
const {
  PsychologicalReportGenerator,
} = require("../lib/features/exam-prep/psychological-report");
const {
  FoundationGapDetector,
} = require("../lib/features/exam-prep/foundation-mapper");
const {
  SolutionAnalyzer,
} = require("../lib/features/exam-prep/solution-analyzer");
const {
  AdaptiveDifficulty,
} = require("../lib/features/exam-prep/adaptive-progression");
const {
  generateExamQuestions,
  generateFallbackQuestion,
} = require("../lib/features/exam-prep/questions");
const analyticsModule = require("../lib/utils/analytics");
const { detectDeviceType } = require("../lib/utils/device-detection");
const { downloadImageAsBase64 } = require("../lib/utils/fetch-image");
const {
  formatResponseWithEnhancedSeparation,
} = require("../lib/utils/formatting");

const imageIntelligence = new ExamPrepImageIntelligence();
const psychReportGenerator = new PsychologicalReportGenerator();
const foundationDetector = new FoundationGapDetector();
const solutionAnalyzer = new SolutionAnalyzer();
const adaptiveDifficulty = new AdaptiveDifficulty();

// Standardized interactive menu for this feature (numbers consistent everywhere)
const MENU_INTERACTIVE = `1️⃣ 💡 Hint
2️⃣ 🔄 Different problem
3️⃣ 🏠 Main Menu`;

module.exports = async (req, res) => {
  try {
    const manyCompatRes = new ManyCompatResponse(res);
    const subscriberId =
      req.body.psid || req.body.subscriber_id || "default_user";
    const message = req.body.message || req.body.user_input || "";
    const userAgent = req.headers["user-agent"] || "";

    let user = await getOrCreateUserState(subscriberId);
    if (!user.preferences.device_type) {
      user.preferences.device_type = detectDeviceType(userAgent);
    }
    if (!user.current_menu || user.current_menu === "welcome") {
      user.current_menu = "exam_prep_conversation";
    }
    user.context = user.context || {};
    trackManyState(subscriberId, {
      type: "exam_prep_conversation",
      current_menu: "exam_prep_conversation",
    });

    const imageInfo = extractImageData(req);

    // Interactive mode takes precedence (solution analysis or commands)
    if (user.context?.interactiveMode && user.context?.currentQuestion) {
      let response;
      if (
        imageInfo &&
        (imageInfo.type === "direct" || imageInfo.type === "url")
      ) {
        response = await handleSolutionUpload(user, imageInfo);
      } else if ((message || "").trim()) {
        response = await handleInteractiveMode(user, message);
      } else {
        const content =
          "🧩 Ready when you are.\nUpload your working photo, or pick an option below.";
        response = formatResponseWithEnhancedSeparation(
          content,
          MENU_INTERACTIVE,
          user.preferences.device_type
        );
      }

      user.conversation_history = user.conversation_history || [];
      user.conversation_history.push({
        role: "assistant",
        message: response,
        timestamp: new Date().toISOString(),
      });
      userStates.set(subscriberId, user);
      persistUserState(subscriberId, user).catch(console.error);

      return manyCompatRes.json({
        message: response,
        status: "success",
        debug_state: { menu: user.current_menu, mode: "interactive" },
      });
    }

    // Painpoint confirmation gate
    if (user.context?.painpointConfirm?.awaiting) {
      const response = await handlePainpointConfirmation(user, message);

      user.conversation_history = user.conversation_history || [];
      user.conversation_history.push({
        role: "assistant",
        message: response,
        timestamp: new Date().toISOString(),
      });
      userStates.set(subscriberId, user);
      persistUserState(subscriberId, user).catch(console.error);

      return manyCompatRes.json({
        message: response,
        status: "success",
        debug_state: {
          menu: user.current_menu,
          mode: user.context?.interactiveMode
            ? "interactive"
            : "awaiting_painpoint_confirmation",
        },
      });
    }

    // First-time image intelligence
    if (
      imageInfo &&
      (imageInfo.type === "direct" || imageInfo.type === "url")
    ) {
      // NEW: If URL, download to base64 for OCR reliability
      let normalizedImageData = imageInfo.data;
      if (imageInfo.type === "url") {
        try {
          normalizedImageData = await downloadImageAsBase64(imageInfo.data);
        } catch (e) {
          console.error("Image URL download failed:", e.message);
          const content =
            "📸 I couldn't fetch the image from the link. Please resend a clearer photo.";
          const response = formatResponseWithEnhancedSeparation(
            content,
            "Tip: Fill the frame, avoid shadows.",
            user.preferences.device_type
          );
          return manyCompatRes.json({
            message: response,
            status: "error",
            echo: response,
          });
        }
      }

      const response = await handleImageIntelligence(user, {
        type: "direct",
        data: normalizedImageData,
      });

      user.conversation_history = user.conversation_history || [];
      user.conversation_history.push({
        role: "assistant",
        message: response,
        timestamp: new Date().toISOString(),
      });

      userStates.set(subscriberId, user);
      persistUserState(subscriberId, user).catch(console.error);

      return manyCompatRes.json({
        message: response,
        status: "success",
        debug_state: {
          menu: user.current_menu,
          mode: user.context?.painpointConfirm?.awaiting
            ? "awaiting_painpoint_confirmation"
            : "image_intelligence",
        },
      });
    }

    // Otherwise, prompt for image (simple, no numeric menu here)
    const response = generateImageUploadPrompt(user);
    user.conversation_history = user.conversation_history || [];
    user.conversation_history.push({
      role: "assistant",
      message: response,
      timestamp: new Date().toISOString(),
    });
    userStates.set(subscriberId, user);
    persistUserState(subscriberId, user).catch(console.error);

    return manyCompatRes.json({
      message: response,
      status: "success",
      debug_state: { menu: user.current_menu, mode: "awaiting_image" },
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

// Handle image intelligence → concise report → ask for painpoint confirmation
async function handleImageIntelligence(user, imageInfo) {
  try {
    const imageData = imageInfo.data;
    const result = await imageIntelligence.extractIntelligenceFromImage(
      imageData,
      user.id
    );
    if (!result.success)
      return generateImageProcessingError(user, result.error);

    const intelligence = result.intelligence;
    const foundationGaps = foundationDetector.detectFoundationGaps(
      intelligence.topic,
      intelligence.grade,
      intelligence.struggle
    );

    // Store meta
    user.context.painpoint_profile = {
      subject: intelligence.subject,
      topic_struggles: intelligence.topic,
      specific_failure: intelligence.struggle,
    };
    user.context.intelligence_metadata = {
      confidence: {
        subject: intelligence.subjectConfidence,
        topic: intelligence.topicConfidence,
        struggle: intelligence.struggleConfidence,
        overall: intelligence.overallConfidence,
      },
      foundationGaps,
      relatedStruggles: intelligence.relatedStruggles,
      userConfidence: intelligence.confidenceLevel,
      extractedText: result.extractedText,
      imageHash: result.imageHash,
    };

    // Build concise report (no date/plan)
    const conciseReport = psychReportGenerator.generateConciseReport(
      intelligence,
      {
        extractedText: result.extractedText,
        confidence: result.confidence,
        foundationGaps,
      }
    );

    // Build painpoint options
    const options = buildPainpointOptions(intelligence, foundationGaps);
    user.context.painpointConfirm = {
      awaiting: true,
      options, // {primary, suggestions: [A,B,C]}
      intelligence,
    };

    const confirmBlock = formatPainpointConfirmationPrompt(options);

    const content = `🎯 **I can see what's happening**\n\n${conciseReport}\n\n${confirmBlock}`;
    return formatResponseWithEnhancedSeparation(
      content,
      'Reply "yes" to confirm the main struggle, or choose A/B/C.',
      user.preferences.device_type
    );
  } catch (error) {
    console.error("Image intelligence processing failed:", error);
    return generateFallbackImageResponse(user);
  }
}

// Build painpoint options from intelligence and gaps
function buildPainpointOptions(intelligence, foundationGaps = []) {
  const primary =
    (intelligence.struggle && intelligence.struggle.trim()) ||
    "method selection";
  const related = Array.from(
    new Set([...(intelligence.relatedStruggles || [])])
  ).filter(Boolean);

  const gapLabels = (foundationGaps || [])
    .slice(0, 3)
    .map((g) => g.description)
    .filter(Boolean);

  const suggestions = Array.from(new Set([...related, ...gapLabels]))
    .filter((s) => s && s.toLowerCase() !== primary.toLowerCase())
    .slice(0, 3);

  const fallbackSuggestions = [
    "calculation slips",
    "equation setup",
    "method steps",
  ];
  while (suggestions.length < 3) {
    const f = fallbackSuggestions.shift();
    if (!f) break;
    if (f.toLowerCase() !== primary.toLowerCase()) suggestions.push(f);
  }

  return { primary, suggestions };
}

function formatPainpointConfirmationPrompt(options) {
  const [A, B, C] = options.suggestions;
  return `🧠 **Focus check**
Main struggle I see: ${options.primary}

A) ${A}
B) ${B}
C) ${C}`;
}

// Handle confirmation replies and then generate plan + first diagnostic
async function handlePainpointConfirmation(user, message = "") {
  const text = (message || "").toLowerCase().trim();
  const confirmCtx = user.context.painpointConfirm;
  const { primary, suggestions } = confirmCtx.options;

  let confirmed = null;
  if (text === "yes" || text === "y") confirmed = primary;
  else if (text === "a") confirmed = suggestions[0];
  else if (text === "b") confirmed = suggestions[1];
  else if (text === "c") confirmed = suggestions[2];

  if (!confirmed) {
    const content = `Please pick one:
• Reply "yes" to confirm "${primary}"
• Or choose A/B/C`;
    return formatResponseWithEnhancedSeparation(
      content,
      'Reply "yes" or choose A/B/C.',
      user.preferences.device_type
    );
  }

  // Store confirmed painpoint
  user.context.confirmed_painpoint = confirmed;
  user.context.painpointConfirm.awaiting = false;

  const plan = `🧭 **Plan:** We’ll stabilise your method fast.
• Phase 1: Method basics
• Phase 2: Pattern drills
• Phase 3: Speed + confidence

First, a quick diagnostic. Do this on paper and upload your working.`;

  // Generate first question targeted to confirmed painpoint
  const intelligence = confirmCtx.intelligence || {};
  const foundationGaps =
    user.context.intelligence_metadata?.foundationGaps || [];

  const firstQuestion = await generateFirstPracticeQuestion(
    {
      ...intelligence,
      struggle: confirmed,
    },
    foundationGaps,
    user.id
  );

  user.context.interactiveMode = true;
  user.context.currentQuestion = firstQuestion;

  const content = `${plan}\n\n🧩 **Question:**\n${firstQuestion.questionText}\n\n📝 When done, upload a photo of your working.`;
  return formatResponseWithEnhancedSeparation(
    content,
    MENU_INTERACTIVE,
    user.preferences.device_type
  );
}

// Analyze solution uploads
async function handleSolutionUpload(user, imageInfo) {
  if (!imageInfo || !user.context?.currentQuestion) {
    const content =
      "I’m ready to analyze your work. Upload a photo, or pick an option below.";
    return formatResponseWithEnhancedSeparation(
      content,
      MENU_INTERACTIVE,
      user.preferences.device_type
    );
  }

  try {
    const analysis = await solutionAnalyzer.analyzeSolution(
      imageInfo.data,
      user.context.currentQuestion,
      user.context
    );

    user.context.solutionHistory = user.context.solutionHistory || [];
    user.context.solutionHistory.push({
      questionId: user.context.currentQuestion.contentId,
      analysis,
      timestamp: new Date().toISOString(),
    });

    const nextQuestion = await generateAdaptiveQuestion(analysis, user.context);
    user.context.currentQuestion = nextQuestion;

    const feedback = generateSolutionFeedback(analysis);
    const content = `${feedback}\n\nNext practice question:\n\n🧩 **Question:**\n${nextQuestion.questionText}\n\n📝 Upload your working when done.`;
    return formatResponseWithEnhancedSeparation(
      content,
      MENU_INTERACTIVE,
      user.preferences.device_type
    );
  } catch (error) {
    console.error("Solution analysis failed:", error);
    const content =
      "I couldn't analyze your solution. Please try uploading a clearer photo of your work.";
    return formatResponseWithEnhancedSeparation(
      content,
      MENU_INTERACTIVE,
      user.preferences.device_type
    );
  }
}

// Handle interactive mode text responses
async function handleInteractiveMode(user, message) {
  const lower = (message || "").toLowerCase().trim();

  if (lower === "1" || lower.includes("hint")) {
    const hint = await generateContextualHint(
      user.context.currentQuestion,
      user.context
    );
    const content = `💡 **Hint:** ${hint}\n\nNow try solving it and upload your work.`;
    return formatResponseWithEnhancedSeparation(
      content,
      MENU_INTERACTIVE,
      user.preferences.device_type
    );
  }

  if (lower === "2" || lower.includes("different")) {
    user.context.interactiveMode = false;
    user.context.currentQuestion = null;
    return generateImageUploadPrompt(user);
  }

  if (lower === "3" || lower.includes("menu")) {
    user.current_menu = "welcome";
    user.context = {};
    return `**Welcome to The GOAT.** I'm here help you study with calm and clarity.

**What do you need right now?**

1️⃣ 📅 Exam/Test Help
2️⃣ 📚 Homework Help 🫶 ⚡  
3️⃣ 🧮 Tips & Hacks

Just pick a number! ✨`;
  }

  const content =
    "I’m ready. Upload your working photo, or pick an option below.";
  return formatResponseWithEnhancedSeparation(
    content,
    MENU_INTERACTIVE,
    user.preferences.device_type
  );
}

// Generate the initial upload prompt (simple, no numeric menu here)
function generateImageUploadPrompt(user) {
  const content = `📸 **Exam/Test Help (image-only)**
Take a clear photo with good lighting.
• Fill the frame; avoid shadows
• One question per photo works best`;
  return formatResponseWithEnhancedSeparation(
    content,
    "When ready, upload your photo here.",
    user.preferences.device_type
  );
}

// Question generation helpers (unchanged except tailored profile)
async function generateFirstPracticeQuestion(
  intelligence,
  foundationGaps,
  userId
) {
  try {
    const profile = {
      subject: intelligence.subject || "Mathematics",
      grade: intelligence.grade || 10,
      topic_struggles: intelligence.topic || "algebra",
      specific_failure: intelligence.struggle || "solving equations",
      assessment_type: "exam practice",
    };

    const { questions } = await generateExamQuestions(profile, 1, userId);
    const q = questions && questions[0];
    if (q && q.questionText) {
      return {
        questionText: q.questionText,
        solution: q.solution || "Solution available after your attempt.",
        contentId:
          q.contentId ||
          `ai_${Date.now().toString(36)}_${Math.random()
            .toString(36)
            .slice(2, 6)}`,
        type: "ai_generated",
      };
    }
  } catch (e) {
    console.error("AI question generation failed:", e.message);
  }

  if (foundationGaps && foundationGaps.length > 0) {
    const fqs = foundationDetector.getFoundationQuestions(
      foundationGaps.slice(0, 1)
    );
    if (fqs && fqs[0]) {
      const fq = fqs[0];
      return {
        questionText: fq.questionText,
        solution: fq.solution || "Solution available after your attempt.",
        contentId: `foundation_${Date.now()}`,
        type: "foundation",
      };
    }
  }

  try {
    const fallback = generateFallbackQuestion({
      subject: intelligence.subject || "Mathematics",
      grade: intelligence.grade || 10,
      topic_struggles: intelligence.topic || "algebra",
      specific_failure: intelligence.struggle || "solving equations",
      assessment_type: "exam practice",
    });
    if (fallback && fallback.questionText) {
      return {
        questionText: fallback.questionText,
        solution: fallback.solution || "Solution available after your attempt.",
        contentId: `fb_${Date.now()}`,
        type: "fallback",
      };
    }
  } catch (e) {
    console.error("Fallback question generation error:", e.message);
  }

  return {
    questionText: `Solve: 2x + 5 = 17`,
    solution: "2x = 12 → x = 6",
    contentId: `simple_${Date.now()}`,
    type: "simple",
  };
}

async function generateAdaptiveQuestion(analysis, context) {
  if (analysis.nextAction === "next_level") {
    return {
      questionText: "Good — try a tougher one:\nSolve: 2(x + 3) = 4x - 6",
      solution: "2x + 6 = 4x - 6 → 12 = 2x → x = 6",
      contentId: `adaptive_up_${Date.now()}`,
      type: "adaptive_up",
    };
  } else if (analysis.nextAction === "foundation_review") {
    return {
      questionText: "Let’s reinforce the base first:\nSolve: x + 3 = 7",
      solution: "x = 4",
      contentId: `foundation_${Date.now()}`,
      type: "foundation_review",
    };
  }
  return {
    questionText: "Try this similar one:\nSolve: 3x − 7 = 2x + 5",
    solution: "x = 12",
    contentId: `same_level_${Date.now()}`,
    type: "same_level",
  };
}

function generateSolutionFeedback(analysis) {
  if (analysis.nextAction === "next_level") {
    return `🎉 Strong work — correct method and answer. Let’s level up.`;
  }
  if (analysis.nextAction === "method_guidance") {
    return `🎯 Decent attempt — the method needs a tweak. I’ll guide you.`;
  }
  if (analysis.nextAction === "calculation_help") {
    return `🧮 Almost — method is fine. Small calculation slip to fix.`;
  }
  return `💪 Keep going — we’ll sharpen this step by step.`;
}

async function generateContextualHint(question, context) {
  const hints = [
    "Start by isolating like terms on one side before you divide or factor.",
    "Name the operation you need, then do it to both sides to keep the 'balance'.",
    "If you're unsure, plug in a simple number to test whether your step keeps the equation true.",
    "Underline the target (e.g., x) and plan the inverse operations in reverse order.",
  ];

  return hints[Math.floor(Math.random() * hints.length)];
}

function generateImageProcessingError(user) {
  const content =
    "📸 I couldn't clearly read your problem. Please retake the photo with better lighting and fill the frame.";
  return formatResponseWithEnhancedSeparation(
    content,
    "Tip: One question per photo works best.",
    user.preferences.device_type
  );
}

function generateFallbackImageResponse(user) {
  const content =
    "📸 I saw an image but couldn’t extract the problem. Please upload a clearer photo of a specific question you’re stuck on.";
  return formatResponseWithEnhancedSeparation(
    content,
    "Tip: Hold your phone steady and fill the frame.",
    user.preferences.device_type
  );
}
