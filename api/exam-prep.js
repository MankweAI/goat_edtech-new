// api/exam-prep.js
/**
 * Exam/Test Help → Topic Practice (Text-only)
 * GOAT Bot 2.0
 * Updated: 2025-08-28 15:58:00 UTC
 * Developer: DithetoMokgabudi
 *
 * Purpose:
 * - Remove image requirement. Flow is Subject + Grade → Topic → Sub-topic → Questions.
 * - Progressive difficulty with manual nudge (Harder/Easier).
 * - Keep routing, analytics, and ManyChat compatibility intact.
 */

const {
  getOrCreateUserState,
  trackManyState,
  persistUserState,
} = require("../lib/core/state");
const { ManyCompatResponse } = require("../lib/core/responses");
const { detectDeviceType } = require("../lib/utils/device-detection");
const {
  SUBJECT_PROBING_DATABASE,
  checkSubjectAvailability,
} = require("../lib/data/subject-database");
const {
  generateExamQuestions,
} = require("../lib/features/exam-prep/questions");
const {
  formatResponseWithEnhancedSeparation,
} = require("../lib/utils/formatting");
const analyticsModule = require("../lib/utils/analytics");

// Mastery-focused menu (consistent numbering)
const MENU = `1️⃣ 📚 View solution
2️⃣ 💡 Hint  
3️⃣ ➡️ Next question
4️⃣ 📈 Harder questions
5️⃣ 📉 Easier questions  
6️⃣ 🔄 Change topic
7️⃣ 🏠 Main menu`;

