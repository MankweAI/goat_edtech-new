/**
 * Response Formatting
 * GOAT Bot 2.0
 * Updated: 2025-08-23 14:58:19 UTC
 */

const { enhanceVisualFormatting } = require("../utils/formatting");

// Format standard response
function formatGoatResponse(message, metadata = {}) {
  const safeMessage =
    message || "Sorry, I couldn't generate a response. Please try again.";
  return {
    message: safeMessage,
    status: "success",
    echo: safeMessage,
    timestamp: new Date().toISOString(),
    user: "sophoniagoat",
    ...metadata,
  };
}

// Generate menu options based on state
function generateEnhancedVisualMenu(aiState, deviceType = "mobile") {
  const spacing = deviceType === "mobile" ? "" : "  ";

  switch (aiState) {
    case "ai_question_generation":
    case "guided_discovery":
      return `1️⃣${spacing} 📚 Solution
2️⃣${spacing} ➡️ Next Question  
3️⃣${spacing} 🔄 Switch Topics
4️⃣${spacing} 🏠 Main Menu`;

    case "ai_painpoint_excavation":
    case "ai_micro_targeting":
    case "ai_painpoint_confirmation":
      return `1️⃣${spacing} ➡️ Continue
2️⃣${spacing} 📝 Skip to Question
3️⃣${spacing} 🔄 Switch Topics  
4️⃣${spacing} 🏠 Main Menu`;

    case "alternative_paths":
      return `1️⃣${spacing} ➡️ Option A (Guided Discovery)
2️⃣${spacing} 📝 Option B (Different Topic)
3️⃣${spacing} 🔄 Option C (Different Subject)
4️⃣${spacing} 🏠 Main Menu`;

    case "ai_subject_grade":
      return `1️⃣${spacing} ➡️ Continue Setup
2️⃣${spacing} 📝 Quick Question
3️⃣${spacing} 🔄 Different Subject
4️⃣${spacing} 🏠 Main Menu`;

    default:
      return `1️⃣${spacing} ➡️ Continue
2️⃣${spacing} 📝 Practice Question
3️⃣${spacing} 🔄 Switch Topics
4️⃣${spacing} 🏠 Main Menu`;
  }
}

// ManyChat compatibility response interceptor
class ManyCompatResponse {
  constructor(originalRes) {
    this.originalRes = originalRes;
  }

  // Intercept all JSON responses to ensure they have the echo field
  json(data) {
    // Ensure data is an object
    const responseData =
      typeof data === "object" ? data : { message: String(data) };

    // Ensure required fields exist
    if (!responseData.hasOwnProperty("status")) {
      responseData.status = responseData.error ? "error" : "success";
    }

    // CRITICAL: Add echo field for ManyChat
    if (
      !responseData.hasOwnProperty("echo") &&
      responseData.hasOwnProperty("message")
    ) {
      responseData.echo = responseData.message;
    }

    // Add timestamp if not present
    if (!responseData.hasOwnProperty("timestamp")) {
      responseData.timestamp = new Date().toISOString();
    }

    // Log the formatted response for debugging
    console.log(
      `🔄 Sending formatted response: ${JSON.stringify(responseData).substring(
        0,
        100
      )}...`
    );

    // Send the enhanced response
    return this.originalRes.json(responseData);
  }

  // Forward status method
  status(code) {
    this.originalRes.status(code);
    return this;
  }
}

module.exports = {
  formatGoatResponse,
  generateEnhancedVisualMenu,
  ManyCompatResponse,
};

