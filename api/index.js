/**
 * GOAT Bot 2.0 - Main Router
 * Updated: 2025-08-24 14:05:00 UTC
 * Developer: DithetoMokgabudi
 * Change: Fix menu option routing; rename to “Exam/Test Help”; add state tracking.
 */

const {
  userStates,
  MANYCHAT_STATES,
  setupStateCleanup,
  trackManyState,
} = require("../lib/core/state");
const { extractImageData, parseGoatCommand } = require("../lib/core/commands");
const { formatGoatResponse } = require("../lib/core/responses");
const { detectDeviceType } = require("../lib/utils/device-detection");
const analyticsModule = require("../lib/utils/analytics");
const stateModule = require("../lib/core/state");
const homeworkHelp = require("./homework.js");
const examPrep = require("./exam-prep.js");
const memoryHacks = require("./memory-hacks.js");
const networkResilience = require("../lib/utils/network-resilience");

setupStateCleanup();

networkResilience.startRetryScheduler({
  analyticsModule,
  stateModule,
});



async function handleWebhook(req, res, start) {
  if (req.method === "GET") {
    return res
      .status(200)
      .json(formatGoatResponse("GOAT Bot webhook is operational"));
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests supported",
      echo: "Only POST requests supported",
    });
  }

  const subscriberId =
    req.body.psid || req.body.subscriber_id || "default_user";
  const message = req.body.message || req.body.user_input || "";
  const userAgent = req.headers["user-agent"] || "";
  console.log(
    `📥 User ${subscriberId}: "${message}" (${message.length} chars)`
  );

  const imageInfo = extractImageData(req);

  let user = userStates.get(subscriberId) || {
    id: subscriberId,
    current_menu: "welcome",
    context: {},
    preferences: { device_type: detectDeviceType(userAgent) },
    last_active: new Date().toISOString(),
  };

  // Reconcile with ManyChat lastMenu
  const lastMenuEntry = MANYCHAT_STATES.lastMenu.get(subscriberId);
  if (
    lastMenuEntry &&
    lastMenuEntry.menu &&
    user.current_menu !== lastMenuEntry.menu
  ) {
    console.log(
      `🔗 Reconciling user menu from "${user.current_menu}" -> "${lastMenuEntry.menu}"`
    );
    user.current_menu = lastMenuEntry.menu;
    userStates.set(subscriberId, user);
  }

  // Route images to Homework Help
  if (imageInfo) {
    console.log(`🖼️ Image detected, routing to homework handler`);
    req.body.has_image = true;
    req.body.imageInfo = imageInfo;
    if (imageInfo.type === "direct") req.body.imageData = imageInfo.data;
    else if (imageInfo.type === "url") req.body.imageUrl = imageInfo.data;

    user.current_menu = "homework_help";
    userStates.set(subscriberId, user);
    trackManyState(subscriberId, {
      type: "homework_help",
      current_menu: "homework_help",
    }); // NEW
    return await homeworkHelp(req, res);
  }

  // FIX: Scope global numeric routing to the welcome menu only
  const trimmed = (message || "").trim();
  if (/^[123]$/.test(trimmed) && user.current_menu === "welcome") {
    if (trimmed === "1") {
      user.current_menu = "exam_prep_conversation";
      userStates.set(subscriberId, user);
      trackManyState(subscriberId, {
        type: "exam_prep_conversation",
        current_menu: "exam_prep_conversation",
      });
      return await examPrep(req, res);
    }
    if (trimmed === "2") {
      user.current_menu = "homework_help";
      userStates.set(subscriberId, user);
      trackManyState(subscriberId, {
        type: "homework_help",
        current_menu: "homework_help",
      });
      return await homeworkHelp(req, res);
    }
    if (trimmed === "3") {
      user.current_menu = "memory_hacks_active";
      userStates.set(subscriberId, user);
      trackManyState(subscriberId, {
        type: "memory_hacks_active",
        current_menu: "memory_hacks_active",
      });
      return await memoryHacks(req, res);
    }
  }

  // Fall back to command parser
  const command = parseGoatCommand(message, user, { imageInfo });
  console.log(`🎯 Command parsed:`, command.type);

  switch (command.type) {
    case "homework_help":
    case "homework_upload": {
      user.current_menu = "homework_help";
      userStates.set(subscriberId, user);
      trackManyState(subscriberId, {
        type: "homework_help",
        current_menu: "homework_help",
      });

      if (command.hasImage) {
        req.body.has_image = true;
        if (command.imageInfo) req.body.imageInfo = command.imageInfo;
        if (command.imageData) req.body.imageData = command.imageData;
        if (command.imageUrl) req.body.imageUrl = command.imageUrl;
      }
      return await homeworkHelp(req, res);
    }

    case "exam_prep_conversation": {
      user.current_menu = "exam_prep_conversation";
      userStates.set(subscriberId, user);
      trackManyState(subscriberId, {
        type: "exam_prep_conversation",
        current_menu: "exam_prep_conversation",
      });
      return await examPrep(req, res);
    }

    case "numbered_menu_command":
      return await examPrep(req, res);

    case "memory_hacks": {
      user.current_menu = "memory_hacks_active";
      userStates.set(subscriberId, user);
      trackManyState(subscriberId, {
        type: "memory_hacks_active",
        current_menu: "memory_hacks_active",
      });
      return await memoryHacks(req, res);
    }

    case "menu_choice": {
      if (command.choice === 1) {
        user.current_menu = "exam_prep_conversation";
        userStates.set(subscriberId, user);
        trackManyState(subscriberId, {
          type: "exam_prep_conversation",
          current_menu: "exam_prep_conversation",
        });
        return await examPrep(req, res);
      } else if (command.choice === 2) {
        user.current_menu = "homework_help";
        userStates.set(subscriberId, user);
        trackManyState(subscriberId, {
          type: "homework_help",
          current_menu: "homework_help",
        });
        return await homeworkHelp(req, res);
      } else if (command.choice === 3) {
        user.current_menu = "memory_hacks_active";
        userStates.set(subscriberId, user);
        trackManyState(subscriberId, {
          type: "memory_hacks_active",
          current_menu: "memory_hacks_active",
        });
        return await memoryHacks(req, res);
      }
      break;
    }

    case "welcome":
    default: {
      if (user.current_menu === "homework_help") {
        return await homeworkHelp(req, res);
      }

      const welcomeResponse = await showWelcomeMenu(user, subscriberId);
      userStates.set(subscriberId, user);
      trackManyState(subscriberId, {
        type: "welcome",
        current_menu: "welcome",
      }); // NEW
      return res.status(200).json(formatGoatResponse(welcomeResponse));
    }
  }
}

