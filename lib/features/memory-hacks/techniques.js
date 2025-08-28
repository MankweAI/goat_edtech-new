/**
 * Memory Techniques System
 * GOAT Bot 2.0
 * Created: 2025-08-23 16:04:32 UTC
 * Developer: DithetoMokgabudi
 */

/**
 * Database of memory techniques organized by subject
 */
const MEMORY_TECHNIQUES = {
  Mathematics: {
    general: [
      {
        name: "Landmark Association",
        description: "Connect mathematical concepts to South African landmarks",
        example:
          "Link the concept of pi (π) to Table Mountain's circular cable car route",
        saContext: true,
      },
      {
        name: "Township Grid Method",
        description:
          "Use mental maps of township layouts to understand coordinate systems",
        example:
          "Remember graphing by visualizing streets in Soweto's grid-like areas",
        saContext: true,
      },
      {
        name: "Safari Sequence",
        description:
          "Remember sequences of operations using a safari journey metaphor",
        example:
          "PEMDAS: Pretoria → Ermelo → Mbombela → Durban → Aliwal North → Springbok",
        saContext: true,
      },
    ],
    algebra: [
      {
        name: "Variable Visualization",
        description: "Picture variables as containers holding different values",
        example: "Imagine x as a baking tin that can hold different amounts",
      },
      {
        name: "Balance Scale Method",
        description:
          "Visualize equations as balance scales that must remain even",
        example:
          "When adding 3 to both sides, picture adding equal weights to a scale",
      },
    ],
    geometry: [
      {
        name: "Drakensberg Dimensions",
        description: "Use the Drakensberg mountain range to remember 3D shapes",
        example:
          "Cathedral Peak for cone, Sentinel Peak for pyramid, Amphitheatre for prism",
        saContext: true,
      },
      {
        name: "Soccer Field Formulas",
        description: "Link geometric formulas to parts of a soccer field",
        example:
          "Rectangle area (length × width) = full field; Circle area (πr²) = center circle",
        saContext: true,
      },
    ],
    trigonometry: [
      {
        name: "SOH-CAH-TOA Safari",
        description: "Remember trig ratios using a safari journey story",
        example:
          "SOH: Simba Observes Hippos, CAH: Cheetahs Attack Hyenas, TOA: Tigers Overtake Antelopes",
        saContext: true,
      },
      {
        name: "Unit Circle Compass",
        description:
          "Map unit circle angles to compass directions around South Africa",
        example:
          "0° = East (Mozambique), 90° = North (Zimbabwe), 180° = West (Atlantic), 270° = South (Antarctica)",
      },
    ],
  },
  "Physical Sciences": {
    physics: [
      {
        name: "Eskom Power Principles",
        description:
          "Connect electricity concepts to South African power infrastructure",
        example:
          "Voltage = water pressure in dam, Current = water flow rate, Resistance = narrow pipes",
        saContext: true,
      },
      {
        name: "Taxi Physics",
        description: "Use minibus taxi experiences to understand Newton's laws",
        example:
          "First law (inertia): passengers lean forward when taxi stops suddenly",
        saContext: true,
      },
    ],
    chemistry: [
      {
        name: "Braai Chemistry",
        description: "Link chemical reactions to cooking processes at a braai",
        example:
          "Combustion = charcoal burning, Maillard reaction = meat browning",
        saContext: true,
      },
      {
        name: "Periodic Table Townships",
        description:
          "Organize the periodic table as neighborhoods with similar properties",
        example:
          "Alkali metals = Soweto (reactive), Noble gases = Sandton (unreactive)",
        saContext: true,
      },
    ],
  },
  English: {
    grammar: [
      {
        name: "Rainbow Nation Grammar",
        description: "Link grammar rules to South Africa's cultural diversity",
        example:
          "Just as SA has 11 official languages, remember the versatile conjunction 'and' can connect 11 different parts of speech",
        saContext: true,
      },
    ],
    literature: [
      {
        name: "Ubuntu Character Analysis",
        description:
          "Apply the Ubuntu philosophy to analyze character motivations",
        example:
          "Understand how a character's decisions affect their community using 'I am because we are'",
        saContext: true,
      },
    ],
  },
};

