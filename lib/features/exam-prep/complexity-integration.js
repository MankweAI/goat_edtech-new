/**
 * Content Complexity Integration for Exam Prep
 * GOAT Bot 2.0
 * Updated: 2025-08-29 14:38:24 UTC
 * Developer: DithetoMokgabudi
 */

const { EnhancedQuestionGenerator } = require("./enhanced-questions");
const {
  sendImageViaManyChat,
  wasImageRecentlySent,
} = require("../../utils/whatsapp-image");
const crypto = require("crypto");

/**
 * Enhanced question display with automatic complexity handling
 * @param {object} user - User object
 * @param {boolean} regenerate - Whether to regenerate question
 * @returns {Promise<string>} Formatted response
 */
async function displayEnhancedQuestion(user, regenerate = false) {
  const m = user.context.examTopicPractice;

  if (!m.current_question || regenerate) {
    const enhancedGenerator = new EnhancedQuestionGenerator();

    const diff = getDifficultyByProgression(m.progression || 0);
    const profile = {
      grade: m.grade || 10,
      subject: m.subject || "Mathematics",
      topic_struggles: m.topic || "algebra",
      specific_failure: m.subtopic || `${m.topic} fundamentals`,
      difficulty: diff.key,
      assessment_type: "practice",
    };

    const result = await enhancedGenerator.generateEnhancedQuestions(
      profile,
      1,
      user.id
    );
    const q = result?.questions?.[0];

    if (!q) {
      // Fallback question
      m.current_question = {
        questionText: `Practice: Master ${
          m.subtopic || m.topic
        }\n\nSolve: 2x + 5 = 15`,
        solution:
          "**Step 1:** 2x = 10\n**Step 2:** x = 5\n**Mastery Check:** Try 3x + 7 = 22.",
        source: "fallback",
        contentId: `fb_${Date.now()}`,
      };
    } else {
      m.current_question = q;
    }

    m.q_index = (m.q_index || 0) + 1;
    m.lastHelpUsed = false;
  }

  return await formatEnhancedQuestionResponse(user);
}

/**
 * Format question response with complexity-aware content delivery
 * @param {object} user - User object
 * @returns {Promise<string>} Formatted response
 */
async function formatEnhancedQuestionResponse(user) {
  const m = user.context.examTopicPractice;
  const q = m.current_question;

  const title = headerTitleOnly(user);
  const qTitle = questionBanner(m.q_index, user.preferences.device_type);
  const canSendImages = Boolean(process.env.MANYCHAT_API_TOKEN);

  let note = "";
  let textContent = q.questionText;

  // Priority 1: Complex Tables
  if (q.hasComplexTable && q.tableImage && canSendImages) {
    const imageId = crypto
      .createHash("md5")
      .update(q.tableImage.data)
      .digest("hex");

    if (wasImageRecentlySent(user.id, imageId)) {
      note = "\n\n[table shown in previous image]";
    } else {
      note = "\n\n[table sent as image]";

      setImmediate(async () => {
        try {
          await sendImageViaManyChat(
            user.id,
            q.tableImage,
            `Q${m.q_index} Table`
          );
        } catch (e) {
          console.error("❌ Failed to send table image:", e.message);
        }
      });
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

      setImmediate(async () => {
        try {
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
  // Priority 3: Complex Math
  else if (q.hasLatex && q.latexImage && canSendImages) {
    const imageId = crypto
      .createHash("md5")
      .update(q.latexImage.data)
      .digest("hex");

    if (wasImageRecentlySent(user.id, imageId)) {
      note = "\n\n[equation shown in previous image]";
    } else {
      note = "\n\n[equation sent as image]";

      setImmediate(async () => {
        try {
          await sendImageViaManyChat(
            user.id,
            q.latexImage,
            `Q${m.q_index} Equation`
          );
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
  }
  // Fallback indicators for when images can't be sent
  else if (!canSendImages) {
    if (q.hasComplexTable) note = "\n\n[table detected]";
    else if (q.hasGraph) note = "\n\n[graph detected]";
    else if (q.hasLatex) note = "\n\n[equation detected]";
  }

  const content = `${title}\n\n${qTitle}\n\n${textContent}${note}`;

  return formatResponseWithEnhancedSeparation(
    content,
    MENU,
    user.preferences.device_type
  );
}

/**
 * Handle solution display with complexity analysis
 * @param {object} user - User object
 * @returns {Promise<string>} Formatted solution response
 */
async function displayEnhancedSolution(user) {
  const m = user.context.examTopicPractice;
  const q = m.current_question;

  if (!q) return await displayEnhancedQuestion(user, false);

  updateProgression(m, "solution");
  const canSendImages = Boolean(process.env.MANYCHAT_API_TOKEN);
  let note = "";

  // Solution image handling (Priority: Tables > Complex Math)
  if (q.hasSolutionTable && q.solutionTableImage && canSendImages) {
    const imageId = crypto
      .createHash("md5")
      .update(q.solutionTableImage.data)
      .digest("hex");

    if (wasImageRecentlySent(user.id, imageId)) {
      note = "\n\n[solution table shown in previous image]";
    } else {
      note = "\n\n[solution table sent as image]";

      setImmediate(async () => {
        try {
          await sendImageViaManyChat(
            user.id,
            q.solutionTableImage,
            `Q${m.q_index} Solution Table`
          );
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

      setImmediate(async () => {
        try {
          await sendImageViaManyChat(
            user.id,
            q.solutionLatexImage,
            `Q${m.q_index} Solution`
          );
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

module.exports = {
  displayEnhancedQuestion,
  formatEnhancedQuestionResponse,
  displayEnhancedSolution,
};
