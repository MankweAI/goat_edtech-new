/**
 * Exam Preparation Question Generation
 * GOAT Bot 2.0
 * Created: 2025-08-23 16:04:32 UTC
 * Developer: DithetoMokgabudi
 * Fixes (2025-08-28 14:31:00 UTC):
 * - REMOVE invalid require('./questions_original') causing runtime crash
 * - Clean, single export of generation + fallback helpers
 */

const OpenAI = require("openai");
let openai;
const latexRenderer = require("../../utils/latex-renderer");
const {
  personalizeQuestionProfile,
  adjustQuestionDifficulty,
} = require("./personalization");
const analyticsModule = require("../../utils/analytics");

try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log("🧠 OpenAI initialized for exam question generation");
  } else {
    console.log("⚠️ No OpenAI API key, using fallback question generation");
  }
} catch (error) {
  console.error("❌ OpenAI initialization error:", error);
}

/**
 * Generate a targeted practice question (Mastery-focused when purpose provided)
 */
async function generateRealAIQuestion(profile) {
  console.log(`🤖 Generating AI question for:`, profile);

  try {
    if (!openai) throw new Error("OpenAI not initialized");

    const purpose = profile.purpose || "topic_mastery";
    const contextLine =
      purpose === "topic_mastery"
        ? `Purpose: Master the topic concept-by-concept. Avoid exam/test framing.`
        : `Purpose: ${purpose}`;

    const questionPrompt = `Create ONE ${profile.subject} practice question for Grade ${profile.grade} aligned to South African CAPS.

${contextLine}
Topic: ${profile.topic_struggles}
Focus: ${profile.specific_failure}
Difficulty: ${profile.difficulty}

Requirements:
- Be concise and specific to the focus
- Use standard SA terminology
- No extra commentary
- Return ONLY the question text`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: questionPrompt }],
      max_tokens: 200,
      temperature: 0.4,
    });

    const questionText = (response.choices?.[0]?.message?.content || "").trim();

    const solutionPrompt = `Provide a step-by-step solution for the ${profile.subject} question (CAPS-aligned, Grade ${profile.grade}).

Question: ${questionText}
Focus: ${profile.specific_failure}
Purpose: ${purpose}

Instructions:
- Be clear and educational
- Bold the steps
- Use proper mathematical notation and SA terminology
- No fluff`;

    const solutionResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: solutionPrompt }],
      max_tokens: 450,
      temperature: 0.3,
    });

    const solution = enhanceVisualFormatting(
      (solutionResponse.choices?.[0]?.message?.content || "").trim()
    );

    return {
      questionText: enhanceVisualFormatting(questionText),
      solution,
      explanation: `Mastery focus: ${profile.specific_failure}`,
      tokens_used:
        (response.usage?.total_tokens || 0) +
        (solutionResponse.usage?.total_tokens || 0),
      source: "ai",
    };
  } catch (error) {
    console.error("OpenAI question generation failed:", error);
    return generateFallbackQuestion(profile);
  }
}

/**
 * Generate a fallback question when AI generation fails
 */
function generateFallbackQuestion(profile) {
  const subject = profile.subject || "Mathematics";
  const grade = profile.grade || "11";
  const topic = (profile.topic_struggles || "algebra").toLowerCase();
  const struggle = (
    profile.specific_failure || "solving equations"
  ).toLowerCase();

  console.log(
    `🔄 Generating fallback question for: ${subject} ${topic} - ${struggle}`
  );

  const fallbacks = {
    Mathematics: getMathFallbackQuestion(topic, struggle, grade),
    "Mathematical Literacy": getMathLitFallbackQuestion(topic, struggle, grade),
    Geography: getGeographyFallbackQuestion(topic, struggle, grade),
    "Physical Sciences": getPhysicalSciencesFallbackQuestion(
      topic,
      struggle,
      grade
    ),
    "Life Sciences": getLifeSciencesFallbackQuestion(topic, struggle, grade),
    History: getHistoryFallbackQuestion(topic, struggle, grade),
    Economics: getEconomicsFallbackQuestion(topic, struggle, grade),
    "Business Studies": getBusinessFallbackQuestion(topic, struggle, grade),
    Accounting: getAccountingFallbackQuestion(topic, struggle, grade),
    English: getEnglishFallbackQuestion(topic, struggle, grade),
  };

  return fallbacks[subject] || getGenericFallbackQuestion(profile);
}

