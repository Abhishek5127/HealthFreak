-- ==============================================================================
-- DISHA HEALTH: 50-ENTITY HEALTH MEMORY, 30-DAY FOOD DIARY & ADAPTIVE PLAN ENGINE
-- PostgreSQL / Supabase Relational Migration
-- ==============================================================================

-- 1. CORE USER DATA
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  auth_provider TEXT DEFAULT 'google',
  date_of_birth DATE,
  age INTEGER,
  height_cm NUMERIC(5, 2) NOT NULL,
  biological_sex TEXT CHECK (biological_sex IN ('male', 'female', 'other', 'prefer_not_to_say')),
  preferred_language TEXT NOT NULL DEFAULT 'hinglish',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  location TEXT,
  occupation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_category TEXT NOT NULL,
  target_description TEXT NOT NULL,
  target_date DATE,
  priority INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  dietary_type TEXT NOT NULL DEFAULT 'vegetarian',
  food_dislikes JSONB DEFAULT '[]'::jsonb,
  food_restrictions JSONB DEFAULT '[]'::jsonb,
  cultural_preferences JSONB DEFAULT '[]'::jsonb,
  preferred_meal_times JSONB DEFAULT '{}'::jsonb,
  preferred_exercise_types JSONB DEFAULT '[]'::jsonb,
  preferred_coach_tone TEXT DEFAULT 'supportive',
  reminder_preferences JSONB DEFAULT '{}'::jsonb,
  cooking_availability TEXT DEFAULT 'self_daily',
  exercise_availability TEXT DEFAULT '30 mins mornings',
  food_budget_tier TEXT DEFAULT 'moderate',
  available_equipment JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health_conditions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  condition_name TEXT NOT NULL,
  category TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  date_reported TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_date TIMESTAMPTZ,
  clinical_notes TEXT,
  source TEXT NOT NULL,
  confidence NUMERIC(3, 2) DEFAULT 0.9,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS allergies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  allergen_name TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'moderate',
  verification_status TEXT NOT NULL DEFAULT 'user_reported',
  reported_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  symptoms JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  timing TEXT NOT NULL,
  purpose TEXT,
  verification_status TEXT NOT NULL DEFAULT 'user_reported',
  start_date DATE,
  end_date DATE,
  prescribed_by_clinician BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS supplements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supplement_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  timing TEXT,
  verification_status TEXT NOT NULL DEFAULT 'user_reported',
  start_date DATE
);

CREATE TABLE IF NOT EXISTS health_restrictions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restriction_type TEXT NOT NULL,
  description TEXT NOT NULL,
  reason TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'user_reported',
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS health_measurements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  measurement_type TEXT NOT NULL,
  value NUMERIC(7, 2) NOT NULL,
  unit TEXT NOT NULL,
  measured_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'user_entered',
  verification_status TEXT NOT NULL DEFAULT 'user_reported',
  notes TEXT
);

-- 2. HEALTH OBSERVATIONS
CREATE TABLE IF NOT EXISTS symptom_observations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  symptom_name TEXT NOT NULL,
  severity INTEGER CHECK (severity BETWEEN 1 AND 10),
  location TEXT,
  duration TEXT,
  observed_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context_notes TEXT,
  verification_status TEXT NOT NULL DEFAULT 'user_reported',
  source_session_id TEXT
);

CREATE TABLE IF NOT EXISTS daily_checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  energy_score INTEGER CHECK (energy_score BETWEEN 1 AND 10),
  mood TEXT NOT NULL,
  symptoms_reported JSONB DEFAULT '[]'::jsonb,
  sleep_hours NUMERIC(3, 1),
  water_intake_ml INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, local_date)
);

CREATE TABLE IF NOT EXISTS health_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  event_date DATE NOT NULL,
  details JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS lab_observations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  biomarker_name TEXT NOT NULL,
  value NUMERIC(8, 2) NOT NULL,
  unit TEXT NOT NULL,
  reference_range_low NUMERIC(8, 2),
  reference_range_high NUMERIC(8, 2),
  flag TEXT DEFAULT 'normal',
  test_date DATE NOT NULL,
  document_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'document_extracted'
);

CREATE TABLE IF NOT EXISTS health_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  extracted_summary TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verification_status TEXT NOT NULL DEFAULT 'document_extracted'
);

