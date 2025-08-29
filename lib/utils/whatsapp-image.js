/**
 * WhatsApp Image Handling Service
 * GOAT Bot 2.0
 * Updated: 2025-08-29 13:12:00 UTC
 * Developer: DithetoMokgabudi
 *
 * Change:
 * - Add small exponential backoff between endpoint attempts (configurable) to reduce cascading timeouts.
 * - Keep existing endpoint selection with MANYCHAT_PATH_HINT and circuit breaker as-is.
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

// ---- Media circuit breaker (process-scoped) ----
const MEDIA_CB = {
  failures: 0,
  lastFailureAt: 0,
  openUntil: 0,
  threshold: parseInt(process.env.MANYCHAT_MEDIA_CIRCUIT_THRESHOLD || "3", 10),
  cooldownMs: parseInt(
    process.env.MANYCHAT_MEDIA_CIRCUIT_COOLDOWN_MS || "120000",
    10
  ), // 2 min
};

function isMediaCircuitOpen() {
  return Date.now() < MEDIA_CB.openUntil;
}
function recordMediaFailure(reason = "") {
  MEDIA_CB.failures += 1;
  MEDIA_CB.lastFailureAt = Date.now();
  if (MEDIA_CB.failures >= MEDIA_CB.threshold) {
    MEDIA_CB.openUntil = Date.now() + MEDIA_CB.cooldownMs;
    console.warn(
      `🧯 ManyChat media circuit OPEN for ${Math.round(
        MEDIA_CB.cooldownMs / 1000
      )}s (reason: ${reason || "unknown"})`
    );
    MEDIA_CB.failures = 0;
  }
}
function recordMediaSuccess() {
  MEDIA_CB.failures = 0;
  MEDIA_CB.lastFailureAt = 0;
  MEDIA_CB.openUntil = 0;
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Internal: Try posting multipart to one of the provided endpoints within a total time budget.
 * Returns response.data on 2xx, otherwise throws last error.
 */
