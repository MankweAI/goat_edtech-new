/**
 * Homework Help API Endpoint
 * GOAT Bot 2.0
 * Updated: 2025-08-23 15:45:43 UTC
 * Developer: DithetoMokgabudi
 */

const { ManyCompatResponse } = require("../lib/core/responses");
const { MANYCHAT_STATES } = require("../lib/core/state");
const {
  ConsolidatedHomeworkHelp,
} = require("../lib/features/homework/processor");

module.exports = async (req, res) => {
  try {
    // Create interceptor that adds ManyChat compatibility
    const manyCompatRes = new ManyCompatResponse(res);

    // CRITICAL FIX: Track current menu state in ManyChat tracking
    const subscriberId =
      req.body.psid || req.body.subscriber_id || "default_user";
    if (MANYCHAT_STATES && subscriberId) {
      MANYCHAT_STATES.lastMenu.set(subscriberId, {
        menu: "homework_help",
        timestamp: Date.now(),
      });
      console.log(
        `🔄 Homework.js updated menu state: ${subscriberId} -> homework_help`
      );
    }

    // Process request with interceptor
    const homeworkHelper = new ConsolidatedHomeworkHelp();
    await homeworkHelper.processHomeworkRequest(req, manyCompatRes);

    return true; // Signal that we've handled the response
  } catch (finalError) {
    console.error("CRITICAL ERROR:", finalError);

    // Even in case of critical error, format properly for ManyChat
    res.json({
      message: "Sorry, something went wrong. Please try again later.",
      status: "error",
      echo: "Sorry, something went wrong. Please try again later.",
      error: finalError.message,
    });

    return true; // Signal that error was handled
  }
};