/**
 * Subject-specific fallback generators
 * Each returns { questionText, solution, source }
 */
function getMathFallbackQuestion(topic, struggle, grade = 11) {
  if (topic.includes("probab")) {
    return {
      questionText: `In a class, 12 students play soccer and 8 students play netball. 5 students play both.
a) Draw a Venn diagram to represent this information.
b) If there are 20 students in total, find the probability that a randomly selected student plays:
   i) Soccer only
   ii) Netball only
   iii) Neither sport`,
      solution: `**Step 1:** Use inclusion–exclusion for counts
Soccer (S) = 12, Netball (N) = 8, Both (S∩N) = 5
Only Soccer = 12 − 5 = 7
Only Netball = 8 − 5 = 3
Total = 20 → Neither = 20 − (7 + 5 + 3) = 5

**Step 2:** Convert to probabilities
i) P(S only) = 7/20
ii) P(N only) = 3/20
iii) P(neither) = 5/20 = 1/4

Therefore: 7/20, 3/20, and 1/4 respectively.`,
      source: "fallback",
    };
  }

  if (topic.includes("factor") || struggle.includes("factor")) {
    return {
      questionText: `Factorise completely: 2x² − 5x − 12`,
      solution: `**Step 1:** Find two numbers that multiply to (2)(−12)=−24 and add to −5 → (−8, +3)
**Step 2:** Split the middle term
2x² − 8x + 3x − 12
**Step 3:** Group and factor
(2x² − 8x) + (3x − 12)
= 2x(x − 4) + 3(x − 4)
**Step 4:** Factor common binomial
= (x − 4)(2x + 3)`,
      source: "fallback",
    };
  }

  if (topic.includes("function")) {
    return {
      questionText: `Given f(x) = x² − 4x + 3,
a) Find the x-intercepts
b) Find the vertex
c) Sketch the basic shape with key points`,
      solution: `**a)** x-intercepts: set f(x)=0 → x² − 4x + 3 = 0 → (x−1)(x−3)=0 → x=1 or x=3
**b)** Vertex at x = −b/(2a) = 4/2 = 2; f(2)= 4 − 8 + 3 = −1 → Vertex (2, −1)
**c)** Upward-opening parabola through (1,0), (3,0), vertex (2,−1), y-intercept at f(0)=3`,
      source: "fallback",
    };
  }

  if (
    topic.includes("trig") ||
    struggle.includes("sin") ||
    struggle.includes("cos") ||
    struggle.includes("tan")
  ) {
    return {
      questionText: `Solve for x in 0° ≤ x < 360°: sin x = 1/2`,
      solution: `Reference angle where sin θ = 1/2 is 30°.
In [0°,360°), sin is positive in Quadrants I and II.
Solutions: x = 30°, 150°.`,
      source: "fallback",
    };
  }

  if (topic.includes("geometry") || struggle.includes("angle")) {
    return {
      questionText: `In triangle ABC, the exterior angle at C is 115°. The interior opposite angles at A and B are equal. Find angles A and B.`,
      solution: `Exterior angle = sum of two opposite interior angles.
Let angle A = angle B = k. Then 115° = k + k = 2k → k = 57.5°.
∴ A = 57.5°, B = 57.5°.`,
      source: "fallback",
    };
  }

  return {
    questionText: `Solve for x: 3x − 7 = 2x + 5`,
    solution: `**Step 1:** Group like terms → 3x − 2x = 5 + 7 → x = 12
**Check:** 3(12) − 7 = 29 and 2(12) + 5 = 29 ✓`,
    source: "fallback",
  };
}

