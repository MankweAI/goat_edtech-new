/**
 * Topic Practice (Text-only) – Subject ➜ Grade ➜ Topic ➜ Sub-topic ➜ Questions
 * Progressive difficulty, no images required.
 * Scope: Exam/Test feature ONLY.
 * Updated: 2025-08-28 15:42:00 UTC
 */

const {
  formatResponseWithEnhancedSeparation,
} = require("../../utils/formatting");
const {
  SUBJECT_PROBING_DATABASE,
  checkSubjectAvailability,
} = require("../../data/subject-database");
const { generateExamQuestions } = require("./questions");

const MENU = `1️⃣ 📚 View solution
2️⃣ 💡 Hint  
3️⃣ ➡️ Next question
4️⃣ 📈 Harder
5️⃣ 📉 Easier  
6️⃣ 🔄 Change topic
7️⃣ 🏠 Main menu`;

function currentHeader(user) {
  const m = user.context.topicPractice || {};
  const diff = getDifficultyByProgression(m.progression || 0);
  const subject = m.subject || "Mathematics";
  const topic = m.topic ? ` • ${m.topic}` : "";
  const sub = m.subtopic ? ` • ${m.subtopic}` : "";
  return `🎯 ${subject}${topic}${sub}\n💪 ${diff.label}: ${diff.description}`;
}

function getDifficultyByProgression(level = 0) {
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
  // reset help flag after action
  m.lastHelpUsed = false;
}

