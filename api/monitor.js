/**
 * Monitoring Endpoint
 * User: sophoniagoat
 * Updated: 2025-08-24 10:42:00 UTC
 */

function isRunningOnGCP() {
  return Boolean(
    process.env.K_SERVICE ||
      process.env.GAE_ENV ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCE_METADATA_HOST
  );
}

function visionConfigured() {
  const hasEnv =
    !!process.env.GOOGLE_VISION_CREDENTIALS_BASE64 ||
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    !!process.env.GCP_CREDS_JSON ||
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  return hasEnv || isRunningOnGCP();
}

module.exports = (req, res) => {
  const { check } = req.query;

  res.setHeader("Content-Type", "application/json");

  if (check === "database") {
    res.status(200).json({
      timestamp: new Date().toISOString(),
      user: "sophoniagoat",
      check: "database",
      status:
        process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
          ? "configured"
          : "not_configured",
      provider: "Supabase",
      readyForSetup: true,
    });
  } else if (check === "services") {
    res.status(200).json({
      timestamp: new Date().toISOString(),
      user: "sophoniagoat",
      check: "services",
      openai: process.env.OPENAI_API_KEY ? "configured" : "not_configured",
      googleVision: visionConfigured() ? "configured" : "not_configured",
      supabase:
        process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
          ? "configured"
          : "not_configured",
      message: "External services status",
    });
  } else {
    res.status(200).json({
      timestamp: new Date().toISOString(),
      user: "sophoniagoat",
      project: "GOAT Bot 2.0 - SA Student Companion",
      monitoring: "ACTIVE",
      phase: "Foundation",
      system: {
        status: "operational",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
      availableChecks: [
        "/api/monitor?check=database",
        "/api/monitor?check=services",
      ],
    });
  }
};