async function showWelcomeMenu(user, subscriberId) {
  console.log(`🏠 Welcome menu for user ${user.id}`);
  user.current_menu = "welcome";
  user.context = {};

  const welcomeBack = user.preferences.last_subject
    ? `\n\n👋 Welcome back!* Ready to master more *${user.preferences.last_subject}*?`
    : "";

  return `*Welcome to The GOAT.* I'm here help you study with calm and clarity.${welcomeBack}

*What do you need right now?*

1️⃣ 📝 Topic Practice Questions
2️⃣ 📚 Homework Help 🫶 ⚡  
3️⃣ 🧮 Tips & Hacks

Just pick a number! ✨`;
}

module.exports = async (req, res) => {
  const start = Date.now();
  console.log(
    `📩 ${req.method} request to ${
      req.url || "/api/index"
    } | ${new Date().toISOString()}`
  );

  try {
    const query = req.query || {};
    const endpoint = query.endpoint || "webhook";

    switch (endpoint) {
      case "webhook":
        return await handleWebhook(req, res, start);
      case "mock-exam":
        return await examPrep(req, res);
      case "homework-ocr":
        return await homeworkHelp(req, res);
      case "memory-hacks":
        return await memoryHacks(req, res);
      default:
        return await handleWebhook(req, res, start);
    }
  } catch (error) {
    console.error("❌ GOAT Bot fatal error:", error);
    if (!res.headersSent) {
      return res.status(500).json(
        formatGoatResponse(
          "Sorry, I encountered an error. Please try typing 'menu' to restart! 🔄",
          {
            status: "error",
            error: error.message,
            elapsed_ms: Date.now() - start,
          }
        )
      );
    }
  }
};
