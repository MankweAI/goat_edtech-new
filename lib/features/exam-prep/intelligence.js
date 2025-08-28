/**
 * Exam/Test Questions Flow (No uploads)
 * GOAT Bot 2.0
 * Updated: 2025-08-28 12:55:00 UTC
 * Developer: DithetoMokgabudi
 * What’s here:
 * - Difficulty-first start (S/M/D)
 * - Topic capture (free text, optional “topic -> chapter”)
 * - Unlimited question loop with controls
 */

const { AI_INTEL_STATES } = require("../../core/state");
const {
  formatResponseWithEnhancedSeparation,
} = require("../../utils/formatting");
const { checkSubjectAvailability } = require("../../data/subject-database");
const { generateExamQuestions } = require("./questions");

const MENU_QUESTION_LOOP = `1️⃣ 📚 View solution
2️⃣ 💡 Hint
3️⃣ ➡️ Next
4️⃣ 🎚️ Change difficulty
5️⃣ 🔄 Change topic
6️⃣ 🏠 Exit`;

const MENU_DIFFICULTY = `S) Simple   M) Medium   D) Difficult`;
const DIFFICULTY_MAP = {
  s: "simplified",
  simple: "simplified",
  m: "mixed",
  medium: "mixed",
  d: "challenging",
  difficult: "challenging",
};

function currentHeader(user) {
  const diffLabel = user.context?.questions_mode?.difficulty_label || "Medium";
  const topic = user.context?.questions_mode?.topic || "General";
  const subject = user.context?.questions_mode?.subject || "Mathematics";
  return `🎯 ${subject} • ${topic} • ${diffLabel}`;
}

async function startAIQuestionsMode(user) {
  user.current_menu = "exam_prep_conversation";
  user.context = user.context || {};
  user.context.questions_mode = user.context.questions_mode || {};
  user.context.ai_intel_state = AI_INTEL_STATES.DIFFICULTY_SELECT;

  const content =
    `📝 **Exam/Test Questions**\nUnlimited practice. No uploads.\n\nChoose a starting level:\n` +
    `S) Simple   M) Medium   D) Difficult\n\n` +
    `You can change anytime: type "Change difficulty".`;
  const menu = MENU_DIFFICULTY;
  return formatResponseWithEnhancedSeparation(
    content,
    menu,
    user.preferences.device_type
  );
}

function parseDifficulty(text) {
  const t = (text || "").trim().toLowerCase();
  if (DIFFICULTY_MAP[t])
    return { key: DIFFICULTY_MAP[t], label: labelFromKey(DIFFICULTY_MAP[t]) };
  if (/simple/.test(t)) return { key: "simplified", label: "Simple" };
  if (/medium|avg|normal/.test(t)) return { key: "mixed", label: "Medium" };
  if (/hard|difficult|challenge|tough/.test(t))
    return { key: "challenging", label: "Difficult" };
  // letter shortcuts embedded
  if (t === "s") return { key: "simplified", label: "Simple" };
  if (t === "m") return { key: "mixed", label: "Medium" };
  if (t === "d") return { key: "challenging", label: "Difficult" };
  return null;
}

function labelFromKey(key) {
  if (key === "simplified") return "Simple";
  if (key === "challenging") return "Difficult";
  return "Medium";
}

function wantsChangeDifficulty(text) {
  return /change\s*difficulty|^4$/.test((text || "").toLowerCase());
}

function wantsChangeTopic(text) {
  return /change\s*topic|^5$/.test((text || "").toLowerCase());
}

function wantsExit(text) {
  const t = (text || "").toLowerCase();
  return t === "6" || /exit|menu|main/.test(t);
}

function wantsSolution(text) {
  const t = (text || "").toLowerCase();
  return t === "1" || t.includes("solution") || t.includes("answer");
}

function wantsHint(text) {
  const t = (text || "").toLowerCase();
  return t === "2" || t.includes("hint");
}

function wantsNext(text) {
  const t = (text || "").toLowerCase();
  return t === "3" || t.includes("next");
}

