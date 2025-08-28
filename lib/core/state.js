/**
 * State Management
 * GOAT Bot 2.0
 * Updated: 2025-08-25 22:05:00 UTC
 * Developer: DithetoMokgabudi
 * Changes:
 *  - Treat network timeouts/abort as transient (do NOT open circuit breaker)
 *  - Debounce state persistence per-user to reduce pressure and retries
 *  - Align persistence timeout to outlive fetch timeout to avoid double timeouts
 */

const { createClient } = require("@supabase/supabase-js");
const { queueForRetry } = require("../utils/network-resilience");

// Replace the Supabase initialization section (around lines 15-35)

let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        db: {
          schema: "public",
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Connection: "keep-alive",
            "Keep-Alive": "timeout=20, max=1000",
            "User-Agent": "GOAT-Bot/2.0",
          },
          // Keep custom fetch but avoid layering conflicting signals elsewhere
          fetch: (url, options = {}) => {
            // 10s fetch timeout here; persist layer uses 12s so fetch aborts first
            const ctrl = AbortSignal.timeout(10000);
            return fetch(url, {
              ...options,
              signal: options.signal || ctrl,
            });
          },
        },
      }
    );
    console.log("🔄 Supabase initialized with serverless optimizations");
  } else {
    console.log(
      "⚠️ Supabase credentials missing, running with in-memory state only"
    );
  }
} catch (error) {
  console.error("❌ Supabase initialization error:", error);
}

class DatabaseCircuitBreaker {
  constructor() {
    this.failureCount = 0;
    this.isOpen = false;
    this.lastFailureTime = null;
    this.failureThreshold = 5;
    this.recoveryTimeout = 60000; // 1 minute
  }

  isTransient(error) {
    const msg = String(error?.message || "").toLowerCase();
    // Treat timeouts/aborts/network blips as transient (do not open the breaker)
    return (
      msg.includes("timeout") ||
      msg.includes("abort") ||
      msg.includes("aborted") ||
      msg.includes("etimedout") ||
      msg.includes("econnreset") ||
      msg.includes("fetch failed") ||
      msg.includes("network")
    );
  }

  async execute(operation, fallback = null) {
    if (
      this.isOpen &&
      Date.now() - this.lastFailureTime < this.recoveryTimeout
    ) {
      console.log("🔌 Circuit breaker is open, using fallback");
      if (fallback) return fallback();
      throw new Error("Circuit breaker is open");
    }

    try {
      const result = await operation();
      this.reset();
      return result;
    } catch (error) {
      // Do NOT count transient errors toward opening the breaker
      if (!this.isTransient(error)) {
        this.recordFailure();
        console.error("🔌 Circuit breaker recorded failure:", error.message);
      } else {
        console.warn("🌩️ Transient DB error (not counting):", error.message);
      }
      if (fallback) return fallback();
      throw error;
    }
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.isOpen = true;
      console.log(
        "🔌 Circuit breaker opened after",
        this.failureCount,
        "failures"
      );
    }
  }

  reset() {
    this.failureCount = 0;
    this.isOpen = false;
    this.lastFailureTime = null;
  }
}

const dbCircuitBreaker = new DatabaseCircuitBreaker();

// Debounce map to coalesce multiple persist calls per user
const pendingPersists = new Map();
const PERSIST_DEBOUNCE_MS = 500; // coalesce bursts
const PERSIST_TIMEOUT_MS = 12000; // let fetch (10s) abort first, then our race

// Enhanced user state management with persistence capabilities
const userStates = new Map();

// Add ManyChat state tracking code
const MANYCHAT_STATES = {
  lastCommand: new Map(),
  lastMenu: new Map(),
  TTL: 12 * 60 * 60 * 1000,
};

