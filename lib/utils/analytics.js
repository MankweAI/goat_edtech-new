/**
 * Analytics System
 * GOAT Bot 2.0
 * Updated: 2025-08-25 19:24:42 UTC
 * Developer: DithetoMokgabudi
 * Changes: Added circuit breaker and improved timeout handling
 */

const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client with optimizations
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        auth: { persistSession: false },
        global: {
          headers: {
            Connection: "keep-alive",
          },
        },
      }
    );
    console.log("🔄 Supabase initialized for analytics");
  } else {
    console.log(
      "⚠️ Supabase credentials missing, running with in-memory analytics only"
    );
  }
} catch (error) {
  console.error("❌ Supabase initialization error:", error);
}

// In-memory analytics store for when DB is unavailable
const localAnalytics = {
  events: [],
  contentMetrics: new Map(),
};

// Circuit breaker for analytics operations
class AnalyticsCircuitBreaker {
  constructor() {
    this.failureCount = 0;
    this.isOpen = false;
    this.lastFailureTime = null;
    this.failureThreshold = 3;
    this.recoveryTimeout = 30000; // 30 seconds
  }

  async execute(operation) {
    if (
      this.isOpen &&
      Date.now() - this.lastFailureTime < this.recoveryTimeout
    ) {
      return false; // Skip operation when circuit is open
    }

    try {
      const result = await operation();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      return false;
    }
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.isOpen = true;
      console.log("📊 Analytics circuit breaker opened");
    }
  }

  reset() {
    this.failureCount = 0;
    this.isOpen = false;
    this.lastFailureTime = null;
  }
}

const analyticsCircuitBreaker = new AnalyticsCircuitBreaker();

/**
 * Track an analytics event with enhanced error handling
 * @param {string} userId - User identifier
 * @param {string} eventType - Type of event
 * @param {object} details - Event details
 * @returns {Promise<boolean>} - Success indicator
 */
async function trackEvent(userId, eventType, details = {}) {
  // Always store locally first
  localAnalytics.events.push({
    userID: userId,
    type: eventType,
    details,
    ts: new Date().toISOString(),
  });

  // Trim local storage if it gets too large
  if (localAnalytics.events.length > 1000) {
    localAnalytics.events = localAnalytics.events.slice(-500);
  }

  // Try to store in database if available
  if (supabase) {
    // Fire-and-forget with circuit breaker
    setImmediate(async () => {
      await analyticsCircuitBreaker.execute(async () => {
        const { error } = await Promise.race([
          supabase.from("analytics_events").insert({
            userID: userId,
            type: eventType,
            details,
            ts: new Date().toISOString(),
          }),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Analytics operation timeout")),
              5000
            )
          ),
        ]);

        if (error) throw error;
        return true;
      });
    });
  }

  return true; // Always return success for user flow
}

/**
 * Record content quality metrics with timeout
 * @param {string} contentId - Content identifier
 * @param {number} rating - User rating (1-5)
 * @param {object} metadata - Content metadata
 * @returns {Promise<boolean>} - Success indicator
 */
async function recordContentQuality(contentId, rating, metadata = {}) {
  // Store locally
  if (!localAnalytics.contentMetrics.has(contentId)) {
    localAnalytics.contentMetrics.set(contentId, {
      ratings: [],
      total_ratings: 0,
      user_rating_avg: 0,
      metadata,
    });
  }

  const metrics = localAnalytics.contentMetrics.get(contentId);
  metrics.ratings.push(rating);
  metrics.total_ratings = metrics.ratings.length;
  metrics.user_rating_avg =
    metrics.ratings.reduce((sum, r) => sum + r, 0) / metrics.total_ratings;

  // Try to store in database with circuit breaker
  if (supabase) {
    setImmediate(async () => {
      await analyticsCircuitBreaker.execute(async () => {
        const { data, error: fetchError } = await Promise.race([
          supabase
            .from("content_quality_metrics")
            .select("contentID, user_rating_avg, total_ratings")
            .eq("contentID", contentId)
            .single(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Content quality timeout")), 3000)
          ),
        ]);

        if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

        if (data) {
          const newAvg =
            (data.user_rating_avg * data.total_ratings + rating) /
            (data.total_ratings + 1);

          const { error } = await supabase
            .from("content_quality_metrics")
            .update({
              user_rating_avg: newAvg,
              total_ratings: data.total_ratings + 1,
              updated: new Date().toISOString(),
            })
            .eq("contentID", contentId);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("content_quality_metrics")
            .insert({
              contentID: contentId,
              user_rating_avg: rating,
              total_ratings: 1,
              caps_alignment: metadata.caps_alignment || 1.0,
              accuracy_score: metadata.accuracy_score || 0.8,
              sa_terminology_score: metadata.sa_terminology_score || 1.0,
              educational_value: metadata.educational_value || rating / 5,
              updated: new Date().toISOString(),
            });

          if (error) throw error;
        }

        return true;
      });
    });
  }

  return true;
}

// Rest of existing functions with timeout improvements...
async function getPersonalizedRecommendations(userId, currentContext = {}) {
  const recommendations = {
    recommended_subjects: [],
    recommended_topics: [],
    learning_pattern: "sequential",
    difficulty_preference: "mixed",
    visual_preference: false,
    next_best_topic: null,
  };

  if (!supabase) return recommendations;

  try {
    return await analyticsCircuitBreaker.execute(async () => {
      const { data: events, error: eventsError } = await Promise.race([
        supabase
          .from("analytics_events")
          .select("type, details, ts")
          .eq("userID", userId)
          .order("ts", { ascending: false })
          .limit(100),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Recommendations timeout")), 4000)
        ),
      ]);

      if (eventsError) throw eventsError;

      // Process events and generate recommendations...
      if (events && events.length > 0) {
        const subjectCounts = {};
        const topicCounts = {};

        events.forEach((event) => {
          const subject = event.details?.subject;
          const topic = event.details?.topic;

          if (subject) {
            subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
          }
          if (topic) {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          }
        });

        recommendations.recommended_subjects = Object.entries(subjectCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map((entry) => entry[0]);

        recommendations.recommended_topics = Object.entries(topicCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map((entry) => entry[0]);
      }

      return recommendations;
    });
  } catch (error) {
    console.error(
      `❌ Failed to get personalized recommendations for ${userId}:`,
      error
    );
    return recommendations;
  }
}

async function getPopularTopics(subject) {
  if (!supabase) return [];

  try {
    return await analyticsCircuitBreaker.execute(async () => {
      const { data, error } = await Promise.race([
        supabase
          .from("analytics_events")
          .select("details")
          .eq("type", "exam_question_generated")
          .filter("details->subject", "eq", subject)
          .order("ts", { ascending: false })
          .limit(100),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Popular topics timeout")), 3000)
        ),
      ]);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const topicCounts = {};
      data.forEach((event) => {
        const topic = event.details?.topic;
        if (topic) {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        }
      });

      return Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((entry) => entry[0]);
    });
  } catch (error) {
    console.error(`❌ Failed to get popular topics for ${subject}:`, error);
    return [];
  }
}

module.exports = {
  trackEvent,
  recordContentQuality,
  getPersonalizedRecommendations,
  getPopularTopics,
};
