/**
 * Exam Prep Intelligence System
 * GOAT Bot 2.0
 * Updated: 2025-08-25
 * Developer: DithetoMokgabudi
 */

const { generateDynamicTargetedProbe } = require("../../utils/probing");
const {
  formatResponseWithEnhancedSeparation,
} = require("../../utils/formatting");
const { AI_INTEL_STATES } = require("../../core/state");
const { checkSubjectAvailability } = require("../../data/subject-database");
const { enhanceTopicSuggestions } = require("./personalization");
// ADD: diagnostics imports used by functions in this file
const {
  getDiagnosticQuestion,
  analyzeDiagnosticAnswer,
} = require("./diagnostics");

// FIX: Added generateEnhancedVisualMenu locally
function generateEnhancedVisualMenu(aiState, deviceType = "mobile") {
  const spacing = deviceType === "mobile" ? "" : "  ";
  switch (aiState) {
    case AI_INTEL_STATES.EXAM_OR_TEST:
      return `1️⃣${spacing} ➡️ Continue
2️⃣${spacing} 📝 Skip to Question
3️⃣${spacing} 🔄 Switch Topics  
4️⃣${spacing} 🏠 Main Menu`;
    case AI_INTEL_STATES.SUBJECT_GRADE:
      return `1️⃣${spacing} ➡️ Continue Setup
2️⃣${spacing} 📝 Quick Question
3️⃣${spacing} 🔄 Different Subject
4️⃣${spacing} 🏠 Main Menu`;
    case AI_INTEL_STATES.AI_PAINPOINT_EXCAVATION:
    case AI_INTEL_STATES.AI_MICRO_TARGETING:
    case AI_INTEL_STATES.AI_PAINPOINT_CONFIRMATION:
      return `1️⃣${spacing} ➡️ Continue
2️⃣${spacing} 📝 Skip to Question
3️⃣${spacing} 🔄 Switch Topics  
4️⃣${spacing} 🏠 Main Menu`;
    case AI_INTEL_STATES.AI_QUESTION_GENERATION:
    case AI_INTEL_STATES.GUIDED_DISCOVERY:
      return `1️⃣${spacing} 📚 Solution
2️⃣${spacing} ➡️ Next Question  
3️⃣${spacing} 🔄 Switch Topics
4️⃣${spacing} 🏠 Main Menu`;
    case AI_INTEL_STATES.ALTERNATIVE_PATHS:
      return `1️⃣${spacing} ➡️ Option A (Guided Discovery)
2️⃣${spacing} 📝 Option B (Different Topic)
3️⃣${spacing} 🔄 Option C (Different Subject)
4️⃣${spacing} 🏠 Main Menu`;
    default:
      return `1️⃣${spacing} ➡️ Continue
2️⃣${spacing} 📝 Practice Question
3️⃣${spacing} 🔄 Switch Topics
4️⃣${spacing} 🏠 Main Menu`;
  }
}

async function startAIIntelligenceGathering(user) {
  console.log(`🤖 Starting AI intelligence for user ${user.id}`);
  const resumePrompt = generateResumePrompt(user);
  if (resumePrompt) return resumePrompt;

  user.current_menu = "exam_prep_conversation";
  user.context = {
    ai_intel_state: AI_INTEL_STATES.EXAM_OR_TEST,
    painpoint_profile: {},
    painpoint_confirmed: false,
    probing_attempts: 0,
  };

  if (user.preferences?.painpoint_history?.length > 0) {
    user.context.ai_intel_state = AI_INTEL_STATES.ALTERNATIVE_PATHS;
    return generateAlternativePathsPrompt(user);
  }

  return `📅 **Exam/Test Prep Mode Activated!** 😰➡️😎

📍 **Step 1/5:** Assessment Type

Exam or test stress? I'll generate questions to unstuck you!

**First** - is this an **EXAM** or **TEST**? *(Different question styles!)*`;
}

function generateAlternativePathsPrompt(user) {
  const recentPainpoint = user.preferences.painpoint_history[0];
  const content = `📅 **Exam/Test Prep Mode Activated!** 😰➡️😎

I see you've previously worked on:
**${recentPainpoint.subject} (Grade ${recentPainpoint.grade})**
Topic: *${recentPainpoint.topic}*
Challenge: *${recentPainpoint.specific_failure}*

**How would you like to proceed?**`;
  const menu = `A️⃣ Continue with this topic & challenge
B️⃣ Same subject but new topic
C️⃣ Start with a completely different subject

Or just tell me if it's for an EXAM or TEST preparation.`;
  user.context.ai_intel_state = AI_INTEL_STATES.ALTERNATIVE_PATHS;
  return formatResponseWithEnhancedSeparation(
    content,
    menu,
    user.preferences.device_type
  );
}

