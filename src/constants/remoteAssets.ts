/**
 * Remote cloud-hosted assets for HealthFreak.
 * Images are served via global Supabase Storage CDN rather than being statically bundled
 * inside the mobile binary, keeping the APK / IPA download size minimal.
 */

const SUPABASE_STORAGE_BASE = 'https://tzeojqnsumumdazvwveo.supabase.co/storage/v1/object/public/app-assets';

export const RemoteAssets = {
  primaryGoals: {
    skinnyToStrong: `${SUPABASE_STORAGE_BASE}/primary-goals/skinny-to-strong-fitness-transformation.png`,
    healthyTransformation: `${SUPABASE_STORAGE_BASE}/primary-goals/healthy-transformation-journey.png`,
    cutePastelSkincare: `${SUPABASE_STORAGE_BASE}/primary-goals/cute-pastel-skincare-routine-duo.png`,
    beforeAfterWellness: `${SUPABASE_STORAGE_BASE}/primary-goals/before-and-after-wellness-glow-up.png`,
    hairLossWorries: `${SUPABASE_STORAGE_BASE}/primary-goals/hair-loss-worries-with-a-healthfreak-mirror.png`,
    hormoneBalance: `${SUPABASE_STORAGE_BASE}/primary-goals/hormone-balance-before-and-after.png`,
    cheerfulChibiStretch: `${SUPABASE_STORAGE_BASE}/primary-goals/cheerful-chibi-side-stretch-duo.png`,
    mindfulWellness: `${SUPABASE_STORAGE_BASE}/primary-goals/mindful-wellness-with-healthfreak.png`,
    gutPainToGlow: `${SUPABASE_STORAGE_BASE}/primary-goals/from-gut-pain-to-healthy-glow.png`,
    cozyMentalWellness: `${SUPABASE_STORAGE_BASE}/primary-goals/cozy-mental-wellness-counseling-scene.png`,
    fitnessTransformation: `${SUPABASE_STORAGE_BASE}/primary-goals/healthfreak-fitness-transformation.png`,
  },
  foodScan: `${SUPABASE_STORAGE_BASE}/food-scan/foodscan.png`,
  loginUi: {
    fitnessDoodle: `${SUPABASE_STORAGE_BASE}/login-ui/healthfreak-fitness-doodle-wallpaper.png`,
    nutritionCollage: `${SUPABASE_STORAGE_BASE}/login-ui/healthfreak-nutrition-doodle-collage.png`,
    neonCallDoodle: `${SUPABASE_STORAGE_BASE}/login-ui/neon-healthfreak-call-doodle-wallpaper.png`,
  },
  logo: {
    mascotGif: `${SUPABASE_STORAGE_BASE}/logo/healthfreak-logo.gif`,
  },
} as const;