function getMathLitFallbackQuestion(topic, struggle, grade = 11) {
  if (topic.includes("finance") || struggle.includes("interest")) {
    return {
      questionText: `Thabo deposits R4 000 at 8% simple interest per year.
How much interest does he earn after 2 years, and what is the total amount?`,
      solution: `Simple interest: I = P·r·t = 4000 × 0.08 × 2 = R640
Total amount A = P + I = 4000 + 640 = R4 640.`,
      source: "fallback",
    };
  }
  if (topic.includes("measurement") || struggle.includes("convert")) {
    return {
      questionText: `A rectangular room measures 4.5 m by 3.2 m.
a) Calculate the area in m².
b) Convert the area to cm².`,
      solution: `a) Area = 4.5 × 3.2 = 14.4 m²
b) 1 m² = 10 000 cm² → 14.4 m² = 14.4 × 10 000 = 144 000 cm²`,
      source: "fallback",
    };
  }
  return {
    questionText: `A budget shows income of R5 500 and expenses of: Rent R2 200, Transport R800, Food R1 200, Other R900. 
a) Calculate the total expenses
b) Determine the savings`,
    solution: `Total expenses = 2200 + 800 + 1200 + 900 = R5 100
Savings = Income − Expenses = 5 500 − 5 100 = R400`,
    source: "fallback",
  };
}

function getGeographyFallbackQuestion(topic, struggle, grade = 11) {
  if (topic.includes("map") || struggle.includes("scale")) {
    return {
      questionText: `On a 1:50 000 map, two towns are 7.2 cm apart. Calculate the real distance in km.`,
      solution: `1 cm represents 50 000 cm = 0.5 km.
7.2 cm → 7.2 × 0.5 = 3.6 km.`,
      source: "fallback",
    };
  }
  if (topic.includes("climate") || struggle.includes("weather")) {
    return {
      questionText: `Explain the difference between weather and climate, and give one example for South Africa.`,
      solution: `Weather: short-term conditions (today/tomorrow).
Climate: long-term average (30+ years).
Example: Western Cape has a Mediterranean climate (winter rainfall).`,
      source: "fallback",
    };
  }
  return {
    questionText: `Define a topographic map and state two features commonly shown on it.`,
    solution: `A topographic map shows the physical and human features of an area with accurate scale.
Two features: contour lines (relief), rivers/roads/settlements (infrastructure).`,
    source: "fallback",
  };
}

function getPhysicalSciencesFallbackQuestion(topic, struggle, grade = 11) {
  if (
    topic.includes("mechanics") ||
    struggle.includes("velocity") ||
    struggle.includes("acceleration")
  ) {
    return {
      questionText: `A car accelerates uniformly from rest to 20 m·s⁻¹ in 5 s.
a) Calculate its acceleration
b) Calculate the distance covered in this time`,
      solution: `a) a = Δv/Δt = (20 − 0)/5 = 4 m·s⁻²
b) s = ½(a)t² (since u=0) = 0.5 × 4 × 5² = 50 m`,
      source: "fallback",
    };
  }
  if (
    topic.includes("electric") ||
    struggle.includes("ohm") ||
    struggle.includes("resistance")
  ) {
    return {
      questionText: `A 12 V battery is connected across a resistor of 4 Ω.
Calculate the current through the resistor and the power dissipated.`,
      solution: `I = V/R = 12/4 = 3 A
P = VI = 12 × 3 = 36 W`,
      source: "fallback",
    };
  }
  return {
    questionText: `Define Newton’s First Law and give a real-life example.`,
    solution: `An object remains at rest or in uniform motion unless acted on by a net external force.
Example: Passengers lurch forward when a taxi brakes suddenly (inertia).`,
    source: "fallback",
  };
}