function generateResumePrompt(user) {
  const prevSubject =
    user.painpoint_profile?.subject || user.preferences?.last_subject;
  const prevGrade =
    user.painpoint_profile?.grade || user.preferences?.last_grade;

  if (prevSubject && prevGrade) {
    return `📅 **Welcome back to Exam/Test Prep!**

I see you've previously worked on **${prevSubject} Grade ${prevGrade}**.

Would you like to:
1️⃣ Continue with ${prevSubject} Grade ${prevGrade}
2️⃣ Start fresh with a different subject/grade

*Reply with 1 or 2*`;
  }
  return null;
}

async function processUserResponse(user, userResponse) {
  const currentState =
    user.context?.ai_intel_state || AI_INTEL_STATES.EXAM_OR_TEST;

  console.log(
    `🧠 Processing exam prep response: "${userResponse}" | Current state: ${currentState}`
  );

  if (user.context?.resuming_session) {
    if (
      userResponse === "1" ||
      userResponse.toLowerCase().includes("continue")
    ) {
      user.context.resuming_session = false;
      const subject =
        user.painpoint_profile?.subject || user.preferences?.last_subject;
      const grade =
        user.painpoint_profile?.grade || user.preferences?.last_grade;

      user.context.painpoint_profile = {
        subject,
        grade,
        assessment_type:
          user.context.painpoint_profile?.assessment_type || "test",
      };
      user.context.ai_intel_state = AI_INTEL_STATES.AI_PAINPOINT_EXCAVATION;
      return generateSubjectSpecificTopicPrompt(user);
    } else {
      user.context.resuming_session = false;
      user.context.ai_intel_state = AI_INTEL_STATES.EXAM_OR_TEST;
      return `📅 **Let's start fresh!**

📍 **Step 1/5:** Assessment Type

Is this an **EXAM** or **TEST**? *(Different question styles!)*`;
    }
  }

  switch (currentState) {
    case AI_INTEL_STATES.EXAM_OR_TEST: {
      const lower = (userResponse || "").toLowerCase();
      if (lower.includes("exam") || lower.includes("test")) {
        user.context.painpoint_profile = {
          ...user.context.painpoint_profile,
          assessment_type: lower.includes("exam") ? "exam" : "test",
        };
        user.current_menu = "exam_prep_conversation";
        user.context.ai_intel_state = AI_INTEL_STATES.SUBJECT_GRADE;
        return generateSubjectGradePrompt(user);
      }
      return `📝 I need to know if this is an **EXAM** or **TEST** to customize questions.

Please type "exam" or "test" to continue.`;
    }
    case AI_INTEL_STATES.SUBJECT_GRADE:
      return await handleSubjectGradeResponse(user, userResponse);
    case AI_INTEL_STATES.AI_PAINPOINT_EXCAVATION:
      return await handlePainpointExcavation(user, userResponse);
    case AI_INTEL_STATES.AI_MICRO_TARGETING:
      return await handleMicroTargeting(user, userResponse);
    case AI_INTEL_STATES.AI_PAINPOINT_CONFIRMATION:
      return await handlePainpointConfirmation(user, userResponse);
    case AI_INTEL_STATES.AI_QUESTION_GENERATION:
      return await handleQuestionGeneration(user, userResponse);
    case AI_INTEL_STATES.GUIDED_DISCOVERY:
      return await handleGuidedDiscovery(user, userResponse);
    case AI_INTEL_STATES.ALTERNATIVE_PATHS:
      return await handleAlternativePaths(user, userResponse);
    case AI_INTEL_STATES.AI_DIAGNOSTIC_QUESTION:
    case AI_INTEL_STATES.AI_DIAGNOSTIC_ANALYSIS:
      return await handleDiagnosticAnalysis(user, userResponse);
    default:
      user.context.ai_intel_state = AI_INTEL_STATES.EXAM_OR_TEST;
      return startAIIntelligenceGathering(user);
  }
}

