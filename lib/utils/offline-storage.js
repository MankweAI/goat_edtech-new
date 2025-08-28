/**
 * Offline Storage System
 * GOAT Bot 2.0
 * Created: 2025-08-25 11:54:13 UTC
 * Developer: DithetoMokgabudi
 */

const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    console.log("🔄 Supabase initialized for offline content");
  } else {
    console.log("⚠️ Supabase credentials missing, offline content unavailable");
  }
} catch (error) {
  console.error("❌ Supabase initialization error:", error);
}

// Local content cache
const contentCache = {
  questions: new Map(),
  solutions: new Map(),
  diagnostics: new Map(),
};

/**
 * Generate a cache key from parameters
 * @param {string} type - Content type
 * @param {object} params - Parameters for content
 * @returns {string} - Cache key
 */
function generateCacheKey(type, params) {
  const normalizedParams = { ...params };

  // Sort object keys for consistency
  const sortedParams = {};
  Object.keys(normalizedParams)
    .sort()
    .forEach((key) => {
      sortedParams[key] = normalizedParams[key];
    });

  const paramString = JSON.stringify(sortedParams);
  return `${type}_${crypto
    .createHash("md5")
    .update(paramString)
    .digest("hex")}`;
}

/**
 * Store content for offline use
 * @param {string} type - Content type
 * @param {object} params - Content parameters
 * @param {object} content - Content to store
 * @returns {Promise<boolean>} - Success indicator
 */
async function storeOfflineContent(type, params, content) {
  if (!content) return false;

  try {
    // Generate cache key
    const cacheKey = generateCacheKey(type, params);

    // Store in local cache
    if (type === "question") {
      contentCache.questions.set(cacheKey, content);
      // Limit cache size
      if (contentCache.questions.size > 100) {
        const oldestKey = contentCache.questions.keys().next().value;
        contentCache.questions.delete(oldestKey);
      }
    } else if (type === "solution") {
      contentCache.solutions.set(cacheKey, content);
      if (contentCache.solutions.size > 100) {
        const oldestKey = contentCache.solutions.keys().next().value;
        contentCache.solutions.delete(oldestKey);
      }
    } else if (type === "diagnostic") {
      contentCache.diagnostics.set(cacheKey, content);
      if (contentCache.diagnostics.size > 50) {
        const oldestKey = contentCache.diagnostics.keys().next().value;
        contentCache.diagnostics.delete(oldestKey);
      }
    }

    // Store in database if available
    if (supabase) {
      const offlineData = {
        contentID: cacheKey,
        type: type,
        subject: params.subject || null,
        grade: params.grade || null,
        topic: params.topic || null,
        sub_topic: params.sub_topic || null,
        question_text: content.questionText || null,
        solution_text: content.solution || null,
        metadata: {
          ...(content.metadata || {}),
          parameters: params,
          stored_at: new Date().toISOString(),
        },
        quality_score: content.quality_score || 0.8,
        caps_aligned: content.caps_aligned || true,
        sa_terminology: content.sa_terminology || true,
        difficulty_level: params.difficulty || "intermediate",
      };

      // Check if content exists
      const { data } = await supabase
        .from("content_storage")
        .select("contentID")
        .eq("contentID", cacheKey)
        .single();

      if (data) {
        // Update existing content
        const { error } = await supabase
          .from("content_storage")
          .update({
            question_text: content.questionText || null,
            solution_text: content.solution || null,
            metadata: offlineData.metadata,
            last_used: new Date().toISOString(),
          })
          .eq("contentID", cacheKey);

        if (error) throw error;
      } else {
        // Insert new content
        const { error } = await supabase
          .from("content_storage")
          .insert(offlineData);

        if (error) throw error;
      }

      console.log(
        `💾 Stored ${type} content with key: ${cacheKey.substring(0, 8)}`
      );
      return true;
    }

    return true;
  } catch (error) {
    console.error(`❌ Failed to store offline content (${type}):`, error);
    return false;
  }
}

/**
 * Retrieve content for offline use
 * @param {string} type - Content type
 * @param {object} params - Content parameters
 * @returns {Promise<object|null>} - Retrieved content or null
 */
