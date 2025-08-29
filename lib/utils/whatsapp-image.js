/**
 * WhatsApp Image Handling Service - FIXED MANYCHAT INTEGRATION
 * GOAT Bot 2.0
 * Updated: 2025-08-29 15:26:00 UTC
 * Developer: DithetoMokgabudi
 */

const axios = require("axios");
const crypto = require("crypto");

// Track recently sent images to avoid duplication
const recentlySentImages = new Map();
const MAX_RECENT_TRACKING = 50;
const RECENT_EXPIRY = 5 * 60 * 1000; // 5 minutes

// ManyChat API configuration - CORRECTED ENDPOINTS
const MANYCHAT_TIMEOUT = 10000; // 10 seconds timeout

/**
 * Track sent image to prevent duplication
 */
function trackSentImage(userId, imageId) {
  const key = `${userId}:${imageId}`;
  recentlySentImages.set(key, Date.now());

  // Clean up old entries
  if (recentlySentImages.size > MAX_RECENT_TRACKING) {
    const now = Date.now();
    for (const [k, time] of recentlySentImages.entries()) {
      if (now - time > RECENT_EXPIRY) {
        recentlySentImages.delete(k);
      }
    }
  }
}

/**
 * Check if image was recently sent
 */
function wasImageRecentlySent(userId, imageId) {
  const key = `${userId}:${imageId}`;
  const sentTime = recentlySentImages.get(key);

  if (!sentTime) return false;
  return Date.now() - sentTime < RECENT_EXPIRY;
}

/**
 * Send image through ManyChat API with CORRECTED endpoints
 */
async function sendImageViaManyChat(userId, imageData, caption = "") {
  if (!process.env.MANYCHAT_API_TOKEN) {
    console.error("❌ MANYCHAT_API_TOKEN not configured");
    return { success: false, error: "MANYCHAT_API_TOKEN not configured" };
  }

  const imageId = crypto.createHash("md5").update(imageData.data).digest("hex");

  // Check for recent send
  if (wasImageRecentlySent(userId, imageId)) {
    console.log(
      `📸 Image ${imageId.substring(0, 8)} already sent recently to ${userId}`
    );
    return { success: true, cached: true };
  }

  try {
    console.log(`📸 Attempting to send image via ManyChat to user ${userId}`);

    const imageUrl = `data:image/${imageData.format};base64,${imageData.data}`;

    // ✅ FIX: Construct the correct payload structure for the `sendContent` endpoint.
    const payload = {
      subscriber_id: userId,
      data: {
        version: "v2",
        content: {
          messages: [
            {
              type: "image",
              url: imageUrl,
              caption: caption || undefined, // Use undefined to omit empty captions
            },
          ],
        },
      },
      message_tag: "NON_PROMOTIONAL_SUBSCRIPTION", // Use an appropriate tag
    };

    const endpoint = "https://api.manychat.com/fb/sending/sendContent";

    console.log(`📡 ManyChat API call to: ${endpoint}`);
    console.log(`📋 Payload: ${JSON.stringify(payload, null, 2)}`); // Log the payload for debugging

    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${process.env.MANYCHAT_API_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": "GOAT-Bot/2.0",
      },
      timeout: MANYCHAT_TIMEOUT,
    });

    console.log(`📩 ManyChat response: ${response.status} - Success`);

    // Success - track the sent image
    trackSentImage(userId, imageId);

    return {
      success: true,
      endpoint: endpoint,
      status: response.status,
      data: response.data,
      imageId: imageId,
    };
  } catch (error) {
    console.error(
      "❌ ManyChat API Error:",
      error.response?.status,
      error.response?.statusText
    );
    // Log the detailed error response from ManyChat
    if (error.response?.data) {
      console.error(
        "❌ Error details:",
        JSON.stringify(error.response.data, null, 2)
      );
    } else {
      console.error("❌ Error message:", error.message);
    }

    // Return failure gracefully to avoid breaking user flow
    return {
      success: false,
      error: error.response?.data || error.message,
      imageId: imageId,
    };
  }
}

/**
 * Fallback: Generate data URI for direct display
 */
function generateImageDataUri(imageData) {
  return `data:image/${imageData.format};base64,${imageData.data}`;
}

/**
 * Enhanced format response with better error handling
 */
async function formatWithLatexImage(text, latexImage, userId = null) {
  if (!latexImage) {
    return { message: text, status: "success", echo: text };
  }

  const imageId = crypto
    .createHash("md5")
    .update(latexImage.data)
    .digest("hex");

  // Check if we recently sent this image to this user
  if (userId && wasImageRecentlySent(userId, imageId)) {
    return {
      message: `${text}\n\n[Mathematical expression shown in previous image]`,
      status: "success",
      echo: `${text}\n\n[Mathematical expression shown in previous image]`,
      reusedImage: true,
    };
  }

  // Attempt to send image immediately
  if (userId && process.env.MANYCHAT_API_TOKEN) {
    try {
      const sendResult = await sendImageViaManyChat(
        userId,
        latexImage,
        "Mathematical equation"
      );

      if (sendResult.success) {
        return {
          message: `${text}\n\n[Mathematical expression sent as image]`,
          status: "success",
          echo: `${text}\n\n[Mathematical expression sent as image]`,
          imageSent: true,
          imageId: imageId,
        };
      } else {
        console.log(`📸 Image send failed, falling back to text indicator`);
        return {
          message: `${text}\n\n[Mathematical expression detected - sending as text]`,
          status: "success",
          echo: `${text}\n\n[Mathematical expression detected - sending as text]`,
          imageFailed: true,
        };
      }
    } catch (error) {
      console.error("❌ Image send error:", error);
      return {
        message: `${text}\n\n[Mathematical expression available]`,
        status: "success",
        echo: `${text}\n\n[Mathematical expression available]`,
        imageError: true,
      };
    }
  }

  // No user ID or token - return text-only version
  return {
    message: `${text}\n\n[Mathematical expression would be sent as image]`,
    status: "success",
    echo: `${text}\n\n[Mathematical expression would be sent as image]`,
    needsImageSend: true,
    imageId,
  };
}

module.exports = {
  sendImageViaManyChat,
  formatWithLatexImage,
  trackSentImage,
  wasImageRecentlySent,
  generateImageDataUri,
};
