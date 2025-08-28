/**
 * Command Processing
 * GOAT Bot 2.0
 * Updated: 2025-08-24 12:40:00 UTC
 */

const { GOAT_COMMANDS, AI_INTEL_STATES, MANYCHAT_STATES } = require("./state");

/**
 * Recursively find the first plausible image URL in an object
 */
function findFirstImageUrl(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 6) return null;

  const imageUrlRegex =
    /(https?:\/\/[^\s"']+\.(?:png|jpe?g|gif|bmp|webp))(?:\?[^\s"']*)?/i;

  // Direct string candidates
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      // Obvious image URL fields commonly used by ManyChat and channels
      const likelyKeys = [
        "image_url",
        "imageUrl",
        "media_url",
        "attachment_url",
        "last_received_attachment_url",
        "file_url",
        "url",
        "original_url",
        "link",
      ];
      if (likelyKeys.includes(key) && imageUrlRegex.test(value)) {
        return value;
      }
      if (imageUrlRegex.test(value)) return value;
      // Data URL form
      if (value.startsWith("data:image/") && value.includes(";base64,")) {
        return value;
      }
    }
  }

  // Array-based attachments
  if (Array.isArray(obj.attachments) && obj.attachments.length > 0) {
    for (const a of obj.attachments) {
      if (typeof a === "string") {
        if (imageUrlRegex.test(a)) return a;
        if (a.startsWith("data:image/") && a.includes(";base64,")) return a;
      } else if (a && typeof a === "object") {
        // Common patterns: { type:'image', url:'...' } or { payload: { url: '...' } }
        if (typeof a.url === "string" && imageUrlRegex.test(a.url)) {
          return a.url;
        }
        if (a.payload && typeof a.payload.url === "string") {
          if (imageUrlRegex.test(a.payload.url)) return a.payload.url;
        }
        if (
          typeof a.original_url === "string" &&
          imageUrlRegex.test(a.original_url)
        ) {
          return a.original_url;
        }
      }
    }
  }

  // Channel-specific nested message forms (e.g., WhatsApp/Messenger)
  if (obj.message && typeof obj.message === "object") {
    const fromNested = findFirstImageUrl(obj.message, depth + 1);
    if (fromNested) return fromNested;

    // WhatsApp via ManyChat sometimes: message.type === 'image', message.image.link
    if (
      obj.message.type === "image" &&
      obj.message.image &&
      typeof obj.message.image.link === "string"
    ) {
      return obj.message.image.link;
    }
  }

  // Generic deep search
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = findFirstImageUrl(value, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

function extractImageData(req) {
  // Accept direct base64 field or data URI
  const maybeBase64 =
    req.body.imageData ||
    req.body.image_base64 ||
    req.body.image ||
    req.body.data ||
    null;

  if (typeof maybeBase64 === "string") {
    const dataUriPrefix = "data:image/";
    if (
      maybeBase64.startsWith(dataUriPrefix) &&
      maybeBase64.includes(";base64,")
    ) {
      const base64 = maybeBase64.split(";base64,")[1];
      if (base64 && base64.length > 50) {
        console.log(
          `📸 Found data URI image (${(base64.length / 1024).toFixed(2)}KB)`
        );
        return { type: "direct", data: base64 };
      }
    } else {
      // Heuristic: treat as base64 if it decodes without throwing and has decent length
      try {
        const buf = Buffer.from(maybeBase64, "base64");
        if (buf && buf.length > 100) {
          console.log(
            `📸 Found direct base64 image (${(
              maybeBase64.length / 1024
            ).toFixed(2)}KB)`
          );
          return { type: "direct", data: maybeBase64 };
        }
      } catch (_) {
        // Not base64, ignore and continue
      }
    }
  }

  // Messenger path (existing)
  const messengerUrl =
    (req.body.message &&
      req.body.message.attachments &&
      req.body.message.attachments[0] &&
      req.body.message.attachments[0].payload &&
      req.body.message.attachments[0].payload.url) ||
    null;

  // ManyChat/Generic URL fields
  const directUrl =
    messengerUrl ||
    req.body.last_received_attachment_url ||
    req.body.attachment_url ||
    req.body.image_url ||
    req.body.imageUrl ||
    (req.body.media && req.body.media.url) ||
    (req.body.payload && req.body.payload.url) ||
    (req.body.message && req.body.message.attachment_url) ||
    null;

  if (directUrl && typeof directUrl === "string") {
    console.log(`📸 Found image URL (direct): ${directUrl.substring(0, 120)}`);
    return { type: "url", data: directUrl };
  }

  // Deep recursive search for URL in ManyChat payloads
  const foundUrl = findFirstImageUrl(req.body);
  if (foundUrl) {
    console.log(
      `📸 Found image URL (recursive): ${foundUrl.substring(0, 120)}`
    );
    // Convert data URI to direct base64 form if needed
    if (foundUrl.startsWith("data:image/") && foundUrl.includes(";base64,")) {
      const base64 = foundUrl.split(";base64,")[1];
      return { type: "direct", data: base64 };
    }
    return { type: "url", data: foundUrl };
  }

  // Enhanced flag detection - check for any property that might indicate an image
  console.log(`📸 Deep request inspection for image data`);
  const hasImageIndicators =
    req.body.has_image === true ||
    req.body.has_attachment === true ||
    req.body.has_media === true ||
    req.body.image === true ||
    req.body.type === "image" ||
    (req.body.message && req.body.message.has_attachment) ||
    (req.body.message && req.body.message.type === "image") ||
    (req.body.message &&
      req.body.message.attachments &&
      req.body.message.attachments.length > 0) ||
    (req.body.event_type &&
      (req.body.event_type.includes("image") ||
        req.body.event_type.includes("media") ||
        req.body.event_type.includes("attachment")));

  if (hasImageIndicators) {
    console.log(
      `📸 Image indicator detected - routing to homework handler with pending state`
    );
    return { type: "pending", data: null };
  }

  console.log(`📸 No image found in request`);
  return null;
}

// Helper function to sanitize the object before logging (remove potentially sensitive data)
function sanitizeObject(obj) {
  if (!obj) return obj;
  const sanitized = { ...obj };

  // Remove potentially sensitive fields
  const sensitiveFields = [
    "token",
    "password",
    "api_key",
    "secret",
    "authorization",
    "auth",
  ];
  for (const key in sanitized) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object") {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }

  return sanitized;
}

// Enhanced command parser
function parseGoatCommand(message, userContext, attachments = {}) {
  // Handle undefined message
  const text = message?.toLowerCase().trim() || "";

  // Extract image data with enhanced logging
 const imageInfo = attachments?.imageInfo || null;
 const attachmentImageData = imageInfo?.data || null;


      if (
        !message ||
        /\bstart\b/.test(text) ||
        /\bhi\b/.test(text) ||
        /\bhello\b/.test(text)
      ) {
        // Only trigger welcome for specific welcome commands
        // DO NOT trigger for "test" which is a valid exam prep response
        if (
          !text.includes("test") ||
          (text === "test" &&
            userContext.current_menu !== "exam_prep_conversation")
        ) {
          return { type: GOAT_COMMANDS.WELCOME };
        }
      }

      if (imageInfo) {
        console.log(
          `📸 Command parser received image of type: ${imageInfo.type}`
        );
      }

  // Check previous menu state from ManyChat tracking
  const subscriberId = userContext.id || "unknown";
  const lastMenu = MANYCHAT_STATES.lastMenu.get(subscriberId);

  // If user was previously in homework_help menu, maintain that state
  if (lastMenu && lastMenu.menu === "homework_help") {
    console.log(`🔄 Maintaining homework_help state for user: ${subscriberId}`);
    userContext.current_menu = "homework_help";
  }

  // New: If an image is present at any time, route to homework upload
  if (imageInfo && (imageInfo.type === "direct" || imageInfo.type === "url")) {
    return {
      type: GOAT_COMMANDS.HOMEWORK_UPLOAD,
      imageData: imageInfo.type === "direct" ? attachmentImageData : null,
      imageUrl: imageInfo.type === "url" ? attachmentImageData : null,
      imageInfo,
      original_text: message || "",
      current_menu: "homework_help",
      hasImage: true,
    };
  }

  // Handle homework-specific states with safer checks
  if (
    userContext.current_menu === "homework_help" ||
    userContext.current_menu === "homework_active"
  ) {
    // More robust image detection
    if (attachmentImageData) {
      console.log(
        `📸 Image data detected in homework mode for user: ${
          userContext.id || "unknown"
        }`
      );
      return {
        type: GOAT_COMMANDS.HOMEWORK_UPLOAD,
        imageData: attachmentImageData,
        imageInfo: imageInfo,
        original_text: message || "",
        current_menu: "homework_help", // Explicitly set menu
        hasImage: true, // Flag for clearer processing
      };
    } else {
      return {
        type: GOAT_COMMANDS.HOMEWORK_HELP,
        text: message || "",
        current_menu: "homework_help", // Explicitly set menu
      };
    }
  }

  if (
    /^[1234]$/.test(text) &&
    userContext.current_menu === "exam_prep_conversation"
  ) {
    return {
      type: GOAT_COMMANDS.NUMBERED_MENU_COMMAND,
      option: parseInt(text),
      original_text: message,
    };
  }

  if (/^[123]$/.test(text) && userContext.current_menu === "welcome") {
    return {
      type: GOAT_COMMANDS.MENU_CHOICE,
      choice: parseInt(text),
      action:
        text === "1"
          ? "exam_prep"
          : text === "2"
          ? "homework_help"
          : "memory_hacks",
    };
  }

  // Handle A, B, C options for alternative paths
  if (
    /^[abc]$/i.test(text) &&
    userContext.ai_intel_state === AI_INTEL_STATES.ALTERNATIVE_PATHS
  ) {
    return {
      type: GOAT_COMMANDS.EXAM_PREP_CONVERSATION,
      text: message,
      alternative_choice: text.toUpperCase(),
    };
  }

  // Define menu commands
  const MENU_COMMANDS = {
    CONTINUE: "continue",
    QUESTION: "question",
    SOLUTION: "solution",
    SWITCH: "switch",
    MENU: "menu",
    NEXT: "next",
  };

  if (Object.values(MENU_COMMANDS).includes(text)) {
    return {
      type: GOAT_COMMANDS.FIXED_MENU_COMMAND,
      command: text,
      original_text: message,
    };
  }

  // FIX: Use word boundaries to avoid matching 'hi' inside words like 'which'
  if (
    !message ||
    /\bstart\b/.test(text) ||
    /\bhi\b/.test(text) ||
    /\bhello\b/.test(text)
  ) {
    return { type: GOAT_COMMANDS.WELCOME };
  }

  const currentMenu = userContext.current_menu || "welcome";

  switch (currentMenu) {
    case "exam_prep_conversation":
      return { type: GOAT_COMMANDS.EXAM_PREP_CONVERSATION, text: message };
    case "homework_active":
      return { type: GOAT_COMMANDS.HOMEWORK_HELP, text: message };
    case "memory_hacks_active":
      return { type: GOAT_COMMANDS.MEMORY_HACKS, text: message };
    default:
      return { type: GOAT_COMMANDS.WELCOME };
  }
}

module.exports = {
  extractImageData,
  parseGoatCommand,
};
