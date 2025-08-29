/**
 * WhatsApp Image Handling Service - PRODUCTION FIX
 * GOAT Bot 2.0
 * Updated: 2025-08-29 15:08:00 UTC
 * Developer: DithetoMokgabudi
 *
 * Fix: Proper ManyChat API endpoint and error handling
 */

const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");

// Track recently sent images to avoid duplication
const recentlySentImages = new Map();
const MAX_RECENT_TRACKING = 50;
const RECENT_EXPIRY = 5 * 60 * 1000; // 5 minutes

// ManyChat API configuration
const MANYCHAT_BASE_URL = "https://api.manychat.com";
const MANYCHAT_TIMEOUT = 8000; // 8 seconds timeout

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
 * Send image through ManyChat API with robust error handling
 */
async function sendImageViaManyChat(userId, imageData, caption = "") {
  if (!process.env.MANYCHAT_API_TOKEN) {
    console.error("❌ MANYCHAT_API_TOKEN not configured");
    throw new Error("MANYCHAT_API_TOKEN not configured");
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

    // Create form data for ManyChat API
    const form = new FormData();
    form.append("subscriber_id", userId);

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData.data, "base64");

    // Determine content type
    const contentType =
      imageData.format === "svg"
        ? "image/svg+xml"
        : `image/${imageData.format}`;
    const filename = `math-equation-${imageId.substring(0, 8)}.${
      imageData.format
    }`;

    // Append image as file
    form.append("file", imageBuffer, {
      filename: filename,
      contentType: contentType,
    });

    if (caption) {
      form.append("caption", caption);
    }

    // Try multiple ManyChat endpoints in order
    const endpoints = [
      `${MANYCHAT_BASE_URL}/fb/sending/sendContent`,
      `${MANYCHAT_BASE_URL}/fb/sending/sendImage`,
      `${MANYCHAT_BASE_URL}/fb/sending/sendFile`,
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        console.log(
          `📡 ManyChat try: ${endpoint} (timeout=${MANYCHAT_TIMEOUT}ms)`
        );

        const response = await axios.post(endpoint, form, {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${process.env.MANYCHAT_API_TOKEN}`,
            "User-Agent": "GOAT-Bot/2.0",
          },
          timeout: MANYCHAT_TIMEOUT,
          maxContentLength: 10 * 1024 * 1024, // 10MB
          maxBodyLength: 10 * 1024 * 1024,
        });

        console.log(
          `📩 ManyChat response: ${response.status} ${JSON.stringify(
            response.data
          ).substring(0, 100)}`
        );

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
        lastError = error;

        if (error.code === "ECONNABORTED") {
          console.error(
            `⚠️ ManyChat request timeout (${endpoint}): ${MANYCHAT_TIMEOUT}ms exceeded`
          );
        } else if (error.response) {
          console.error(
            `⚠️ ManyChat HTTP error (${endpoint}): ${error.response.status} ${error.response.statusText}`
          );
        } else {
          console.error(
            `⚠️ ManyChat request error (${endpoint}): ${error.message}`
          );
        }

        // Continue to next endpoint
        continue;
      }
    }

    // All endpoints failed
    throw new Error(
      `All ManyChat endpoints failed. Last error: ${
        lastError?.message || "Unknown"
      }`
    );
  } catch (error) {
    console.error("❌ Failed to send image via ManyChat:", error.message);

    // Don't throw - return failure response to avoid breaking user flow
    return {
      success: false,
      error: error.message,
      imageId: imageId,
    };
  }
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
          message: `${text}\n\n[Mathematical expression detected - image sending failed]`,
          status: "success",
          echo: `${text}\n\n[Mathematical expression detected - image sending failed]`,
          imageFailed: true,
        };
      }
    } catch (error) {
      console.error("❌ Image send error:", error);
      return {
        message: `${text}\n\n[Mathematical expression detected - image unavailable]`,
        status: "success",
        echo: `${text}\n\n[Mathematical expression detected - image unavailable]`,
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
};