/**
 * General memory principles applicable to all subjects
 */
const GENERAL_MEMORY_PRINCIPLES = [
  {
    name: "Spaced Repetition",
    description: "Review material at increasing intervals",
    implementation:
      "Study new concepts, then review after 1 day, 3 days, 1 week, etc.",
  },
  {
    name: "Active Recall",
    description: "Test yourself instead of just rereading notes",
    implementation:
      "Cover your notes and try to explain concepts in your own words",
  },
  {
    name: "Visual Mnemonics",
    description: "Create vivid mental images to remember information",
    implementation:
      "Picture a concept interacting with your neighborhood or home",
  },
  {
    name: "Stories and Songs",
    description: "Turn information into narratives or lyrics",
    implementation:
      "Create a South African rhythm or song about mathematical formulas",
  },
  {
    name: "Mind Mapping",
    description:
      "Create visual diagrams showing relationships between concepts",
    implementation:
      "Draw branches connecting related ideas, using colors and images",
  },
];

/**
 * Get memory techniques for a specific subject and topic
 * @param {string} subject - Academic subject
 * @param {string} topic - Specific topic within subject
 * @returns {Object} Memory techniques and principles
 */
function getMemoryTechniques(subject, topic) {
  // Default to Mathematics if subject not found
  const subjectTechniques =
    MEMORY_TECHNIQUES[subject] || MEMORY_TECHNIQUES["Mathematics"];

  // Try to find topic-specific techniques
  let topicTechniques = [];
  if (topic && subjectTechniques[topic.toLowerCase()]) {
    topicTechniques = subjectTechniques[topic.toLowerCase()];
  }

  // Always include general techniques for the subject
  const generalTechniques = subjectTechniques.general || [];

  // Combine and prioritize SA context techniques
  const allTechniques = [...topicTechniques, ...generalTechniques];
  const saTechniques = allTechniques.filter((t) => t.saContext);
  const otherTechniques = allTechniques.filter((t) => !t.saContext);

  // Select principles
  const selectedPrinciples = GENERAL_MEMORY_PRINCIPLES.slice(0, 3);

  return {
    subject,
    topic,
    techniques: {
      sa_context: saTechniques.slice(0, 3), // Up to 3 SA-specific techniques
      general: otherTechniques.slice(0, 2), // Up to 2 general techniques
    },
    principles: selectedPrinciples,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate a formatted memory hack response
 * @param {string} subject - Academic subject
 * @param {string} topic - Specific topic (optional)
 * @returns {string} Formatted memory hack response
 */
function generateMemoryHackResponse(subject, topic) {
  const techniques = getMemoryTechniques(subject, topic);

 let response = `🧠 **Memory Hacks for ${subject}`;
 // Only add colon if topic is provided
 if (topic) response += `: ${topic}`;
 response += "**\n\n";

 // Add SA-context techniques
 if (techniques.techniques.sa_context.length > 0) {
   response += "**🇿🇦 South African Memory Techniques:**\n\n";

   techniques.techniques.sa_context.forEach((technique, index) => {
     response += `**${index + 1}. ${technique.name}**\n${
       technique.description
     }\n`;
     response += `*Example:* ${technique.example}\n\n`;
   });
 }

  // Add general techniques
  if (techniques.techniques.general.length > 0) {
    response += "**📚 General Techniques:**\n\n";

    techniques.techniques.general.forEach((technique, index) => {
      response += `**${index + 1}. ${technique.name}**\n${
        technique.description
      }\n`;
      if (technique.example) {
        response += `*Example:* ${technique.example}\n\n`;
      }
    });
  }

  // Add one key principle
  if (techniques.principles.length > 0) {
    const principle = techniques.principles[0];
    response += `**💡 Key Learning Principle: ${principle.name}**\n`;
    response += `${principle.description}\n`;
    response += `*How to use it:* ${principle.implementation}\n\n`;
  }

  response +=
    "**Remember:** The best memory technique is the one that works for YOU. Try these and adapt them to your personal learning style!";

  return response;
}

module.exports = {
  MEMORY_TECHNIQUES,
  GENERAL_MEMORY_PRINCIPLES,
  getMemoryTechniques,
  generateMemoryHackResponse,
};
