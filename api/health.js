/**
 * Health Check Endpoint
 * User: sophoniagoat
 */

module.exports = (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    user: "sophoniagoat",
    project: "GOAT Bot 2.0 - SA Student Companion",
    phase: "Foundation",
    health: "EXCELLENT",
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
    },
    message: "All systems operational - ready for Phase 1!",
  });
};