-- 3. FOOD DIARY (STRICT ZERO-IMAGE PERSISTENCE)
CREATE TABLE IF NOT EXISTS meals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consumption_date DATE NOT NULL,
  consumption_timestamp TIMESTAMPTZ NOT NULL,
  local_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  meal_category TEXT NOT NULL CHECK (meal_category IN ('breakfast', 'lunch', 'dinner', 'snack')),
  meal_source TEXT NOT NULL,
  meal_status TEXT NOT NULL DEFAULT 'recorded',
  meal_description TEXT NOT NULL,
  overall_analysis_confidence NUMERIC(3, 2) DEFAULT 0.95,
  user_confirmation_status TEXT NOT NULL DEFAULT 'user_confirmed',
  notes TEXT,
  total_nutrients JSONB NOT NULL,
  coach_insight TEXT,
  health_benefits JSONB DEFAULT '[]'::jsonb,
  considerations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, consumption_date);

CREATE TABLE IF NOT EXISTS meal_items (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  standard_food_name TEXT NOT NULL,
  localized_food_name TEXT,
  original_user_provided_name TEXT,
  food_category TEXT NOT NULL,
  food_reference_id TEXT,
  regional_dish_name TEXT,
  recognition_confidence NUMERIC(3, 2) DEFAULT 0.95,
  estimated_quantity NUMERIC(6, 2) NOT NULL,
  serving_unit TEXT NOT NULL,
  serving_count NUMERIC(4, 2) NOT NULL DEFAULT 1,
  estimated_weight_grams NUMERIC(6, 2) NOT NULL,
  min_estimated_weight_grams NUMERIC(6, 2),
  most_likely_estimated_weight_grams NUMERIC(6, 2),
  max_estimated_weight_grams NUMERIC(6, 2),
  confirmed_weight_grams NUMERIC(6, 2),
  portion_source TEXT NOT NULL DEFAULT 'model_estimate',
  portion_confidence NUMERIC(3, 2) DEFAULT 0.9,
  ingredients JSONB DEFAULT '[]'::jsonb,
  cooking_method TEXT,
  cooking_oil_info TEXT,
  recipe_profile_ref TEXT,
  nutrients JSONB NOT NULL,
  nutrient_source TEXT NOT NULL DEFAULT 'IFCT_2017',
  nutrient_reference_version TEXT NOT NULL DEFAULT '1.0',
  source TEXT NOT NULL,
  confirmation_status TEXT NOT NULL DEFAULT 'user_confirmed',
  last_corrected_at TIMESTAMPTZ,
  original_estimate_summary TEXT,
  current_corrected_value_summary TEXT
);
CREATE INDEX IF NOT EXISTS idx_meal_items_meal ON meal_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_items_user ON meal_items(user_id);

