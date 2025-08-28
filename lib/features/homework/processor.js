/**
 * Homework Processing Logic (Image-only, Hints-only)
 * GOAT Bot 2.0
 * Updated: 2025-08-24 13:44:06 UTC
 * Developer: DithetoMokgabudi
 *
 * Behavior:
 * - Users upload homework images ONLY.
 * - OCR extracts questions and we ALWAYS ask: “Which question here is giving you a hard time?”
 * - User replies with a number (e.g., 3) → We provide hints/tricks/clues ONLY. We NEVER provide full solutions.
 * - If user says “I don’t understand” or “more”, we provide a different approach (rotating hint strategies).
 */

const { processHomeworkImage, imageProcessing } = require("./image-ocr");
const {
  generateHomeworkHint,
  generateAIHint,
  generateDynamicHint,
} = require("./hint-system");
const { questionDetector } = require("../../utils/question-detector");
const https = require("https");
const { URL } = require("url");

// User state management (scoped to this feature)
const userStates = new Map();

// Homework state constants
const HOMEWORK_STATES = {
  AWAITING_IMAGE: "awaiting_image",
  QUESTIONS_DETECTED: "questions_detected",
  PROVIDING_HINT: "providing_hint",
};

// Download an image URL and return base64 string
async function downloadImageAsBase64(imageUrl) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(imageUrl);
      const options = {
        method: "GET",
        headers: {
          "User-Agent":
            "GOATBot/2.0 (+https://github.com/MankweAI/goat_edtech)",
        },
      };

      const req = https.request(parsed, options, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          return reject(new Error(`HTTP ${res.statusCode} fetching image URL`));
        }

        const contentType = res.headers["content-type"] || "";
        if (!contentType.startsWith("image/")) {
          return reject(
            new Error(
              `URL did not return an image content-type: ${contentType}`
            )
          );
        }

        const contentLength = parseInt(
          res.headers["content-length"] || "0",
          10
        );
        const MAX = 5 * 1024 * 1024; // 5MB
        if (contentLength && contentLength > MAX) {
          return reject(new Error("Image too large (max 5MB)"));
        }

        const chunks = [];
        let total = 0;
        res.on("data", (chunk) => {
          total += chunk.length;
          if (total > MAX) {
            req.destroy(new Error("Image too large (max 5MB)"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer.toString("base64"));
        });
      });

      req.setTimeout(10000, () => {
        req.destroy(new Error("Image download timeout"));
      });

      req.on("error", (err) => reject(err));
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Footer utilities
function appendFooter(message) {
  const footer =
    "\n\n—\n📸 Upload a photo of your homework • 🔢 Reply with question number • 🏠 Type 'menu' for Main Menu";
  return `${message}${footer}`;
}

function reply(res, data) {
  const payload = { ...data };
  if (payload.message) payload.message = appendFooter(payload.message);
  if (payload.echo) payload.echo = appendFooter(payload.echo);
  return res.json(payload);
}

// Helper: detect confusion/follow-up trigger
function isConfusedOrMore(text = "") {
  const t = text.toLowerCase().trim();
  if (!t) return false;
  return (
    /(don't|dont)\s*understand|confused|still stuck|still\s+confused|lost/.test(
      t
    ) ||
    /more|another|next|different|hint|clue|explain|simpler|break.*down/.test(t)
  );
}

// Rotate hint strategy to avoid repetition and never reveal full solution
async function provideNextHint(user, userText = "") {
  const q = user.context.selectedQuestion;
  if (!q) {
    return {
      hint: "Please select a question number first, then I’ll share a hint to get you unstuck.",
      type: "system",
    };
  }

  user.context.hintCount = (user.context.hintCount || 0) + 1;
  const lastType = user.context.lastHintType || "none";
  const tryOrder = [];

  // First hint: use consolidated generator (instant -> AI -> dynamic)
  if (user.context.hintCount === 1) {
    tryOrder.push("consolidated");
  } else {
    // Subsequent: rotate types to vary approach
    if (lastType === "instant") {
      tryOrder.push("dynamic", "ai");
    } else if (lastType === "dynamic") {
      tryOrder.push("ai", "instant");
    } else if (lastType === "ai") {
      tryOrder.push("dynamic", "instant");
    } else {
      tryOrder.push("consolidated");
    }
  }

  // Attempt in order
  for (const mode of tryOrder) {
    try {
      if (mode === "consolidated") {
        const res = await generateHomeworkHint(
          q,
          userText || "general",
          user.context.struggleType || "general"
        );
        user.context.lastHintType = res.type || "instant";
        user.context.lastHint = res.hint;
        return res;
      }
      if (mode === "dynamic") {
        const res = generateDynamicHint(
          q,
          userText || "Another way to think about it"
        );
        user.context.lastHintType = res.type || "dynamic";
        user.context.lastHint = res.hint;
        return res;
      }
      if (mode === "ai") {
        // Ask AI to provide a different angle without solving
        const res = await generateAIHint(
          q,
          userText || "Give a different simpler angle without solving"
        );
        user.context.lastHintType = res.type || "ai";
        user.context.lastHint = res.hint;
        return res;
      }
    } catch (e) {
      // Continue to next strategy
      console.error("Hint strategy failed:", mode, e.message);
    }
  }

  // Final fallback
  const fallback = generateDynamicHint(
    q,
    "Provide a very short nudge without any steps"
  );
  user.context.lastHintType = fallback.type || "dynamic";
  user.context.lastHint = fallback.hint;
  return fallback;
}

