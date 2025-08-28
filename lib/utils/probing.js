/**
 * Dynamic Probing System
 * GOAT Bot 2.0
 * Updated: 2025-08-23 15:21:03 UTC
 */

const { SUBJECT_PROBING_DATABASE } = require("../data/subject-database");

// Generate topic-specific probe
function generateTopicSpecificProbe(topic, topicData, attempt) {
  switch (attempt) {
    case 1:
      const examples = topicData.examples.map((ex) => `• **${ex}**`).join("\n");
      return `**${
        topic.charAt(0).toUpperCase() + topic.slice(1)
      } troubles!** What about ${topic} specifically?

${examples}

**What specifically happens** when you try these?`;

    case 2:
      const struggles = topicData.common_struggles
        .map((s) => `• "${s}"`)
        .join("\n");
      return `**Let's narrow down your ${topic} struggle.**

When you see a ${topic} problem, what's your **first reaction**?
${struggles}`;

    case 3:
      return `**Final attempt to understand your ${topic} challenge.**

**Think of the last ${topic} problem you tried.** What exactly made you get stuck?`;

    default:
      return `**Tell me about your ${topic} challenge** - what makes it difficult for you?`;
  }
}

// Hardcoded fallback probe
function generateHardcodedProbe(userResponse, profile, attempt) {
  const topic = profile.topic_struggles || "the topic";

  switch (attempt) {
    case 1:
      return `**${topic} troubles!** What specifically about ${topic}?

**Tell me exactly what happens** when you try to work with ${topic}.`;

    case 2:
      return `**Let's get more specific about ${topic}.**

When you see a ${topic} problem, what's your **first thought**? Do you:
• Know what to do but get confused halfway?
• Feel completely lost where to start?
• Have a method but it doesn't work?`;

    default:
      return `**Tell me about your ${topic} challenge** - what makes it difficult for you?`;
  }
}

// Generate targeted probe dynamically
async function generateDynamicTargetedProbe(userResponse, profile, attempt) {
  const subject = profile.subject || "Mathematics";
  const topic = profile.topic_struggles?.toLowerCase() || "general";

  console.log(
    `🔄 Dynamic probing: ${subject} -> ${topic} (attempt ${attempt})`
  );

  const subjectData = SUBJECT_PROBING_DATABASE[subject];
  if (subjectData) {
    // Look for exact topic match
    const topicData = subjectData[topic];
    if (topicData) {
      console.log(`✅ Found exact topic match: ${topic}`);
      return generateTopicSpecificProbe(topic, topicData, attempt);
    }

    // Look for partial topic matches
    const partialMatch = Object.keys(subjectData).find(
      (key) => topic.includes(key) || key.includes(topic)
    );
    if (partialMatch) {
      console.log(`✅ Found partial topic match: ${partialMatch} for ${topic}`);
      return generateTopicSpecificProbe(
        partialMatch,
        subjectData[partialMatch],
        attempt
      );
    }

    // No specific topic found, but subject exists - use general subject probing
    console.log(
      `⚠️ No topic match for ${topic}, using general ${subject} probing`
    );
    const generalTopicKeys = Object.keys(subjectData);
    if (generalTopicKeys.length > 0) {
      const generalExamples = generalTopicKeys
        .slice(0, 4)
        .map((key) => `**${key.charAt(0).toUpperCase() + key.slice(1)}**`)
        .join(", ");

      if (attempt === 1) {
        return `**${
          topic.charAt(0).toUpperCase() + topic.slice(1)
        } troubles!** What about ${topic} specifically?

Common ${subject} areas include: ${generalExamples}

**What specifically happens** when you try to work with ${topic}?`;
      }
    }
  }

  // Fallback to hardcoded approach
  console.log(
    `⚠️ No subject data found for ${subject}, using hardcoded fallback`
  );
  return generateHardcodedProbe(userResponse, profile, attempt);
}

module.exports = {
  generateDynamicTargetedProbe,
  generateTopicSpecificProbe,
  generateHardcodedProbe,
};