function getLifeSciencesFallbackQuestion(topic, struggle, grade = 11) {
  if (
    topic.includes("cell") ||
    struggle.includes("mitosis") ||
    struggle.includes("meiosis")
  ) {
    return {
      questionText: `Differentiate between mitosis and meiosis by completing:
Number of divisions, number of daughter cells, genetic similarity.`,
      solution: `Mitosis: 1 division, 2 daughter cells, genetically identical (growth/repair).
Meiosis: 2 divisions, 4 daughter cells, genetically different (gamete formation).`,
      source: "fallback",
    };
  }
  return {
    questionText: `Explain diffusion and osmosis, and give one example of each in the human body.`,
    solution: `Diffusion: movement of particles from high to low concentration (e.g., O₂ moving from alveoli to blood).
Osmosis: movement of water across a semi-permeable membrane from high to low water potential (e.g., water absorption in kidneys).`,
    source: "fallback",
  };
}

function getHistoryFallbackQuestion(topic, struggle, grade = 11) {
  if (
    topic.includes("apartheid") ||
    topic.includes("soweto") ||
    struggle.includes("significance")
  ) {
    return {
      questionText: `Evaluate the significance of the 1976 Soweto Uprising in the struggle against apartheid (short paragraph).`,
      solution: `It internationalised the anti-apartheid struggle, galvanised youth activism, and exposed the regime’s brutality. 
It led to increased sanctions and strengthened internal resistance, marking a turning point towards eventual negotiations.`,
      source: "fallback",
    };
  }
  return {
    questionText: `Explain one internal and one external factor that weakened the apartheid government in the 1980s.`,
    solution: `Internal: Mass mobilisation and strikes led by UDF/COSATU increased ungovernability.
External: International sanctions and disinvestment pressured the economy and legitimacy.`,
    source: "fallback",
  };
}

function getEconomicsFallbackQuestion(topic, struggle, grade = 11) {
  if (topic.includes("macro") || struggle.includes("gdp")) {
    return {
      questionText: `Define GDP and explain the difference between nominal GDP and real GDP.`,
      solution: `GDP: total value of final goods and services produced in a country in a period.
Nominal: measured at current prices.
Real: adjusted for inflation to reflect true growth.`,
      source: "fallback",
    };
  }
  return {
    questionText: `Explain demand-pull inflation and state one policy the SARB can use to reduce it.`,
    solution: `Demand-pull inflation occurs when aggregate demand exceeds aggregate supply.
SARB can increase interest rates to reduce borrowing and spending.`,
    source: "fallback",
  };
}

function getBusinessFallbackQuestion(topic, struggle, grade = 11) {
  if (topic.includes("ethic") || struggle.includes("ethic")) {
    return {
      questionText: `Give two examples of ethical business practices and explain why they matter.`,
      solution: `Examples: Fair wages, honest marketing.
They build trust, protect brand reputation, and ensure long-term sustainability.`,
      source: "fallback",
    };
  }
  return {
    questionText: `Explain the difference between vision and mission statements with one example each.`,
    solution: `Vision: long-term aspirational goal (e.g., “Be SA’s most trusted school app”).
Mission: what the business does daily to achieve it (e.g., “Provide reliable study tools to learners”).`,
    source: "fallback",
  };
}

function getAccountingFallbackQuestion(topic, struggle, grade = 11) {
  if (topic.includes("vat")) {
    return {
      questionText: `A business sells goods for R1 150 including VAT at 15%.
a) Calculate VAT amount
b) Determine the selling price excluding VAT`,
      solution: `Inclusive → Excl = 1 150 ÷ 1.15 = R1 000
VAT = 1 150 − 1 000 = R150`,
      source: "fallback",
    };
  }
  return {
    questionText: `Prepare the accounting equation after: Owner invests R50 000 cash; buys equipment for R20 000 cash.`,
    solution: `Initial: Assets +50 000 (Cash), Equity +50 000 (Capital)
Purchase: Assets −20 000 (Cash), +20 000 (Equipment)
Net: Assets = Cash 30 000 + Equipment 20 000 = 50 000; Equity = 50 000`,
    source: "fallback",
  };
}

