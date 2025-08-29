// api/exam-prep.js
/**
 * Exam/Test Help → Topic Practice
 * GOAT Bot 2.0
 * Updated: 2025-08-29 11:07:00 UTC
 * Developer: DithetoMokgabudi
 *
 * Change (Hotfix):
 * - If MANYCHAT_API_TOKEN is missing, do NOT claim "[... sent as image]".
 *   Show a neutral "[equation detected]" / "[graph detected]" note instead.
 * - Prevents misleading UX when env is not configured in prod.
 */

const crypto = require("crypto");
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
  getCapsTopics,
  getCapsSubtopics,
} = require("../lib/data/subject-database");
const {
  generateExamQuestions,
} = require("../lib/features/exam-prep/questions");
const {
  formatResponseWithEnhancedSeparation,
} = require("../lib/utils/formatting");
const analyticsModule = require("../lib/utils/analytics");
const {
  sendImageViaManyChat,
  wasImageRecentlySent,
} = require("../lib/utils/whatsapp-image");



// Mastery-focused menu (consistent numbering)
const MENU = `1️⃣ 📚 View solution
2️⃣ 💡 Hint  
3️⃣ ➡️ Next question
4️⃣ 📈 Harder questions
5️⃣ 📉 Easier questions  
6️⃣ 🔄 Change topic
7️⃣ 🏠 Main menu`;

// Helpers
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

// Number + topic emojis (consistent lists)
function numberToEmoji(n) {
  const map = {
    1: "1️⃣",
    2: "2️⃣",
    3: "3️⃣",
    4: "4️⃣",
    5: "5️⃣",
    6: "6️⃣",
    7: "7️⃣",
    8: "8️⃣",
    9: "9️⃣",
    10: "🔟",
  };
  return map[n] || `#${n}`;
}
function pickTopicEmoji(topicLabel = "") {
  const t = topicLabel.toLowerCase();
  if (/(algebra|equation|expression|sequence|series|function|graph)/.test(t))
    return "🧮";
  if (/(trig|triangle|geometry|circle|angle|pythag)/.test(t)) return "📐";
  if (/(probab|stat|data|venn|mean|median|mode|deviation)/.test(t)) return "📊";
  if (/(map|gis|scale|contour|climate|geomorph|settlement|development)/.test(t))
    return "🗺️";
  if (
    /(mechanics|force|velocity|acceleration|circuit|ohm|electric|matter)/.test(
      t
    )
  )
    return "🔬";
  if (/(cell|dna|meiosis|mitosis|ecosystem|homeostasis)/.test(t)) return "🧬";
  if (/(finance|budget|interest|vat|tax|account)/.test(t)) return "💸";
  if (/(history|apartheid|cold war|nationalism)/.test(t)) return "📜";
  return "📘";
}
function formatEmojiNumberedList(items) {
  return items
    .map((t, i) => `${numberToEmoji(i + 1)} ${pickTopicEmoji(t)} ${t}`)
    .join("\n");
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

// Existing header (kept for solution/hint screens)
function header(user) {
  const m = user.context.examTopicPractice || {};
  const diff = getDifficulty(m.progression || 0);
  const subject = m.subject || "Mathematics";
  const topic = m.topic ? ` • ${m.topic}` : "";
  const sub = m.subtopic ? ` • ${m.subtopic}` : "";
  return `🎯 ${subject}${topic}${sub}\n💪 ${diff.label}: ${diff.description}`;
}

// NEW: Title-only header (no difficulty line) for the question screen
function headerTitleOnly(user) {
  const m = user.context.examTopicPractice || {};
  const subject = m.subject || "Mathematics";
  const topic = m.topic ? ` • ${m.topic}` : "";
  const sub = m.subtopic ? ` • ${m.subtopic}` : "";
  return `🎯 ${subject}${topic}${sub}`;
}

// NEW: Centered question banner
function questionBanner(index = 1, deviceType = "mobile") {
  const indent = "            "; // 12 spaces
  return `${indent}*Question ${index}*`;
}

// Intent checks
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
  const title = headerTitleOnly(user);
  const qTitle = questionBanner(m.q_index, user.preferences.device_type);

  const canSendImages = Boolean(process.env.MANYCHAT_API_TOKEN);
  let note = "";

  if (q.hasGraph && q.graphImage && q.graphImage.data && q.graphImage.format) {
    const imageId = crypto
      .createHash("md5")
      .update(q.graphImage.data)
      .digest("hex");
    if (wasImageRecentlySent(user.id, imageId)) {
      note = "\n\n[graph shown in previous image]";
    } else {
      note = canSendImages
        ? "\n\n[graph sent as image]"
        : "\n\n[graph detected]";
      if (canSendImages) {
        setImmediate(async () => {
          try {
            console.log(
              `📤 Queue graph send → channel=${
                process.env.MANYCHAT_CHANNEL || "whatsapp"
              }, format=${q.graphImage.format}`
            );
            await sendImageViaManyChat(
              user.id,
              q.graphImage,
              `Q${m.q_index} Graph`
            );
          } catch (e) {
            console.error("❌ Failed to send graph image:", e.message);
          }
        });
      }
    }
  } else if (
    q.hasLatex &&
    q.latexImage &&
    q.latexImage.data &&
    q.latexImage.format
  ) {
    const imageId = crypto
      .createHash("md5")
      .update(q.latexImage.data)
      .digest("hex");
    if (wasImageRecentlySent(user.id, imageId)) {
      note = "\n\n[equation shown in previous image]";
    } else {
      note = canSendImages
        ? "\n\n[equation sent as image]"
        : "\n\n[equation detected]";
      if (canSendImages) {
        setImmediate(async () => {
          try {
            console.log(
              `📤 Queue LaTeX send → channel=${
                process.env.MANYCHAT_CHANNEL || "whatsapp"
              }, format=${q.latexImage.format}`
            );
            await sendImageViaManyChat(
              user.id,
              q.latexImage,
              `Q${m.q_index} Equation`
            );
          } catch (e) {
            console.error("❌ Failed to send formula image:", e.message);
          }
        });
      }
    }
  }

  const content = `${title}\n\n${qTitle}\n\n${q.questionText}${note}`;
  return formatResponseWithEnhancedSeparation(
    content,
    MENU,
    user.preferences.device_type
  );
}


