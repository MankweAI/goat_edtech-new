/**
 * Memory Hacks API Endpoint
 * GOAT Bot 2.0
 * Updated: 2025-08-23 15:39:01 UTC
 * Developer: DithetoMokgabudi
 */

const { ManyCompatResponse } = require("../lib/core/responses");
const {
  userStates,
  MANYCHAT_STATES,
  trackManyState,
} = require("../lib/core/state");
const {
  formatResponseWithEnhancedSeparation,
} = require("../lib/utils/formatting");
const { detectDeviceType } = require("../lib/utils/device-detection");

module.exports = async (req, res) => {
  try {
    // Create interceptor for ManyChat compatibility
    const manyCompatRes = new ManyCompatResponse(res);

    // Extract user data
    const subscriberId =
      req.body.psid || req.body.subscriber_id || "default_user";
    const message = req.body.message || req.body.user_input || "";
    const userAgent = req.headers["user-agent"] || "";

    // Get or create user state
    let user = userStates.get(subscriberId) || {
      id: subscriberId,
      current_menu: "memory_hacks",
      context: {},
      preferences: {
        device_type: detectDeviceType(userAgent),
      },
      last_active: new Date().toISOString(),
    };

    // Update menu state tracking
    user.current_menu = "memory_hacks_active";
    trackManyState(subscriberId, {
      type: "memory_hacks",
      current_menu: user.current_menu,
    });

    // Process memory hack request
    const response = await handleMemoryHacksFlow(user, message);

    // Update user state
    userStates.set(subscriberId, user);

    return manyCompatRes.json({
      message: response,
      status: "success",
    });
  } catch (error) {
    console.error("Memory hacks error:", error);

    return res.json({
      message:
        "Sorry, I encountered an error with memory hacks. Please try again.",
      status: "error",
      echo: "Sorry, I encountered an error with memory hacks. Please try again.",
      error: error.message,
    });
  }
};

// Memory hacks flow handler
async function handleMemoryHacksFlow(user, text) {
  const subject = text.trim() || "Mathematics";

  const content = `🧠 **Memory Hack** ✨

**SA Memory Trick for ${subject}**

💡 Using local landmarks and culture to remember key concepts:

1️⃣ **Table Mountain Method:** Visualize a problem at the top of Table Mountain to see it from all angles

2️⃣ **Veld Connection:** Link concepts to different areas of the South African veld

3️⃣ **Ubuntu Learning:** Apply the "I am because we are" principle to understand how concepts relate to each other`;

  const menu = `1️⃣ ➡️ More Hacks
2️⃣ 📝 Practice Questions
3️⃣ 🔄 Different Subject  
4️⃣ 🏠 Main Menu`;

  return formatResponseWithEnhancedSeparation(
    content,
    menu,
    user.preferences.device_type
  );
}