// Main class
class ConsolidatedHomeworkHelp {
  constructor() {}

  async processHomeworkRequest(req, res) {
    const {
      psid,
      message,
      imageData,
      imageInfo,
      user_input,
      has_image,
      imageUrl,
    } = req.body;

    const userId = psid || "anonymous";
    const text = (message || user_input || "").trim();

    let user = this.getOrCreateUser(userId);
    user.current_menu = "homework_help";

    try {
      // IMAGE PATH ONLY
      if (imageData || imageUrl) {
        let base64Data = imageData || null;

        if (!base64Data && imageUrl) {
          try {
            base64Data = await downloadImageAsBase64(imageUrl);
          } catch (fetchErr) {
            console.error("📸 Image download error:", fetchErr);
            return reply(res, {
              message:
                "📸 I couldn't download the image from the link sent. Please resend a clearer image.",
              status: "error",
              echo: "📸 I couldn't download the image from the link sent. Please resend a clearer image.",
            });
          }
        }

        if (!base64Data) {
          return reply(res, {
            message:
              "📸 I received an image indicator but no usable image data. Please try sending again.",
            status: "error",
            echo: "📸 I received an image indicator but no usable image data. Please try sending again.",
          });
        }

        const validation = imageProcessing.validateImage(base64Data);
        if (!validation.valid) {
          return reply(res, {
            message: `📸 **Image issue:** ${validation.reason}\n\nPlease try uploading again with a clearer image.`,
            status: "error",
            echo: `📸 **Image issue:** ${validation.reason}\n\nPlease try uploading again with a clearer image.`,
          });
        }

        return await this.handleImageUpload(user, base64Data, res);
      }

      // TEXT PATH (only numeric selection, menu, or “more”/confusion for extra hints)
      if (text) {
        const t = text.toLowerCase();

        // Menu escape
        if (t === "menu" || t === "main menu" || t === "home" || t === "back") {
          user.context = {};
          user.state = HOMEWORK_STATES.AWAITING_IMAGE;
          return reply(res, {
            message: this.getMainMenuMessage(),
            status: "success",
            echo: this.getMainMenuMessage(),
          });
        }

        // Selection flow
        if (user.state === HOMEWORK_STATES.QUESTIONS_DETECTED) {
          const num = parseInt(text, 10);
          const list = user.context?.questions || [];
          if (Number.isInteger(num) && list[num - 1]) {
            const selected = list[num - 1];

            // Set selected question context
            user.context.selectedQuestion = selected;
            user.state = HOMEWORK_STATES.PROVIDING_HINT;
            user.context.hintCount = 0;
            user.context.lastHintType = "none";

            // Provide first hint immediately (no solution)
            const firstHint = await provideNextHint(user, "start");
            const msg =
              `🧩 **Hint:**\n\n${firstHint.hint}\n\n` +
              "Reply 'more' or 'I don't understand' for a different approach.";
            return reply(res, {
              message: msg,
              status: "success",
              echo: msg,
            });
          }

          // Invalid selection
          return reply(res, {
            message:
              "Please reply with a valid question number from the list above.",
            status: "invalid_selection",
            echo: "Please reply with a valid question number from the list above.",
          });
        }

        // Additional hints while providing hints
        if (user.state === HOMEWORK_STATES.PROVIDING_HINT) {
          if (isConfusedOrMore(text)) {
            const nextHint = await provideNextHint(user, text);
            const msg =
              `🧩 **Another Hint:**\n\n${nextHint.hint}\n\n` +
              "Reply 'more' if you want one more nudge.";
            return reply(res, {
              message: msg,
              status: "success",
              echo: msg,
            });
          }

          // If user types anything else during hinting, nudge them
          return reply(res, {
            message:
              "If you’re still stuck, reply 'more' or 'I don't understand' and I’ll try a different angle.",
            status: "success",
            echo: "If you’re still stuck, reply 'more' or 'I don't understand' and I’ll try a different angle.",
          });
        }

        // Otherwise, instruct to upload an image
        return reply(res, {
          message:
            "📸 Homework is image-only. Please upload a clear photo of your homework question.",
          status: "success",
          echo: "📸 Homework is image-only. Please upload a clear photo of your homework question.",
        });
      }

      // Default prompt
      return this.sendUploadPrompt(res);
    } catch (error) {
      console.error("Homework help error:", error);
      return reply(res, {
        message:
          "Sorry, I encountered an error while processing your homework. Please try again.",
        status: "error",
        echo: "Sorry, I encountered an error while processing your homework. Please try again.",
      });
    }
  }