CREATE TABLE IF NOT EXISTS meal_item_ingredients (
  id TEXT PRIMARY KEY,
  meal_item_id TEXT NOT NULL REFERENCES meal_items(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  estimated_grams NUMERIC(6, 2),
  is_inferred BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS meal_nutrients (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE UNIQUE,
  calories NUMERIC(7, 2) NOT NULL,
  protein_grams NUMERIC(6, 2) NOT NULL,
  carbs_grams NUMERIC(6, 2) NOT NULL,
  fat_grams NUMERIC(6, 2) NOT NULL,
  fiber_grams NUMERIC(6, 2) NOT NULL,
  sugar_grams NUMERIC(6, 2) DEFAULT 0,
  sodium_mg NUMERIC(7, 2) DEFAULT 0,
  potassium_mg NUMERIC(7, 2) DEFAULT 0,
  micronutrients JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS food_reference_catalog (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL UNIQUE,
  hindi_name TEXT,
  category TEXT NOT NULL,
  serving_unit TEXT NOT NULL,
  default_serving_grams NUMERIC(6, 2) NOT NULL,
  nutrients_per_100g JSONB NOT NULL,
  database_source TEXT NOT NULL DEFAULT 'IFCT_2017',
  verification_source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_reference_profiles (
  id TEXT PRIMARY KEY,
  recipe_name TEXT NOT NULL UNIQUE,
  regional_category TEXT NOT NULL,
  standard_ingredients JSONB NOT NULL,
  default_oil_ghee_grams NUMERIC(5, 2) NOT NULL,
  nutrients_per_100g JSONB NOT NULL,
  reference_source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meal_item_correction_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  meal_item_id TEXT REFERENCES meal_items(id) ON DELETE SET NULL,
  conversation_session_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'voice_followup',
  original_food_state JSONB NOT NULL,
  corrected_food_state JSONB NOT NULL,
  quantity_delta_grams NUMERIC(6, 2) NOT NULL,
  calorie_delta NUMERIC(6, 2) NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS meal_followup_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_session_id TEXT,
  related_meal_id TEXT REFERENCES meals(id) ON DELETE SET NULL,
  related_meal_item_ids JSONB DEFAULT '[]'::jsonb,
  consumption_date_discussed DATE NOT NULL,
  question_asked TEXT NOT NULL,
  user_response TEXT NOT NULL,
  event_type TEXT NOT NULL,
  original_food_details JSONB,
  corrected_food_details JSONB,
  portion_adjustment TEXT,
  nutrition_adjustment JSONB,
  confirmation_status TEXT NOT NULL DEFAULT 'user_confirmed',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_nutrition_summaries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  calories_total NUMERIC(7, 2) NOT NULL DEFAULT 0,
  calories_target NUMERIC(7, 2) NOT NULL,
  protein_total NUMERIC(6, 2) NOT NULL DEFAULT 0,
  protein_target NUMERIC(6, 2) NOT NULL,
  carbs_total NUMERIC(6, 2) NOT NULL DEFAULT 0,
  carbs_target NUMERIC(6, 2) NOT NULL,
  fat_total NUMERIC(6, 2) NOT NULL DEFAULT 0,
  fat_target NUMERIC(6, 2) NOT NULL,
  fiber_total NUMERIC(6, 2) NOT NULL DEFAULT 0,
  fiber_target NUMERIC(6, 2) NOT NULL,
  sugar_total NUMERIC(6, 2) NOT NULL DEFAULT 0,
  sodium_mg_total NUMERIC(7, 2) NOT NULL DEFAULT 0,
  micronutrients_total JSONB DEFAULT '{}'::jsonb,
  meal_count INTEGER NOT NULL DEFAULT 0,
  food_items_count INTEGER NOT NULL DEFAULT 0,
  scanned_meal_count INTEGER NOT NULL DEFAULT 0,
  voice_reported_meal_count INTEGER NOT NULL DEFAULT 0,
  manual_entered_meal_count INTEGER NOT NULL DEFAULT 0,
  corrected_entries_count INTEGER NOT NULL DEFAULT 0,
  data_coverage_status TEXT NOT NULL DEFAULT 'unrecorded',
  breakfast_status TEXT NOT NULL DEFAULT 'unrecorded',
  lunch_status TEXT NOT NULL DEFAULT 'unrecorded',
  dinner_status TEXT NOT NULL DEFAULT 'unrecorded',
  snacks_status TEXT NOT NULL DEFAULT 'unrecorded',
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, local_date)
);

CREATE TABLE IF NOT EXISTS weekly_nutrition_summaries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  average_daily_calories NUMERIC(7, 2) NOT NULL,
  average_daily_protein NUMERIC(6, 2) NOT NULL,
  average_daily_carbs NUMERIC(6, 2) NOT NULL,
  average_daily_fat NUMERIC(6, 2) NOT NULL,
  average_daily_fiber NUMERIC(6, 2) NOT NULL,
  days_with_logs_count INTEGER NOT NULL,
  total_meals_logged INTEGER NOT NULL,
  top_frequent_foods JSONB DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS monthly_nutrition_summaries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month_start_date DATE NOT NULL,
  month_end_date DATE NOT NULL,
  average_daily_calories NUMERIC(7, 2) NOT NULL,
  average_daily_protein NUMERIC(6, 2) NOT NULL,
  average_daily_carbs NUMERIC(6, 2) NOT NULL,
  average_daily_fat NUMERIC(6, 2) NOT NULL,
  average_daily_fiber NUMERIC(6, 2) NOT NULL,
  days_with_logs_count INTEGER NOT NULL,
  coverage_percentage NUMERIC(5, 2) NOT NULL,
  high_intake_days_count INTEGER NOT NULL,
  low_intake_days_count INTEGER NOT NULL,
  top_frequent_foods JSONB DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month_start_date)
);

-- 4. LIFESTYLE & ACTIVITY
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  activity_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  intensity TEXT NOT NULL,
  calories_burned INTEGER,
  notes TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sleep_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  bed_time TIMESTAMPTZ NOT NULL,
  wake_time TIMESTAMPTZ NOT NULL,
  duration_hours NUMERIC(4, 2) NOT NULL,
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS water_intake_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  amount_ml INTEGER NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  habit_key TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS exercise_feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  perceived_exertion INTEGER CHECK (perceived_exertion BETWEEN 1 AND 10),
  joint_pain_reported TEXT,
  feedback_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CONVERSATION MEMORY
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in_app_voice', 'pstn_outbound', 'chat')),
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  provider TEXT NOT NULL DEFAULT 'gemini',
  summary TEXT
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK (speaker IN ('coach', 'user')),
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_summaries (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE UNIQUE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  key_takeaways JSONB DEFAULT '[]'::jsonb,
  reported_obstacles JSONB DEFAULT '[]'::jsonb,
  commitments_made JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile_facts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.95,
  verification_status TEXT NOT NULL DEFAULT 'user_reported',
  source_session_id TEXT,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  superseded_by_fact_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profile_facts_user_key ON profile_facts(user_id, key);

CREATE TABLE IF NOT EXISTS profile_fact_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fact_id TEXT NOT NULL REFERENCES profile_facts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT NOT NULL,
  session_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS unresolved_questions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  context_reason TEXT NOT NULL,
  related_category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  asked_session_id TEXT,
  resolved_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS coach_recommendations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recommendation_text TEXT NOT NULL,
  category TEXT NOT NULL,
  source_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS followup_responses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES unresolved_questions(id) ON DELETE CASCADE,
  user_response_text TEXT NOT NULL,
  interpreted_fact JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PLANS & PERSONALIZATION
CREATE TABLE IF NOT EXISTS health_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  overview TEXT NOT NULL,
  daily_calories INTEGER NOT NULL,
  water_intake_ml INTEGER NOT NULL,
  safety_constraints JSONB DEFAULT '[]'::jsonb,
  clinical_review_status TEXT NOT NULL DEFAULT 'pending',
  adaptation_level INTEGER NOT NULL DEFAULT 1,
  adaptation_reason_summary TEXT,
  historical_grounding_records JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS plan_versions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  overview TEXT NOT NULL,
  daily_calories INTEGER NOT NULL,
  water_intake_ml INTEGER NOT NULL,
  safety_constraints JSONB DEFAULT '[]'::jsonb,
  clinical_review_status TEXT NOT NULL,
  adaptation_level INTEGER NOT NULL,
  adaptation_reason_summary TEXT,
  historical_grounding_records JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS plan_items (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES health_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('nutrition', 'movement', 'recovery')),
  timing TEXT NOT NULL,
  details TEXT NOT NULL,
  contraindications JSONB DEFAULT '[]'::jsonb,
  grounding_reason TEXT
);

CREATE TABLE IF NOT EXISTS plan_item_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_item_id TEXT NOT NULL REFERENCES plan_items(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  skip_reason TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_adjustment_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_plan_version_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  requested_level INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_personalization_reasons (
  id TEXT PRIMARY KEY,
  plan_version_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recommendation_title TEXT NOT NULL,
  justification TEXT NOT NULL,
  source_type TEXT NOT NULL,
  evidence_summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_safety_reviews (
  id TEXT PRIMARY KEY,
  plan_version_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  passed_safety_check BOOLEAN NOT NULL DEFAULT TRUE,
  violations_detected JSONB DEFAULT '[]'::jsonb,
  substitutions_applied JSONB DEFAULT '[]'::jsonb,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. CALLING, PRIVACY & AUDIT
CREATE TABLE IF NOT EXISTS scheduled_followups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_time_ist TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  target_date_to_review DATE,
  status TEXT NOT NULL DEFAULT 'scheduled',
  target_questions JSONB DEFAULT '[]'::jsonb,
  idempotency_key TEXT NOT NULL UNIQUE,
  attempt_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS call_attempts (
  id TEXT PRIMARY KEY,
  scheduled_followup_id TEXT REFERENCES scheduled_followups(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attempt_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  duration_seconds INTEGER,
  failure_reason TEXT
);

CREATE TABLE IF NOT EXISTS user_consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  voice_processing_consent BOOLEAN NOT NULL DEFAULT TRUE,
  transcript_retention_consent BOOLEAN NOT NULL DEFAULT TRUE,
  health_data_use_consent BOOLEAN NOT NULL DEFAULT TRUE,
  outbound_calling_consent BOOLEAN NOT NULL DEFAULT TRUE,
  voice_recording_consent BOOLEAN NOT NULL DEFAULT FALSE,
  consent_given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS data_retention_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  meal_history_retention_days INTEGER NOT NULL DEFAULT 365,
  transcript_retention_days INTEGER NOT NULL DEFAULT 30,
  auto_delete_upon_inactive BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_entity_id TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

-- ENABLE ROW LEVEL SECURITY (RLS) FOR MULTI-TENANT ISOLATION
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_nutrients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_item_correction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_followup_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_nutrition_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_nutrition_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_nutrition_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_fact_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