async function handleSubjectGrade(user, text) {
  const m = user.context.examTopicPractice;
  const { subject, grade } = parseSubjectGrade(text);
  m.subject = subject;
  m.grade = grade;

  // CAPS-first topics; fallback to probing/examples
  const capsTopics = listTopicsCAPS(subject, grade);
  let topics = [];
  let fromCAPS = false;
  if (capsTopics && capsTopics.length > 0) {
    topics = capsTopics.slice(0, 10);
    fromCAPS = true;
  } else {
    topics = listTopicsFallback(subject).slice(0, 10);
  }

  m._topics = topics;
  m._topics_from_caps = fromCAPS;
  m.stage = "topic_select";

  // Enhanced emoji-numbered list
  const prettyTopics = topics.map((t) => labelize(t));
  const list = formatEmojiNumberedList(prettyTopics);

  const content = `Got it: *${subject} Grade ${grade}*\n\nWhat topic would you like to practice?\n\n${list}\n\nPick a number to start practicing.`;
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
    const list = formatEmojiNumberedList(
      (topics || []).map((x) => labelize(x))
    );
    return formatResponseWithEnhancedSeparation(
      `Please pick a topic by number (1–${topics.length}).\n\n${list}`,
      `Reply with a number (e.g., 1)`,
      user.preferences.device_type
    );
  }

  const key = topics[pick - 1]; // raw CAPS topic or fallback label
  m.topic = labelize(key);

  // Subtopics: CAPS-first with original key; fallback to probing DB
  const subs = m._topics_from_caps
    ? listSubtopicsCAPS(m.subject, m.grade, key)
    : listSubtopicsFallback(m.subject, key);

  if (!subs || subs.length === 0) {
    m.subtopic = m.topic;
    m.stage = "loop";
    m.q_index = 0;
    m.current_question = null;
    return await ensureQuestion(user, true);
  }

  m._subtopics = subs.slice(0, 8);
  m.stage = "subtopic_select";

  // Consistent sub-topic list formatting (number emoji + 🧩)
  const subList = m._subtopics
    .map((s, i) => `${numberToEmoji(i + 1)} 🧩 ${s}`)
    .join("\n");
  const content = `Nice. ${m.topic}.\n\nPick a sub-topic:\n\n${subList}`;
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

  const subsCAPS = listSubtopicsCAPS(m.subject, m.grade, topicText);
  const subs =
    subsCAPS && subsCAPS.length > 0
      ? subsCAPS
      : listSubtopicsFallback(
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

  m._subtopics = subs.slice(0, 8);
  m.stage = "subtopic_select";

  const subList = m._subtopics
    .map((s, i) => `${numberToEmoji(i + 1)} 🧩 ${s}`)
    .join("\n");
  const content = `Nice. ${m.topic}.\n\nPick a sub-topic:\n\n${subList}`;
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
    const subList = subs
      .map((s, i) => `${numberToEmoji(i + 1)} 🧩 ${s}`)
      .join("\n");
    return formatResponseWithEnhancedSeparation(
      `Please pick a sub-topic by number (1–${subs.length}).\n\n${subList}`,
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

  if (wantsSolution(t)) {
    const q = m.current_question;
    if (!q) return await ensureQuestion(user, false);
    updateProgression(m, "solution");

    const canSendImages = Boolean(process.env.MANYCHAT_API_TOKEN);
    let note = "";

    if (
      q.hasSolutionLatex &&
      q.solutionLatexImage &&
      q.solutionLatexImage.data &&
      q.solutionLatexImage.format
    ) {
      const imageId = crypto
        .createHash("md5")
        .update(q.solutionLatexImage.data)
        .digest("hex");
      if (wasImageRecentlySent(user.id, imageId)) {
        note = "\n\n[equation shown in previous image]";
      } else {
        note = canSendImages
          ? "\n\n[equation sent as image]"
          : "\n\n[equation detected]";
        if (canSendImages) {
          setImmediate(async () => {
            try {
              console.log(
                `📤 Queue Solution LaTeX send → channel=${
                  process.env.MANYCHAT_CHANNEL || "whatsapp"
                }, format=${q.solutionLatexImage.format}`
              );
              await sendImageViaManyChat(
                user.id,
                q.solutionLatexImage,
                `Q${m.q_index} Solution`
              );
            } catch (e) {
              console.error(
                "❌ Failed to send solution formula image:",
                e.message
              );
            }
          });
        }
      }
    }

    const content = `${header(user)}\n\n🧩 **Solution (steps):**\n\n${
      q.solution || "Solution available after attempt."
    }${note}`;
    return formatResponseWithEnhancedSeparation(
      content,
      MENU,
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

    const canSendImages = Boolean(process.env.MANYCHAT_API_TOKEN);
    let note = "";

    if (
      q.hasSolutionLatex &&
      q.solutionLatexImage &&
      q.solutionLatexImage.data &&
      q.solutionLatexImage.format
    ) {
      const imageId = crypto
        .createHash("md5")
        .update(q.solutionLatexImage.data)
        .digest("hex");

      if (wasImageRecentlySent(user.id, imageId)) {
        note = "\n\n[equation shown in previous image]";
      } else {
        note = canSendImages
          ? "\n\n[equation sent as image]"
          : "\n\n[equation detected]";
        if (canSendImages) {
          setImmediate(async () => {
            try {
              await sendImageViaManyChat(
                user.id,
                q.solutionLatexImage,
                `Q${m.q_index} Solution`
              );
            } catch (e) {
              console.error(
                "❌ Failed to send solution formula image:",
                e.message
              );
            }
          });
        } else {
          console.log(
            "ℹ️ ManyChat token missing; skipping image send (solution)"
          );
        }
      }
    }

    const content = `${header(user)}\n\n🧩 **Solution (steps):**\n\n${
      q.solution || "Solution available after attempt."
    }${note}`;
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

// --- existing helpers reused from earlier version (parseSubjectGrade, CAPS loaders, etc.) ---
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
function listTopicsCAPS(subject, grade) {
  const caps = getCapsTopics(subject, grade) || [];
  return caps;
}
function listTopicsFallback(subject) {
  const bank = SUBJECT_PROBING_DATABASE[subject] || {};
  const keys = Object.keys(bank).filter((k) => typeof bank[k] === "object");
  if (keys.length > 0) return keys.map((t) => labelize(t));
  return ["Topic 1", "Topic 2", "Topic 3", "Topic 4"];
}
function listSubtopicsCAPS(subject, grade, topicKey) {
  return getCapsSubtopics(subject, grade, topicKey) || [];
}
function listSubtopicsFallback(subject, topicKey) {
  const bank = SUBJECT_PROBING_DATABASE[subject] || {};
  const topic = bank[topicKey] || bank[topicKey?.toLowerCase?.()] || {};
  const ex = Array.isArray(topic.examples) ? topic.examples : [];
  const struggles = Array.isArray(topic.common_struggles)
    ? topic.common_struggles
    : [];
  const merged = Array.from(new Set([...ex, ...struggles])).filter(Boolean);
  return merged.slice(0, 8);
}

// Main handler


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
    `📝 **Topic Practice**\nUnlimited practice to master any topic.\n\n` +
    `What subject and grade?\nExamples: "Mathematics 10", "Physical Sciences 11", "Geography 9"`;
  const menu = `Reply: Subject + Grade (e.g., "Mathematics 10")`;
  return formatResponseWithEnhancedSeparation(
    content,
    menu,
    user.preferences.device_type
  );
}

module.exports = async (req, res) => {
  try {
    const manyCompatRes = new ManyCompatResponse(res);
    const subscriberId =
      req.body.psid || req.body.subscriber_id || "default_user";
    const message = (req.body.message || req.body.user_input || "").trim();
    const userAgent = req.headers["user-agent"] || "";

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

    persistUserState(subscriberId, user).catch(() => {});
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