  async handleImageUpload(user, imageData, res) {
    try {
      const result = await processHomeworkImage(imageData, user.id);

      if (!result.success) {
        user.state = HOMEWORK_STATES.AWAITING_IMAGE;
        user.context.ocrError = result.error;
        return reply(res, {
          message:
            "📸 **Image processing failed.** Please try a clearer photo (good lighting, steady camera, fill the frame).",
          status: "error",
          echo: "📸 **Image processing failed.** Please try a clearer photo (good lighting, steady camera, fill the frame).",
        });
      }

      const extractedText = result.text;
      const confidence = result.confidence;
      const questions = questionDetector.detectQuestions(
        extractedText,
        confidence
      );

      user.context = {
        extractedText,
        questions,
        ocrConfidence: confidence,
        imageHash: result.imageHash,
        timestamp: new Date().toISOString(),
      };

      if (questions.length === 0) {
        user.state = HOMEWORK_STATES.AWAITING_IMAGE;
        return reply(res, {
          message:
            "📸 I couldn't find a clear question in the image. Please retake the photo closer to the question and try again.",
          status: "no_questions",
          echo: "📸 I couldn't find a clear question in the image. Please retake the photo closer to the question and try again.",
        });
      }

      // ALWAYS ask user to choose which question is giving them a hard time
      user.state = HOMEWORK_STATES.QUESTIONS_DETECTED;
      const list = this.formatQuestionList(questions);
      const msg =
        `📚 **Found ${questions.length} question${
          questions.length > 1 ? "s" : ""
        }!**\n\n${list}\n\n` +
        "👉 **Which question here is giving you a hard time?** Reply with the number only.";
      return reply(res, {
        message: msg,
        status: "success",
        echo: msg,
      });
    } catch (error) {
      console.error("OCR processing error:", error);

      user.state = HOMEWORK_STATES.AWAITING_IMAGE;
      let errorMessage =
        "📸 **Image processing failed.** Please try a clearer photo.";

      if (error.message.includes("timeout")) {
        errorMessage =
          "📸 **Image processing timed out.** Please try again with a clearer photo.";
      } else if (error.message.includes("quota")) {
        errorMessage =
          "📸 **Service temporarily busy.** Please try again in a moment.";
      } else if (error.code === 7) {
        errorMessage =
          "📸 **Vision API permission error.** Image recognition is unavailable for now.";
      }

      return reply(res, {
        message: errorMessage,
        status: "error",
        echo: errorMessage,
      });
    }
  }

  // Helpers
  getOrCreateUser(userId) {
    if (!userStates.has(userId)) {
      userStates.set(userId, {
        id: userId,
        context: {},
        state: HOMEWORK_STATES.AWAITING_IMAGE,
        lastActive: new Date().toISOString(),
      });
    }
    const user = userStates.get(userId);
    user.lastActive = new Date().toISOString();
    return user;
  }

  formatQuestionList(questions) {
    return questions
      .map((q, i) => `**${q.number || i + 1}.** ${q.text.substring(0, 80)}...`)
      .join("\n\n");
  }

  sendUploadPrompt(res) {
    const message =
      "📚 **Homework Help**\n\nUpload a clear photo of your homework. I’ll extract the questions so you can pick the number and I’ll share hints to get you unstuck.";
    return reply(res, { message, status: "success", echo: message });
  }

  getMainMenuMessage() {
    return `**Welcome to The GOAT.** I'm here help you study with calm and clarity.

**What do you need right now?**

1️⃣ 📅 Exam/Test Help
2️⃣ 📚 Homework Help 🫶 ⚡  
3️⃣ 🧮 Tips & Hacks

Just pick a number! ✨`;
  }
}

setInterval(() => {
  const now = Date.now();
  const expirationTime = 8 * 60 * 60 * 1000; // 8 hours
  let expiredCount = 0;

  for (const [userId, userData] of userStates.entries()) {
    const lastActiveTime = new Date(userData.lastActive).getTime();
    if (now - lastActiveTime > expirationTime) {
      userStates.delete(userId);
      expiredCount++;
    }
  }

  if (expiredCount > 0) {
    console.log(`🧹 Cleaned up ${expiredCount} inactive homework sessions`);
  }
}, 60 * 60 * 1000).unref();

module.exports = {
  ConsolidatedHomeworkHelp,
  HOMEWORK_STATES,
};
