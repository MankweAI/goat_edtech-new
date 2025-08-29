/**
 * WhatsApp Image Handling Service
 * GOAT Bot 2.0
 * Updated: 2025-08-29 12:10:00 UTC
 * Developer: DithetoMokgabudi
 *
 * Changes:
 * - Add resilient endpoint fallback for ManyChat WhatsApp:
 *   Try WA short path (/wa/...), then /whatsapp/..., and prefer sendFile over sendImage.
 * - Keep using multipart "file" per ManyChat spec.
 * - Keep optional SVG→PNG conversion via sharp.
 * - Detailed per-endpoint logging and graceful fallback on 404/405/415/4xx.
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
 * Internal: Try posting multipart to one of the provided endpoints (first that succeeds).
 * Returns response.data on 2xx, otherwise throws last error.
 */
async function postToManyChatEndpoints(endpoints, form, headers) {
  let lastErr = null;

  for (const url of endpoints) {
    try {
      console.log(`📡 ManyChat try: ${url}`);
      const resp = await axios.post(url, form, {
        headers: { ...headers, ...form.getHeaders() },
        timeout: 15000,
        validateStatus: () => true,
      });
      const status = resp.status;
      const bodySnippet = (() => {
        try {
          return JSON.stringify(resp.data).slice(0, 200);
        } catch {
          return String(resp.data).slice(0, 200);
        }
      })();

      console.log(`📩 ManyChat response: ${status} ${bodySnippet}`);

      // Accept only 2xx
      if (status >= 200 && status < 300) {
        return resp.data;
      }

      // If 404/405/415/4xx, try next endpoint
      const msg = `HTTP ${status}`;
      lastErr = new Error(`Endpoint failed (${url}): ${msg}`);
      continue;
    } catch (e) {
      lastErr = e;
      console.error(`⚠️ ManyChat request error (${url}):`, e.message);
      continue;
    }
  }

  throw lastErr || new Error("All ManyChat endpoints failed");
}

/**
 * Send image through ManyChat API
 * - Channel 'whatsapp' tries multiple endpoints to avoid 404 issues:
 *   1) /wa/sending/sendFile
 *   2) /wa/sending/sendImage
 *   3) /whatsapp/sending/sendFile
 *   4) /whatsapp/sending/sendImage
 * - Channel 'fb' uses:
 *   1) /fb/sending/sendImage
 *   2) /fb/sending/sendFile
 * - Field must be "file" (multipart)
 * - Tries to convert SVG→PNG for WhatsApp (better compatibility)
 */
async function sendImageViaManyChat(userId, imageData, caption = "") {
  if (!process.env.MANYCHAT_API_TOKEN) {
    throw new Error("MANYCHAT_API_TOKEN not configured");
  }

  const channelRaw = (process.env.MANYCHAT_CHANNEL || "whatsapp")
    .trim()
    .toLowerCase();
  const channel = channelRaw === "wa" ? "whatsapp" : channelRaw;

  let filePath = null;
  let mime = null;

  try {
    // Prepare payload file
    if (imageData.format === "svg") {
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
      `📤 Sending image via ManyChat channel=${channel} → ${path.basename(
        filePath
      )} [${mime}]`
    );

    // Endpoint candidates (ordered)
    let endpoints = [];
    if (channel === "whatsapp") {
      const base = "https://api.manychat.com";
      // Allow override for debugging
      if (process.env.MANYCHAT_ENDPOINT_OVERRIDE) {
        endpoints = [process.env.MANYCHAT_ENDPOINT_OVERRIDE];
      } else {
        endpoints = [
          `${base}/wa/sending/sendFile`,
          `${base}/wa/sending/sendImage`,
          `${base}/whatsapp/sending/sendFile`,
          `${base}/whatsapp/sending/sendImage`,
        ];
      }
    } else if (channel === "fb") {
      const base = "https://api.manychat.com";
      endpoints = [
        `${base}/fb/sending/sendImage`,
        `${base}/fb/sending/sendFile`,
      ];
    } else {
      // Fallback to WA list if unknown channel
      const base = "https://api.manychat.com";
      endpoints = [
        `${base}/wa/sending/sendFile`,
        `${base}/wa/sending/sendImage`,
        `${base}/whatsapp/sending/sendFile`,
        `${base}/whatsapp/sending/sendImage`,
      ];
    }

    const data = await postToManyChatEndpoints(endpoints, form, {
      Authorization: `Bearer ${process.env.MANYCHAT_API_TOKEN}`,
    });

    // Cleanup temp file
    fs.unlink(filePath).catch(() => {});

    // Track dedup
    const imageId = crypto
      .createHash("md5")
      .update(imageData.data)
      .digest("hex");
    trackSentImage(userId, imageId);

    return data;
  } catch (error) {
    console.error("❌ Failed to send image via ManyChat:", error.message);
    // Cleanup temp file best-effort
    if (filePath) fs.unlink(filePath).catch(() => {});
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