// Define constants for state tracking
const GOAT_COMMANDS = {
  WELCOME: "welcome",
  MENU_CHOICE: "menu_choice",
  EXAM_PREP_CONVERSATION: "exam_prep_conversation",
  HOMEWORK_HELP: "homework_help",
  HOMEWORK_UPLOAD: "homework_upload",
  MEMORY_HACKS: "memory_hacks",
  FIXED_MENU_COMMAND: "fixed_menu_command",
  NUMBERED_MENU_COMMAND: "numbered_menu_command",
};

const AI_INTEL_STATES = {
  EXAM_OR_TEST: "ai_exam_or_test",
  SUBJECT_GRADE: "ai_subject_grade",
  AI_PAINPOINT_EXCAVATION: "ai_painpoint_excavation",
  AI_MICRO_TARGETING: "ai_micro_targeting",
  AI_PAINPOINT_CONFIRMATION: "ai_painpoint_confirmation",
  AI_QUESTION_GENERATION: "ai_question_generation",
  GUIDED_DISCOVERY: "guided_discovery",
  ALTERNATIVE_PATHS: "alternative_paths",
  IMMEDIATE_FALLBACK: "immediate_fallback",
  AI_DIAGNOSTIC_QUESTION: "ai_diagnostic_question",
  AI_DIAGNOSTIC_ANALYSIS: "ai_diagnostic_analysis",
};

// Async operation with circuit breaker
async function performDatabaseOperation(operation, fallback = null) {
  return dbCircuitBreaker.execute(operation, fallback);
}

function schedulePersist(userId, stateToSave) {
  const existing = pendingPersists.get(userId);
  if (existing) {
    existing.state = stateToSave; // overwrite with the latest
    return;
  }

  const entry = {
    state: stateToSave,
    timer: setTimeout(async () => {
      pendingPersists.delete(userId);
      try {
        await performDatabaseOperation(
          async () => {
            if (!supabase) throw new Error("Supabase not configured");

            // Race with timeout; fetch’s own 10s timeout should occur first
            const { error } = await Promise.race([
              supabase.from("user_states").upsert(entry.state, {
                onConflict: "userID",
                ignoreDuplicates: false,
              }),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("State persistence timeout")),
                  PERSIST_TIMEOUT_MS
                )
              ),
            ]);

            if (error) throw error;

            console.log(`💾 State persisted for user ${userId}`);
            return true;
          },
          () => {
            console.log(`💾 Fallback: State kept in memory for user ${userId}`);
            queueForRetry("state", userId, stateToSave);
            return false;
          }
        );
      } catch (e) {
        console.error(`❌ Error persisting state for ${userId}:`, {
          message: e.message,
          timestamp: new Date().toISOString(),
        });
        queueForRetry("state", userId, stateToSave);
      }
    }, PERSIST_DEBOUNCE_MS),
  };

  pendingPersists.set(userId, entry);
}