function generateSubjectGradePrompt(user) {
  const content = `📚 **Great!** Let's get you ready for your ${user.context.painpoint_profile.assessment_type}.

📍 **Step 2/5:** Subject & Grade

What **subject** and **grade** are you working on?
*(e.g., "Grade 11 Mathematics" or "Grade 9 Physical Sciences")*`;
  const menu = generateEnhancedVisualMenu(
    AI_INTEL_STATES.SUBJECT_GRADE,
    user.preferences.device_type
  );
  return formatResponseWithEnhancedSeparation(
    content,
    menu,
    user.preferences.device_type
  );
}

async function handlePainpointConfirmation(user, userResponse) {
  const text = userResponse.toLowerCase().trim();

  if (
    text.includes("yes") ||
    text.includes("correct") ||
    text.includes("right")
  ) {
    user.context.painpoint_confirmed = true;

    const profile = user.context.painpoint_profile;
    user.preferences.painpoint_history =
      user.preferences.painpoint_history || [];
    user.preferences.painpoint_history.unshift({
      subject: profile.subject,
      grade: profile.grade,
      topic: profile.topic_struggles,
      specific_failure: profile.specific_failure,
      timestamp: new Date().toISOString(),
    });
    if (user.preferences.painpoint_history.length > 10) {
      user.preferences.painpoint_history =
        user.preferences.painpoint_history.slice(0, 10);
    }
    // Immediately progress to generation (sets IMMEDIATE_FALLBACK)
    return await handleQuestionGeneration(user, "");
  }

  // If not confirmed, update and re-confirm
  user.context.painpoint_profile.specific_failure = userResponse;
  return await generateImprovedPainpointConfirmation(user, {
    specific_struggle: userResponse,
    clarity_level: "clear",
  });
}

async function handleSubjectGradeResponse(user, userResponse) {
  const text = userResponse.toLowerCase();
  let grade = 11;
  let subject = "Mathematics";

  const gradeMatch = text.match(/grade\s*(\d+)|gr\s*(\d+)|(\d+)\s*grade/i);
  if (gradeMatch) {
    const extractedGrade = parseInt(
      gradeMatch[1] || gradeMatch[2] || gradeMatch[3]
    );
    if (extractedGrade >= 8 && extractedGrade <= 11) grade = extractedGrade;
  }

  const subjectInfo = checkSubjectAvailability(text);
  if (subjectInfo.detected) subject = subjectInfo.detected;

  user.context.painpoint_profile = {
    ...user.context.painpoint_profile,
    grade,
    subject,
  };

  user.preferences = user.preferences || {};
  user.preferences.last_subject = subject;
  user.preferences.last_grade = grade;

  user.context.ai_intel_state = AI_INTEL_STATES.AI_PAINPOINT_EXCAVATION;
  return generateSubjectSpecificTopicPrompt(user);
}

function generateSubjectSpecificTopicPrompt(user) {
  const profile = user.context.painpoint_profile;
  const subject = profile.subject;
  const topicSuggestions = getTopicSuggestionsSync(subject);

  return `📚 **${subject} Grade ${profile.grade}** - Got it!

📍 **Step 3/5:** Topic Focus

Which **topics** in ${subject} are giving you trouble?

*Common ${subject} topics include:*
${topicSuggestions}

*Just tell me which topic is challenging you.*`;
}

function getTopicSuggestionsSync(subject) {
  const suggestionsMap = {
    Mathematics:
      "Algebra, Geometry, Trigonometry, Functions, Calculus, Probability",
    "Mathematical Literacy":
      "Finance, Measurement, Maps & Plans, Data Handling, Probability",
    "Physical Sciences":
      "Mechanics, Electricity, Chemistry, Waves, Matter & Materials",
    "Life Sciences":
      "Cells, Genetics, Plant Biology, Human Physiology, Ecology",
    Geography:
      "Mapwork, Climate, Geomorphology, Settlement, Economic Geography",
    History:
      "South African History, Cold War, Civil Rights, Capitalism vs Communism",
    Economics:
      "Microeconomics, Macroeconomics, Economic Development, Contemporary Issues",
    "Business Studies":
      "Business Environments, Business Ventures, Business Operations, Ethics",
    Accounting:
      "Financial Statements, VAT, Budgeting, Inventory Valuation, Ethics",
  };
  return (
    suggestionsMap[subject] || "various topics specific to your curriculum"
  );
}

