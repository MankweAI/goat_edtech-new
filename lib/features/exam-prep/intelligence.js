/**
 * Exam/Test Questions Flow (No uploads) – Progressive Difficulty
 * GOAT Bot 2.0
 * Updated: 2025-08-28 13:50:00 UTC
 * Developer: DithetoMokgabudi
 *
 * Change: Wire CAPS taxonomy (Grades 8–11) into Topic/Sub-topic menus.
 */

const { AI_INTEL_STATES } = require("../../core/state");
const {
  formatResponseWithEnhancedSeparation,
} = require("../../utils/formatting");
const {
  checkSubjectAvailability,
  SUBJECT_PROBING_DATABASE,
  getCapsTopics,
  getCapsSubtopics,
} = require("../../data/subject-database");
const { generateExamQuestions } = require("./questions");

// Menus
const MENU_QUESTION_LOOP = `1️⃣ 📚 View solution
2️⃣ 💡 Hint
3️⃣ ➡️ Next
4️⃣ 🔁 Change sub-topic
5️⃣ 🔄 Change topic
6️⃣ 🏠 Exit`;

// Helpers: parsing and selection
function parseSubjectGrade(text) {
  const raw = (text || "").trim();
  if (!raw) return { subject: "Mathematics", grade: 10 };

  const parts = raw
    .split(/[,\|;:-]/)
    .map((s) => s.trim())
    .filter(Boolean);

  let subjectText = parts[0] || raw;
  const detected = checkSubjectAvailability(subjectText);
  const subject = detected.detected || "Mathematics";

  const gradeMatch = raw.match(/\b(gr(?:ade)?\s*)?(\d{1,2})\b/i);
  const grade = gradeMatch
    ? Math.max(8, Math.min(11, parseInt(gradeMatch[2], 10)))
    : 10;

  return { subject, grade };
}

function listTopicsForSubject(subject, grade) {
  // Prefer CAPS taxonomy (subject+grade)
  const capsTopics = getCapsTopics(subject, grade);
  if (capsTopics && capsTopics.length > 0) return capsTopics;

  // Fallback to legacy probing DB (subject-only)
  const bank = SUBJECT_PROBING_DATABASE[subject] || {};
  return Object.keys(bank).filter((k) => typeof bank[k] === "object");
}

function deriveSubtopics(subject, grade, topicKey) {
  // Prefer CAPS taxonomy lists
  const capsSubs = getCapsSubtopics(subject, grade, topicKey);
  if (capsSubs && capsSubs.length > 0) return capsSubs.slice(0, 8);

  // Fallback to examples/common_struggles in probing DB
  const bank = SUBJECT_PROBING_DATABASE[subject] || {};
  const topic = bank[topicKey] || {};
  const subA = Array.isArray(topic.examples) ? topic.examples : [];
  const subB = Array.isArray(topic.common_struggles)
    ? topic.common_struggles
    : [];
  const merged = Array.from(new Set([...subA, ...subB])).filter(Boolean);
  return merged.slice(0, 8);
}

function formatNumberedList(items) {
  return items.map((t, i) => `**${i + 1}.** ${t}`).join("\n");
}

function readNumericChoice(text, max) {
  const num = parseInt((text || "").trim(), 10);
  if (Number.isInteger(num) && num >= 1 && num <= max) return num;
  return null;
}

// Progressive difficulty controller (unchanged)
function getDifficultyByProgression(level = 0) {
  if (level <= 0) return { key: "simplified", label: "Simple" };
  if (level === 1) return { key: "mixed", label: "Medium" };
  return { key: "challenging", label: "Difficult" };
}

function updateProgressionOnAction(qm, action) {
  qm.progression = qm.progression ?? 0;
  qm.stats = qm.stats || { hints: 0, solutions: 0, nexts: 0 };

  if (action === "hint") {
    qm.stats.hints += 1;
    if (qm.progression > 0) qm.progression -= 1;
  } else if (action === "solution") {
    qm.stats.solutions += 1;
    qm.progression = Math.max(0, qm.progression - 1);
  } else if (action === "next") {
    qm.stats.nexts += 1;
    const recentHelp = (qm.lastQuestion || {}).helpUsed || false;
    if (!recentHelp) qm.progression += 1;
    if (qm.progression > 3) qm.progression = 3;
  }
}

function markHelpUsed(qm) {
  qm.lastQuestion = qm.lastQuestion || {};
  qm.lastQuestion.helpUsed = true;
}

function currentHeader(user) {
  const qm = user.context?.questions_mode || {};
  const subject = qm.subject || "Mathematics";
  const topic = qm.topic || "General";
  const subtopic = qm.subtopic ? ` • ${qm.subtopic}` : "";
  const diff = getDifficultyByProgression(qm.progression || 0).label;
  return `🎯 ${subject} • ${topic}${subtopic} • ${diff}`;
}