// Helpers
function formatNumbered(items) {
  return items.map((t, i) => `**${i + 1}.** ${t}`).join("\n");
}
function pickNumber(text, max) {
  const n = parseInt((text || "").trim(), 10);
  if (Number.isInteger(n) && n >= 1 && n <= max) return n;
  return null;
}
function labelize(key) {
  if (!key) return key;
  return key
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

// Progressive difficulty tiers
function getDifficulty(level = 0) {
  if (level <= 0)
    return {
      key: "simplified",
      label: "Foundation",
      description: "Building understanding",
    };
  if (level === 1)
    return {
      key: "mixed",
      label: "Standard",
      description: "Typical exam level",
    };
  if (level === 2)
    return {
      key: "challenging",
      label: "Advanced",
      description: "Challenge yourself",
    };
  return { key: "expert", label: "Expert", description: "Master level" };
}
function updateProgression(m, action) {
  m.progression = m.progression ?? 0;
  if (action === "harder") m.progression = Math.min(3, m.progression + 1);
  if (action === "easier") m.progression = Math.max(0, m.progression - 1);
  if (action === "next" && !m.lastHelpUsed)
    m.progression = Math.min(3, m.progression + 1);
  if (action === "hint" || action === "solution") m.lastHelpUsed = true;
}
function header(user) {
  const m = user.context.examTopicPractice || {};
  const diff = getDifficulty(m.progression || 0);
  const subject = m.subject || "Mathematics";
  const topic = m.topic ? ` • ${m.topic}` : "";
  const sub = m.subtopic ? ` • ${m.subtopic}` : "";
  return `🎯 ${subject}${topic}${sub}\n💪 ${diff.label}: ${diff.description}`;
}
function buildQHeader(user, index = 1) {
  const diffLabel = getDifficulty(
    user.context.examTopicPractice.progression || 0
  ).label;
  const marks =
    diffLabel === "Expert"
      ? 6
      : diffLabel === "Advanced"
      ? 5
      : diffLabel === "Foundation"
      ? 2
      : 3;
  const time =
    diffLabel === "Expert"
      ? "~6 min"
      : diffLabel === "Advanced"
      ? "~5 min"
      : diffLabel === "Foundation"
      ? "~2 min"
      : "~3 min";
  return `Q${index} • ${diffLabel} • Master this concept • ${time}`;
}
function firstHint(solution = "") {
  if (!solution)
    return "Start with what’s given vs what’s required; choose the rule that links them.";
  const step1 = solution.split("\n").find((ln) => /\*\*Step\s*1/i.test(ln));
  if (step1) return step1.replace(/\*\*/g, "").trim();
  const first = solution
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)[0];
  return (
    first ||
    "Identify the relationship, write the equation, then isolate the unknown."
  );
}
function parseSubjectGrade(text) {
  const raw = (text || "").trim();
  if (!raw) return { subject: "Mathematics", grade: 10 };
  const parts = raw
    .split(/[,\|;:-]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const detected = checkSubjectAvailability(parts[0] || raw);
  const subject = detected.detected || "Mathematics";
  const gMatch = raw.match(/\b(gr(?:ade)?\s*)?(\d{1,2})\b/i);
  const g = gMatch ? parseInt(gMatch[2], 10) : 10;
  const grade = Math.max(8, Math.min(11, isFinite(g) ? g : 10));
  return { subject, grade };
}
function listTopics(subject) {
  const bank = SUBJECT_PROBING_DATABASE[subject] || {};
  return Object.keys(bank).filter((k) => typeof bank[k] === "object");
}
function listSubtopics(subject, topicKey) {
  const bank = SUBJECT_PROBING_DATABASE[subject] || {};
  const topic = bank[topicKey] || {};
  const ex = Array.isArray(topic.examples) ? topic.examples : [];
  const struggles = Array.isArray(topic.common_struggles)
    ? topic.common_struggles
    : [];
  const merged = Array.from(new Set([...ex, ...struggles])).filter(Boolean);
  return merged.slice(0, 8);
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
function wantsHarder(text) {
  const t = (text || "").toLowerCase();
  return t === "4" || /harder|advance|tougher|difficult/.test(t);
}
function wantsEasier(text) {
  const t = (text || "").toLowerCase();
  return t === "5" || /easier|simpler|basic|foundation/.test(t);
}
function wantsChangeTopic(text) {
  return /change\s*topic|^6$/.test((text || "").toLowerCase());
}
function wantsExit(text) {
  return /menu|main|^7$/.test((text || "").toLowerCase());
}

// Question generation
async function ensureQuestion(user, regenerate = false) {
  const m = user.context.examTopicPractice;
  if (!m.current_question || regenerate) {
    const diff = getDifficulty(m.progression || 0);
    const profile = {
      grade: m.grade || 10,
      subject: m.subject || "Mathematics",
      topic_struggles: m.topic || "algebra",
      specific_failure: m.subtopic || `${m.topic} fundamentals`,
      difficulty: diff.key,
      assessment_type: "practice",
    };
    const result = await generateExamQuestions(profile, 1, user.id);
    const q = result?.questions?.[0] || {
      questionText: `Practice: Master ${
        m.subtopic || m.topic
      }\n\nSolve: 2x + 5 = 15`,
      solution:
        "**Step 1:** 2x = 10\n**Step 2:** x = 5\n**Mastery Check:** Try 3x + 7 = 22.",
      source: "fallback",
      contentId: `fb_${Date.now()}`,
    };
    m.current_question = q;
    m.q_index = (m.q_index || 0) + 1;
    m.lastHelpUsed = false;
  }
  const q = m.current_question;
  const content = `${header(user)}\n\n${buildQHeader(user, m.q_index)}\n\n${
    q.questionText
  }`;
  return formatResponseWithEnhancedSeparation(
    content,
    MENU,
    user.preferences.device_type
  );
}

// Flow screens
async function screenStart(user) {
  user.current_menu = "exam_prep_conversation";
  user.context = user.context || {};
  user.context.examTopicPractice = {
    stage: "subject_grade",
    progression: 0,
    q_index: 0,
    current_question: null,
  };
  const content =
    `📝 **Topic Practice (no images)**\nUnlimited practice to master any topic.\n\n` +
    `What subject and grade?\nExamples: "Mathematics 10", "Physical Sciences 11", "Geography 9"`;
  const menu = `Reply: Subject + Grade (e.g., "Mathematics 10")`;
  return formatResponseWithEnhancedSeparation(
    content,
    menu,
    user.preferences.device_type
  );
}

async function handleSubjectGrade(user, text) {
  const m = user.context.examTopicPractice;
  const { subject, grade } = parseSubjectGrade(text);
  m.subject = subject;
  m.grade = grade;

  const topics = listTopics(subject);
  if (!topics || topics.length === 0) {
    m.stage = "topic_free";
    const examples = {
      Mathematics: ['"Algebra"', '"Functions"', '"Trigonometry"', '"Geometry"'],
      Geography: ['"Mapwork"', '"Population"', '"Development"', '"Climate"'],
      History: [
        '"Apartheid SA"',
        '"Cold War"',
        '"Nationalisms"',
        '"World War II"',
      ],
      "Physical Sciences": [
        '"Mechanics"',
        '"Electricity"',
        '"Matter"',
        '"Waves"',
      ],
    }[subject] || ['"Topic 1"', '"Topic 2"'];
    const content = `Got it: **${subject} Grade ${grade}**\n\nWhat topic would you like to practice?\nExamples: ${examples.join(
      ", "
    )}`;
    return formatResponseWithEnhancedSeparation(
      content,
      `Reply with the topic name`,
      user.preferences.device_type
    );
  }

  m._topics = topics;
  m.stage = "topic_select";
  const list = formatNumbered(topics.map((t) => labelize(t)));
  const content = `Perfect: **${subject} Grade ${grade}**\n\n**Choose a topic to master:**\n\n${list}\n\nPick a number to start practicing.`;
  return formatResponseWithEnhancedSeparation(
    content,
    `Reply with a number (1-${topics.length})`,
    user.preferences.device_type
  );
}

async function handleTopicSelect(user, text) {
  const m = user.context.examTopicPractice;
  const topics = m._topics || [];
  const pick = pickNumber(text, topics.length);

  if (!pick) {
    return formatResponseWithEnhancedSeparation(
      `Please pick a topic by number (1–${topics.length}).`,
      `Reply with a number (e.g., 1)`,
      user.preferences.device_type
    );
  }

  const key = topics[pick - 1];
  m.topic = labelize(key);

  const subs = listSubtopics(m.subject, key);
  if (!subs || subs.length === 0) {
    m.subtopic = m.topic;
    m.stage = "loop";
    m.q_index = 0;
    m.current_question = null;
    return await ensureQuestion(user, true);
  }

  m._subtopics = subs;
  m.stage = "subtopic_select";
  const list = formatNumbered(subs);
  const content = `Nice. ${m.topic}.\n\nPick a sub-topic:\n\n${list}`;
  return formatResponseWithEnhancedSeparation(
    content,
    `Reply with a number (e.g., 1)`,
    user.preferences.device_type
  );
}

async function handleTopicFree(user, text) {
  const m = user.context.examTopicPractice;
  const topicText = (text || "algebra").trim();
  m.topic = topicText
    .split(" ")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");

  const subs = listSubtopics(
    m.subject,
    topicText.toLowerCase().replace(/\s+/g, "_")
  );
  if (!subs || subs.length === 0) {
    m.subtopic = m.topic;
    m.stage = "loop";
    m.q_index = 0;
    m.current_question = null;
    return await ensureQuestion(user, true);
  }

  m._subtopics = subs;
  m.stage = "subtopic_select";
  const list = formatNumbered(subs);
  const content = `Nice. ${m.topic}.\n\nPick a sub-topic:\n\n${list}`;
  return formatResponseWithEnhancedSeparation(
    content,
    `Reply with a number (e.g., 1)`,
    user.preferences.device_type
  );
}

async function handleSubtopicSelect(user, text) {
  const m = user.context.examTopicPractice;
  const subs = m._subtopics || [];
  const pick = pickNumber(text, subs.length);

  if (!pick) {
    return formatResponseWithEnhancedSeparation(
      `Please pick a sub-topic by number (1–${subs.length}).`,
      `Reply with a number (e.g., 1)`,
      user.preferences.device_type
    );
  }

  m.subtopic = subs[pick - 1];
  m.stage = "loop";
  m.q_index = 0;
  m.current_question = null;
  return await ensureQuestion(user, true);
}

async function handleLoop(user, text) {
  const m = user.context.examTopicPractice;
  const t = (text || "").trim();

  if (wantsExit(t)) {
    user.current_menu = "welcome";
    user.context = {};
    return `**Welcome to The GOAT.** I'm here help you study with calm and clarity.

**What do you need right now?**

1️⃣ 📅 Exam/Test Help
2️⃣ 📚 Homework Help 🫶 ⚡  
3️⃣ 🧮 Tips & Hacks

Just pick a number! ✨`;
  }

  if (wantsChangeTopic(t)) {
    const topics = listTopics(m.subject);
    m._topics = topics;
    m.stage = "topic_select";
    const list = formatNumbered(topics.map((x) => labelize(x)));
    const content = `Okay, pick a CAPS-aligned topic:\n\n${list}`;
    return formatResponseWithEnhancedSeparation(
      content,
      `Reply with a number (e.g., 1)`,
      user.preferences.device_type
    );
  }

  if (wantsHarder(t)) {
    updateProgression(m, "harder");
    return await ensureQuestion(user, true);
  }

  if (wantsEasier(t)) {
    updateProgression(m, "easier");
    return await ensureQuestion(user, true);
  }

  if (wantsSolution(t)) {
    const q = m.current_question;
    if (!q) return await ensureQuestion(user, false);
    updateProgression(m, "solution");
    const content = `${header(user)}\n\n🧩 **Solution (steps):**\n\n${
      q.solution || "Solution available after attempt."
    }`;
    return formatResponseWithEnhancedSeparation(
      content,
      MENU,
      user.preferences.device_type
    );
  }

  if (wantsHint(t)) {
    const q = m.current_question;
    if (!q) return await ensureQuestion(user, false);
    updateProgression(m, "hint");
    const hint = firstHint(q.solution);
    const content = `${header(user)}\n\n💡 **Hint:** ${hint}`;
    return formatResponseWithEnhancedSeparation(
      content,
      MENU,
      user.preferences.device_type
    );
  }

  if (wantsNext(t)) {
    updateProgression(m, "next");
    return await ensureQuestion(user, true);
  }

  const content = `${header(
    user
  )}\n\nI can show the solution or give a hint — or send the next question.`;
  return formatResponseWithEnhancedSeparation(
    content,
    MENU,
    user.preferences.device_type
  );
}

// Main handler
module.exports = async (req, res) => {
  try {
    const manyCompatRes = new ManyCompatResponse(res);
    const subscriberId =
      req.body.psid || req.body.subscriber_id || "default_user";
    const message = (req.body.message || req.body.user_input || "").trim();
    const userAgent = req.headers["user-agent"] || "";

    // Load/prepare user
    let user = await getOrCreateUserState(subscriberId);
    user.preferences = user.preferences || {};
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

    const flow = user.context.examTopicPractice?.stage || "subject_grade";
    let response;

    if (!user.context.examTopicPractice) {
      response = await screenStart(user);
    } else if (flow === "subject_grade") {
      response = await handleSubjectGrade(user, message);
    } else if (flow === "topic_select") {
      response = await handleTopicSelect(user, message);
    } else if (flow === "topic_free") {
      response = await handleTopicFree(user, message);
    } else if (flow === "subtopic_select") {
      response = await handleSubtopicSelect(user, message);
    } else if (flow === "loop") {
      response = await handleLoop(user, message);
    } else {
      response = await screenStart(user);
    }

    // Persist conversation
    user.conversation_history = user.conversation_history || [];
    if (message) {
      user.conversation_history.push({
        role: "user",
        message,
        timestamp: new Date().toISOString(),
      });
    }
    user.conversation_history.push({
      role: "assistant",
      message: response,
      timestamp: new Date().toISOString(),
    });

    // Save state (debounced)
    persistUserState(subscriberId, user).catch(() => {});

    // Minimal analytics
    analyticsModule
      .trackEvent(subscriberId, "exam_topic_practice", {
        stage: user.context.examTopicPractice?.stage || "unknown",
        subject: user.context.examTopicPractice?.subject,
        topic: user.context.examTopicPractice?.topic,
        subtopic: user.context.examTopicPractice?.subtopic,
      })
      .catch(() => {});

    return manyCompatRes.json({
      message: response,
      status: "success",
      debug_state: {
        menu: user.current_menu,
        stage: user.context.examTopicPractice?.stage || "unknown",
      },
    });
  } catch (error) {
    console.error("Exam/Test (Topic Practice) error:", error);
    return res.json({
      message:
        "Sorry, I encountered an error with Topic Practice. Please try again.",
      status: "error",
      echo: "Sorry, I encountered an error with Topic Practice. Please try again.",
      error: error.message,
    });
  }
};