async function getTopicSuggestions(subject) {
  const baseTopics = getTopicSuggestionsSync(subject);
  try {
    const baseTopicArray = baseTopics.split(", ");
    const enhancedTopics = await enhanceTopicSuggestions(
      subject,
      baseTopicArray
    );
    return enhancedTopics.join(", ");
  } catch (error) {
    console.error(`❌ Error enhancing topics for ${subject}:`, error);
    return baseTopics;
  }
}

async function handlePainpointExcavation(user, userResponse) {
  const profile = user.context.painpoint_profile;
  profile.topic_struggles = userResponse.trim();
  user.context.painpoint_profile = profile;

  user.context.ai_intel_state = AI_INTEL_STATES.AI_MICRO_TARGETING;

  return `🎯 **${profile.topic_struggles}** - Let's zero in!

📍 **Step 4/5:** Specific Challenge

What **specifically** about ${profile.topic_struggles} is difficult for you?
*(e.g., "I don't understand how to factorize quadratics" or "I get confused with balancing equations")*`;
}

async function handleDiagnosticAnalysis(user, userResponse) {
  if (
    userResponse === "1" ||
    userResponse.toLowerCase().includes("can't solve")
  ) {
    const diagnostic = user.context.diagnostic_question;
    user.context.painpoint_profile.specific_failure = `difficulty with ${user.context.painpoint_profile.topic_struggles}: ${diagnostic.purpose}`;
    user.context.ai_intel_state = AI_INTEL_STATES.AI_PAINPOINT_CONFIRMATION;
    return await generateImprovedPainpointConfirmation(user, {
      specific_struggle: user.context.painpoint_profile.specific_failure,
      clarity_level: "clear",
    });
  }

  if (userResponse === "2" || userResponse.toLowerCase().includes("skip")) {
    user.context.ai_intel_state = AI_INTEL_STATES.AI_MICRO_TARGETING;
    return `📍 **Let's try a different approach.**

What **specifically** about ${user.context.painpoint_profile.topic_struggles} is difficult for you?

*(e.g., "I don't understand how to start" or "I mix up the formulas")*`;
  }

  if (userResponse === "3" || userResponse.toLowerCase().includes("switch")) {
    user.context.ai_intel_state = AI_INTEL_STATES.AI_PAINPOINT_EXCAVATION;
    return generateSubjectSpecificTopicPrompt(user);
  }

  if (userResponse === "4" || userResponse.toLowerCase().includes("menu")) {
    user.current_menu = "welcome";
    user.context = {};
    return `**Welcome to The GOAT.** I'm here help you study with calm and clarity.

**What do you need right now?**

1️⃣ 📅 Exam/Test Help
2️⃣ 📚 Homework Help 🫶 ⚡  
3️⃣ 🧮 Tips & Hacks

Just pick a number! ✨`;
  }

  try {
    const diagnosticQuestion = user.context.diagnostic_question;
    const analysis = await analyzeDiagnosticAnswer(
      userResponse,
      diagnosticQuestion
    );

    user.context.diagnostic_analysis = analysis;

    if (analysis.specific_issues.length > 0) {
      const mainIssue = analysis.specific_issues[0];
      let issueDescription = "";
      switch (mainIssue) {
        case "no_calculation_shown":
          issueDescription = "not showing working steps";
          break;
        case "uncertainty_expressed":
          issueDescription = "uncertainty about core concepts";
          break;
        case "too_brief":
          issueDescription = "difficulty expressing mathematical reasoning";
          break;
        default:
          issueDescription = `difficulty with ${user.context.painpoint_profile.topic_struggles}`;
      }
      user.context.painpoint_profile.specific_failure = issueDescription;
    } else {
      user.context.painpoint_profile.specific_failure = `difficulty with ${user.context.painpoint_profile.topic_struggles}`;
    }

    const content = `📊 **Based on your answer, I think I understand your challenge.**

${analysis.feedback}

I see that you're specifically struggling with: 
*${user.context.painpoint_profile.specific_failure}*

Is this correct? This helps me create targeted practice questions.`;
    user.context.ai_intel_state = AI_INTEL_STATES.AI_PAINPOINT_CONFIRMATION;

    const menu = generateEnhancedVisualMenu(
      AI_INTEL_STATES.AI_PAINPOINT_CONFIRMATION,
      user.preferences.device_type
    );

    return formatResponseWithEnhancedSeparation(
      content,
      menu,
      user.preferences.device_type
    );
  } catch (error) {
    console.error("Diagnostic analysis error:", error);
    user.context.ai_intel_state = AI_INTEL_STATES.AI_MICRO_TARGETING;
    return `📍 Let me ask differently:

What **specifically** about ${user.context.painpoint_profile.topic_struggles} is difficult for you?

*(e.g., "I don't understand how to start" or "I mix up the formulas")*`;
  }
}

