/**
 * WhatsApp Image Handling Service
 * GOAT Bot 2.0
 * Created: 2025-08-25 11:06:31 UTC
 * Developer: DithetoMokgabudi
 */

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const crypto = require("crypto");

// Track recently sent images to avoid duplication
const recentlySentImages = new Map();
const MAX_RECENT_TRACKING = 50;
const RECENT_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * Convert SVG to data URL
 * @param {string} svg - SVG content
 * @returns {string} - Data URL
 */
function svgToDataUrl(svg) {
  // Convert to base64 and create data URL
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Create temporary file from data
 * @param {string} data - Data to write to file
 * @param {string} format - File format (svg, png, etc.)
 * @param {string} encoding - Data encoding (utf8, base64)
 * @returns {Promise<string>} - Path to temporary file
 */
async function createTempFile(data, format = "png", encoding = "base64") {
  const tempDir = os.tmpdir();
  const fileName = `latex-${crypto.randomBytes(8).toString("hex")}.${format}`;
  const filePath = path.join(tempDir, fileName);

  try {
    await fs.writeFile(
      filePath,
      data,
      encoding === "base64" ? "base64" : "utf8"
    );
    return filePath;
  } catch (error) {
    console.error("❌ Failed to create temp file:", error);
    throw error;
  }
}

/**
 * Track sent image to prevent duplication
 * @param {string} userId - User ID
 * @param {string} imageId - Image identifier
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
 * @param {string} userId - User ID
 * @param {string} imageId - Image identifier
 * @returns {boolean} - True if image was recently sent
 */
function wasImageRecentlySent(userId, imageId) {
  const key = `${userId}:${imageId}`;
  const sentTime = recentlySentImages.get(key);

  if (!sentTime) return false;

  return Date.now() - sentTime < RECENT_EXPIRY;
}

/**
 * Send image through ManyChat API
 * @param {string} userId - ManyChat subscriber ID
 * @param {object} imageData - Image data
 * @param {string} caption - Image caption
 * @returns {Promise<object>} - API response
 */
async function sendImageViaManyChat(userId, imageData, caption = "") {
  if (!process.env.MANYCHAT_API_TOKEN) {
    throw new Error("MANYCHAT_API_TOKEN not configured");
  }

  try {
    // Convert to temp file if needed
    let imagePath;
    if (imageData.format === "svg") {
      // For SVG, convert to data URL
      const dataUrl = svgToDataUrl(imageData.data);
      // Create a temp file from the data URL
      imagePath = await createTempFile(dataUrl.split(",")[1], "svg", "base64");
    } else {
      // For other formats like PNG
      imagePath = await createTempFile(
        imageData.data,
        imageData.format,
        "base64"
      );
    }

    // Create form data with the image
    const form = new FormData();
    form.append("subscriber_id", userId);
    form.append("image", await fs.readFile(imagePath), {
      filename: path.basename(imagePath),
      contentType: `image/${imageData.format}`,
    });

    if (caption) {
      form.append("caption", caption);
    }

    // Send to ManyChat API
    const response = await axios.post(
      "https://api.manychat.com/fb/sending/sendImage",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${process.env.MANYCHAT_API_TOKEN}`,
        },
      }
    );

    // Cleanup temp file
    fs.unlink(imagePath).catch((err) => {
      console.error("❌ Failed to delete temp file:", err);
    });

    // Track that we sent this image
    const imageId = crypto
      .createHash("md5")
      .update(imageData.data)
      .digest("hex");
    trackSentImage(userId, imageId);

    return response.data;
  } catch (error) {
    console.error("❌ Failed to send image via ManyChat:", error);
    throw error;
  }
}

/**
 * Format response with image for WhatsApp
 * @param {string} text - Plain text content
 * @param {object} latexImage - LaTeX image data
 * @param {string} userId - User ID for deduplication
 * @returns {Promise<object>} - Formatted response
 */
async function formatWithLatexImage(text, latexImage, userId = null) {
  if (!latexImage) {
    return { message: text, status: "success", echo: text };
  }

  // Generate an image ID for deduplication
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

  // For WhatsApp text message, we'll provide a text-only version
  // The actual image will be sent separately using ManyChat API
  return {
    message: `${text}\n\n[Mathematical expression sent as separate image]`,
    status: "success",
    echo: `${text}\n\n[Mathematical expression sent as separate image]`,
    latexImage,
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

