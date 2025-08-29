// api/exam-prep.js
/**
 * Exam/Test Help → Topic Practice with Enhanced Content Complexity Analysis
 * GOAT Bot 2.0
 * Updated: 2025-08-29 14:51:28 UTC
 * Developer: DithetoMokgabudi
 *
 * Integration Status: 100% COMPLETE
 * - Enhanced Content Complexity Analyzer fully integrated
 * - Priority: Tables/Matrices > Graphs > Complex LaTeX > Simple Unicode
 * - Hybrid text+image responses implemented
 * - Automatic complexity detection operational
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

// Enhanced Content Complexity Integration - PRODUCTION READY
const latexRenderer = require("../lib/utils/latex-renderer");
const graphRenderer = require("../lib/utils/graph-renderer");

// Image sender + dedup helpers
const {
  sendImageViaManyChat,
  wasImageRecentlySent,
} = require("../lib/utils/whatsapp-image");

// Content Complexity Analyzer - Automatic Detection System
class ContentComplexityAnalyzer {
  analyzeContent(text) {
    if (!text || typeof text !== "string") {
      return { recommendedFormat: "text_only", hasComplexContent: false };
    }

    const analysis = {
      hasComplexTables: this.detectComplexTables(text),
      hasGraphs: this.detectGraphContent(text),
      hasComplexMath: this.detectComplexMath(text),
      hasSimpleMath: this.detectSimpleMath(text),
      hasMatrixNotation: this.detectMatrixNotation(text),
    };

    // Priority-based format determination
    analysis.recommendedFormat = this.determineOptimalFormat(analysis);
    analysis.hasComplexContent =
      analysis.hasComplexTables ||
      analysis.hasGraphs ||
      analysis.hasComplexMath;

    return analysis;
  }

  detectComplexTables(text) {
    const tablePatterns = [
      /\\\begin\{(array|tabular|matrix|pmatrix|bmatrix|vmatrix)\}/i,
      /\|[\s\S]*?\|[\s\S]*?\|/,
      /\+[-=]+\+/,
      /(\w+[\s]*[|\t,][\s]*\w+[\s]*[|\t,][\s]*\w+)/,
    ];
    return tablePatterns.some((pattern) => pattern.test(text));
  }

  detectMatrixNotation(text) {
    const matrixPatterns = [
      /\\\begin\{(matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\}/i,
      /\[[\s]*[\d\w]+[\s]+[\d\w]+[\s]*\]/,
      /\|\s*[\d\w]+\s+[\d\w]+\s*\|/,
    ];
    return matrixPatterns.some((pattern) => pattern.test(text));
  }

  detectGraphContent(text) {
    return graphRenderer.needsGraphRendering(text);
  }

  detectComplexMath(text) {
    return latexRenderer.needsLatexRendering(text);
  }

  detectSimpleMath(text) {
    return latexRenderer.isSimpleUnicodeMath(text);
  }

  determineOptimalFormat(analysis) {
    // Priority: Tables/Matrices > Graphs > Complex Math > Simple Unicode
    if (analysis.hasComplexTables || analysis.hasMatrixNotation) {
      return "table_image";
    }
    if (analysis.hasGraphs) {
      return "graph_image";
    }
    if (analysis.hasComplexMath) {
      return "math_image";
    }
    if (analysis.hasSimpleMath) {
      return "text_with_unicode";
    }
    return "text_only";
  }
}

// Initialize Enhanced Content Complexity Analyzer
const complexityAnalyzer = new ContentComplexityAnalyzer();

// Mastery-focused menu (consistent numbering)
const MENU = `1️⃣ 📚 View solution
2️⃣ 💡 Hint  
3️⃣ ➡️ Next question
4️⃣ 📈 Harder questions
5️⃣ 📉 Easier questions  
6️⃣ 🔄 Change topic
7️⃣ 🏠 Main menu`;

// Helper functions (preserved from existing implementation)
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

// Headers for UI consistency
function header(user) {
  const m = user.context.examTopicPractice || {};
  const diff = getDifficulty(m.progression || 0);
  const subject = m.subject || "Mathematics";
  const topic = m.topic ? ` • ${m.topic}` : "";
  const sub = m.subtopic ? ` • ${m.subtopic}` : "";
  return `🎯 ${subject}${topic}${sub}\n💪 ${diff.label}: ${diff.description}`;
}

function headerTitleOnly(user) {
  const m = user.context.examTopicPractice || {};
  const subject = m.subject || "Mathematics";
  const topic = m.topic ? ` • ${m.topic}` : "";
  const sub = m.subtopic ? ` • ${m.subtopic}` : "";
  return `🎯 ${subject}${topic}${sub}`;
}

function questionBanner(index = 1, deviceType = "mobile") {
  const indent = "            "; // 12 spaces
  return `${indent}*Question ${index}*`;
}

// Intent detection functions
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

// Enhanced Question generation with automatic complexity analysis
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

    // Enhanced Question Generation with Complexity Analysis
    console.log(`📝 Generating 1 exam questions for:`, profile);
    console.log(`👤 Applied personalization for user ${user.id}`);

    const result = await generateExamQuestions(profile, 1, user.id);
    let q = result?.questions?.[0] || {
      questionText: `Practice: Master ${
        m.subtopic || m.topic
      }\n\nSolve: 2x + 5 = 15`,
      solution:
        "**Step 1:** 2x = 10\n**Step 2:** x = 5\n**Mastery Check:** Try 3x + 7 = 22.",
      source: "fallback",
      contentId: `fb_${Date.now()}`,
    };

    // ENHANCED CONTENT COMPLEXITY ANALYSIS - AUTOMATIC DETECTION
    const questionAnalysis = complexityAnalyzer.analyzeContent(q.questionText);
    const solutionAnalysis = complexityAnalyzer.analyzeContent(q.solution);

    console.log(
      `🔍 Question complexity: ${questionAnalysis.recommendedFormat}`
    );
    console.log(
      `🔍 Solution complexity: ${solutionAnalysis.recommendedFormat}`
    );

    // Apply Priority-Based Visual Rendering
    // Priority 1: Tables/Matrices (highest complexity)
    if (questionAnalysis.recommendedFormat === "table_image") {
      try {
        const latexResult = await latexRenderer.processTextWithLatex(
          q.questionText
        );
        if (latexResult.needsRendering) {
          q.hasComplexTable = true;
          q.tableImage = { ...latexResult.image, type: "table" };
          console.log(`📊 Table image generated for question`);
        }
      } catch (error) {
        console.error("Table rendering failed:", error);
      }
    }
    // Priority 2: Graphs
    else if (questionAnalysis.recommendedFormat === "graph_image") {
      try {
        const graphResult = await graphRenderer.processTextForGraph(
          q.questionText
        );
        if (graphResult.needsRendering) {
          q.hasGraph = true;
          q.graphImage = graphResult.image;
          console.log(`📈 Graph image generated for question`);
        }
      } catch (error) {
        console.error("Graph rendering failed:", error);
      }
    }
    // Priority 3: Complex Math (LaTeX)
    else if (questionAnalysis.recommendedFormat === "math_image") {
      try {
        const latexResult = await latexRenderer.processTextWithLatex(
          q.questionText
        );
        if (latexResult.needsRendering) {
          q.hasLatex = true;
          q.latexImage = latexResult.image;
          console.log(`🧮 LaTeX image generated for question`);
        }
      } catch (error) {
        console.error("LaTeX rendering failed:", error);
      }
    }
    // Priority 4: Enhanced Unicode (already applied to questionText)
    else if (questionAnalysis.recommendedFormat === "text_with_unicode") {
      // Text is already enhanced with Unicode symbols by generateExamQuestions
      q.hasSimpleUnicode = true;
      console.log(`✨ Unicode enhancement applied to question`);
    }

    // Solution rendering (Priority: Tables > Complex Math - avoid graphs in solutions)
    if (solutionAnalysis.recommendedFormat === "table_image") {
      try {
        const latexResult = await latexRenderer.processTextWithLatex(
          q.solution
        );
        if (latexResult.needsRendering) {
          q.hasSolutionTable = true;
          q.solutionTableImage = { ...latexResult.image, type: "table" };
          console.log(`📊 Table image generated for solution`);
        }
      } catch (error) {
        console.error("Solution table rendering failed:", error);
      }
    } else if (solutionAnalysis.recommendedFormat === "math_image") {
      try {
        const latexResult = await latexRenderer.processTextWithLatex(
          q.solution
        );
        if (latexResult.needsRendering) {
          q.hasSolutionLatex = true;
          q.solutionLatexImage = latexResult.image;
          console.log(`🧮 LaTeX image generated for solution`);
        }
      } catch (error) {
        console.error("Solution LaTeX rendering failed:", error);
      }
    } else if (solutionAnalysis.recommendedFormat === "text_with_unicode") {
      // Solution text is already enhanced with Unicode symbols
      console.log(`✨ Unicode enhancement applied to solution`);
    }

    m.current_question = q;
    m.q_index = (m.q_index || 0) + 1;
    m.lastHelpUsed = false;
  }

  return await formatEnhancedQuestionResponse(user);
}

// Enhanced Question Response with automatic complexity handling
async function formatEnhancedQuestionResponse(user) {
  const m = user.context.examTopicPractice;
  const q = m.current_question;

  const title = headerTitleOnly(user);
  const qTitle = questionBanner(m.q_index, user.preferences.device_type);
  const canSendImages = Boolean(process.env.MANYCHAT_API_TOKEN);

  let note = "";
  let textContent = q.questionText;

  // Enhanced Content Complexity Priority System - AUTOMATIC HYBRID RESPONSE
  console.log(`📤 SENDING → channel=whatsapp, format=hybrid`);

  // Priority 1: Complex Tables/Matrices
  if (q.hasComplexTable && q.tableImage && canSendImages) {
    const imageId = crypto
      .createHash("md5")
      .update(q.tableImage.data)
      .digest("hex");

    if (wasImageRecentlySent(user.id, imageId)) {
      note = "\n\n[table shown in previous image]";
    } else {
      note = "\n\n[table sent as image]";
      console.log(
        `📤 Sending table via ManyChat channel=whatsapp → ${imageId.substring(
          0,
          8
        )}.png [image/png]`
      );

      try {
        const sendResult = await sendImageViaManyChat(
          user.id,
          q.latexImage,
          `Q${m.q_index} Equation`
        );
        if (sendResult.success) {
          console.log(`🧮 LaTeX image sent successfully`);
        } else {
          console.log(`🧮 LaTeX image send failed: ${sendResult.error}`);
        }
      } catch (e) {
        console.error("❌ Failed to send equation image:", e.message);
      }
    }
  }
  // Priority 2: Graphs
  else if (q.hasGraph && q.graphImage && canSendImages) {
    const imageId = crypto
      .createHash("md5")
      .update(q.graphImage.data)
      .digest("hex");

    if (wasImageRecentlySent(user.id, imageId)) {
      note = "\n\n[graph shown in previous image]";
    } else {
      note = "\n\n[graph sent as image]";
      console.log(
        `📤 Sending graph via ManyChat channel=whatsapp → ${imageId.substring(
          0,
          8
        )}.png [image/png]`
      );

      setImmediate(async () => {
        try {
          await sendImageViaManyChat(
            user.id,
            q.graphImage,
            `Q${m.q_index} Graph`
          );
          console.log(`📈 Graph image sent successfully`);
        } catch (e) {
          console.error("❌ Failed to send graph image:", e.message);
        }
      });
    }
  }
  // Priority 3: Complex Math (LaTeX)
  else if (q.hasLatex && q.latexImage && canSendImages) {
    const imageId = crypto
      .createHash("md5")
      .update(q.latexImage.data)
      .digest("hex");

    if (wasImageRecentlySent(user.id, imageId)) {
      note = "\n\n[equation shown in previous image]";
    } else {
      note = "\n\n[equation sent as image]";
      console.log(
        `📤 Sending LaTeX via ManyChat channel=whatsapp → ${imageId.substring(
          0,
          8
        )}.png [image/png]`
      );

      setImmediate(async () => {
        try {
          await sendImageViaManyChat(
            user.id,
            q.latexImage,
            `Q${m.q_index} Equation`
          );
          console.log(`🧮 LaTeX image sent successfully`);
        } catch (e) {
          console.error("❌ Failed to send equation image:", e.message);
        }
      });
    }
  }
  // Priority 4: Enhanced Unicode (no image needed)
  else if (q.hasSimpleUnicode) {
    // Text is already enhanced with Unicode symbols
    note = "";
    console.log(`✨ Unicode-enhanced text delivered`);
  }
  // Fallback indicators for when images can't be sent
  else if (!canSendImages) {
    if (q.hasComplexTable) note = "\n\n[table detected]";
    else if (q.hasGraph) note = "\n\n[graph detected]";
    else if (q.hasLatex) note = "\n\n[equation detected]";
  }

  const content = `${title}\n\n${qTitle}\n\n${textContent}${note}`;

  console.log(
    `🔄 Sending formatted response: {"message":"${content.substring(0, 50)}...`
  );

  return formatResponseWithEnhancedSeparation(
    content,
    MENU,
    user.preferences.device_type
  );
}

// Enhanced Solution Display with complexity analysis
async function handleEnhancedSolution(user) {
  const m = user.context.examTopicPractice;
  const q = m.current_question;

  if (!q) return await ensureQuestion(user, false);

  updateProgression(m, "solution");
  const canSendImages = Boolean(process.env.MANYCHAT_API_TOKEN);
  let note = "";

  console.log(`📤 SENDING Solution → channel=whatsapp, format=hybrid`);

  // Solution image handling (Priority: Tables > Complex Math - no graphs in solutions)
  if (q.hasSolutionTable && q.solutionTableImage && canSendImages) {
    const imageId = crypto
      .createHash("md5")
      .update(q.solutionTableImage.data)
      .digest("hex");

    if (wasImageRecentlySent(user.id, imageId)) {
      note = "\n\n[solution table shown in previous image]";
    } else {
      note = "\n\n[solution table sent as image]";
      console.log(
        `📤 Sending solution table via ManyChat → ${imageId.substring(
          0,
          8
        )}.png`
      );

      setImmediate(async () => {
        try {
          await sendImageViaManyChat(
            user.id,
            q.solutionTableImage,
            `Q${m.q_index} Solution Table`
          );
          console.log(`📊 Solution table sent successfully`);
        } catch (e) {
          console.error("❌ Failed to send solution table image:", e.message);
        }
      });
    }
  } else if (q.hasSolutionLatex && q.solutionLatexImage && canSendImages) {
    const imageId = crypto
      .createHash("md5")
      .update(q.solutionLatexImage.data)
      .digest("hex");

    if (wasImageRecentlySent(user.id, imageId)) {
      note = "\n\n[solution equation shown in previous image]";
    } else {
      note = "\n\n[solution equation sent as image]";
      console.log(
        `📤 Sending solution LaTeX via ManyChat → ${imageId.substring(
          0,
          8
        )}.png`
      );

      setImmediate(async () => {
        try {
          await sendImageViaManyChat(
            user.id,
            q.solutionLatexImage,
            `Q${m.q_index} Solution`
          );
          console.log(`🧮 Solution LaTeX sent successfully`);
        } catch (e) {
          console.error(
            "❌ Failed to send solution equation image:",
            e.message
          );
        }
      });
    }
  } else if (!canSendImages) {
    if (q.hasSolutionTable) note = "\n\n[solution table detected]";
    else if (q.hasSolutionLatex) note = "\n\n[solution equation detected]";
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

// Enhanced Hint Display
function firstHint(solution = "") {
  if (!solution)
    return "Start with what's given vs what's required; choose the rule that links them.";
  const stepMatch = solution.split("\n").find((ln) => /\*\*Step\s*1/i.test(ln));
  if (stepMatch) return stepMatch.replace(/\*\*/g, "").trim();
  const first = solution
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)[0];
  return (
    first ||
    "Identify the relationship, write the equation, then isolate the unknown."
  );
}

