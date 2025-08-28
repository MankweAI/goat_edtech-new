/**
 * Homework Answering Engine (Conversational)
 * GOAT Bot 2.0
 * Updated: 2025-08-24 13:18:00 UTC
 * Developer: DithetoMokgabudi
 */

const OpenAI = require("openai");
const { questionDetector } = require("../../utils/question-detector");

// Initialize OpenAI (optional)
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log("🧠 OpenAI initialized for homework answering");
  } else {
    console.log("⚠️ No OpenAI key; using fallback answering");
  }
} catch (e) {
  console.error("❌ OpenAI init failed for answering:", e);
  openai = null;
}

// Simple follow-up intent detector
function detectFollowUpIntent(text = "") {
  const t = text.toLowerCase().trim();

  if (!t) return "unknown";
  if (/(don't|dont)\s+understand|confused|lost|not\s+sure|help/.test(t))
    return "confused";
  if (/explain|more detail|further|expand|break.*down|simpler/.test(t))
    return "explain_more";
  if (/example|eg|e\.g\./.test(t)) return "example";
  if (/practice|problem|question|try one|exercise/.test(t)) return "practice";
  if (/steps?|how to|procedure|method/.test(t)) return "steps";
  if (/definition|define|what is/.test(t)) return "definition";
  if (/graph|plot|visual/.test(t)) return "graph";

  return "unknown";
}

// Basic solver: ax + b = c (kept for math convenience)
function trySolveLinearEquation(text) {
  const t = text.replace(/\s+/g, "");
  const m = t.match(/^([+\-]?\d*)x([+\-]\d+)?=([+\-]?\d+)$/i);
  if (!m) return null;
  let aStr = m[1];
  if (aStr === "" || aStr === "+") aStr = "1";
  if (aStr === "-") aStr = "-1";
  const a = parseFloat(aStr);
  const b = m[2] ? parseFloat(m[2]) : 0;
  const c = parseFloat(m[3]);
  if (!isFinite(a) || !isFinite(b) || !isFinite(c) || a === 0) return null;

  const x = (c - b) / a;
  return {
    a,
    b,
    c,
    x,
    steps: [
      `Move constants: ${a}x ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`} = ${c}`,
      `${a}x = ${c} ${b >= 0 ? `- ${b}` : `+ ${Math.abs(b)}`} = ${c - b}`,
      `x = (${c - b}) ÷ ${a} = ${x}`,
    ],
  };
}

// Progressive fallback responses based on classification, intent, and depth
function fallbackAnswerForClassificationDepth(
  classification,
  baseQuestion,
  followUpIntent,
  depth = 0
) {
  const qLower = String(baseQuestion || "").toLowerCase();

  // Ensure depth stays in 0..3
  const d = Math.max(0, Math.min(3, depth));

  // Calculus: derivatives
  if (
    classification === "calculus_derivative" ||
    qLower.includes("derivative")
  ) {
    // Depth-based progression
    const phases = [
      // 0: Core concept
      `📘 Derivatives measure how fast a function changes at a point (the slope of its tangent).
• Notation: f'(x) or d/dx [f(x)]
• Idea: If y = f(x), derivative tells how y changes when x changes a little.

Want a simple example or a practice problem?`,
      // 1: Everyday analogy + simplest example
      `📘 Think of speed: Your car’s speedometer shows how position changes each second — that’s a derivative.
• Rule: d/dx[x^n] = n·x^(n−1)
• Example: d/dx[x^3] = 3x^2

Shall I give a step-by-step example with numbers?`,
      // 2: Step-by-step example
      `🧮 Step-by-step example
Question: Find the derivative of y = 3x^2 − 2x + 1
• d/dx[3x^2] = 6x
• d/dx[−2x] = −2
• d/dx[1] = 0
⇒ y' = 6x − 2

At x = 2, y' = 6(2) − 2 = 10 (instantaneous rate of change).
Want another example or a practice question?`,
      // 3: Slightly deeper rules + quick practice
      `📘 Going deeper (product/chain rule glimpse)
• Product: d/dx[uv] = u'v + uv'
• Chain: d/dx[f(g(x))] = f'(g(x))·g'(x)

Quick practice: Differentiate y = 5x^3 − 4x. What is y'?
(Answer after you try: y' = 15x^2 − 4)

Want me to generate a custom practice problem?`,
    ];

    // Adjust by follow-up intent
    if (followUpIntent === "example") return phases[2];
    if (followUpIntent === "practice") return phases[3];
    if (followUpIntent === "steps") return phases[2];
    if (followUpIntent === "explain_more" || followUpIntent === "confused")
      return phases[Math.min(3, d)];

    return phases[d];
  }

  // Linear equations (quick utility if detected)
  if (classification === "linear_equation") {
    const solved = trySolveLinearEquation(qLower);
    if (solved) {
      return `🧮 Solve for x: ${baseQuestion}
${solved.steps.map((s, i) => `**Step ${i + 1}:** ${s}`).join("\n")}
✅ Therefore: x = ${solved.x}
Want a similar practice question?`;
    }

    return `🧮 Strategy for linear equations:
• Keep x on one side, numbers on the other
• Do the same operation to both sides
• Isolate x step by step

Example: 2x − 3 = 7 → 2x = 10 → x = 5
Want me to solve your exact one step-by-step?`;
  }

  // Biology/general concept definitions
  if (
    classification === "biology_concept" ||
    classification === "definition" ||
    qLower.startsWith("what is")
  ) {
    const variants = [
      `📘 Simple definition:
${baseQuestion}
• Core idea in syllabus terms
• One-sentence meaning with where it’s used
Want an everyday example or quick diagram description?`,
      `📘 Everyday example:
Connect ${baseQuestion} to a familiar scenario. Then link it back to the textbook term.
Want a short practice question to check understanding?`,
      `📘 Step-by-step understanding:
1) Name it
2) Purpose/role
3) Inputs/outputs (if process)
4) Real-world link
Want me to generate a 1-mark definition question?`,
      `📘 Deeper details:
Common misconceptions and how to avoid them.
Want graded practice or another example?`,
    ];
    if (followUpIntent === "example") return variants[1];
    if (followUpIntent === "practice") return variants[2];
    if (followUpIntent === "explain_more" || followUpIntent === "confused")
      return variants[Math.min(3, d)];
    return variants[d];
  }

  // Generic academic fallback
  const generic = [
    `Here’s a concise explanation of: ${baseQuestion}
• Identify what it is
• Where it’s used
• One small example
Would you like a practice problem or a worked example?`,
    `Let’s ground it with an example based on: ${baseQuestion}
• Example: [short, relatable scenario]
Want a short practice question?`,
    `Quick steps to apply this:
1) Identify data
2) Select rule/method
3) Apply carefully
4) Check result
Want me to craft a practice question?`,
    `Common mistakes to avoid and a quick check:
