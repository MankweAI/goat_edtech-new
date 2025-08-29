/**
 * WhatsApp Image Handling Service
 * GOAT Bot 2.0
 * Updated: 2025-08-29 11:26:00 UTC
 * Developer: DithetoMokgabudi
 *
 * Changes:
 * - Use ManyChat WhatsApp endpoint by default (configurable via MANYCHAT_CHANNEL).
 * - Use multipart field name "file" (ManyChat spec), not "image".
 * - Attempt SVG→PNG conversion for WhatsApp via optional sharp; fall back gracefully.
 * - Better logging of API responses and failures.
 */

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const crypto = require("crypto");

// Optional dependency (runtime only). If missing, we still function (SVG may not render on WA).
let sharp = null;
try {
  // eslint-disable-next-line import/no-extraneous-dependencies, global-require
  sharp = require("sharp");
} catch (_) {
  sharp = null;
}

// Track recently sent images to avoid duplication
const recentlySentImages = new Map();
const MAX_RECENT_TRACKING = 50;
const RECENT_EXPIRY = 5 * 60 * 1000; // 5 minutes

function svgToDataUrl(svg) {
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

async function createTempFileFromBuffer(buffer, ext) {
  const tempDir = os.tmpdir();
  const fileName = `goat-${crypto.randomBytes(8).toString("hex")}.${ext}`;
  const filePath = path.join(tempDir, fileName);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

/**
 * Create temporary file from data (base64 or utf8)
 */
async function createTempFile(data, format = "png", encoding = "base64") {
  const tempDir = os.tmpdir();
  const fileName = `goat-${crypto.randomBytes(8).toString("hex")}.${format}`;
  const filePath = path.join(tempDir, fileName);

  await fs.writeFile(filePath, data, encoding === "base64" ? "base64" : "utf8");
  return filePath;
}

function trackSentImage(userId, imageId) {
  const key = `${userId}:${imageId}`;
  recentlySentImages.set(key, Date.now());

  if (recentlySentImages.size > MAX_RECENT_TRACKING) {
    const now = Date.now();
    for (const [k, time] of recentlySentImages.entries()) {
      if (now - time > RECENT_EXPIRY) {
        recentlySentImages.delete(k);
      }
    }
  }
}

function wasImageRecentlySent(userId, imageId) {
  const key = `${userId}:${imageId}`;
  const sentTime = recentlySentImages.get(key);
  if (!sentTime) return false;
  return Date.now() - sentTime < RECENT_EXPIRY;
}

/**
 * Send image through ManyChat API
 * - Defaults to WhatsApp endpoint
 * - Field must be "file" (multipart)
 * - Tries to convert SVG→PNG for WhatsApp (better compatibility)
 */
async function sendImageViaManyChat(userId, imageData, caption = "") {
  if (!process.env.MANYCHAT_API_TOKEN) {
    throw new Error("MANYCHAT_API_TOKEN not configured");
  }

  const channel = (process.env.MANYCHAT_CHANNEL || "whatsapp").trim(); // "whatsapp" | "fb"
  const endpoint = `https://api.manychat.com/${channel}/sending/sendImage`;

  let filePath = null;
  let mime = null;

  try {
    // Prepare payload file
    if (imageData.format === "svg") {
      // Prefer PNG for WhatsApp
      if (channel === "whatsapp" && sharp) {
        try {
          const svgBuffer = Buffer.from(imageData.data, "base64");
          const pngBuffer = await sharp(svgBuffer)
            .png({ compressionLevel: 9 })
            .toBuffer();
          filePath = await createTempFileFromBuffer(pngBuffer, "png");
          mime = "image/png";
        } catch (convErr) {
          console.warn(
            "⚠️ SVG→PNG conversion failed, sending raw SVG (may not render on WhatsApp):",
            convErr.message
          );
          filePath = await createTempFile(imageData.data, "svg", "base64");
          mime = "image/svg+xml";
        }
      } else {
        // Non-WA or no sharp available: send SVG as-is
        filePath = await createTempFile(imageData.data, "svg", "base64");
        mime = "image/svg+xml";
        if (channel === "whatsapp") {
          console.warn(
            "⚠️ Sending SVG to WhatsApp; this may not render. Install sharp to enable SVG→PNG."
          );
        }
      }
    } else {
      // PNG/JPG etc already
      filePath = await createTempFile(
        imageData.data,
        imageData.format,
        "base64"
      );
      mime = `image/${imageData.format}`;
    }

    const form = new FormData();
    form.append("subscriber_id", userId);
    form.append("file", await fs.readFile(filePath), {
      filename: path.basename(filePath),
      contentType: mime,
    });
    if (caption) form.append("caption", caption);

    console.log(
      `📤 Sending image via ManyChat (${channel}) → ${path.basename(
        filePath
      )} [${mime}]`
    );

    const response = await axios.post(endpoint, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${process.env.MANYCHAT_API_TOKEN}`,
      },
      timeout: 10000,
      validateStatus: () => true, // handle non-2xx gracefully
    });

    // Cleanup temp file
    fs.unlink(filePath).catch(() => {});

    // Log response for visibility
    try {
      console.log(
        `📩 ManyChat response (${channel}): ${response.status} ${JSON.stringify(
          response.data
        ).slice(0, 200)}`
      );
    } catch (_) {
      console.log(`📩 ManyChat response (${channel}): ${response.status}`);
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `ManyChat sendImage failed: HTTP ${response.status} - ${JSON.stringify(
          response.data || {}
        )}`
      );
    }

    // Track dedup
    const imageId = crypto
      .createHash("md5")
      .update(imageData.data)
      .digest("hex");
    trackSentImage(userId, imageId);

    return response.data;
  } catch (error) {
    console.error("❌ Failed to send image via ManyChat:", error.message);
    throw error;
  }
}

async function formatWithLatexImage(text, latexImage, userId = null) {
  if (!latexImage) {
    return { message: text, status: "success", echo: text };
  }
  const imageId = crypto
    .createHash("md5")
    .update(latexImage.data)
    .digest("hex");

  if (userId && wasImageRecentlySent(userId, imageId)) {
    return {
      message: `${text}\n\n[Mathematical expression shown in previous image]`,
      status: "success",
      echo: `${text}\n\n[Mathematical expression shown in previous image]`,
      reusedImage: true,
    };
  }

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