function getEnglishFallbackQuestion(topic, struggle, grade = 11) {
  if (topic.includes("grammar") || struggle.includes("tense")) {
    return {
      questionText: `Identify the tense and correct the error: “He go to school yesterday.”`,
      solution: `Past action → simple past required: “He went to school yesterday.”`,
      source: "fallback",
    };
  }
  return {
    questionText: `Write a short paragraph (3–4 lines) describing your favourite place using at least two adjectives and one simile.`,
    solution: `Example: “The library is a quiet sanctuary, warm and welcoming. The shelves stand like soldiers guarding stories. Its gentle hush helps me focus.”`,
    source: "fallback",
  };
}

function getGenericFallbackQuestion(profile) {
  const subject = profile.subject || "Mathematics";
  const topic = profile.topic_struggles || "algebra";
  const struggle = profile.specific_failure || "solving equations";
  return {
    questionText: `Practice question (${subject} - ${topic}): Create and solve a problem that helps with "${struggle}". For example, start by identifying what's given and what you must find.`,
    solution: `Strategy:
1) Identify knowns and unknowns
2) Choose the relevant rule/formula
3) Apply step-by-step
4) Check the result with substitution or units`,
    source: "fallback",
  };
}

// Helper function to enhance visual formatting of math content
function enhanceVisualFormatting(content) {
  if (!content) return "";
  let enhanced = content;

  enhanced = enhanced
    .replace(/\^2/g, "²")
    .replace(/\^3/g, "³")
    .replace(/sqrt\(([^)]+)\)/g, "√($1)")
    .replace(/\+\-/g, "±")
    .replace(/infinity/gi, "∞")
    .replace(/pi\b/gi, "π")
    .replace(/theta/gi, "θ");

  enhanced = enhanced
    .replace(/Step (\d+):/g, "**Step $1:**")
    .replace(/Step (\d+)\./g, "**Step $1:**")
    .replace(/(\d+)\.\s/g, "**$1.** ")
    .replace(/Given:/g, "**Given:**")
    .replace(/Solution:/g, "**Solution:**")
    .replace(/Answer:/g, "**Answer:**")
    .replace(/Therefore:/g, "**Therefore:**");

  return enhanced;
}