function parseSubjectGrade(text) {
  const raw = (text || "").trim();
  if (!raw) return { subject: "Mathematics", grade: 10 };

  const parts = raw
    .split(/[,\|;:-]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const subText = parts[0] || raw;

  const detected = checkSubjectAvailability(subText);
  const subject = detected.detected || "Mathematics";

  const gMatch = raw.match(/\b(gr(?:ade)?\s*)?(\d{1,2})\b/i);
  const g = gMatch ? parseInt(gMatch[2], 10) : 10;
  const grade = Math.max(8, Math.min(11, isFinite(g) ? g : 10));

  return { subject, grade };
}

function listTopics(subject) {
  const bank = SUBJECT_PROBING_DATABASE[subject] || {};
  // topics are object keys with examples/struggles
  return Object.keys(bank).filter((k) => typeof bank[k] === "object");
}

function listSubtopics(subject, topicKey) {
  const bank = SUBJECT_PROBING_DATABASE[subject] || {};
  const topic = bank[topicKey] || {};
  const ex = Array.isArray(topic.examples) ? topic.examples : [];
  return ex.slice(0, 8);
}

function formatNumbered(items) {
  return items.map((t, i) => `**${i + 1}.** ${t}`).join("\n");
}

function readPick(text, max) {
  const n = parseInt((text || "").trim(), 10);
  if (Number.isInteger(n) && n >= 1 && n <= max) return n;
  return null;
}

function wants(text, expr) {
  return expr.test((text || "").toLowerCase());
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

function buildHeader(user, index = 1) {
  const diff = getDifficultyByProgression(
    user.context.topicPractice.progression || 0
  ).label;
  const marks =
    diff === "Expert"
      ? 6
      : diff === "Advanced"
      ? 5
      : diff === "Foundation"
      ? 2
      : 3;
  const time =
    diff === "Expert"
      ? "~6 min"
      : diff === "Advanced"
      ? "~5 min"
      : diff === "Foundation"
      ? "~2 min"
      : "~3 min";
  return `Q${index} • ${diff} • Master this concept • ${time}`;
}

function firstHint(solution = "") {
  if (!solution)
    return "Start by writing what’s given vs what’s required, then pick the rule that links them.";
  const step1 = solution.split("\n").find((ln) => /\*\*Step\s*1/i.test(ln));
  if (step1) return step1.replace(/\*\*/g, "").trim();
  const first = solution
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)[0];
  return (
    first ||
    "Identify the relationship, set up the equation, then isolate the unknown."
  );
}

async function generateQuestion(user, isNext = false) {
  const m = user.context.topicPractice;
  if (!m.current_question || isNext) {
    const diff = getDifficultyByProgression(m.progression || 0);
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
  const header = buildHeader(user, m.q_index);
  const content = `${currentHeader(user)}\n\n${header}\n\n${q.questionText}`;
  return formatResponseWithEnhancedSeparation(
    content,
    MENU,
    user.preferences.device_type
  );
}

// Public: start + process
async function startTopicPractice(user) {
  user.current_menu = "exam_prep_conversation";
  user.context = user.context || {};
  user.context.topicPractice = {
    active: true,
    stage: "subject_grade",
    progression: 0,
    q_index: 0,
    current_question: null,
  };

  const content = `📝 **Topic Practice (no images)**
Unlimited practice to master any topic.

What subject and grade?
Examples: "Mathematics 10", "Physical Sciences 11", "Geography 9"`;
  const menu = `Reply: Subject + Grade (e.g., "Mathematics 10")`;
  return formatResponseWithEnhancedSeparation(
    content,
    menu,
    user.preferences.device_type
  );
}

async function processTopicPractice(user, messageText) {
  const m = user.context.topicPractice || {};
  const text = (messageText || "").trim();

  // Exit
  if (wantsExit(text) && m.stage === "loop") {
    user.current_menu = "welcome";
    user.context = {};
    return `**Welcome to The GOAT.** I'm here help you study with calm and clarity.

**What do you need right now?**

1️⃣ 📅 Exam/Test Help
2️⃣ 📚 Homework Help 🫶 ⚡  
3️⃣ 🧮 Tips & Hacks

Just pick a number! ✨`;
  }

  // Subject + Grade
  if (m.stage === "subject_grade") {
    const { subject, grade } = parseSubjectGrade(text);
    m.subject = subject;
    m.grade = grade;

    const topics = listTopics(subject);
    if (!topics || topics.length === 0) {
      m.stage = "topic_free";
      const ex = suggestExamples(subject)
        .map((t) => `"${t}"`)
        .join(", ");
      const content = `Got it: **${subject} Grade ${grade}**

What topic would you like to practice?
Examples: ${ex}`;
      return formatResponseWithEnhancedSeparation(
        content,
        `Reply with the topic name`,
        user.preferences.device_type
      );
    }

    m._topics = topics;
    m.stage = "topic_select";
    const list = formatNumbered(topics.map((t) => labelize(t)));
    const content = `Perfect: **${subject} Grade ${grade}**

Choose a topic to master:

${list}

Pick a number to start.`;
    return formatResponseWithEnhancedSeparation(
      content,
      `Reply with a number (1-${topics.length})`,
      user.preferences.device_type
    );
  }

  // Topic selection (numbered)
  if (m.stage === "topic_select") {
    const pick = readPick(text, (m._topics || []).length);
    if (!pick) {
      return formatResponseWithEnhancedSeparation(
        `Please pick a topic by number (1–${(m._topics || []).length}).`,
        `Reply with a number (e.g., 1)`,
        user.preferences.device_type
      );
    }

    const key = m._topics[pick - 1];
    m.topic = labelize(key);

    const subs = listSubtopics(m.subject, key);
    if (!subs || subs.length === 0) {
      m.subtopic = m.topic;
      m.stage = "loop";
      m.q_index = 0;
      m.current_question = null;
      return await generateQuestion(user, true);
    }

    m._subtopics = subs;
    m.stage = "subtopic_select";
    const list = formatNumbered(subs);
    const content = `Nice. ${m.topic}.

Pick a sub-topic:

${list}`;
    return formatResponseWithEnhancedSeparation(
      content,
      `Reply with a number (e.g., 1)`,
      user.preferences.device_type
    );
  }

  // Topic free-text fallback
  if (m.stage === "topic_free") {
    const topicText = text || "algebra";
    m.topic = capitalize(topicText);
    const subs = listSubtopics(
      m.subject,
      topicText.toLowerCase().replace(/\s+/g, "_")
    );
    if (!subs || subs.length === 0) {
      m.subtopic = m.topic;
      m.stage = "loop";
      m.q_index = 0;
      m.current_question = null;
      return await generateQuestion(user, true);
    }
    m._subtopics = subs;
    m.stage = "subtopic_select";
    const list = formatNumbered(subs);
    const content = `Nice. ${m.topic}.

Pick a sub-topic:

${list}`;
    return formatResponseWithEnhancedSeparation(
      content,
      `Reply with a number (e.g., 1)`,
      user.preferences.device_type
    );
  }

  // Subtopic selection
  if (m.stage === "subtopic_select") {
    const pick = readPick(text, (m._subtopics || []).length);
    if (!pick) {
      return formatResponseWithEnhancedSeparation(
        `Please pick a sub-topic by number (1–${(m._subtopics || []).length}).`,
        `Reply with a number (e.g., 1)`,
        user.preferences.device_type
      );
    }
    m.subtopic = m._subtopics[pick - 1];
    m.stage = "loop";
    m.q_index = 0;
    m.current_question = null;
    return await generateQuestion(user, true);
  }

  // Loop
  if (m.stage === "loop") {
    if (wantsChangeTopic(text)) {
      // back to topic list for current subject
      const topics = listTopics(m.subject);
      m._topics = topics;
      m.stage = "topic_select";
      const list = formatNumbered(topics.map((t) => labelize(t)));
      const content = `Okay, pick a CAPS-aligned topic:

${list}`;
      return formatResponseWithEnhancedSeparation(
        content,
        `Reply with a number (e.g., 1)`,
        user.preferences.device_type
      );
    }

    if (wantsHarder(text)) {
      updateProgression(m, "harder");
      return await generateQuestion(user, true);
    }

    if (wantsEasier(text)) {
      updateProgression(m, "easier");
      return await generateQuestion(user, true);
    }

    if (wantsSolution(text)) {
      const q = m.current_question;
      if (!q) return await generateQuestion(user, false);
      m.lastHelpUsed = true;
      const content = `${currentHeader(user)}\n\n🧩 **Solution (steps):**\n\n${
        q.solution || "Solution available after attempt."
      }`;
      return formatResponseWithEnhancedSeparation(
        content,
        MENU,
        user.preferences.device_type
      );
    }

    if (wantsHint(text)) {
      const q = m.current_question;
      if (!q) return await generateQuestion(user, false);
      m.lastHelpUsed = true;
      const hint = firstHint(q.solution);
      const content = `${currentHeader(user)}\n\n💡 **Hint:** ${hint}`;
      return formatResponseWithEnhancedSeparation(
        content,
        MENU,
        user.preferences.device_type
      );
    }

    if (wantsNext(text)) {
      updateProgression(m, "next");
      return await generateQuestion(user, true);
    }

    // Default nudge
    const content = `${currentHeader(
      user
    )}\n\nI can show the solution or give a hint — or send the next question.`;
    return formatResponseWithEnhancedSeparation(
      content,
      MENU,
      user.preferences.device_type
    );
  }

  // Safety restart
  user.context.topicPractice = null;
  return await startTopicPractice(user);
}

function labelize(key) {
  if (!key) return key;
  return key
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function suggestExamples(subject) {
  const map = {
    Mathematics: ["Algebra", "Functions & Graphs", "Trigonometry", "Geometry"],
    Geography: [
      "Mapwork",
      "Population",
      "Development & Inequality",
      "Resources & Sustainability",
    ],
    History: [
      "World War II",
      "Cold War",
      "Apartheid SA (overview)",
      "Nationalisms",
    ],
    "Physical Sciences": [
      "Mechanics",
      "Electricity",
      "Matter & Materials",
      "Waves & Sound",
    ],
    "Life Sciences": [
      "Cells & Tissues",
      "Transport Systems",
      "Population Ecology",
      "Human Impact",
    ],
    "Mathematical Literacy": [
      "Finance",
      "Measurement",
      "Maps & Plans",
      "Data & Probability",
    ],
  };
  return map[subject] || ["Topic 1", "Topic 2", "Topic 3", "Topic 4"];
}

module.exports = {
  startTopicPractice,
  processTopicPractice,
};
