export type TabType = 'home' | 'plan' | 'coach' | 'progress' | 'profile';

export type ModalType =
  | null
  | 'splash'
  | 'onboarding'
  | 'checkin'
  | 'activity_session'
  | 'lab_report'
  | 'voice_overlay'
  | 'meal_scanner'
  | 'meal_result';

export type WellnessGoal =
  | 'weight_gain'
  | 'weight_loss'
  | 'acne_control'
  | 'skincare_glow'
  | 'hair_health'
  | 'pcos_pcod'
  | 'metabolic_fitness'
  | 'weight_management'
  | 'thyroid_health'
  | 'energy_vitality';

export type LanguagePreference = 'English' | 'Hindi' | 'Hinglish';

export type CheckInMood = 'lowEnergy' | 'tense' | 'calm' | 'balanced' | 'energized';

export type GenderType = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
export type DietaryPreference = 'vegetarian' | 'non_vegetarian' | 'eggetarian' | 'vegan';
export type SkinType = 'oily' | 'dry' | 'combination' | 'sensitive' | 'normal';

export interface CalculatedNutritionPlan {
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  waterLiters: number;
  bmi: number;
  tdee: number;
  calorieAdjustment: number;
  projectedWeeks?: number;
  headline: string;
  subheadline: string;
  keyBenefits: string[];
  recommendedFoods: { name: string; tag: string; protein: string; cal: string }[];
}

export interface UserSurveyAssessment {
  goal: WellnessGoal;
  currentWeightKg: number;
  targetWeightKg: number;
  heightCm: number;
  age: number;
  gender: GenderType;
  activityLevel: ActivityLevel;
  dietaryPreference: DietaryPreference;
  weightPace?: 'steady' | 'moderate' | 'rapid';
  skinType?: SkinType;
  skinConcerns?: string[];
  waterIntakeLiters?: number;
  sleepHours?: number;
  sunscreenHabit?: 'daily' | 'sometimes' | 'never';
  hairConcerns?: string[];
  hormonalConcerns?: string[];
  calculatedPlan: CalculatedNutritionPlan;
  completedAt: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  authProvider?: string;
  streakDays: number;
  selectedGoal: WellnessGoal;
  goalLabel: string;
  language: LanguagePreference;
  onboardingCompleted: boolean;
  currentMood: CheckInMood;
  lastCheckInTime?: string;
  healthConditions: string[];
  surveyAssessment?: UserSurveyAssessment;
  waterLoggedMl?: number;
}

export interface DailyActivityItem {
  id: string;
  title: string;
  category: 'nutrition' | 'movement' | 'habit' | 'symptom';
  time: string;
  duration?: string;
  intensity?: 'Gentle' | 'Moderate' | 'High intensity';
  tags: string[];
  completed: boolean;
  description: string;
  calories?: number;
  iconName: string;
}

export interface ActivitySessionStep {
  title: string;
  durationSeconds: number;
  instructions: string;
  postureTip?: string;
}

export interface ActivitySession {
  id: string;
  title: string;
  subtitle: string;
  timeSlot: string;
  intensity: string;
  durationMinutes: number;
  tags: string[];
  trainerName: string;
  steps: ActivitySessionStep[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: string;
  isQuickReply?: boolean;
  suggestions?: string[];
  actionLink?: {
    type: 'open_plan' | 'open_checkin' | 'open_labs';
    label: string;
  };
}

export interface ProgressMetric {
  id: string;
  title: string;
  value: string;
  target: string;
  percentage: number;
  unit: string;
  trend: 'up' | 'down' | 'steady';
  trendLabel: string;
  color: string;
}

export interface BiomarkerResult {
  id: string;
  name: string;
  value: number;
  unit: string;
  referenceRange: string;
  status: 'optimal' | 'normal' | 'borderline' | 'attention';
  category: string;
  insight: string;
}

export interface LabReport {
  id: string;
  title: string;
  date: string;
  labName: string;
  summary: string;
  biomarkers: BiomarkerResult[];
  coachRecommendation: string;
}