// Generate questions (with personalization and LaTeX handling)
async function generateExamQuestions(profile, count = 3, userId = null) {
  console.log(`📝 Generating ${count} exam questions for:`, profile);

  let enhancedProfile = profile;
  if (userId) {
    enhancedProfile = await personalizeQuestionProfile(profile, userId);
    console.log(`👤 Applied personalization for user ${userId}`);
  }

  const questions = [];

  try {
    // Main question
    const mainQuestion = await generateRealAIQuestion(enhancedProfile);
    const adjustedQuestion = userId
      ? adjustQuestionDifficulty(mainQuestion, enhancedProfile)
      : mainQuestion;

    // LaTeX processing
    if (latexRenderer.needsLatexRendering(adjustedQuestion.questionText)) {
      try {
        const processedQuestion = await latexRenderer.processTextWithLatex(
          adjustedQuestion.questionText
        );
        if (processedQuestion.needsRendering) {
          adjustedQuestion.latexImage = processedQuestion.image;
          adjustedQuestion.hasLatex = true;
        }
      } catch (latexError) {
        console.error("LaTeX rendering error:", latexError);
      }
    }
    if (latexRenderer.needsLatexRendering(adjustedQuestion.solution)) {
      try {
        const processedSolution = await latexRenderer.processTextWithLatex(
          adjustedQuestion.solution
        );
        if (processedSolution.needsRendering) {
          adjustedQuestion.solutionLatexImage = processedSolution.image;
          adjustedQuestion.hasSolutionLatex = true;
        }
      } catch (latexError) {
        console.error("LaTeX solution rendering error:", latexError);
      }
    }

    adjustedQuestion.contentId = generateContentId(
      enhancedProfile.subject,
      enhancedProfile.topic_struggles
    );

    questions.push(adjustedQuestion);

    // Variations
    for (let i = questions.length; i < count; i++) {
      try {
        const variedProfile = {
          ...profile,
          specific_failure: `${profile.specific_failure} (variation ${i})`,
        };

        const question = await generateRealAIQuestion(variedProfile);

        if (latexRenderer.needsLatexRendering(question.questionText)) {
          try {
            const processedQuestion = await latexRenderer.processTextWithLatex(
              question.questionText
            );
            if (processedQuestion.needsRendering) {
              question.latexImage = processedQuestion.image;
              question.hasLatex = true;
            }
          } catch (latexError) {
            console.error("LaTeX rendering error:", latexError);
          }
        }

        if (latexRenderer.needsLatexRendering(question.solution)) {
          try {
            const processedSolution = await latexRenderer.processTextWithLatex(
              question.solution
            );
            if (processedSolution.needsRendering) {
              question.solutionLatexImage = processedSolution.image;
              question.hasSolutionLatex = true;
            }
          } catch (latexError) {
            console.error("LaTeX solution rendering error:", latexError);
          }
        }

        questions.push(question);
      } catch (error) {
        console.error(`Error generating question ${i + 1}:`, error);
        questions.push(generateFallbackQuestion(enhancedProfile));
      }
    }

    if (userId) {
      analyticsModule
        .trackEvent(userId, "exam_questions_generated", {
          subject: enhancedProfile.subject,
          grade: enhancedProfile.grade,
          topic: enhancedProfile.topic_struggles,
          count,
          personalized: true,
          content_id: questions[0].contentId,
        })
        .catch((err) => console.error("Analytics error:", err));
    }
  } catch (error) {
    console.error("Failed to generate any AI questions:", error);
    for (let i = 0; i < count; i++) {
      questions.push(generateFallbackQuestion(enhancedProfile));
    }
  }

  return {
    questions,
    metadata: {
      count: questions.length,
      ai_generated: questions.filter((q) => q.source === "ai").length,
      fallback: questions.filter((q) => q.source !== "ai").length,
      latex_rendered: questions.filter((q) => q.hasLatex || q.hasSolutionLatex)
        .length,
      personalized: enhancedProfile !== profile,
      generated_at: new Date().toISOString(),
      profile: {
        subject: enhancedProfile.subject,
        grade: enhancedProfile.grade,
        topic: enhancedProfile.topic_struggles,
        specific_challenge: enhancedProfile.specific_failure,
      },
    },
  };
}

// Generate a unique content ID
function generateContentId(subject, topic) {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 7);
  const subjectCode = subject ? subject.substring(0, 3).toLowerCase() : "gen";
  const topicCode = topic ? topic.substring(0, 3).toLowerCase() : "gen";
  return `qst_${subjectCode}${topicCode}_${timestamp}${randomPart}`;
}

module.exports = {
  // Core
  generateRealAIQuestion,
  generateFallbackQuestion,
  generateExamQuestions,
  // Helpers (exported for reuse/testing)
  getMathFallbackQuestion,
  getMathLitFallbackQuestion,
  getGeographyFallbackQuestion,
  getPhysicalSciencesFallbackQuestion,
  getLifeSciencesFallbackQuestion,
  getHistoryFallbackQuestion,
  getEconomicsFallbackQuestion,
  getBusinessFallbackQuestion,
  getAccountingFallbackQuestion,
  getEnglishFallbackQuestion,
  getGenericFallbackQuestion,
};
