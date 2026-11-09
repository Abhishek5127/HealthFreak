-- ==============================================================================
-- HEALTHFREAK: COACH MEMORY, DAILY SNAPSHOTS, PLANS & SCHEDULING
-- Migration 004: Schema Extensions for Proactive AI Health Coach System
-- ==============================================================================

-- 1. PROFILES EXTENSIONS
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'hinglish' CHECK (preferred_language IN ('en', 'hi', 'hinglish'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_call_time TEXT DEFAULT '10:00';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS call_channel TEXT DEFAULT 'app' CHECK (call_channel IN ('app', 'phone'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coach_calls_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coach_data_consent_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS step_goal INTEGER DEFAULT 10000;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipment TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS injuries_note TEXT;

-- 2. DAILY HEALTH SNAPSHOTS
CREATE TABLE IF NOT EXISTS daily_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  steps INTEGER NOT NULL DEFAULT 0,
  step_goal INTEGER NOT NULL DEFAULT 10000,
  calories_in NUMERIC NOT NULL DEFAULT 0,
  calorie_target NUMERIC NOT NULL DEFAULT 2000,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  fiber_g NUMERIC NOT NULL DEFAULT 0,
  water_ml INTEGER NOT NULL DEFAULT 0,
  workouts_done INTEGER NOT NULL DEFAULT 0,
  plan_day_completed BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'device',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, local_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_health_snapshots_user_date ON daily_health_snapshots(user_id, local_date DESC);

-- 3. CALLS & CALL NOTES
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  channel TEXT NOT NULL DEFAULT 'app' CHECK (channel IN ('app', 'phone')),
  purpose TEXT NOT NULL DEFAULT 'checkin' CHECK (purpose IN ('checkin', 'scheduled', 'plan', 'adhoc')),
  scheduled_call_id TEXT,
  language_used TEXT,
  status TEXT NOT NULL DEFAULT 'initiating',
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary_status TEXT NOT NULL DEFAULT 'pending' CHECK (summary_status IN ('pending', 'done', 'needs_review')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calls_user_started ON calls(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_summary_status ON calls(summary_status) WHERE summary_status != 'done';

CREATE TABLE IF NOT EXISTS call_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checkpoint_type TEXT NOT NULL,
  note TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_notes_call ON call_notes(call_id, created_at ASC);

-- 4. USER ISSUES & FOLLOW-UPS
CREATE TABLE IF NOT EXISTS user_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('pain', 'injury', 'sleep', 'digestion', 'energy', 'diet_adherence', 'motivation', 'other')),
  description TEXT,
  severity TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'improving', 'resolved', 'needs_doctor')),
  first_reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_mentioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mention_count INTEGER NOT NULL DEFAULT 1,
  source_call_id TEXT REFERENCES calls(id) ON DELETE SET NULL,
  follow_up_due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_issues_user_status ON user_issues(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_issues_follow_up_due ON user_issues(user_id, follow_up_due_at) WHERE status IN ('open', 'improving');

CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES user_issues(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  ask_after TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'asked', 'answered', 'dropped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_due ON follow_ups(user_id, ask_after) WHERE status = 'pending';

-- 5. EXERCISE PLANS
CREATE TABLE IF NOT EXISTS exercise_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  start_date DATE NOT NULL,
  weeks INTEGER NOT NULL DEFAULT 4,
  plan_json JSONB NOT NULL,
  safety_notes TEXT,
  created_by TEXT NOT NULL DEFAULT 'coach',
  source_call_id TEXT REFERENCES calls(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exactly one active plan per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_plan_per_user ON exercise_plans(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_exercise_plans_user_version ON exercise_plans(user_id, version DESC);

-- 6. SCHEDULED CALLS
CREATE TABLE IF NOT EXISTS scheduled_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  user_tz TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  channel TEXT NOT NULL DEFAULT 'app' CHECK (channel IN ('app', 'phone')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'dialing', 'completed', 'missed', 'rescheduled', 'cancelled')),
  reason TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  call_id TEXT REFERENCES calls(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL DEFAULT 'agent' CHECK (created_by IN ('agent', 'user', 'system')),
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, scheduled_for)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_calls_due ON scheduled_calls(scheduled_for, status) WHERE status = 'pending';

-- 7. APP MESSAGES
CREATE TABLE IF NOT EXISTS app_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('followup', 'plan_ready', 'reminder', 'missed_call', 'checkin')),
  body TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  deep_link TEXT,
  issue_id UUID REFERENCES user_issues(id) ON DELETE SET NULL,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_by TEXT NOT NULL DEFAULT 'coach',
  dedupe_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_messages_user_scheduled ON app_messages(user_id, scheduled_for DESC);

-- 8. POST-CALL JOBS
CREATE TABLE IF NOT EXISTS post_call_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_call_jobs_queue ON post_call_jobs(run_after, status) WHERE status IN ('pending', 'failed');

-- 9. REFRESH FUNCTION FROM EXISTING LOGS
CREATE OR REPLACE FUNCTION refresh_daily_health_snapshot(p_user_id TEXT, p_date DATE)
RETURNS VOID AS $$
DECLARE
  v_steps INTEGER := 0;
  v_step_goal INTEGER := 10000;
  v_water_ml INTEGER := 0;
  v_cals_in NUMERIC := 0;
  v_protein NUMERIC := 0;
  v_carbs NUMERIC := 0;
  v_fat NUMERIC := 0;
  v_fiber NUMERIC := 0;
  v_workouts INTEGER := 0;
BEGIN
  -- Aggregate activity
  SELECT COALESCE(steps, 0), COALESCE(step_goal, 10000), COALESCE(water_intake_ml, 0)
  INTO v_steps, v_step_goal, v_water_ml
  FROM daily_activity
  WHERE user_id = p_user_id AND activity_date = p_date;

  -- Aggregate nutrition summary
  SELECT
    COALESCE(actual_calories, 0),
    COALESCE(actual_protein_g, 0),
    COALESCE(actual_carbohydrates_g, 0),
    COALESCE(actual_fat_g, 0),
    COALESCE(actual_fiber_g, 0)
  INTO v_cals_in, v_protein, v_carbs, v_fat, v_fiber
  FROM daily_nutrition_summaries
  WHERE user_id = p_user_id AND summary_date = p_date;

  -- Upsert Snapshot
  INSERT INTO daily_health_snapshots (
    user_id, local_date, steps, step_goal,
    calories_in, calorie_target, protein_g, carbs_g, fat_g, fiber_g,
    water_ml, workouts_done, plan_day_completed, source, synced_at, updated_at
  ) VALUES (
    p_user_id, p_date, COALESCE(v_steps, 0), COALESCE(v_step_goal, 10000),
    COALESCE(v_cals_in, 0), 2000, COALESCE(v_protein, 0), COALESCE(v_carbs, 0),
    COALESCE(v_fat, 0), COALESCE(v_fiber, 0), COALESCE(v_water_ml, 0),
    COALESCE(v_workouts, 0), FALSE, 'db_refresh', NOW(), NOW()
  )
  ON CONFLICT (user_id, local_date) DO UPDATE SET
    steps = EXCLUDED.steps,
    step_goal = EXCLUDED.step_goal,
    calories_in = EXCLUDED.calories_in,
    protein_g = EXCLUDED.protein_g,
    carbs_g = EXCLUDED.carbs_g,
    fat_g = EXCLUDED.fat_g,
    fiber_g = EXCLUDED.fiber_g,
    water_ml = EXCLUDED.water_ml,
    synced_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 10. ROW LEVEL SECURITY
ALTER TABLE daily_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_call_jobs ENABLE ROW LEVEL SECURITY;

-- Helper macro for RLS policies
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'daily_health_snapshots', 'calls', 'call_notes', 'user_issues',
    'follow_ups', 'exercise_plans', 'scheduled_calls', 'app_messages'
  ] LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS %I ON %I;
      CREATE POLICY %I ON %I
        FOR ALL
        USING (auth.uid()::text = user_id OR user_id = ''usr_synthetic_alex'');
    ', 'user_isolation_' || tbl, tbl, 'user_isolation_' || tbl, tbl);
  END LOOP;
END $$;

