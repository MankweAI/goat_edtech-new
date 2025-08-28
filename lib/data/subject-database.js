/**
 * Subject Knowledge Database + CAPS Taxonomy (Grades 8–11)
 * GOAT Bot 2.0
 * Updated: 2025-08-28 13:45:00 UTC
 * Developer: DithetoMokgabudi
 *
 * What changed:
 * - Added CAPS_TAXONOMY with Subjects -> Grades -> Topics -> Sub-topics
 * - New helpers: getCapsTopics(subject, grade), getCapsSubtopics(subject, grade, topic)
 * - Existing SUBJECT_PROBING_DATABASE retained (examples/diagnostics fallback)
 */

const { CAPS_TAXONOMY } = require("./caps-taxonomy");

// Subject availability status (unchanged)
const SUBJECT_STATUS = {
  MATHEMATICS: {
    available: true,
    name: "Mathematics",
    alias: ["math", "maths", "mathematics"],
  },
  MATHEMATICAL_LITERACY: {
    available: true,
    name: "Mathematical Literacy",
    alias: ["maths lit", "math lit", "mathematical literacy", "mlit"],
  },
  PHYSICAL_SCIENCES: {
    available: true,
    name: "Physical Sciences",
    alias: ["physics", "physical", "chemistry", "physical sciences", "science"],
  },
  LIFE_SCIENCES: {
    available: true,
    name: "Life Sciences",
    alias: ["biology", "life", "life sciences"],
  },
  ENGLISH: {
    available: true,
    name: "English",
    alias: ["english", "english home", "english fal"],
  },
  GEOGRAPHY: {
    available: true,
    name: "Geography",
    alias: ["geography", "geo", "geog"],
  },
  HISTORY: {
    available: true,
    name: "History",
    alias: ["history", "hist"],
  },
  ECONOMICS: {
    available: true,
    name: "Economics",
    alias: ["economics", "eco", "econ"],
  },
  ACCOUNTING: {
    available: true,
    name: "Accounting",
    alias: ["accounting", "acc"],
  },
  BUSINESS_STUDIES: {
    available: true,
    name: "Business Studies",
    alias: ["business", "business studies", "bs"],
  },
};

