-- ==============================================================================
-- HEALTHFREAK: CALL TRANSCRIPTS AND POST-CALL EXTRACTION
-- Migration 005: Schema for Per-Turn Transcript Persistence & Extraction Pipeline
-- ==============================================================================

-- 1. CALL TRANSCRIPT TURNS (per-turn streaming persistence)
CREATE TABLE IF NOT EXISTS call_transcript_turns (
  call_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  turn_index INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent')),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (call_id, turn_index)
);

CREATE INDEX IF NOT EXISTS idx_call_transcript_turns_user_created ON call_transcript_turns(user_id, created_at DESC);

-- 2. CALL EXTRACTION JOBS
CREATE TABLE IF NOT EXISTS call_extraction_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_call_extraction_jobs_status ON call_extraction_jobs(status, created_at);

-- 3. ROW LEVEL SECURITY
ALTER TABLE call_transcript_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_extraction_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_isolation_call_transcript_turns ON call_transcript_turns;
CREATE POLICY user_isolation_call_transcript_turns ON call_transcript_turns
  FOR ALL
  USING (auth.uid()::text = user_id OR user_id = 'usr_synthetic_alex');

DROP POLICY IF EXISTS user_isolation_call_extraction_jobs ON call_extraction_jobs;
CREATE POLICY user_isolation_call_extraction_jobs ON call_extraction_jobs
  FOR ALL
  USING (auth.uid()::text = user_id OR user_id = 'usr_synthetic_alex');