// Entry
async function startAIQuestionsMode(user) {
  user.current_menu = "exam_prep_conversation";
  user.context = user.context || {};
  user.context.questions_mode = {
    progression: 0,
    q_index: 0,
    current_question: null,
  };
  user.context.ai_intel_state = AI_INTEL_STATES.SUBJECT_GRADE;

  const content =
    `📝 **Exam/Test Questions**\nUnlimited practice. No uploads.\n\n` +
    `First, tell me your subject and grade.\n` +
    `Example: "Mathematics, 10" or "Maths 11"`;
  const menu = `Reply with: Subject, Grade (e.g., "Mathematics, 10")`;
  return formatResponseWithEnhancedSeparation(
    content,
    menu,
    user.preferences.device_type
  );
}

// Handlers
async function handleSubjectGrade(user, text) {
  const { subject, grade } = parseSubjectGrade(text);
  user.context.questions_mode.subject = subject;
  user.context.questions_mode.grade = grade;

  const topics = listTopicsForSubject(subject, grade);
  if (!topics || topics.length === 0) {
    user.context.ai_intel_state = AI_INTEL_STATES.TOPIC_SELECT;
    return formatResponseWithEnhancedSeparation(
      `Got it: ${subject} (Grade ${grade}).\n\nTell me the topic (e.g., "Algebra", "Trigonometry", "Geometry", "Functions").`,
      `Reply with the topic name.`,
      user.preferences.device_type
    );
  }

  user.context.questions_mode._topics = topics;
  user.context.ai_intel_state = AI_INTEL_STATES.TOPIC_SELECT;

  const list = formatNumberedList(topics);
  const content = `Great: ${subject} (Grade ${grade}).\n\nHere are the CAPS topics:\n\n${list}\n\nPick a topic by number.`;
  return formatResponseWithEnhancedSeparation(
    content,
    `Reply with a number (e.g., 1)`,
    user.preferences.device_type
  );
}

async function handleTopicSelect(user, text) {
  const qm = user.context.questions_mode || {};
  const topics = qm._topics || [];
  const pick = readNumericChoice(text, topics.length);

  if (!pick) {
    return formatResponseWithEnhancedSeparation(
      `Please pick a topic by number (1–${topics.length}).`,
      `Reply with a number (e.g., 1)`,
      user.preferences.device_type
    );
  }

  const chosenKey = topics[pick - 1];
  qm.topic = chosenKey;

  const subs = deriveSubtopics(
    qm.subject || "Mathematics",
    qm.grade || 10,
    chosenKey
  );
  if (!subs || subs.length === 0) {
    qm.subtopic = qm.topic;
    user.context.ai_intel_state = AI_INTEL_STATES.QUESTION_LOOP;
    qm.q_index = 0;
    qm.current_question = null;
    return await showQuestion(user, true);
  }

  qm._subtopics = subs;
  user.context.ai_intel_state = AI_INTEL_STATES.SUBTOPIC_SELECT;

  const list = formatNumberedList(subs);
  const content = `Nice. ${qm.topic}.\n\nPick a sub-topic:\n\n${list}`;
  return formatResponseWithEnhancedSeparation(
    content,
    `Reply with a number (e.g., 1)`,
    user.preferences.device_type
  );
}

async function handleSubtopicSelect(user, text) {
  const qm = user.context.questions_mode || {};
  const subs = qm._subtopics || [];
  const pick = readNumericChoice(text, subs.length);

  if (!pick) {
    return formatResponseWithEnhancedSeparation(
      `Please pick a sub-topic by number (1–${subs.length}).`,
      `Reply with a number (e.g., 1)`,
      user.preferences.device_type
    );
  }

  qm.subtopic = subs[pick - 1];
  user.context.ai_intel_state = AI_INTEL_STATES.QUESTION_LOOP;
  qm.q_index = 0;
  qm.current_question = null;

  return await showQuestion(user, true);
}