// Existing probing DB (kept for examples/diagnostics fallback)
const SUBJECT_PROBING_DATABASE = {
  // Mathematics only (retained)
  Mathematics: {
    algebra: {
      examples: [
        "Solving equations (like 2x + 5 = 15)",
        "Factoring expressions (like x² + 5x + 6)",
        "Simplifying expressions (like 3x + 2x)",
        "Substitution (plugging numbers into formulas)",
      ],
      common_struggles: [
        "I don't know which method to use",
        "I get confused with the steps",
        "I make calculation mistakes",
        "I don't understand what X means",
      ],
      diagnostic_question: {
        questionText:
          "Solve for x: 2x + 7 = 19\n\nShow all your working steps.",
        solution:
          "**Step 1:** Subtract 7 from both sides\n2x = 12\n\n**Step 2:** Divide both sides by 2\nx = 6\n\n**Therefore:** x = 6",
        purpose: "Basic equation solving",
      },
    },
    geometry: {
      examples: [
        "Circle theorems",
        "Triangle properties",
        "Euclidean geometry proofs",
        "Coordinate geometry",
      ],
      common_struggles: [
        "I can't visualize the shapes",
        "I don't know which theorem to apply",
        "I struggle with proofs",
        "I confuse different properties",
      ],
      diagnostic_question: {
        questionText:
          "In a circle with center O, AB is a diameter. If point C lies on the circle, prove that angle ACB is 90°.",
        solution:
          "**Given:** AB is a diameter of the circle with center O\nPoint C lies on the circle\n\n**To Prove:** Angle ACB = 90°\n\n**Proof:**\nOA = OC = OB (radii of the circle)\nTriangle AOC is isosceles (two sides equal)\nSimilarly, triangle BOC is isosceles\nIn triangle AOC: angle OAC = angle OCA\nIn triangle BOC: angle OBC = angle OCB\nAngle ACB = angle OCA + angle OCB\nAngle ACB = angle OAC + angle OBC\nIn triangle AOB, angles OAB + OBA + AOB = 180° (angle sum in triangle)\nSince AB is a diameter, angle AOB = 180°\nTherefore, angles OAB + OBA = 0°\nTherefore, angle ACB = 90°",
        purpose: "Circle theorem application",
      },
    },
    trigonometry: {
      examples: [
        "Using sin, cos, and tan",
        "Solving for angles in triangles",
        "Using the sine and cosine rules",
        "Graphing trigonometric functions",
      ],
      common_struggles: [
        "I forget which ratio to use",
        "I struggle with the unit circle",
        "The formulas confuse me",
        "I can't solve equations with trig functions",
      ],
      diagnostic_question: {
        questionText:
          "Find all solutions to the equation sin(x) = 0.5 for 0° ≤ x < 360°.",
        solution:
          "**Step 1:** We know that sin(x) = 0.5 means x = 30° or x = 150° in the first period\n\n**Step 2:** For the range 0° ≤ x < 360°, we need to find all solutions\nsin(x) = sin(x + 360°)\nSo, x = 30° or x = 150° or x = 30° + 360° or x = 150° + 360°\n\n**Step 3:** Filtering values in our range:\nx = 30° or x = 150° or x = 390° or x = 510°\n\n**Step 4:** Only keeping values in range 0° ≤ x < 360°:\nx = 30° or x = 150°\n\n**Therefore:** x = 30° or x = 150°",
        purpose: "Solving trigonometric equations",
      },
    },
    functions: {
      examples: [
        "Graphing linear functions",
        "Parabolas and other functions",
        "Finding domain and range",
        "Transformations of functions",
      ],
      common_struggles: [
        "I don't know how to sketch the graph",
        "I can't find intercepts",
        "I struggle with transformations",
        "I don't understand domain and range",
      ],
      diagnostic_question: {
        questionText:
          "Sketch the graph of f(x) = x² - 4 and show all key points.",
        solution:
          "**Step 1:** Identify the parent function: f(x) = x²\n\n**Step 2:** Identify the transformation: Shifted down by 4 units\n\n**Step 3:** Find key points:\nVertex: (0, -4) [Substituting x = 0 into f(x) = x² - 4]\nY-intercept: -4 [When x = 0, f(0) = -4]\nX-intercepts: Set f(x) = 0\nx² - 4 = 0\nx² = 4\nx = ±2\nSo x = 2 or x = -2\n\n**Step 4:** Draw the parabola through these points opening upward with vertex at (0, -4).",
        purpose: "Function transformation",
      },
    },
  },
  // Other subjects optional here (use CAPS_TAXONOMY for menus)
};

// Subject availability checker (unchanged)
function checkSubjectAvailability(subjectInput) {
  const input = (subjectInput || "").toLowerCase();
  for (const [, subject] of Object.entries(SUBJECT_STATUS)) {
    for (const alias of subject.alias) {
      if (input.includes(alias)) {
        return {
          detected: subject.name,
          available: subject.available,
          coming_soon: subject.coming_soon || false,
          key: subject.name.toUpperCase().replace(/\s+/g, "_"),
        };
      }
    }
  }
  return {
    detected: "Mathematics",
    available: true,
    coming_soon: false,
    key: "MATHEMATICS",
  };
}

/**
 * CAPS helpers
 */
function normalizeGrade(grade) {
  const g = parseInt(grade, 10);
  if (!Number.isFinite(g)) return null;
  return Math.min(11, Math.max(8, g));
}

function getCapsTopics(subject, grade) {
  const g = normalizeGrade(grade);
  const subj = CAPS_TAXONOMY[subject];
  if (!subj || !g || !subj[g]) return [];
  const topics = subj[g].topics || {};
  return Object.keys(topics);
}

function getCapsSubtopics(subject, grade, topicNameOrKey) {
  const g = normalizeGrade(grade);
  const subj = CAPS_TAXONOMY[subject];
  if (!subj || !g || !subj[g]) return [];
  const topics = subj[g].topics || {};

  // Try exact match
  if (topics[topicNameOrKey]) return topics[topicNameOrKey];

  // Case-insensitive/partial match
  const key = Object.keys(topics).find(
    (k) => k.toLowerCase() === String(topicNameOrKey || "").toLowerCase()
  );
  if (key) return topics[key];

  // Fuzzy startsWith fallback
  const fuzzy = Object.keys(topics).find((k) =>
    k.toLowerCase().startsWith(String(topicNameOrKey || "").toLowerCase())
  );
  if (fuzzy) return topics[fuzzy];

  return [];
}

module.exports = {
  CAPS_TAXONOMY,
  SUBJECT_STATUS,
  SUBJECT_PROBING_DATABASE,
  checkSubjectAvailability,
  getCapsTopics,
  getCapsSubtopics,
};
