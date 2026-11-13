-- ==============================================================================
-- HEALTHFREAK: STRUCTURED USER COMMITMENTS & BACKFILL (RULE R4)
-- Migration 008: Dedicated Structured Storage for User Commitments Independent of call_notes
-- STATUS: DRAFT / PENDING (DO NOT APPLY WITHOUT EXPLICIT USER INSTRUCTION "apply")
-- ==============================================================================

-- 1. CREATE USER_COMMITMENTS TABLE
CREATE TABLE IF NOT EXISTS user_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  call_id TEXT,
  commitment TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_commitments_user_status ON user_commitments(user_id, status, created_at DESC);

-- 2. ROW LEVEL SECURITY (Strict Isolation - No Backdoors)
ALTER TABLE user_commitments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_isolation_user_commitments ON user_commitments;
CREATE POLICY user_isolation_user_commitments ON user_commitments
  FOR ALL USING (auth.uid()::text = user_id);

-- 3. IDEMPOTENT BACKFILL FROM EXISTING call_notes
INSERT INTO user_commitments (user_id, call_id, commitment, category, status, created_at)
SELECT
  user_id,
  call_id,
  note,
  COALESCE(data->>'category', 'general'),
  'pending',
  created_at
FROM call_notes
WHERE checkpoint_type = 'commitment_made'
  AND note IS NOT NULL
  AND TRIM(note) != ''
ON CONFLICT DO NOTHING;