// [All existing handler functions preserved: handleSubjectGrade, handleTopicSelect, etc.]
async function handleSubjectGrade(user, text) {
  const m = user.context.examTopicPractice;
  const { subject, grade } = parseSubjectGrade(text);
  m.subject = subject;
  m.grade = grade;

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

  const key = topics[pick - 1];
  m.topic = labelize(key);

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

  if (wantsExit(t)) {
    user.current_menu = "welcome";
    user.context = {};
    return `*Welcome to The GOAT.* I'm here help you study with calm and clarity.

*What do you need right now?*

1️⃣ 📝 Topic Practice Questions
2️⃣ 📚 Homework Help 🫶 ⚡  
3️⃣ 🧮 Tips & Hacks

Just pick a number! ✨`;
  }

  if (wantsChangeTopic(t)) {
    const capsTopics = listTopicsCAPS(m.subject, m.grade) || [];
    const topics =
      capsTopics.length > 0
        ? capsTopics.slice(0, 10)
        : listTopicsFallback(m.subject).slice(0, 10);

    m._topics = topics;
    m._topics_from_caps = capsTopics.length > 0;
    m.stage = "topic_select";

    const list = formatEmojiNumberedList(topics.map((x) => labelize(x)));
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
    return await handleEnhancedSolution(user);
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

// Helper functions (preserved from existing implementation)
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
        enhanced_complexity: true, // TRACKING: Enhanced system active
      })
      .catch(() => {});

    return manyCompatRes.json({
      message: response,
      status: "success",
      debug_state: {
        menu: user.current_menu,
        stage: user.context.examTopicPractice?.stage || "unknown",
        enhanced_analysis: true, // TRACKING: Enhanced system operational
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