function parseTopicAndSubject(text) {
  const input = (text || "").trim();
  // Optional "topic -> chapter" format
  const [topicRaw] = input.split(/->|→/);
  const detectedSubjectInfo = checkSubjectAvailability(input || "Mathematics");
  const subject = detectedSubjectInfo.detected || "Mathematics";
  const topic = (topicRaw || "General").trim();
  return { subject, topic };
}

function topicPrompt(user) {
  const content =
    `🎚️ **Difficulty set:** ${user.context.questions_mode.difficulty_label}\n\n` +
    `📍 Now tell me the topic (and optional chapter):\n` +
    `Example: "Similar triangles" or "Functions → Parabolas".\n` +
    `You can also say: "Algebra", "Trigonometry", "Probability".`;
  return formatResponseWithEnhancedSeparation(
    content,
    `Reply with the topic name.\n\nOr type "Back" to pick difficulty again.`,
    user.preferences.device_type
  );
}

function buildQuestionHeader(user, index = 1) {
  const diffLabel = user.context.questions_mode.difficulty_label || "Medium";
  const marks = diffLabel === "Difficult" ? 5 : diffLabel === "Simple" ? 2 : 3;
  const time =
    diffLabel === "Difficult"
      ? "~5 min"
      : diffLabel === "Simple"
      ? "~2 min"
      : "~3 min";
  return `Q${index} • ${diffLabel} • ${marks} marks • ${time}`;
}

function extractFirstHintFromSolution(solutionText = "") {
  if (!solutionText)
    return "Think method-first: identify what is given and what is required, then set up the right relationship.";
  const stepMatch = solutionText
    .split("\n")
    .find((ln) => /\*\*Step\s*1/i.test(ln));
  if (stepMatch) return stepMatch.replace(/\*\*/g, "").trim();
  // fallback: first non-empty line
  const first = solutionText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)[0];
  return (
    first ||
    "Start by writing what you know and the goal, then choose a formula or rule that connects them."
  );
}

async function generateOneQuestion(user, variation = 0) {
  const qm = user.context.questions_mode;
  const profile = {
    grade: qm.grade || 10,
    subject: qm.subject || "Mathematics",
    topic_struggles: qm.topic || "algebra",
    specific_failure: `${qm.topic} practice`,
    assessment_type: "test",
    difficulty: qm.difficulty_key || "mixed",
  };

  const result = await generateExamQuestions(profile, 1, user.id);
  const q = result?.questions?.[0];
  if (!q) {
    return {
      questionText: "Practice: Solve 2x + 5 = 15",
      solution: "**Step 1:** 2x = 10\n**Step 2:** x = 5",
      source: "fallback",
      contentId: `fb_${Date.now()}`,
    };
  }
  return q;
}

async function showQuestion(user, isNext = false) {
  if (isNext || !user.context.questions_mode.current_question) {
    const q = await generateOneQuestion(user, isNext ? 1 : 0);
    user.context.questions_mode.current_question = q;
    user.context.questions_mode.q_index =
      (user.context.questions_mode.q_index || 0) + 1;
  }
  const q = user.context.questions_mode.current_question;
  const header = buildQuestionHeader(user, user.context.questions_mode.q_index);

  const content = `${currentHeader(user)}\n\n${header}\n\n${q.questionText}`;
  return formatResponseWithEnhancedSeparation(
    content,
    MENU_QUESTION_LOOP,
    user.preferences.device_type
  );
}

async function handleDifficultySelect(user, text) {
  const parsed = parseDifficulty(text);
  if (!parsed) {
    const content =
      "Pick a starting level:\n\nS) Simple   M) Medium   D) Difficult\n(You can change anytime)";
    return formatResponseWithEnhancedSeparation(
      content,
      MENU_DIFFICULTY,
      user.preferences.device_type
    );
  }

  user.context.questions_mode.difficulty_key = parsed.key;
  user.context.questions_mode.difficulty_label = parsed.label;
  user.context.ai_intel_state = AI_INTEL_STATES.TOPIC_SELECT;

  return topicPrompt(user);
}