async function postToManyChatEndpoints(
  endpoints,
  form,
  headers,
  totalBudgetMs
) {
  let lastErr = null;
  const started = Date.now();

  const defaultAttemptMs = parseInt(
    process.env.MANYCHAT_MEDIA_ATTEMPT_TIMEOUT_MS || "5000",
    10
  );
  const backoffBase = parseInt(
    process.env.MANYCHAT_MEDIA_BACKOFF_BASE_MS || "200",
    10
  );
  const backoffMax = parseInt(
    process.env.MANYCHAT_MEDIA_BACKOFF_MAX_MS || "1000",
    10
  );

  for (let i = 0; i < endpoints.length; i++) {
    const url = endpoints[i];

    // Small exponential backoff before subsequent attempts
    if (i > 0) {
      const backoff = Math.min(backoffBase * Math.pow(2, i - 1), backoffMax);
      const elapsedBeforeBackoff = Date.now() - started;
      const remainingBeforeBackoff = totalBudgetMs - elapsedBeforeBackoff;
      if (remainingBeforeBackoff > Math.max(200, backoff)) {
        await sleep(backoff);
      }
    }

    const elapsed = Date.now() - started;
    const remaining = totalBudgetMs - elapsed;
    if (remaining <= 0) {
      lastErr = new Error("Total media send budget exhausted");
      break;
    }
    const attemptTimeout = Math.max(
      1500,
      Math.min(defaultAttemptMs, remaining)
    );

    try {
      console.log(`📡 ManyChat try: ${url} (timeout=${attemptTimeout}ms)`);
      const resp = await axios.post(url, form, {
        headers: { ...headers, ...form.getHeaders() },
        timeout: attemptTimeout,
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

      if (status >= 200 && status < 300) {
        recordMediaSuccess();
        return resp.data;
      }

      if (status >= 500) recordMediaFailure(`HTTP_${status}`);
      lastErr = new Error(`Endpoint failed (${url}): HTTP ${status}`);
      continue;
    } catch (e) {
      recordMediaFailure(e.message || "network_error");
      lastErr = e;
      console.error(`⚠️ ManyChat request error (${url}):`, e.message);
      continue;
    }
  }

  throw lastErr || new Error("All ManyChat endpoints failed");
}

/**
 * Send image through ManyChat API
 * - Circuit breaker to skip attempts for a cool-down period after repeated failures.
 * - Total time budget across endpoints (default 10s, env MANYCHAT_MEDIA_MAX_TOTAL_MS).
 * - Path hint selection via MANYCHAT_PATH_HINT:
 *    • whatsapp → try /whatsapp/sending/sendImage first (then sendFile, then /wa/*)
 *    • wa (or unset) → try /wa/* first (legacy), then /whatsapp/*
 * - Field must be "file" (multipart)
 * - Tries to convert SVG→PNG for WhatsApp (better compatibility)
 */
async function sendImageViaManyChat(userId, imageData, caption = "") {
  if (!process.env.MANYCHAT_API_TOKEN) {
    throw new Error("MANYCHAT_API_TOKEN not configured");
  }

  if (process.env.MANYCHAT_DISABLE_MEDIA === "1") {
    throw new Error("Media sending disabled by config");
  }

  if (isMediaCircuitOpen()) {
    throw new Error("ManyChat media circuit is open; skipping send");
  }

  const channelRaw = (process.env.MANYCHAT_CHANNEL || "whatsapp")
    .trim()
    .toLowerCase();
  const channel = channelRaw === "wa" ? "whatsapp" : channelRaw;

  const totalBudgetMs = parseInt(
    process.env.MANYCHAT_MEDIA_MAX_TOTAL_MS || "10000",
    10
  );
  const PATH_HINT = (process.env.MANYCHAT_PATH_HINT || "").trim().toLowerCase(); // "whatsapp" or "wa"

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
    const base = "https://api.manychat.com";
    let endpoints = [];

    if (channel === "whatsapp") {
      if (process.env.MANYCHAT_ENDPOINT_OVERRIDE) {
        endpoints = [process.env.MANYCHAT_ENDPOINT_OVERRIDE];
      } else {
        const preferWhatsApp = PATH_HINT === "whatsapp";
        const preferWa = PATH_HINT === "wa";

        if (preferWhatsApp) {
          endpoints = [
            `${base}/whatsapp/sending/sendImage`,
            `${base}/whatsapp/sending/sendFile`,
            `${base}/wa/sending/sendFile`,
            `${base}/wa/sending/sendImage`,
          ];
        } else if (preferWa) {
          endpoints = [
            `${base}/wa/sending/sendFile`,
            `${base}/wa/sending/sendImage`,
            `${base}/whatsapp/sending/sendFile`,
            `${base}/whatsapp/sending/sendImage`,
          ];
        } else {
          // Default: prefer /whatsapp/* first (safest with ManyChat docs), then /wa/*
          endpoints = [
            `${base}/whatsapp/sending/sendImage`,
            `${base}/whatsapp/sending/sendFile`,
            `${base}/wa/sending/sendFile`,
            `${base}/wa/sending/sendImage`,
          ];
        }
      }
    } else if (channel === "fb") {
      endpoints = [
        `${base}/fb/sending/sendImage`,
        `${base}/fb/sending/sendFile`,
      ];
    } else {
      endpoints = [
        `${base}/whatsapp/sending/sendImage`,
        `${base}/whatsapp/sending/sendFile`,
        `${base}/wa/sending/sendFile`,
        `${base}/wa/sending/sendImage`,
      ];
    }

    const data = await postToManyChatEndpoints(
      endpoints,
      form,
      { Authorization: `Bearer ${process.env.MANYCHAT_API_TOKEN}` },
      totalBudgetMs
    );

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
  isMediaCircuitOpen,
};
