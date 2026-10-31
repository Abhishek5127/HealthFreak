/**
 * Comprehensive Health Memory & Food Diary Entity Models
 * Covers all 50 logical entities specified in the Master Health Memory Architecture.
 */

export type VerificationStatus =
  | 'unverified'
  | 'user_reported'
  | 'user_confirmed'
  | 'document_extracted'
  | 'clinician_verified'
  | 'superseded'
  | 'inactive';

export type DataSource =
  | 'camera_scan'
  | 'manual_entry'
  | 'voice_report'
  | 'voice_followup'
  | 'imported_diary'
  | 'coach_suggested_and_user_confirmed';

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type LanguageCode = 'en' | 'hi' | 'hinglish';

// ==========================================
// 1. CORE USER DATA (Entities 1 - 9)
// ==========================================

export interface UserProfileEntity {
  id: string; // User ID
  name: string;
  dateOfBirth?: string; // YYYY-MM-DD
  age?: number;
  heightCm: number;
  biologicalSex?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  preferredLanguage: LanguageCode;
  timezone: string; // e.g. 'Asia/Kolkata'
  location?: string;
  occupation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserGoalEntity {
  id: string;
  userId: string;
  goalCategory: string; // 'weight_loss' | 'pcos_management' | 'cardiovascular' | 'energy'
  targetDescription: string;
  targetDate?: string;
  priority: number; // 1 to 5
  status: 'active' | 'achieved' | 'paused' | 'abandoned';
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferencesEntity {
  id: string;
  userId: string;
  dietaryType: 'vegetarian' | 'non_vegetarian' | 'eggetarian' | 'vegan' | 'jain';
  foodDislikes: string[];
  foodRestrictions: string[];
  culturalPreferences: string[];
  preferredMealTimes: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
    snack?: string;
  };
  preferredExerciseTypes: string[];
  preferredCoachTone: 'supportive' | 'direct' | 'educational' | 'encouraging';
  reminderPreferences: {
    morningCheckin: boolean;
    mealReminders: boolean;
    eveningReview: boolean;
  };
  cookingAvailability: 'self_daily' | 'family_cook' | 'maid' | 'outside_food' | 'limited';
  exerciseAvailability: string; // e.g. "30 mins mornings"
  foodBudgetTier: 'budget' | 'moderate' | 'premium';
  availableEquipment: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HealthConditionEntity {
  id: string;
  userId: string;
  conditionName: string;
  category: 'metabolic' | 'musculoskeletal' | 'cardiovascular' | 'hormonal' | 'gastrointestinal' | 'other';
  verificationStatus: VerificationStatus;
  dateReported: string;
  effectiveDate?: string;
  clinicalNotes?: string;
  source: DataSource | 'user_intake' | 'clinician';
  confidence: number;
  active: boolean;
}

export interface AllergyEntity {
  id: string;
  userId: string;
  allergenName: string; // e.g. 'Peanuts', 'Lactose', 'Gluten'
  severity: 'mild' | 'moderate' | 'severe' | 'anaphylactic';
  verificationStatus: VerificationStatus;
  reportedDate: string;
  symptoms: string[];
}

export interface MedicationEntity {
  id: string;
  userId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  timing: string; // e.g. 'before breakfast'
  purpose?: string;
  verificationStatus: VerificationStatus;
  startDate?: string;
  endDate?: string;
  prescribedByClinician: boolean;
}

export interface SupplementEntity {
  id: string;
  userId: string;
  supplementName: string; // e.g. 'Vitamin D3', 'Omega 3', 'Whey Protein'
  dosage: string;
  frequency: string;
  timing?: string;
  verificationStatus: VerificationStatus;
  startDate?: string;
}

export interface HealthRestrictionEntity {
  id: string;
  userId: string;
  restrictionType: 'exercise_contraindication' | 'dietary_sodium_limit' | 'calorie_floor' | 'fluid_intake';
  description: string;
  reason: string;
  verificationStatus: VerificationStatus;
  active: boolean;
}

export interface HealthMeasurementEntity {
  id: string;
  userId: string;
  measurementType: 'weight_kg' | 'height_cm' | 'waist_cm' | 'body_fat_pct' | 'blood_pressure_systolic' | 'blood_pressure_diastolic' | 'fasting_blood_glucose_mg_dl';
  value: number;
  unit: string;
  measuredDate: string; // ISO string
  source: 'user_entered' | 'smart_scale' | 'clinic_report';
  verificationStatus: VerificationStatus;
  notes?: string;
}

// ==========================================
// 2. HEALTH OBSERVATIONS (Entities 10 - 14)
// ==========================================

export interface SymptomObservationEntity {
  id: string;
  userId: string;
  symptomName: string;
  severity: number; // 1 to 10
  location?: string; // e.g. 'right knee', 'lower back'
  duration?: string;
  observedDate: string;
  contextNotes?: string;
  verificationStatus: VerificationStatus;
  sourceSessionId?: string;
}

export interface DailyCheckinEntity {
  id: string;
  userId: string;
  localDate: string; // YYYY-MM-DD
  energyScore: number; // 1 to 10
  mood: 'calm' | 'energized' | 'balanced' | 'lowEnergy' | 'tense';
  symptomsReported: string[];
  sleepHours?: number;
  waterIntakeMl?: number;
  notes?: string;
  createdAt: string;
}

export interface HealthEventEntity {
  id: string;
  userId: string;
  eventType: 'flare_up' | 'doctor_visit' | 'medication_change' | 'injury' | 'milestone';
  description: string;
  eventDate: string;
  details?: Record<string, any>;
}

export interface LabObservationEntity {
  id: string;
  userId: string;
  biomarkerName: string; // e.g. 'HbA1c', 'Vitamin D', 'TSH'
  value: number;
  unit: string;
  referenceRangeLow?: number;
  referenceRangeHigh?: number;
  flag: 'normal' | 'low' | 'high' | 'critical';
  testDate: string;
  documentId?: string;
  verificationStatus: VerificationStatus;
}

export interface HealthDocumentEntity {
  id: string;
  userId: string;
  documentType: 'blood_report' | 'prescription' | 'discharge_summary';
  extractedSummary: string;
  uploadedAt: string;
  verificationStatus: VerificationStatus;
}

// ==========================================
// 3. FOOD DIARY & NUTRITION (Entities 15 - 25)
// ==========================================

export interface FoodItemIngredient {
  name: string;
  estimatedGrams?: number;
  isInferred: boolean;
}

export interface NutrientBreakdown {
  calories: number; // kcal
  protein: number;  // g
  carbohydrates: number; // g
  dietaryFiber: number; // g
  totalFat: number; // g
  saturatedFat?: number; // g
  totalSugars?: number; // g
  sodiumMg?: number; // mg
  potassiumMg?: number; // mg
  ironMg?: number; // mg
  calciumMg?: number; // mg
  vitaminCMg?: number; // mg
  folateMcg?: number; // mcg
}

export interface MealItemEntity {
  id: string;
  mealId: string;
  userId: string;
  standardFoodName: string;
  localizedFoodName?: string;
  originalUserProvidedName?: string;
  foodCategory: string; // 'grains' | 'legumes' | 'dairy' | 'vegetables' | 'protein' | 'fruit' | 'snack'
  foodReferenceId?: string; // IFCT / USDA ID
  regionalDishName?: string;
  recognitionConfidence: number; // 0.0 - 1.0

  // Portion
  estimatedQuantity: number;
  servingUnit: string;
  servingCount: number;
  estimatedWeightGrams: number;
  minEstimatedWeightGrams: number;
  mostLikelyEstimatedWeightGrams: number;
  maxEstimatedWeightGrams: number;
  confirmedWeightGrams?: number;
  portionSource: 'model_estimate' | 'user_confirmed' | 'voice_correction' | 'portion_guide';
  portionConfidence: number;

  // Composition
  ingredients: FoodItemIngredient[];
  cookingMethod?: string;
  cookingOilInfo?: string;
  recipeProfileRef?: string;
  preparationNotes?: string;

  // Nutrition
  nutrients: NutrientBreakdown;
  nutrientSource: 'IFCT_2017' | 'USDA_FDC' | 'recipe_calculation' | 'verified_catalog';
  nutrientReferenceVersion: string;

  // Provenance
  source: DataSource;
  confirmationStatus: VerificationStatus;
  lastCorrectedAt?: string;
  originalEstimateSummary?: string;
  currentCorrectedValueSummary?: string;
}

export interface MealEntity {
  id: string;
  userId: string;
  consumptionDate: string; // YYYY-MM-DD in user's local timezone
  consumptionTimestamp: string; // ISO UTC string
  localTimezone: string; // e.g. 'Asia/Kolkata'
  mealCategory: MealCategory;
  mealSource: DataSource;
  mealStatus: 'recorded' | 'explicitly_skipped' | 'partially_recorded' | 'awaiting_clarification' | 'confirmed';
  mealDescription: string;
  overallAnalysisConfidence: number;
  userConfirmationStatus: VerificationStatus;
  notes?: string;
  items: MealItemEntity[];
  totalNutrients: NutrientBreakdown;
  coachInsight?: string;
  healthBenefits?: Array<{ title: string; description: string; category: string }>;
  considerations?: Array<{ title: string; description: string; type: 'info' | 'caution' }>;
  createdAt: string;
  updatedAt: string;
}

export interface FoodReferenceItem {
  id: string;
  canonicalName: string;
  hindiName?: string;
  category: string;
  servingUnit: string;
  defaultServingGrams: number;
  nutrientsPer100g: NutrientBreakdown;
  databaseSource: 'IFCT_2017' | 'USDA_FDC';
  verificationSource: string;
}

export interface RecipeReferenceProfile {
  id: string;
  recipeName: string;
  regionalCategory: 'North Indian' | 'South Indian' | 'Maharashtrian' | 'Pan-Indian' | 'General';
  standardIngredients: Array<{ name: string; standardWeightGrams: number }>;
  defaultOilGheeGrams: number;
  nutrientsPer100g: NutrientBreakdown;
  referenceSource: string;
}

export interface MealItemCorrectionEvent {
  id: string;
  userId: string;
  mealId: string;
  mealItemId?: string;
  conversationSessionId?: string;
  timestamp: string;
  reason: string;
  source: 'voice_followup' | 'chat_message' | 'ui_manual_edit';
  originalFoodState: {
    name: string;
    weightGrams: number;
    calories: number;
  };
  correctedFoodState: {
    name: string;
    weightGrams: number;
    calories: number;
  };
  quantityDeltaGrams: number;
  calorieDelta: number;
  notes?: string;
}

export interface MealFollowupEvent {
  id: string;
  userId: string;
  conversationSessionId?: string;
  relatedMealId?: string;
  relatedMealItemIds?: string[];
  consumptionDateDiscussed: string; // YYYY-MM-DD
  questionAsked: string;
  userResponse: string;
  eventType:
    | 'meal_confirmed'
    | 'meal_added_from_voice'
    | 'portion_corrected'
    | 'food_item_added'
    | 'food_item_removed'
    | 'cooking_method_updated'
    | 'ingredient_updated'
    | 'meal_marked_skipped'
    | 'meal_context_updated'
    | 'clarification_requested';
  originalFoodDetails?: any;
  correctedFoodDetails?: any;
  portionAdjustment?: string;
  nutritionAdjustment?: {
    calorieDelta: number;
    proteinDelta: number;
    carbsDelta: number;
    fatDelta: number;
  };
  confirmationStatus: VerificationStatus;
  timestamp: string;
}

export interface DailyNutritionSummaryEntity {
  id: string;
  userId: string;
  localDate: string; // YYYY-MM-DD
  caloriesTotal: number;
  caloriesTarget: number;
  proteinTotal: number;
  proteinTarget: number;
  carbsTotal: number;
  carbsTarget: number;
  fatTotal: number;
  fatTarget: number;
  fiberTotal: number;
  fiberTarget: number;
  sugarTotal: number;
  sodiumMgTotal: number;
  micronutrientsTotal: Record<string, { amount: number; unit: string; dailyValuePct: number }>;
  mealCount: number;
  foodItemsCount: number;
  scannedMealCount: number;
  voiceReportedMealCount: number;
  manualEnteredMealCount: number;
  correctedEntriesCount: number;
  // Completeness flags
  dataCoverageStatus: 'full' | 'partial' | 'skipped_only' | 'unrecorded';
  breakfastStatus: 'logged' | 'explicitly_skipped' | 'unrecorded';
  lunchStatus: 'logged' | 'explicitly_skipped' | 'unrecorded';
  dinnerStatus: 'logged' | 'explicitly_skipped' | 'unrecorded';
  snacksStatus: 'logged' | 'none' | 'unrecorded';
  lastCalculatedAt: string;
}

export interface WeeklyNutritionSummaryEntity {
  id: string;
  userId: string;
  weekStartDate: string; // YYYY-MM-DD
  weekEndDate: string; // YYYY-MM-DD
  averageDailyCalories: number;
  averageDailyProtein: number;
  averageDailyCarbs: number;
  averageDailyFat: number;
  averageDailyFiber: number;
  daysWithLogsCount: number; // 0 to 7
  totalMealsLogged: number;
  topFrequentFoods: Array<{ name: string; count: number }>;
  calculatedAt: string;
}

export interface MonthlyNutritionSummaryEntity {
  id: string;
  userId: string;
  monthStartDate: string; // YYYY-MM-DD
  monthEndDate: string; // YYYY-MM-DD
  averageDailyCalories: number;
  averageDailyProtein: number;
  averageDailyCarbs: number;
  averageDailyFat: number;
  averageDailyFiber: number;
  daysWithLogsCount: number; // 0 to 30
  coveragePercentage: number; // e.g. 80% (24 / 30)
  highIntakeDaysCount: number;
  lowIntakeDaysCount: number;
  topFrequentFoods: Array<{ name: string; count: number }>;
  calculatedAt: string;
}

// ==========================================
// 4. LIFESTYLE & ACTIVITY (Entities 26 - 30)
// ==========================================

export interface ActivityLogEntity {
  id: string;
  userId: string;
  localDate: string;
  activityType: string; // e.g. 'Brisk Walk', 'Wall Sits', 'Yoga'
  durationMinutes: number;
  intensity: 'low' | 'moderate' | 'high';
  caloriesBurned?: number;
  notes?: string;
  completedAt: string;
}

export interface SleepLogEntity {
  id: string;
  userId: string;
  localDate: string;
  bedTime: string;
  wakeTime: string;
  durationHours: number;
  qualityRating?: number; // 1 to 5
}

export interface WaterIntakeLogEntity {
  id: string;
  userId: string;
  localDate: string;
  amountMl: number;
  loggedAt: string;
}

export interface HabitLogEntity {
  id: string;
  userId: string;
  localDate: string;
  habitKey: string; // e.g. 'morning_warm_water', '10k_steps'
  completed: boolean;
}

export interface ExerciseFeedbackEntity {
  id: string;
  userId: string;
  activityId?: string;
  activityName: string;
  perceivedExertion: number; // 1 to 10
  jointPainReported?: string; // e.g. 'mild right knee soreness'
  feedbackDate: string;
}

// ==========================================
// 5. CONVERSATION MEMORY (Entities 31 - 38)
// ==========================================

export interface ConversationSessionEntity {
  id: string;
  userId: string;
  type: 'in_app_voice' | 'pstn_outbound' | 'chat';
  status: 'active' | 'completed' | 'abandoned';
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  provider: 'gemini' | 'openai';
  summary?: string;
}

export interface ConversationMessageEntity {
  id: string;
  sessionId: string;
  userId: string;
  speaker: 'coach' | 'user';
  text: string;
  timestamp: string;
}

export interface ConversationSummaryEntity {
  id: string;
  sessionId: string;
  userId: string;
  summaryText: string;
  keyTakeaways: string[];
  reportedObstacles: string[];
  commitmentsMade: string[];
  createdAt: string;
}

export interface ProfileFactEntity {
  id: string;
  userId: string;
  category: 'dietary_preference' | 'routine' | 'symptom' | 'injury' | 'schedule' | 'goal' | 'family';
  key: string;
  value: any;
  confidence: number;
  verificationStatus: VerificationStatus;
  sourceSessionId?: string;
  effectiveFrom: string;
  effectiveTo?: string; // for superseded facts
  supersededByFactId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileFactEventEntity {
  id: string;
  userId: string;
  factId: string;
  eventType: 'created' | 'confirmed' | 'contradicted' | 'superseded' | 'deleted';
  oldValue?: any;
  newValue?: any;
  reason: string;
  sessionId?: string;
  timestamp: string;
}

export interface UnresolvedQuestionEntity {
  id: string;
  userId: string;
  question: string;
  contextReason: string;
  relatedCategory: 'nutrition_gap' | 'portion_clarification' | 'symptom_followup' | 'plan_barrier';
  status: 'pending' | 'resolved' | 'dismissed';
  askedSessionId?: string;
  resolvedSessionId?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface CoachRecommendationEntity {
  id: string;
  userId: string;
  recommendationText: string;
  category: 'nutrition' | 'movement' | 'sleep' | 'hydration';
  sourceSessionId: string;
  status: 'active' | 'accepted' | 'declined' | 'superseded';
  createdAt: string;
}

export interface FollowupResponseEntity {
  id: string;
  userId: string;
  questionId: string;
  userResponseText: string;
  interpretedFact?: Record<string, any>;
  receivedAt: string;
}

// ==========================================
// 6. PLANS & PERSONALIZATION (Entities 39 - 45)
// ==========================================

export interface PlanItemEntity {
  id: string;
  planId: string;
  name: string;
  category: 'nutrition' | 'movement' | 'recovery';
  timing: string;
  details: string;
  contraindications?: string[];
  groundingReason?: string; // Why this item was chosen from user history
}

export interface PlanVersionEntity {
  id: string;
  userId: string;
  versionNumber: number;
  status: 'draft' | 'active' | 'archived';
  title: string;
  overview: string;
  dailyCalories: number;
  waterIntakeMl: number;
  items: PlanItemEntity[];
  safetyConstraints: string[];
  clinicalReviewStatus: 'approved' | 'pending' | 'flagged';
  adaptationLevel: 1 | 2 | 3; // 1 = Memory, 2 = Small plan adjustment, 3 = Major clinical review
  adaptationReasonSummary?: string;
  historicalGroundingRecords?: {
    referencedMealIds?: string[];
    referencedFactKeys?: string[];
    adherenceIssuesAddressed?: string[];
  };
  generatedAt: string;
  approvedAt?: string;
  activatedAt?: string;
}

export interface HealthPlanEntity extends PlanVersionEntity {}

export interface PlanItemLogEntity {
  id: string;
  userId: string;
  planItemId: string;
  localDate: string;
  status: 'completed' | 'skipped' | 'modified';
  skipReason?: string;
  loggedAt: string;
}

export interface PlanAdjustmentRequestEntity {
  id: string;
  userId: string;
  currentPlanVersionId: string;
  reason: string;
  requestedLevel: 1 | 2 | 3;
  status: 'pending_review' | 'draft_generated' | 'applied' | 'rejected';
  createdAt: string;
}

export interface PlanPersonalizationReasonEntity {
  id: string;
  planVersionId: string;
  userId: string;
  recommendationTitle: string;
  justification: string;
  sourceType: 'food_diary_pattern' | 'repeated_skip' | 'injury_flag' | 'user_request';
  evidenceSummary: string;
}

export interface PlanSafetyReviewEntity {
  id: string;
  planVersionId: string;
  userId: string;
  passedSafetyCheck: boolean;
  violationsDetected: string[];
  substitutionsApplied: string[];
  reviewedAt: string;
}

// ==========================================
// 7. CALLING, PRIVACY & AUDIT (Entities 46 - 50)
// ==========================================

export interface ScheduledFollowupEntity {
  id: string;
  userId: string;
  scheduledTimeIST: string; // ISO string
  type: 'daily_meal_checkin' | 'previous_day_review' | 'weekly_nutrition_review' | 'monthly_health_review';
  targetDateToReview?: string; // YYYY-MM-DD
  status: 'scheduled' | 'queued' | 'in_progress' | 'completed' | 'cancelled' | 'failed_quiet_hours';
  targetQuestions: string[];
  idempotencyKey: string;
  attemptCount: number;
}

export interface CallAttemptEntity {
  id: string;
  scheduledFollowupId?: string;
  userId: string;
  attemptTimestamp: string;
  status: 'connected' | 'unanswered' | 'busy' | 'failed' | 'rejected';
  durationSeconds?: number;
  failureReason?: string;
}

export interface UserConsentsEntity {
  id: string;
  userId: string;
  voiceProcessingConsent: boolean;
  transcriptRetentionConsent: boolean;
  healthDataUseConsent: boolean;
  outboundCallingConsent: boolean;
  voiceRecordingConsent: boolean; // default false
  consentGivenAt: string;
  lastUpdatedAt: string;
  revokedAt?: string;
}

export interface DataRetentionPreferencesEntity {
  id: string;
  userId: string;
  mealHistoryRetentionDays: number; // default 365, min 30
  transcriptRetentionDays: number; // default 30
  autoDeleteUponInactive: boolean;
  updatedAt: string;
}

export interface AuditLogEntity {
  id: string;
  userId: string;
  actor: 'user' | 'coach_agent' | 'system_scheduler' | 'admin';
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'consent_change';
  targetEntity: string;
  targetEntityId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  timestamp: string;
}