• Mistake A → Fix
• Mistake B → Fix
Want another example or graded practice?`,
  ];
  if (followUpIntent === "example") return generic[1];
  if (followUpIntent === "practice") return generic[2];
  if (followUpIntent === "steps") return generic[2];
  if (followUpIntent === "explain_more" || followUpIntent === "confused")
    return generic[Math.min(3, d)];
  return generic[d];
}

function systemPrompt() {
  return `You are The GOAT: a calm, concise WhatsApp tutor for SA students (Grades 8–12).
Rules:
- Answer directly and simply (<= 120 words).
- If user is confused, make it simpler; add one concrete example.
- For problems, show short step-by-step.
- Always end with one small follow-up option (practice? another example?).`;
}

async function generateAIAnswer(question, conversation = [], meta = {}) {
  if (!openai) return null;

  const depth = meta.depth ?? 0;
  const intent = meta.intent || "unknown";
  const classification = meta.classification || "general";

  const messages = [
    { role: "system", content: systemPrompt() },
    {
      role: "system",
      content: `Context: classification=${classification}, depth=${depth}, intent=${intent}. If intent indicates confusion/explain_more, simplify and add a concrete example.`,
    },
    ...conversation.slice(-6),
    { role: "user", content: question },
  ];

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      max_tokens: 350,
      temperature: 0.3,
    });

    return (resp.choices?.[0]?.message?.content || "").trim();
  } catch (e) {
    console.error("AI answering failed:", e.message);
    return null;
  }
}

/**
 * Generate a conversational answer to a homework question or follow-up.
 * Uses selectedQuestion from context as the base topic; the latest user text is a follow-up signal.
 */
async function generateHomeworkAnswer(latestUserText, userContext = {}) {
  const baseQuestion =
    userContext?.selectedQuestion?.text || String(latestUserText || "");
  const classification =
    userContext?.selectedQuestion?.type ||
    questionDetector.classifyQuestion(baseQuestion);

  const intent = detectFollowUpIntent(String(latestUserText || ""));
  const depth = userContext?.explain_depth || 0;
  const conversation = userContext?.conversation || [];

  // Prefer AI if available
  const ai = await generateAIAnswer(baseQuestion, conversation, {
    depth,
    intent,
    classification,
  });
  if (ai) {
    return { answer: ai, classification, source: "ai" };
  }

  // Fallback – progressive, intent-aware
  const fb = fallbackAnswerForClassificationDepth(
    classification,
    baseQuestion,
    intent,
    depth
  );
  return { answer: fb, classification, source: "fallback" };
}

module.exports = {
  generateHomeworkAnswer,
  detectFollowUpIntent,
  trySolveLinearEquation,
};
