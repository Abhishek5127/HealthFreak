-- ==============================================================================
-- HEALTHFREAK: DAILY ACTIVITY & PEDOMETER TRACKING
-- PostgreSQL / Supabase Relational Migration
-- ==============================================================================

CREATE TABLE IF NOT EXISTS daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  steps INTEGER NOT NULL DEFAULT 0,
  step_goal INTEGER NOT NULL DEFAULT 10000,
  distance_meters NUMERIC DEFAULT 0,
  active_minutes INTEGER DEFAULT 0,
  calories_burned NUMERIC DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'device',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON daily_activity(user_id, activity_date);

-- Enable Row Level Security (RLS)
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'daily_activity' AND policyname = 'Users can manage own daily activity'
  ) THEN
    CREATE POLICY "Users can manage own daily activity" ON daily_activity
      FOR ALL
      USING (auth.uid()::text = user_id OR user_id = 'usr_synthetic_alex');
  END IF;
END $$;