async function getOfflineContent(type, params) {
  try {
    // Generate cache key
    const cacheKey = generateCacheKey(type, params);

    // Check local cache first
    if (type === "question" && contentCache.questions.has(cacheKey)) {
      console.log(`🔄 Using cached question: ${cacheKey.substring(0, 8)}`);
      return contentCache.questions.get(cacheKey);
    } else if (type === "solution" && contentCache.solutions.has(cacheKey)) {
      console.log(`🔄 Using cached solution: ${cacheKey.substring(0, 8)}`);
      return contentCache.solutions.get(cacheKey);
    } else if (
      type === "diagnostic" &&
      contentCache.diagnostics.has(cacheKey)
    ) {
      console.log(`🔄 Using cached diagnostic: ${cacheKey.substring(0, 8)}`);
      return contentCache.diagnostics.get(cacheKey);
    }

    // Check database if available
    if (supabase) {
      const { data, error } = await supabase
        .from("content_storage")
        .select("*")
        .eq("contentID", cacheKey)
        .single();

      if (error) {
        if (error.code !== "PGRST116") {
          // Not found
          throw error;
        }
        return null;
      }

      if (data) {
        // Update last used timestamp
        supabase
          .from("content_storage")
          .update({ last_used: new Date().toISOString() })
          .eq("contentID", cacheKey)
          .then(() => {})
          .catch((err) => console.error("Failed to update last_used:", err));

        // Convert to content format
        const content = {
          questionText: data.question_text,
          solution: data.solution_text,
          contentId: data.contentID,
          metadata: data.metadata,
          source: "offline_storage",
        };

        // Store in local cache
        if (type === "question") {
          contentCache.questions.set(cacheKey, content);
        } else if (type === "solution") {
          contentCache.solutions.set(cacheKey, content);
        } else if (type === "diagnostic") {
          contentCache.diagnostics.set(cacheKey, content);
        }

        console.log(
          `📂 Retrieved ${type} from database: ${cacheKey.substring(0, 8)}`
        );
        return content;
      }
    }

    return null;
  } catch (error) {
    console.error(`❌ Failed to retrieve offline content (${type}):`, error);
    return null;
  }
}

/**
 * Get recommended content for preloading
 * @param {string} subject - Academic subject
 * @param {number} grade - Academic grade
 * @param {number} count - Number of items to preload
 * @returns {Promise<Array>} - Array of content items
 */
async function getRecommendedContent(subject, grade, count = 5) {
  try {
    if (!supabase) return [];

    // Get high quality content
    const { data, error } = await supabase
      .from("high_quality_content")
      .select("*")
      .eq("subject", subject)
      .eq("grade", grade)
      .order("quality_score", { ascending: false })
      .limit(count);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("❌ Failed to get recommended content:", error);
    return [];
  }
}

/**
 * Preload content for offline use
 * @param {string} userId - User identifier
 * @param {object} userProfile - User profile
 * @returns {Promise<boolean>} - Success indicator
 */
async function preloadOfflineContent(userId, userProfile) {
  try {
    if (!supabase) return false;

    const subject =
      userProfile.subject || userProfile.preferences?.last_subject;
    const grade = userProfile.grade || userProfile.preferences?.last_grade;

    if (!subject || !grade) return false;

    console.log(`🔄 Preloading content for ${subject} Grade ${grade}`);

    // Get recommended content
    const recommendedContent = await getRecommendedContent(subject, grade, 5);

    if (recommendedContent.length === 0) return false;

    // Store content in cache
    for (const content of recommendedContent) {
      const params = {
        subject: content.subject,
        grade: content.grade,
        topic: content.topic,
        sub_topic: content.sub_topic,
        difficulty: content.difficulty_level,
      };

      const formattedContent = {
        questionText: content.question_text,
        solution: content.solution_text,
        metadata: content.metadata,
        quality_score: content.quality_score,
        caps_aligned: content.caps_aligned,
        sa_terminology: content.sa_terminology,
      };

      await storeOfflineContent("question", params, formattedContent);
    }

    console.log(
      `✅ Preloaded ${recommendedContent.length} content items for offline use`
    );
    return true;
  } catch (error) {
    console.error("❌ Failed to preload offline content:", error);
    return false;
  }
}

/**
 * Get all offline content for a subject
 * @param {string} subject - Academic subject
 * @param {number} grade - Academic grade
 * @returns {Promise<Array>} - Array of content items
 */
async function getOfflineContentBySubject(subject, grade) {
  try {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("content_storage")
      .select("*")
      .eq("subject", subject)
      .eq("grade", grade)
      .order("last_used", { ascending: false });

    if (error) throw error;

    return (data || []).map((item) => ({
      contentId: item.contentID,
      type: item.type,
      questionText: item.question_text,
      solution: item.solution_text,
      topic: item.topic,
      sub_topic: item.sub_topic,
      last_used: item.last_used,
      metadata: item.metadata,
    }));
  } catch (error) {
    console.error(`❌ Failed to get offline content for ${subject}:`, error);
    return [];
  }
}

module.exports = {
  storeOfflineContent,
  getOfflineContent,
  preloadOfflineContent,
  getOfflineContentBySubject,
  getRecommendedContent,
};