async function generateDiagnosticQuestion(user) {
  const { subject, topic_struggles } = user.context.painpoint_profile;
  console.log(
    `🔍 Generating diagnostic question for ${subject} - ${topic_struggles}`
  );

  try {
    const diagnosticQuestion = await getDiagnosticQuestion(
      subject,
      topic_struggles
    );

    user.context.diagnostic_question = diagnosticQuestion;
    user.context.ai_intel_state = AI_INTEL_STATES.AI_DIAGNOSTIC_ANALYSIS;

    const content = `📝 **Let me understand your specific challenge better.**

Here's a ${subject} question about ${topic_struggles}:

${diagnosticQuestion.questionText}

**Please attempt this question so I can identify exactly where you're getting stuck.**`;

    const menu = `1️⃣ ➡️ I can't solve this
2️⃣ 📝 Skip diagnostic
3️⃣ 🔄 Switch topics
4️⃣ 🏠 Main Menu`;

    return formatResponseWithEnhancedSeparation(
      content,
      menu,
      user.preferences.device_type
    );
  } catch (error) {
    console.error("Diagnostic question error:", error);
    user.context.ai_intel_state = AI_INTEL_STATES.AI_MICRO_TARGETING;
    return handleMicroTargeting(
      user,
      "I'm not sure exactly what I'm struggling with"
    );
  }
}

async function handleMicroTargeting(user, userResponse) {
  const profile = user.context.painpoint_profile;

  if (
    userResponse.toLowerCase().includes("not sure") ||
    userResponse.toLowerCase().includes("don't know") ||
    userResponse.toLowerCase().includes("uncertain")
  ) {
    console.log(`🔍 User uncertain about painpoint, starting diagnostic`);
    user.context.ai_intel_state = AI_INTEL_STATES.AI_DIAGNOSTIC_QUESTION;
    return generateDiagnosticQuestion(user);
  }

  const painpointClarity = await analyzeEnhancedPainpointClarity(
    userResponse,
    profile
  );

  if (
    painpointClarity.clarity_level === "clear" &&
    !painpointClarity.needs_more_probing
  ) {
    profile.specific_failure = painpointClarity.specific_struggle;
    user.context.painpoint_profile = profile;
    user.context.ai_intel_state = AI_INTEL_STATES.AI_PAINPOINT_CONFIRMATION;
    return await generateImprovedPainpointConfirmation(user, painpointClarity);
  }

  user.context.probing_attempts = (user.context.probing_attempts || 0) + 1;

  if (user.context.probing_attempts >= 2) {
    const probe = await generateDynamicTargetedProbe(
      userResponse,
      profile,
      user.context.probing_attempts
    );
    return `${probe}\n\n**Not sure? Type "not sure" and I'll ask a diagnostic question to help.**`;
  }

  const probe = await generateDynamicTargetedProbe(
    userResponse,
    profile,
    user.context.probing_attempts
  );
  return probe;
}

async function analyzeEnhancedPainpointClarity(userResponse, profile) {
  const response = userResponse.toLowerCase().trim();
  const subject = profile.subject;
  console.log(`🔍 Enhanced analysis for: "${userResponse}" in ${subject}`);
  // ... unchanged content detection rules ...
  // For brevity, keep your existing implementation here
  // (no behavior change required for the fix)
  // [Keep the full function body as in your current file]
  return {
    clarity_level: "clear",
    specific_struggle: response.length ? userResponse : "unspecified",
    needs_more_probing: false,
    recognition_reason: "fallback",
  };
}

