-- ==============================================================================
-- HEALTHFREAK: ISSUE HISTORY & MEMORY HYGIENE
-- Migration 006: Tombstone Table and Schema Additions for Issue & Fact Purge
-- ==============================================================================

-- 1. ISSUE HISTORY (Tombstone table for resolved issues: NO free text or symptom titles)
CREATE TABLE IF NOT EXISTS issue_history (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT,
  opened_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mention_count INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_issue_history_user ON issue_history(user_id, resolved_at DESC);

-- 2. ADD ISSUE_ID LINK TO SCHEDULED FOLLOWUPS (Nullable)
ALTER TABLE scheduled_followups ADD COLUMN IF NOT EXISTS issue_id UUID;
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_issue ON scheduled_followups(issue_id);

-- 3. ADD SOURCE_ISSUE_ID LINK TO HEALTH CONDITIONS (Nullable)
ALTER TABLE health_conditions ADD COLUMN IF NOT EXISTS source_issue_id UUID;
CREATE INDEX IF NOT EXISTS idx_health_conditions_source_issue ON health_conditions(source_issue_id);

-- 4. ADD PLAN CONSTRAINT ISSUE IDS AND STALENESS FLAG TO EXERCISE PLANS
ALTER TABLE exercise_plans ADD COLUMN IF NOT EXISTS constraint_issue_ids JSONB DEFAULT '[]'::JSONB;
ALTER TABLE exercise_plans ADD COLUMN IF NOT EXISTS is_stale BOOLEAN DEFAULT FALSE;

-- 5. ROW LEVEL SECURITY
ALTER TABLE issue_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_isolation_issue_history ON issue_history;
CREATE POLICY user_isolation_issue_history ON issue_history
  FOR ALL
  USING (auth.uid()::text = user_id OR user_id = 'usr_synthetic_alex');

