/**
 * Homework Hint Generation System
 * GOAT Bot 2.0
 * Updated: 2025-08-23 15:39:01 UTC
 * Developer: DithetoMokgabudi
 */

const OpenAI = require("openai");

// Initialize OpenAI with proper error handling
let openai;
try {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠️ OpenAI API key not found, using mock implementation");
    // Create mock OpenAI client with predefined responses
    openai = {
      chat: {
        completions: {
          create: async ({ messages }) => {
            console.log("📝 Using mock OpenAI response");
            // Extract the question type from the message to provide relevant hints
            const message = messages[0]?.content || "";
            let mockResponse =
              "Focus on understanding the key concepts and applying the right formula.";

            if (message.includes("linear_equation")) {
              mockResponse =
                "Move all variables to one side and constants to the other side. Then solve for the variable.";
            } else if (message.includes("triangle_area")) {
              mockResponse =
                "Remember that the area of a triangle is (1/2) × base × height.";
            } else if (message.includes("quadratic")) {
              mockResponse =
                "Try factoring or using the quadratic formula: x = (-b ± √(b² - 4ac)) ÷ 2a.";
            }

            return {
              choices: [{ message: { content: mockResponse } }],
              usage: { total_tokens: 0 },
            };
          },
        },
      },
    };
  } else {
    console.log("🔄 Initializing OpenAI with API key");
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch (error) {
  console.error("❌ OpenAI initialization error:", error);
  // Create mock OpenAI client as fallback
  openai = {
    chat: {
      completions: {
        create: async () => {
          console.log("📝 Using fallback response due to initialization error");
          return {
            choices: [
              {
                message: {
                  content:
                    "Look for similar examples in your textbook and follow the same steps for this problem.",
                },
              },
            ],
            usage: { total_tokens: 0 },
          };
        },
      },
    },
  };
}

// Predefined instant hints database
const instantHints = {
  // Linear equations
  linear_equation: {
    hint: "Move numbers to one side, x to the other",
    example: "If 2x + 5 = 15, then 2x = 10, so x = 5",
  },
  // Triangle area
  triangle_area: {
    hint: "Area = ½ × base × height",
    example: "Base = 6, Height = 4 → Area = ½ × 6 × 4 = 12",
  },
  // Circle area
  circle_area: {
    hint: "Area = π × radius²",
    example: "radius = 3 → Area = π × 3² = 9π ≈ 28.3",
  },
  // Quadratic equations
  quadratic_equation: {
    hint: "Factor or use the quadratic formula: x = (-b ± √(b² - 4ac)) ÷ 2a",
    example: "For x² + 5x + 6 = 0, a=1, b=5, c=6, leading to x = -2 or x = -3",
  },
  // More hint types...
};

// Generate quick hint from database
function generateQuickHint(questionType, struggleType) {
  const instantHint = instantHints[questionType];
  if (instantHint) {
    // Customize hint based on struggle type
    let customizedHint = instantHint.hint;
    let customizedExample = instantHint.example;

    if (struggleType === "formula_knowledge") {
      customizedHint = `**Formula:** ${instantHint.hint}`;
    } else if (struggleType === "calculation") {
      customizedExample = `**Step-by-step:** ${instantHint.example}`;
    } else if (struggleType === "conceptual") {
      customizedHint = `**Concept:** ${instantHint.hint}\n\nThink of it as a pattern or rule to follow.`;
    }

    return {
      hint: customizedHint,
      example: customizedExample,
      type: "instant",
    };
  }

  return null;
}

// Generate AI-based hint
async function generateAIHint(question, struggle) {
  try {
    // Add timeout and better error handling
    const generatePromise = openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: `Student is stuck on: "${struggle}"
Question: "${question.text}"
Question type: ${question.type}

Generate a brief educational hint that guides them toward the solution WITHOUT giving the direct answer. Focus on the method or approach they should use. Maximum 40 words.`,
        },
      ],
      max_tokens: 60,
      temperature: 0.1,
    });

    // Add timeout for API
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("AI hint generation timeout")), 10000);
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    return {
      hint: response.choices[0].message.content.trim(),
      type: "ai",
      source: "openai",
    };
  } catch (error) {
    console.error("AI hint generation error:", error);
    if (error.message.includes("timeout")) {
      return {
        hint: "Focus on identifying the key information and applying the relevant formula. Break down the problem into smaller steps.",
        type: "ai_fallback",
        source: "timeout_fallback",
      };
    }
    throw error;
  }
}

// Generate dynamic hint as fallback
function generateDynamicHint(question, struggle) {
  const questionText = question.text.toLowerCase();
  const struggleText = struggle.toLowerCase();
  let hint = "";
  let source = "dynamic";

  // Analyze question for key patterns
  if (
    questionText.includes("solve") &&
    (questionText.includes("=") || questionText.includes("equation"))
  ) {
    hint =
      "Isolate the variable by performing the same operations on both sides of the equation. Remember to reverse operations (addition becomes subtraction, etc).";
  } else if (
    questionText.includes("area") ||
    questionText.includes("perimeter") ||
    questionText.includes("volume")
  ) {
    hint =
      "Identify the shape and use the appropriate formula. Make sure your units are consistent throughout your calculation.";
  } else if (questionText.includes("factor")) {
    hint =
      "Look for the greatest common factor first. Then try to arrange terms to identify patterns like difference of squares or perfect trinomials.";
  } else if (questionText.includes("graph")) {
    hint =
      "Start by finding key points like x-intercepts (where y=0), y-intercepts (where x=0), and any vertices or asymptotes if applicable.";
  } else {
    // Generic hint based on struggle
    if (
      struggleText.includes("formula") ||
      struggleText.includes("don't know how")
    ) {
      hint =
        "Try to identify what type of problem this is, then recall the relevant formula. Look for keywords in the question that indicate the formula needed.";
    } else if (struggleText.includes("start")) {
      hint =
        "Start by writing down what you know and what you need to find. Then identify the connection between them - what formula or method links them?";
    } else {
      hint =
        "Break the problem into smaller steps. Identify the information given and what you're trying to find, then work step-by-step toward the solution.";
    }
  }

  return {
    hint,
    source,
    type: "dynamic",
  };
}

// Consolidated hint generation with fallback hierarchy
async function generateHomeworkHint(question, struggle, struggleType) {
  try {
    // Try instant hint first
    const quickHint = generateQuickHint(question.type, struggleType);
    if (quickHint) {
      return quickHint;
    }

    // Try AI hint
    try {
      const aiHint = await generateAIHint(question, struggle);
      return aiHint;
    } catch (aiError) {
      console.log(
        "AI hint generation failed, using fallback:",
        aiError.message
      );
      // Fall back to dynamic hint generation
      return generateDynamicHint(question, struggle);
    }
  } catch (error) {
    console.error("Hint generation error:", error);
    // Last resort fallback
    return {
      hint: "Focus on identifying what you need to find, what information you have, and then apply the appropriate method or formula.",
      type: "emergency_fallback",
      source: "error_recovery",
    };
  }
}

module.exports = {
  instantHints,
  generateQuickHint,
  generateAIHint,
  generateDynamicHint,
  generateHomeworkHint,
};