async function persistUserState(userId, state) {
  if (!userId) return false;

  // Fast path: if DB not configured, just keep in memory and queue
  if (!supabase) {
    queueForRetry("state", userId, state);
    return true;
  }

  // Prepare state data once; debounced job will reuse latest snapshot
  const stateToSave = {
    userID: userId,
    current_menu: state.current_menu || "welcome",
    context: state.context || {},
    painpoint_profile:
      state.painpoint_profile || state.context?.painpoint_profile || {},
    preferences: state.preferences || {},
    conversation_history: (state.conversation_history || []).slice(-10),
    last_active: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Debounce schedule
  schedulePersist(userId, stateToSave);

  // Always return success immediately for user flow
  return true;
}

// Enhanced state tracking function with error handling
function trackManyState(subscriberId, state) {
  try {
    if (!subscriberId || typeof subscriberId !== "string") {
      console.warn(`⚠️ Invalid subscriberId: ${subscriberId}`);
      return;
    }

    MANYCHAT_STATES.lastCommand.set(subscriberId, {
      command: state?.type || "unknown",
      timestamp: Date.now(),
    });

    MANYCHAT_STATES.lastMenu.set(subscriberId, {
      menu: state?.current_menu || "welcome",
      timestamp: Date.now(),
    });

    console.log(
      `🔄 ManyChat state tracked: ${subscriberId} | Menu: ${
        state?.current_menu || "welcome"
      }`
    );
  } catch (error) {
    console.error(`❌ Error tracking state for user ${subscriberId}:`, error);
  }
}

// Add memory cleanup for ManyChat state
function setupStateCleanup() {
  return setInterval(() => {
    const now = Date.now();
    let cleanedEntries = 0;

    for (const [key, data] of MANYCHAT_STATES.lastCommand.entries()) {
      if (now - data.timestamp > MANYCHAT_STATES.TTL) {
        MANYCHAT_STATES.lastCommand.delete(key);
        cleanedEntries++;
      }
    }

    for (const [key, data] of MANYCHAT_STATES.lastMenu.entries()) {
      if (now - data.timestamp > MANYCHAT_STATES.TTL) {
        MANYCHAT_STATES.lastMenu.delete(key);
        cleanedEntries++;
      }
    }

    if (cleanedEntries > 0) {
      console.log(
        `🧹 Cleaned up ${cleanedEntries} expired ManyChat state entries`
      );
    }
  }, 60 * 60 * 1000).unref();
}

/**
 * NEW: Track analytics event in the database
 * @param {string} userId - User identifier
 * @param {string} type - Event type
 * @param {object} details - Event details
 */
async function trackAnalytics(userId, type, details = {}) {
  if (!supabase || !userId || !type) return false;

  try {
    const eventData = {
      userID: userId,
      type,
      details,
      feature_used: "exam_prep",
      ts: new Date().toISOString(),
    };

    const { error } = await supabase.from("analytics_events").insert(eventData);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`❌ Analytics tracking error for ${userId}:`, error);
    return false;
  }
}

async function retrieveUserState(userId) {
  if (!supabase || !userId) return null;

  try {
    return await performDatabaseOperation(
      async () => {
        const { data: stateData, error: stateError } = await Promise.race([
          supabase
            .from("user_states")
            .select("*")
            .eq("userID", userId)
            .single(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("State retrieval timeout")), 3000)
          ),
        ]);

        if (stateError && stateError.code !== "PGRST116") throw stateError;

        if (stateData) {
          userStates.set(userId, {
            id: userId,
            current_menu: stateData.current_menu,
            context: stateData.context || {},
            painpoint_profile: stateData.painpoint_profile || {},
            preferences: stateData.preferences || {},
            conversation_history: stateData.conversation_history || [],
            last_active: stateData.last_active,
          });

          console.log(`📂 Retrieved state for user ${userId}`);
          return userStates.get(userId);
        }

        return null;
      },
      () => {
        console.log(`📂 Fallback: No state retrieved for user ${userId}`);
        return null;
      }
    );
  } catch (error) {
    console.error(`❌ Error retrieving state for user ${userId}:`, error);
    return null;
  }
}

async function getOrCreateUserState(userId) {
  // First check in-memory state
  if (userStates.has(userId)) {
    const state = userStates.get(userId);
    state.last_active = new Date().toISOString();
    return state;
  }

  // Try to retrieve from database with timeout
  const retrievedState = await retrieveUserState(userId);
  if (retrievedState) return retrievedState;

  // Create new state if not found
  const newState = {
    id: userId,
    current_menu: "welcome",
    context: {},
    painpoint_profile: {},
    preferences: {},
    conversation_history: [],
    last_active: new Date().toISOString(),
  };

  userStates.set(userId, newState);

  // Try to persist the new state (debounced; fire-and-forget)
  persistUserState(userId, newState);

  return newState;
}

// Export enhanced module
module.exports = {
  userStates,
  MANYCHAT_STATES,
  GOAT_COMMANDS,
  AI_INTEL_STATES,
  trackManyState,
  setupStateCleanup,
  persistUserState,
  retrieveUserState,
  getOrCreateUserState,
  trackAnalytics,
};
