/**
 * Analytics Dashboard
 * GOAT Bot 2.0 - SA Student Companion
 * User: sophoniagoat
 * Created: 2025-08-20 19:35:21 UTC
 */

module.exports = async (req, res) => {
  try {
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Get usage statistics
    const { data: analytics } = await supabase
      .from("analytics_events")
      .select("type, details, ts")
      .gte("ts", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // Get content quality metrics
    const { data: contentMetrics } = await supabase
      .from("content_quality_metrics")
      .select("*")
      .order("user_rating_avg", { ascending: false });

    // Feature usage breakdown
    const featureUsage = analytics?.reduce((acc, event) => {
      const feature = event.details?.feature || "unknown";
      acc[feature] = (acc[feature] || 0) + 1;
      return acc;
    }, {});

    res.json({
      timestamp: new Date().toISOString(),
      user: "sophoniagoat",
      analytics: {
        totalEvents: analytics?.length || 0,
        featureUsage,
        topContent: contentMetrics?.slice(0, 10),
        averageRating:
          contentMetrics?.reduce((sum, item) => sum + item.user_rating_avg, 0) /
          (contentMetrics?.length || 1),
      },
      period: "Last 7 days",
    });
  } catch (error) {
    res.status(500).json({
      error: "Analytics retrieval failed",
      message: error.message,
    });
  }
};