async function handleTopicSelect(user, text) {
  if (/^back$/i.test(text || "")) {
    user.context.ai_intel_state = AI_INTEL_STATES.DIFFICULTY_SELECT;
    return formatResponseWithEnhancedSeparation(
      "Okay, let's reset the level.",
      MENU_DIFFICULTY,
      user.preferences.device_type
    );
  }

  const { subject, topic } = parseTopicAndSubject(text);
  user.context.questions_mode.subject = subject;
  user.context.questions_mode.topic = topic;
  user.context.ai_intel_state = AI_INTEL_STATES.QUESTION_LOOP;
  user.context.questions_mode.q_index = 0;
  user.context.questions_mode.current_question = null;

  return await showQuestion(user, true);
}

async function handleQuestionLoop(user, text) {
  const t = (text || "").trim();

  if (wantsExit(t)) {
    user.current_menu = "welcome";
    user.context = {};
    return `**Welcome to The GOAT.** I'm here help you study with calm and clarity.

**What do you need right now?**

1️⃣ 📝 Exam/Test Questions
2️⃣ 📚 Homework Help 🫶 ⚡  
3️⃣ 🧮 Tips & Hacks

Just pick a number! ✨`;
  }

  if (wantsChangeDifficulty(t)) {
    user.context.ai_intel_state = AI_INTEL_STATES.DIFFICULTY_SELECT;
    return formatResponseWithEnhancedSeparation(
      "Pick your new starting level:",
      MENU_DIFFICULTY,
      user.preferences.device_type
    );
  }

  if (wantsChangeTopic(t)) {
    user.context.ai_intel_state = AI_INTEL_STATES.TOPIC_SELECT;
    return topicPrompt(user);
  }

  if (wantsSolution(t)) {
    const q = user.context.questions_mode.current_question;
    if (!q) return await showQuestion(user, false);
    const content = `${currentHeader(user)}\n\n🧩 **Solution (steps):**\n\n${
      q.solution || "Solution available after attempt."
    }`;
    return formatResponseWithEnhancedSeparation(
      content,
      MENU_QUESTION_LOOP,
      user.preferences.device_type
    );
  }

  if (wantsHint(t)) {
    const q = user.context.questions_mode.current_question;
    if (!q) return await showQuestion(user, false);
    const hint = extractFirstHintFromSolution(q.solution);
    const content = `${currentHeader(user)}\n\n💡 **Hint:** ${hint}`;
    return formatResponseWithEnhancedSeparation(
      content,
      MENU_QUESTION_LOOP,
      user.preferences.device_type
    );
  }

  if (wantsNext(t)) {
    return await showQuestion(user, true);
  }

  // Default: acknowledge and offer options
  const content = `${currentHeader(
    user
  )}\n\nI can show the solution or give a hint — or send the next question.`;
  return formatResponseWithEnhancedSeparation(
    content,
    MENU_QUESTION_LOOP,
    user.preferences.device_type
  );
}

async function processQuestionsFlow(user, message) {
  const state = user.context?.ai_intel_state;

  switch (state) {
    case AI_INTEL_STATES.DIFFICULTY_SELECT:
      return await handleDifficultySelect(user, message);
    case AI_INTEL_STATES.TOPIC_SELECT:
      return await handleTopicSelect(user, message);
    case AI_INTEL_STATES.QUESTION_LOOP:
      return await handleQuestionLoop(user, message);
    default:
      // Safety fallback: restart questions mode
      return await startAIQuestionsMode(user);
  }
}

// Backward compatibility exports (api/exam-prep.js imports these names)
module.exports = {
  startAIQuestionsMode: startAIQuestionsMode,
  processQuestionsFlow: processQuestionsFlow,
  // Keeping old names for compatibility (no-ops in this pivoted flow)
  startAIIntelligenceGathering: startAIQuestionsMode,
  processUserResponse: processQuestionsFlow,
  // Other legacy exports (not used in new flow) intentionally omitted
};