// Question generation
async function generateOneQuestion(user, variation = 0) {
  const qm = user.context.questions_mode;
  const diff = getDifficultyByProgression(qm.progression || 0);

  const profile = {
    grade: qm.grade || 10,
    subject: qm.subject || "Mathematics",
    topic_struggles: qm.topic || "algebra",
    specific_failure: qm.subtopic || `${qm.topic} practice`,
    assessment_type: "test",
    difficulty: diff.key,
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

function buildQuestionHeader(user, index = 1) {
  const diffLabel = getDifficultyByProgression(
    user.context.questions_mode.progression || 0
  ).label;
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
  const first = solutionText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)[0];
  return (
    first ||
    "Start by writing what you know and the goal, then choose the rule that connects them."
  );
}

async function showQuestion(user, isNext = false) {
  const qm = user.context.questions_mode;

  if (isNext || !qm.current_question) {
    const q = await generateOneQuestion(user, isNext ? 1 : 0);
    qm.current_question = q;
    qm.q_index = (qm.q_index || 0) + 1;
    qm.lastQuestion = { helpUsed: false };
  }

  const q = qm.current_question;
  const header = buildQuestionHeader(user, qm.q_index);

  const content = `${currentHeader(user)}\n\n${header}\n\n${q.questionText}`;
  return formatResponseWithEnhancedSeparation(
    content,
    MENU_QUESTION_LOOP,
    user.preferences.device_type
  );
}

// Intent checks
function wantsExit(text) {
  const t = (text || "").toLowerCase();
  return t === "6" || /exit|menu|main/.test(t);
}
function wantsChangeTopic(text) {
  return /change\s*topic|^5$/.test((text || "").toLowerCase());
}
function wantsChangeSubtopic(text) {
  return /change\s*sub.?topic|^4$/.test((text || "").toLowerCase());
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

// Loop handler
async function handleQuestionLoop(user, text) {
  const qm = user.context.questions_mode || {};
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

  if (wantsChangeTopic(t)) {
    user.context.ai_intel_state = AI_INTEL_STATES.TOPIC_SELECT;
    const topics = listTopicsForSubject(
      qm.subject || "Mathematics",
      qm.grade || 10
    );
    user.context.questions_mode._topics = topics;
    const list = formatNumberedList(topics);
    const content = `Okay, pick a CAPS topic:\n\n${list}`;
    return formatResponseWithEnhancedSeparation(
      content,
      `Reply with a number (e.g., 1)`,
      user.preferences.device_type
    );
  }

  if (wantsChangeSubtopic(t)) {
    const subject = qm.subject || "Mathematics";
    const topics = listTopicsForSubject(subject, qm.grade || 10);
    const key =
      topics.find((k) => k.toLowerCase() === (qm.topic || "").toLowerCase()) ||
      topics[0];
    const subs = deriveSubtopics(subject, qm.grade || 10, key);
    user.context.ai_intel_state = AI_INTEL_STATES.SUBTOPIC_SELECT;
    user.context.questions_mode._subtopics = subs;
    const list = formatNumberedList(subs);
    const content = `Pick a sub-topic in ${qm.topic}:\n\n${list}`;
    return formatResponseWithEnhancedSeparation(
      content,
      `Reply with a number (e.g., 1)`,
      user.preferences.device_type
    );
  }

  if (wantsSolution(t)) {
    const q = qm.current_question;
    if (!q) return await showQuestion(user, false);
    updateProgressionOnAction(qm, "solution");
    markHelpUsed(qm);
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
    const q = qm.current_question;
    if (!q) return await showQuestion(user, false);
    updateProgressionOnAction(qm, "hint");
    markHelpUsed(qm);
    const hint = extractFirstHintFromSolution(q.solution);
    const content = `${currentHeader(user)}\n\n💡 **Hint:** ${hint}`;
    return formatResponseWithEnhancedSeparation(
      content,
      MENU_QUESTION_LOOP,
      user.preferences.device_type
    );
  }

  if (wantsNext(t)) {
    updateProgressionOnAction(qm, "next");
    return await showQuestion(user, true);
  }

  const content = `${currentHeader(
    user
  )}\n\nI can show the solution or give a hint — or send the next question.`;
  return formatResponseWithEnhancedSeparation(
    content,
    MENU_QUESTION_LOOP,
    user.preferences.device_type
  );
}

// Main processor
async function processQuestionsFlow(user, message) {
  const state = user.context?.ai_intel_state;

  switch (state) {
    case AI_INTEL_STATES.SUBJECT_GRADE:
      return await handleSubjectGrade(user, message);
    case AI_INTEL_STATES.TOPIC_SELECT:
      return await handleTopicSelect(user, message);
    case AI_INTEL_STATES.SUBTOPIC_SELECT:
      return await handleSubtopicSelect(user, message);
    case AI_INTEL_STATES.QUESTION_LOOP:
      return await handleQuestionLoop(user, message);
    default:
      return await startAIQuestionsMode(user);
  }
}

module.exports = {
  startAIQuestionsMode,
  processQuestionsFlow,
  // Back-compat aliases
  startAIIntelligenceGathering: startAIQuestionsMode,
  processUserResponse: processQuestionsFlow,
};
