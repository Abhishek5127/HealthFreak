-- ==============================================================================
-- HEALTHFREAK: GOOGLE OAUTH AUTOMATION & ROW LEVEL SECURITY (RLS) POLICIES
-- PostgreSQL / Supabase Migration
-- ==============================================================================

-- 1. Ensure `profiles` table columns accommodate first-time Google sign-ins
ALTER TABLE public.profiles
  ALTER COLUMN height_cm SET DEFAULT 170.0,
  ALTER COLUMN height_cm DROP NOT NULL,
  ALTER COLUMN auth_provider SET DEFAULT 'google',
  ALTER COLUMN onboarding_completed SET DEFAULT FALSE;

-- 2. AUTOMATIC PROFILE PROVISIONING TRIGGER ON auth.users
-- Automatically creates/syncs a public.profiles record whenever a user logs in via Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    email,
    avatar_url,
    auth_provider,
    onboarding_completed,
    height_cm,
    preferred_language,
    timezone,
    created_at,
    updated_at
  )
  VALUES (
    new.id::text,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1),
      'HealthFreak Member'
    ),
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      NULL
    ),
    COALESCE(new.raw_app_meta_data->>'provider', 'google'),
    FALSE,
    170.0,
    'hinglish',
    'Asia/Kolkata',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to Supabase auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. ROW LEVEL SECURITY (RLS) POLICIES FOR USER ISOLATION
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid()::text = id OR id = 'usr_synthetic_alex');

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid()::text = id OR id = 'usr_synthetic_alex');

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid()::text = id OR id = 'usr_synthetic_alex');

-- 4. RLS POLICIES FOR ESSENTIAL USER HEALTH DATA TABLES
-- User Preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own preferences" ON public.user_preferences;
CREATE POLICY "Users manage own preferences" ON public.user_preferences
  FOR ALL
  USING (auth.uid()::text = user_id OR user_id = 'usr_synthetic_alex');

-- User Goals
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own goals" ON public.user_goals;
CREATE POLICY "Users manage own goals" ON public.user_goals
  FOR ALL
  USING (auth.uid()::text = user_id OR user_id = 'usr_synthetic_alex');

-- Meals & Food Diary
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own meals" ON public.meals;
CREATE POLICY "Users manage own meals" ON public.meals
  FOR ALL
  USING (auth.uid()::text = user_id OR user_id = 'usr_synthetic_alex');

-- Daily Check-ins
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own checkins" ON public.daily_checkins;
CREATE POLICY "Users manage own checkins" ON public.daily_checkins
  FOR ALL
  USING (auth.uid()::text = user_id OR user_id = 'usr_synthetic_alex');

-- User Consents
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own consents" ON public.user_consents;
CREATE POLICY "Users manage own consents" ON public.user_consents
  FOR ALL
  USING (auth.uid()::text = user_id OR user_id = 'usr_synthetic_alex');

