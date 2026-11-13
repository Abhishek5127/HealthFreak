-- ==============================================================================
-- HEALTHFREAK: SECURITY HARDENING - REMOVE SYNTHETIC TEST USER RLS BACKDOOR
-- Migration 007: Drop 'OR user_id = usr_synthetic_alex' from production RLS policies
-- STATUS: DRAFT / PENDING (DO NOT APPLY WITHOUT EXPLICIT USER INSTRUCTION "apply")
-- ==============================================================================

-- 1. Daily Activity Logs
DROP POLICY IF EXISTS user_isolation_activity ON daily_activity_logs;
CREATE POLICY user_isolation_activity ON daily_activity_logs
  FOR ALL USING (auth.uid()::text = user_id);

-- 2. Profiles
DROP POLICY IF EXISTS user_read_own_profile ON profiles;
CREATE POLICY user_read_own_profile ON profiles
  FOR SELECT USING (auth.uid()::text = id);

DROP POLICY IF EXISTS user_update_own_profile ON profiles;
CREATE POLICY user_update_own_profile ON profiles
  FOR UPDATE USING (auth.uid()::text = id);

DROP POLICY IF EXISTS user_insert_own_profile ON profiles;
CREATE POLICY user_insert_own_profile ON profiles
  FOR INSERT WITH CHECK (auth.uid()::text = id);

-- 3. Meals & Items
DROP POLICY IF EXISTS user_isolation_meals ON meals;
CREATE POLICY user_isolation_meals ON meals
  FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS user_isolation_meal_items ON meal_items;
CREATE POLICY user_isolation_meal_items ON meal_items
  FOR ALL USING (auth.uid()::text = user_id);

-- 4. User Preferences & Consents
DROP POLICY IF EXISTS user_isolation_preferences ON user_preferences;
CREATE POLICY user_isolation_preferences ON user_preferences
  FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS user_isolation_consents ON user_consents;
CREATE POLICY user_isolation_consents ON user_consents
  FOR ALL USING (auth.uid()::text = user_id);

-- 5. Coach Memory & Calls
DROP POLICY IF EXISTS user_isolation_calls ON calls;
CREATE POLICY user_isolation_calls ON calls
  FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS user_isolation_call_notes ON call_notes;
CREATE POLICY user_isolation_call_notes ON call_notes
  FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS user_isolation_issues ON user_issues;
CREATE POLICY user_isolation_issues ON user_issues
  FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS user_isolation_daily_snapshots ON daily_health_snapshots;
CREATE POLICY user_isolation_daily_snapshots ON daily_health_snapshots
  FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS user_isolation_conditions ON health_conditions;
CREATE POLICY user_isolation_conditions ON health_conditions
  FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS user_isolation_plans ON exercise_plans;
CREATE POLICY user_isolation_plans ON exercise_plans
  FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS user_isolation_followups ON scheduled_followups;
CREATE POLICY user_isolation_followups ON scheduled_followups
  FOR ALL USING (auth.uid()::text = user_id);

-- 6. Transcripts & Extraction Jobs
DROP POLICY IF EXISTS user_isolation_call_transcript_turns ON call_transcript_turns;
CREATE POLICY user_isolation_call_transcript_turns ON call_transcript_turns
  FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS user_isolation_call_extraction_jobs ON call_extraction_jobs;
CREATE POLICY user_isolation_call_extraction_jobs ON call_extraction_jobs
  FOR ALL USING (auth.uid()::text = user_id);

-- 7. Issue History Tombstones
DROP POLICY IF EXISTS user_isolation_issue_history ON issue_history;
CREATE POLICY user_isolation_issue_history ON issue_history
  FOR ALL USING (auth.uid()::text = user_id);