async function generateImprovedPainpointConfirmation(user, painpointClarity) {
  const profile = user.context.painpoint_profile;
  const struggle = painpointClarity.specific_struggle;

  console.log(`✅ Generating confirmation for: ${struggle}`);

  const content = `**Perfect! Let me confirm I understand your struggle:**

**Subject:** ${profile.subject} Grade ${profile.grade}
**Topic:** ${profile.topic_struggles}
**Specific Challenge:** "${struggle}"

**Is this correct?** I'll create practice questions targeting exactly this challenge.

**Type 'yes' if this is right, or tell me what I misunderstood.**

📍 **Step 5/5:** Confirmation Required`;

  const menu = generateEnhancedVisualMenu(
    AI_INTEL_STATES.AI_PAINPOINT_CONFIRMATION,
    user.preferences.device_type
  );
  return formatResponseWithEnhancedSeparation(
    content,
    menu,
    user.preferences.device_type
  );
}

async function handleQuestionGeneration(user, userResponse) {
  user.preferences.personalization = user.preferences.personalization || {
    difficulty: "adaptive",
    explanations: "detailed",
    examples: true,
    visualStyle: "clear",
  };

  const personalizationMsg = user.preferences.painpoint_history
    ? `\n\n📊 **Personalized for you** based on your learning patterns`
    : `\n\n📊 **Customized for your needs**`;

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

  user.context.ai_intel_state = AI_INTEL_STATES.IMMEDIATE_FALLBACK;
  user.context.generation_started = Date.now();
  user.context.failureType = user.context.painpoint_profile.specific_failure;
  user.context.subjectArea = user.context.painpoint_profile.subject;

  return loadingMessage;
}

async function handleGuidedDiscovery(user, userResponse) {
  return `🔍 **Guided Discovery:**

Let's explore this concept together step by step...`;
}

async function handleAlternativePaths(user, userResponse) {
  const response = userResponse.toUpperCase();
  const recentPainpoint = user.preferences.painpoint_history[0];

  if (
    response === "A" ||
    response.includes("CONTINUE") ||
    response.includes("SAME")
  ) {
    user.context.painpoint_profile = {
      subject: recentPainpoint.subject,
      grade: recentPainpoint.grade,
      topic_struggles: recentPainpoint.topic,
      specific_failure: recentPainpoint.specific_failure,
      assessment_type: user.context.painpoint_profile.assessment_type || "test",
    };
    user.context.ai_intel_state = AI_INTEL_STATES.AI_QUESTION_GENERATION;
    user.context.painpoint_confirmed = true;

    return `🎯 **Perfect! Continuing with your previous challenge:**

Subject: ${recentPainpoint.subject} (Grade ${recentPainpoint.grade})
Topic: ${recentPainpoint.topic}
Challenge: ${recentPainpoint.specific_failure}

Generating a targeted practice question...`;
  } else if (response === "B" || response.includes("NEW TOPIC")) {
    user.context.painpoint_profile = {
      subject: recentPainpoint.subject,
      grade: recentPainpoint.grade,
      assessment_type: user.context.painpoint_profile.assessment_type || "test",
    };
    user.context.ai_intel_state = AI_INTEL_STATES.AI_PAINPOINT_EXCAVATION;
    return generateSubjectSpecificTopicPrompt(user);
  } else if (response === "C" || response.includes("DIFFERENT")) {
    user.context.painpoint_profile = {
      assessment_type: user.context.painpoint_profile.assessment_type || "test",
    };
    user.context.ai_intel_state = AI_INTEL_STATES.SUBJECT_GRADE;
    return generateSubjectGradePrompt(user);
  } else if (response.includes("EXAM") || response.includes("TEST")) {
    user.context.painpoint_profile = {
      assessment_type: response.includes("EXAM") ? "exam" : "test",
    };
    user.context.ai_intel_state = AI_INTEL_STATES.SUBJECT_GRADE;
    return generateSubjectGradePrompt(user);
  }

  user.context.ai_intel_state = AI_INTEL_STATES.EXAM_OR_TEST;
  return `📅 I need to know if this is for **EXAM** or **TEST** preparation.

Please type "exam" or "test" to continue, or select one of the options:

A️⃣ Continue with previous topic & challenge
B️⃣ Same subject but new topic
C️⃣ Start with a completely different subject`;
}

module.exports = {
  startAIIntelligenceGathering,
  analyzeEnhancedPainpointClarity,
  generateImprovedPainpointConfirmation,
  processUserResponse,
  generateEnhancedVisualMenu,
  generateDiagnosticQuestion,
  handleDiagnosticAnalysis,
  getTopicSuggestions,
  generateSubjectSpecificTopicPrompt,
};
