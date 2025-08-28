/**
 * Device Detection Utilities
 * GOAT Bot 2.0
 * Updated: 2025-08-23 14:58:19 UTC
 */

function detectDeviceType(userAgent = "") {
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone"))
    return "mobile";
  if (ua.includes("tablet") || ua.includes("ipad")) return "tablet";
  return "mobile"; // Default to mobile
}

module.exports = { detectDeviceType };

