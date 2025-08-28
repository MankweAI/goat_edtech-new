/**
 * Database Setup Script for Exam/Test Help Persistence
 * GOAT Bot 2.0
 * Created: 2025-08-25 10:47:12 UTC
 * Developer: DithetoMokgabudi
 */

const { createClient } = require("@supabase/supabase-js");

async function setupDatabase() {
  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  console.log("📊 Creating user_states table...");

  try {
    // Create user_states table if it doesn't exist
    const { error: createError } = await supabase.rpc(
      "create_user_states_if_not_exists",
      {
        sql_command: `
        CREATE TABLE IF NOT EXISTS user_states (
          userID TEXT PRIMARY KEY,
          current_menu TEXT NOT NULL DEFAULT 'welcome',
          context JSONB NOT NULL DEFAULT '{}'::JSONB,
          painpoint_profile JSONB NOT NULL DEFAULT '{}'::JSONB,
          preferences JSONB NOT NULL DEFAULT '{}'::JSONB,
          conversation_history JSONB NOT NULL DEFAULT '[]'::JSONB,
          last_active TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        -- Add index for faster queries
        CREATE INDEX IF NOT EXISTS idx_user_states_last_active ON user_states(last_active);
      `,
      }
    );

    if (createError) throw createError;

    // Try to add the foreign key constraint if possible
    const { error: fkError } = await supabase.rpc(
      "add_foreign_key_if_possible",
      {
        sql_command: `
        DO $$
        BEGIN
          BEGIN
            ALTER TABLE user_states 
            ADD CONSTRAINT fk_user_states_users 
            FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE;
          EXCEPTION
            WHEN undefined_table THEN
              RAISE NOTICE 'users table does not exist, skipping foreign key';
            WHEN duplicate_object THEN
              RAISE NOTICE 'foreign key already exists';
          END;
        END $$;
      `,
      }
    );

    if (fkError) console.warn("⚠️ Foreign key creation error:", fkError);

    console.log("✅ Database setup complete!");

    // Verify setup
    const { data, error } = await supabase
      .from("user_states")
      .select("count(*)", { count: "exact", head: true });

    if (error) throw error;

    console.log(`ℹ️ user_states table exists with ${data.count} records`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

setupDatabase();

