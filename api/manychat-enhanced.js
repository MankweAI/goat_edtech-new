/**
 * Enhanced ManyChat Integration
 * GOAT Bot 2.0 - SA Student Companion
 * User: sophoniagoat
 * Created: 2025-08-20 19:35:21 UTC
 */

module.exports = async (req, res) => {
  try {
    const { psid, message, custom_fields } = req.body;
    const userChoice = message?.toLowerCase() || "";

    if (
      userChoice.includes("1") ||
      userChoice.includes("exam") ||
      userChoice.includes("test")
    ) {
      return handleMockExamFlow(psid, message, res);
    } else if (userChoice.includes("2") || userChoice.includes("homework")) {
      return handleHomeworkFlow(psid, message, res);
    } else if (
      userChoice.includes("3") ||
      userChoice.includes("memory") ||
      userChoice.includes("hack")
    ) {
      return handleMemoryHackFlow(psid, message, res);
    } else {
      return showMainMenu(res);
    }
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Sorry, I encountered an error. Please try again.",
        status: "error",
      });
  }
};

function showMainMenu(res) {
  res.json({
    message:
      "🇿🇦 Welcome to GOAT Bot - Your SA Student Companion! 📚\n\nChoose what you need help with:\n\n1️⃣ Exam/Test Help - Get targeted practice and coaching\n2️⃣ Homework Help - Upload a photo of your question (image only)\n3️⃣ Memory Hacks - SA-specific mnemonics and techniques\n\nJust type 1, 2, or 3 to get started!",
    status: "success",
  });
}

async function handleMockExamFlow(psid, message, res) {
  // Integration with existing mock-exam endpoint
  // Parse user requirements and generate appropriate exam
}

async function handleHomeworkFlow(psid, message, res) {
  // Integration with existing homework-ocr endpoint
  // Handle both text and image inputs
}

async function handleMemoryHackFlow(psid, message, res) {
  // Integration with existing memory-hacks endpoint
  // Interactive subject/topic selection
}

