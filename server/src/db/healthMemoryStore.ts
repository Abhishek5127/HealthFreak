import {
  UserProfileEntity,
  UserGoalEntity,
  UserPreferencesEntity,
  HealthConditionEntity,
  AllergyEntity,
  MedicationEntity,
  SupplementEntity,
  HealthRestrictionEntity,
  HealthMeasurementEntity,
  SymptomObservationEntity,
  DailyCheckinEntity,
  HealthEventEntity,
  LabObservationEntity,
  HealthDocumentEntity,
  MealEntity,
  MealItemEntity,
  FoodReferenceItem,
  RecipeReferenceProfile,
  MealItemCorrectionEvent,
  MealFollowupEvent,
  DailyNutritionSummaryEntity,
  WeeklyNutritionSummaryEntity,
  MonthlyNutritionSummaryEntity,
  ActivityLogEntity,
  SleepLogEntity,
  WaterIntakeLogEntity,
  HabitLogEntity,
  ExerciseFeedbackEntity,
  ConversationSessionEntity,
  ConversationMessageEntity,
  ConversationSummaryEntity,
  ProfileFactEntity,
  ProfileFactEventEntity,
  UnresolvedQuestionEntity,
  CoachRecommendationEntity,
  FollowupResponseEntity,
  HealthPlanEntity,
  PlanItemEntity,
  PlanItemLogEntity,
  PlanAdjustmentRequestEntity,
  PlanPersonalizationReasonEntity,
  PlanSafetyReviewEntity,
  ScheduledFollowupEntity,
  CallAttemptEntity,
  UserConsentsEntity,
  DataRetentionPreferencesEntity,
  AuditLogEntity,
  NutrientBreakdown,
  VerificationStatus,
  DataSource,
} from '../types/healthMemory.js';
import { MealNutritionService } from '../services/nutritionDatabase.js';

export class HealthMemoryStore {
  private static instance: HealthMemoryStore;

  // 1. Core User Data
  public profiles: Map<string, UserProfileEntity> = new Map();
  public userGoals: Map<string, UserGoalEntity[]> = new Map();
  public userPreferences: Map<string, UserPreferencesEntity> = new Map();
  public healthConditions: Map<string, HealthConditionEntity[]> = new Map();
  public allergies: Map<string, AllergyEntity[]> = new Map();
  public medications: Map<string, MedicationEntity[]> = new Map();
  public supplements: Map<string, SupplementEntity[]> = new Map();
  public healthRestrictions: Map<string, HealthRestrictionEntity[]> = new Map();
  public healthMeasurements: Map<string, HealthMeasurementEntity[]> = new Map();

  // 2. Health Observations
  public symptomObservations: Map<string, SymptomObservationEntity[]> = new Map();
  public dailyCheckins: Map<string, DailyCheckinEntity[]> = new Map();
  public healthEvents: Map<string, HealthEventEntity[]> = new Map();
  public labObservations: Map<string, LabObservationEntity[]> = new Map();
  public healthDocuments: Map<string, HealthDocumentEntity[]> = new Map();

  // 3. Food Diary
  public meals: Map<string, MealEntity> = new Map(); // mealId -> MealEntity
  public mealItems: Map<string, MealItemEntity[]> = new Map(); // mealId -> MealItemEntity[]
  public foodReferenceCatalog: Map<string, FoodReferenceItem> = new Map();
  public recipeReferenceProfiles: Map<string, RecipeReferenceProfile> = new Map();
  public mealItemCorrectionEvents: Map<string, MealItemCorrectionEvent[]> = new Map(); // userId -> events
  public mealFollowupEvents: Map<string, MealFollowupEvent[]> = new Map(); // userId -> events
  public dailySummaries: Map<string, DailyNutritionSummaryEntity> = new Map(); // `${userId}_${localDate}` -> summary
  public weeklySummaries: Map<string, WeeklyNutritionSummaryEntity[]> = new Map(); // userId -> summaries
  public monthlySummaries: Map<string, MonthlyNutritionSummaryEntity[]> = new Map(); // userId -> summaries

  // 4. Lifestyle & Activity
  public activityLogs: Map<string, ActivityLogEntity[]> = new Map();
  public sleepLogs: Map<string, SleepLogEntity[]> = new Map();
  public waterIntakeLogs: Map<string, WaterIntakeLogEntity[]> = new Map();
  public habitLogs: Map<string, HabitLogEntity[]> = new Map();
  public exerciseFeedback: Map<string, ExerciseFeedbackEntity[]> = new Map();

  // 5. Conversation Memory
  public conversationSessions: Map<string, ConversationSessionEntity> = new Map();
  public conversationMessages: Map<string, ConversationMessageEntity[]> = new Map();
  public conversationSummaries: Map<string, ConversationSummaryEntity> = new Map();
  public profileFacts: Map<string, ProfileFactEntity[]> = new Map(); // userId -> facts
  public profileFactEvents: Map<string, ProfileFactEventEntity[]> = new Map(); // userId -> events
  public unresolvedQuestions: Map<string, UnresolvedQuestionEntity[]> = new Map(); // userId -> questions
  public coachRecommendations: Map<string, CoachRecommendationEntity[]> = new Map();
  public followupResponses: Map<string, FollowupResponseEntity[]> = new Map();

  // 6. Plans & Personalization
  public healthPlans: Map<string, HealthPlanEntity[]> = new Map(); // userId -> plans
  public planItemLogs: Map<string, PlanItemLogEntity[]> = new Map();
  public planAdjustmentRequests: Map<string, PlanAdjustmentRequestEntity[]> = new Map();
  public planPersonalizationReasons: Map<string, PlanPersonalizationReasonEntity[]> = new Map();
  public planSafetyReviews: Map<string, PlanSafetyReviewEntity[]> = new Map();

  // 7. Calling, Privacy & Audit
  public scheduledFollowups: Map<string, ScheduledFollowupEntity[]> = new Map();
  public callAttempts: Map<string, CallAttemptEntity[]> = new Map();
  public userConsents: Map<string, UserConsentsEntity> = new Map(); // userId -> consents
  public dataRetentionPreferences: Map<string, DataRetentionPreferencesEntity> = new Map();
  public auditLogs: AuditLogEntity[] = [];

  private constructor() {
    this.seedReferenceCatalogs();
    this.seedSyntheticAlex();
    this.seedSyntheticPriya();
  }

  public static getInstance(): HealthMemoryStore {
    if (!HealthMemoryStore.instance) {
      HealthMemoryStore.instance = new HealthMemoryStore();
    }
    return HealthMemoryStore.instance;
  }

  // ==========================================
  // SEED CATALOGS & SYNTHETIC DATA
  // ==========================================

  private seedReferenceCatalogs(): void {
    const catalog: FoodReferenceItem[] = [
      {
        id: 'ref_roti',
        canonicalName: 'Roti / Chapati',
        hindiName: 'रोटी / चपाती',
        category: 'grains',
        servingUnit: 'piece (~40g)',
        defaultServingGrams: 40,
        nutrientsPer100g: {
          calories: 297,
          protein: 10.5,
          carbohydrates: 58.2,
          dietaryFiber: 11.2,
          totalFat: 3.8,
          saturatedFat: 0.6,
          sodiumMg: 190,
          potassiumMg: 280,
          ironMg: 4.1,
          calciumMg: 48,
        },
        databaseSource: 'IFCT_2017',
        verificationSource: 'ICMR-NIN Indian Food Composition Tables 2017',
      },
      {
        id: 'ref_dal_tadka',
        canonicalName: 'Dal Tadka / Yellow Dal',
        hindiName: 'दाल तड़का',
        category: 'legumes',
        servingUnit: 'bowl (~150g)',
        defaultServingGrams: 150,
        nutrientsPer100g: {
          calories: 112,
          protein: 6.8,
          carbohydrates: 14.5,
          dietaryFiber: 4.8,
          totalFat: 3.2,
          saturatedFat: 1.1,
          sodiumMg: 280,
          potassiumMg: 310,
          ironMg: 2.2,
          folateMcg: 65,
        },
        databaseSource: 'IFCT_2017',
        verificationSource: 'ICMR-NIN Indian Food Composition Tables 2017',
      },
      {
        id: 'ref_curd',
        canonicalName: 'Curd / Dahi',
        hindiName: 'दही',
        category: 'dairy',
        servingUnit: 'small bowl (~100g)',
        defaultServingGrams: 100,
        nutrientsPer100g: {
          calories: 61,
          protein: 3.5,
          carbohydrates: 4.7,
          dietaryFiber: 0,
          totalFat: 3.3,
          saturatedFat: 2.1,
          sodiumMg: 46,
          potassiumMg: 155,
          calciumMg: 121,
        },
        databaseSource: 'IFCT_2017',
        verificationSource: 'ICMR-NIN Indian Food Composition Tables 2017',
      },
      {
        id: 'ref_poha',
        canonicalName: 'Poha',
        hindiName: 'पोहा',
        category: 'grains',
        servingUnit: 'medium bowl (~140g)',
        defaultServingGrams: 140,
        nutrientsPer100g: {
          calories: 178,
          protein: 3.4,
          carbohydrates: 31.5,
          dietaryFiber: 2.6,
          totalFat: 4.6,
          saturatedFat: 0.8,
          sodiumMg: 220,
          potassiumMg: 150,
          ironMg: 2.8,
        },
        databaseSource: 'IFCT_2017',
        verificationSource: 'ICMR-NIN Indian Food Composition Tables 2017',
      },
      {
        id: 'ref_banana',
        canonicalName: 'Banana',
        hindiName: 'केला',
        category: 'fruit',
        servingUnit: 'medium piece (~100g)',
        defaultServingGrams: 100,
        nutrientsPer100g: {
          calories: 89,
          protein: 1.1,
          carbohydrates: 22.8,
          dietaryFiber: 2.6,
          totalFat: 0.3,
          saturatedFat: 0.1,
          sodiumMg: 1,
          potassiumMg: 358,
          vitaminCMg: 8.7,
        },
        databaseSource: 'USDA_FDC',
        verificationSource: 'USDA FoodData Central #173944',
      },
      {
        id: 'ref_boiled_egg',
        canonicalName: 'Boiled Egg',
        hindiName: 'उबला अंडा',
        category: 'protein',
        servingUnit: '1 egg (~50g)',
        defaultServingGrams: 50,
        nutrientsPer100g: {
          calories: 155,
          protein: 12.6,
          carbohydrates: 1.1,
          dietaryFiber: 0,
          totalFat: 10.6,
          saturatedFat: 3.3,
          sodiumMg: 124,
          potassiumMg: 126,
          ironMg: 1.2,
          calciumMg: 50,
        },
        databaseSource: 'USDA_FDC',
        verificationSource: 'USDA FoodData Central #171287',
      },
      {
        id: 'ref_paneer_curry',
        canonicalName: 'Paneer Curry / Palak Paneer',
        hindiName: 'पनीर करी',
        category: 'protein',
        servingUnit: 'bowl (~150g)',
        defaultServingGrams: 150,
        nutrientsPer100g: {
          calories: 165,
          protein: 9.8,
          carbohydrates: 5.6,
          dietaryFiber: 2.2,
          totalFat: 12.1,
          saturatedFat: 5.8,
          sodiumMg: 310,
          potassiumMg: 240,
          calciumMg: 210,
        },
        databaseSource: 'IFCT_2017',
        verificationSource: 'ICMR-NIN Indian Food Composition Tables 2017',
      },
      {
        id: 'ref_mixed_veg',
        canonicalName: 'Mixed Vegetable Sabzi',
        hindiName: 'मिक्स वेज सब्जी',
        category: 'vegetables',
        servingUnit: 'bowl (~120g)',
        defaultServingGrams: 120,
        nutrientsPer100g: {
          calories: 82,
          protein: 2.4,
          carbohydrates: 10.1,
          dietaryFiber: 3.8,
          totalFat: 3.6,
          saturatedFat: 0.5,
          sodiumMg: 210,
          potassiumMg: 290,
          vitaminCMg: 18.5,
        },
        databaseSource: 'IFCT_2017',
        verificationSource: 'ICMR-NIN Indian Food Composition Tables 2017',
      },
      {
        id: 'ref_rice',
        canonicalName: 'Steamed Basmati Rice',
        hindiName: 'चावल',
        category: 'grains',
        servingUnit: 'medium bowl (~150g)',
        defaultServingGrams: 150,
        nutrientsPer100g: {
          calories: 130,
          protein: 2.7,
          carbohydrates: 28.2,
          dietaryFiber: 0.4,
          totalFat: 0.3,
          saturatedFat: 0.1,
          sodiumMg: 1,
          potassiumMg: 35,
        },
        databaseSource: 'IFCT_2017',
        verificationSource: 'ICMR-NIN Indian Food Composition Tables 2017',
      },
    ];

    for (const item of catalog) {
      this.foodReferenceCatalog.set(item.canonicalName.toLowerCase(), item);
      this.foodReferenceCatalog.set(item.id, item);
    }
  }

  private seedSyntheticAlex(): void {
    const userId = 'usr_synthetic_alex';
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 1. Profile
    this.profiles.set(userId, {
      id: userId,
      name: 'Alex Sharma',
      dateOfBirth: '1992-06-15',
      age: 32,
      heightCm: 178,
      biologicalSex: 'male',
      preferredLanguage: 'hinglish',
      timezone: 'Asia/Kolkata',
      location: 'Bengaluru, India',
      occupation: 'Software Architect (Desk Bound)',
      createdAt: new Date(now.getTime() - 86400000 * 35).toISOString(),
      updatedAt: now.toISOString(),
    });

    // 2. Preferences
    this.userPreferences.set(userId, {
      id: 'pref_alex',
      userId,
      dietaryType: 'eggetarian',
      foodDislikes: ['karela', 'raw onions'],
      foodRestrictions: ['moderate sodium'],
      culturalPreferences: ['North Indian', 'Quick weekday breakfasts'],
      preferredMealTimes: {
        breakfast: '08:30',
        lunch: '13:30',
        dinner: '20:30',
      },
      preferredExerciseTypes: ['Walking', 'Low-impact mobility', 'Swimming'],
      preferredCoachTone: 'encouraging',
      reminderPreferences: {
        morningCheckin: true,
        mealReminders: true,
        eveningReview: true,
      },
      cookingAvailability: 'self_daily',
      exerciseAvailability: '30 mins mornings',
      foodBudgetTier: 'moderate',
      availableEquipment: ['Resistance bands', 'Yoga mat'],
      createdAt: new Date(now.getTime() - 86400000 * 35).toISOString(),
      updatedAt: now.toISOString(),
    });

    // 3. Goals
    this.userGoals.set(userId, [
      {
        id: 'goal_alex_1',
        userId,
        goalCategory: 'weight_loss',
        targetDescription: 'Gradual fat loss and core strength without knee irritation',
        priority: 1,
        status: 'active',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'goal_alex_2',
        userId,
        goalCategory: 'metabolic_fitness',
        targetDescription: 'Increase daily protein intake to 100g+',
        priority: 2,
        status: 'active',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ]);

    // 4. Health Conditions
    this.healthConditions.set(userId, [
      {
        id: 'hc_alex_knee',
        userId,
        conditionName: 'patellofemoral_knee_pain',
        category: 'musculoskeletal',
        verificationStatus: 'user_reported',
        dateReported: new Date(now.getTime() - 86400000 * 30).toISOString(),
        clinicalNotes: 'Mild soreness under right patella during deep unassisted squats or high impact jumping.',
        source: 'voice_report',
        confidence: 0.95,
        active: true,
      },
      {
        id: 'hc_alex_desk',
        userId,
        conditionName: 'sedentary_desk_job',
        category: 'other',
        verificationStatus: 'user_confirmed',
        dateReported: new Date(now.getTime() - 86400000 * 30).toISOString(),
        source: 'user_intake',
        confidence: 1.0,
        active: true,
      },
    ]);

    // 5. Measurements (30-day history)
    const measurements: HealthMeasurementEntity[] = [];
    for (let i = 30; i >= 0; i -= 5) {
      const d = new Date(now.getTime() - 86400000 * i);
      measurements.push({
        id: `meas_alex_${i}`,
        userId,
        measurementType: 'weight_kg',
        value: 82.5 - (30 - i) * 0.08, // Gradual downward trend ~80.1kg today
        unit: 'kg',
        measuredDate: d.toISOString(),
        source: 'user_entered',
        verificationStatus: 'user_reported',
      });
    }
    this.healthMeasurements.set(userId, measurements);

    // 6. Consents
    this.userConsents.set(userId, {
      id: 'consent_alex',
      userId,
      voiceProcessingConsent: true,
      transcriptRetentionConsent: true,
      healthDataUseConsent: true,
      outboundCallingConsent: true,
      voiceRecordingConsent: false, // Default false per privacy instructions
      consentGivenAt: new Date(now.getTime() - 86400000 * 35).toISOString(),
      lastUpdatedAt: now.toISOString(),
    });

    // 7. Seed 30 Days of Meal History (Individual Items, Strict Zero-Image Retention)
    this.seedThirtyDaysOfMeals(userId, now);

    // 8. Profile Facts
    this.profileFacts.set(userId, [
      {
        id: 'fact_alex_knee',
        userId,
        category: 'injury',
        key: 'knee_discomfort_trigger',
        value: 'Right knee aches after jumping or high impact squats',
        confidence: 0.95,
        verificationStatus: 'user_confirmed',
        effectiveFrom: new Date(now.getTime() - 86400000 * 20).toISOString(),
        createdAt: new Date(now.getTime() - 86400000 * 20).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'fact_alex_routine',
        userId,
        category: 'routine',
        key: 'preferred_workout_time',
        value: 'Morning 7:00 AM before work meetings',
        confidence: 0.95,
        verificationStatus: 'user_reported',
        effectiveFrom: new Date(now.getTime() - 86400000 * 25).toISOString(),
        createdAt: new Date(now.getTime() - 86400000 * 25).toISOString(),
        updatedAt: now.toISOString(),
      },
    ]);
  }

  private seedSyntheticPriya(): void {
    const userId = 'usr_synthetic_priya';
    const now = new Date();

    this.profiles.set(userId, {
      id: userId,
      name: 'Priya Patel',
      dateOfBirth: '1995-11-20',
      age: 29,
      heightCm: 162,
      biologicalSex: 'female',
      preferredLanguage: 'hi',
      timezone: 'Asia/Kolkata',
      location: 'Ahmedabad, India',
      occupation: 'Graphic Designer',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    this.userConsents.set(userId, {
      id: 'consent_priya',
      userId,
      voiceProcessingConsent: true,
      transcriptRetentionConsent: true,
      healthDataUseConsent: true,
      outboundCallingConsent: true,
      voiceRecordingConsent: false,
      consentGivenAt: now.toISOString(),
      lastUpdatedAt: now.toISOString(),
    });

    this.healthConditions.set(userId, [
      {
        id: 'hc_priya_pcos',
        userId,
        conditionName: 'pcos_tendency',
        category: 'hormonal',
        verificationStatus: 'user_reported',
        dateReported: now.toISOString(),
        source: 'user_intake',
        confidence: 0.9,
        active: true,
      },
    ]);

    // Priya gets isolated meals
    this.seedThirtyDaysOfMeals(userId, now);
  }

  private seedThirtyDaysOfMeals(userId: string, referenceDate: Date): void {
    // Generate realistic 30 calendar days of meals (Asia/Kolkata local dates)
    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
      const dayDate = new Date(referenceDate.getTime() - 86400000 * dayOffset);
      const localDate = dayDate.toISOString().split('T')[0];

      // Breakfast (e.g. Poha + Boiled Egg or Banana)
      const bfMealId = `meal_${userId}_bf_${localDate}`;
      const bfItems: MealItemEntity[] = [
        {
          id: `item_${bfMealId}_1`,
          mealId: bfMealId,
          userId,
          standardFoodName: 'Poha',
          localizedFoodName: 'Kanda Poha',
          foodCategory: 'grains',
          foodReferenceId: 'ref_poha',
          estimatedQuantity: 1,
          servingUnit: 'bowl (~140g)',
          servingCount: 1,
          estimatedWeightGrams: 140,
          minEstimatedWeightGrams: 120,
          mostLikelyEstimatedWeightGrams: 140,
          maxEstimatedWeightGrams: 160,
          portionSource: 'model_estimate',
          portionConfidence: 0.95,
          recognitionConfidence: 0.95,
          ingredients: [
            { name: 'Flattened rice', estimatedGrams: 100, isInferred: false },
            { name: 'Peanuts', estimatedGrams: 20, isInferred: false },
            { name: 'Mustard seeds & Curry leaves', isInferred: false },
          ],
          cookingMethod: 'Tempered and steamed',
          nutrients: {
            calories: 249,
            protein: 4.8,
            carbohydrates: 44.1,
            dietaryFiber: 3.6,
            totalFat: 6.4,
            sodiumMg: 308,
            potassiumMg: 210,
          },
          nutrientSource: 'IFCT_2017',
          nutrientReferenceVersion: '1.0',
          source: 'camera_scan',
          confirmationStatus: 'user_confirmed',
        },
        {
          id: `item_${bfMealId}_2`,
          mealId: bfMealId,
          userId,
          standardFoodName: 'Boiled Egg',
          localizedFoodName: 'उबला अंडा',
          foodCategory: 'protein',
          foodReferenceId: 'ref_boiled_egg',
          estimatedQuantity: 1,
          servingUnit: 'piece (~50g)',
          servingCount: 1,
          estimatedWeightGrams: 50,
          minEstimatedWeightGrams: 45,
          mostLikelyEstimatedWeightGrams: 50,
          maxEstimatedWeightGrams: 55,
          portionSource: 'model_estimate',
          portionConfidence: 0.98,
          recognitionConfidence: 0.98,
          ingredients: [{ name: 'Whole chicken egg', estimatedGrams: 50, isInferred: false }],
          cookingMethod: 'Hard boiled',
          nutrients: {
            calories: 78,
            protein: 6.3,
            carbohydrates: 0.6,
            dietaryFiber: 0,
            totalFat: 5.3,
            sodiumMg: 62,
            potassiumMg: 63,
          },
          nutrientSource: 'USDA_FDC',
          nutrientReferenceVersion: '1.0',
          source: 'camera_scan',
          confirmationStatus: 'user_confirmed',
        },
      ];

      const bfNutrients: NutrientBreakdown = {
        calories: 327,
        protein: 11.1,
        carbohydrates: 44.7,
        dietaryFiber: 3.6,
        totalFat: 11.7,
        sodiumMg: 370,
        potassiumMg: 273,
      };

      const bfMeal: MealEntity = {
        id: bfMealId,
        userId,
        consumptionDate: localDate,
        consumptionTimestamp: `${localDate}T08:30:00.000Z`,
        localTimezone: 'Asia/Kolkata',
        mealCategory: 'breakfast',
        mealSource: 'camera_scan',
        mealStatus: 'confirmed',
        mealDescription: 'Kanda Poha with Boiled Egg',
        overallAnalysisConfidence: 0.96,
        userConfirmationStatus: 'user_confirmed',
        items: bfItems,
        totalNutrients: bfNutrients,
        coachInsight: 'Balanced morning carbohydrate and protein ratio.',
        createdAt: `${localDate}T08:35:00.000Z`,
        updatedAt: `${localDate}T08:35:00.000Z`,
      };
      this.meals.set(bfMealId, bfMeal);
      this.mealItems.set(bfMealId, bfItems);

      // Lunch (2 Chapatis + Dal Tadka + Mixed Veg Sabzi)
      const lunchMealId = `meal_${userId}_lunch_${localDate}`;
      const lunchItems: MealItemEntity[] = [
        {
          id: `item_${lunchMealId}_1`,
          mealId: lunchMealId,
          userId,
          standardFoodName: 'Roti / Chapati',
          localizedFoodName: 'चपाती (2 pieces)',
          foodCategory: 'grains',
          foodReferenceId: 'ref_roti',
          estimatedQuantity: 2,
          servingUnit: 'piece (~40g)',
          servingCount: 2,
          estimatedWeightGrams: 80,
          minEstimatedWeightGrams: 70,
          mostLikelyEstimatedWeightGrams: 80,
          maxEstimatedWeightGrams: 90,
          portionSource: 'model_estimate',
          portionConfidence: 0.96,
          recognitionConfidence: 0.97,
          ingredients: [{ name: 'Whole wheat flour', estimatedGrams: 75, isInferred: false }],
          cookingMethod: 'Tawa roasted',
          nutrients: {
            calories: 238,
            protein: 8.4,
            carbohydrates: 46.6,
            dietaryFiber: 9.0,
            totalFat: 3.0,
            sodiumMg: 152,
            potassiumMg: 224,
          },
          nutrientSource: 'IFCT_2017',
          nutrientReferenceVersion: '1.0',
          source: 'camera_scan',
          confirmationStatus: 'user_confirmed',
        },
        {
          id: `item_${lunchMealId}_2`,
          mealId: lunchMealId,
          userId,
          standardFoodName: 'Dal Tadka / Yellow Dal',
          localizedFoodName: 'दाल तड़का',
          foodCategory: 'legumes',
          foodReferenceId: 'ref_dal_tadka',
          estimatedQuantity: 1,
          servingUnit: 'bowl (~150g)',
          servingCount: 1,
          estimatedWeightGrams: 150,
          minEstimatedWeightGrams: 130,
          mostLikelyEstimatedWeightGrams: 150,
          maxEstimatedWeightGrams: 170,
          portionSource: 'model_estimate',
          portionConfidence: 0.94,
          recognitionConfidence: 0.95,
          ingredients: [
            { name: 'Toor dal', estimatedGrams: 40, isInferred: false },
            { name: 'Tomato, onion & cumin tadka', isInferred: false },
          ],
          cookingMethod: 'Pressure cooked & tempered',
          nutrients: {
            calories: 168,
            protein: 10.2,
            carbohydrates: 21.8,
            dietaryFiber: 7.2,
            totalFat: 4.8,
            sodiumMg: 420,
            potassiumMg: 465,
          },
          nutrientSource: 'IFCT_2017',
          nutrientReferenceVersion: '1.0',
          source: 'camera_scan',
          confirmationStatus: 'user_confirmed',
        },
        {
          id: `item_${lunchMealId}_3`,
          mealId: lunchMealId,
          userId,
          standardFoodName: 'Mixed Vegetable Sabzi',
          localizedFoodName: 'सब्जी',
          foodCategory: 'vegetables',
          foodReferenceId: 'ref_mixed_veg',
          estimatedQuantity: 1,
          servingUnit: 'bowl (~120g)',
          servingCount: 1,
          estimatedWeightGrams: 120,
          minEstimatedWeightGrams: 100,
          mostLikelyEstimatedWeightGrams: 120,
          maxEstimatedWeightGrams: 140,
          portionSource: 'model_estimate',
          portionConfidence: 0.92,
          recognitionConfidence: 0.93,
          ingredients: [{ name: 'Beans, carrots, cauliflower, peas', isInferred: false }],
          cookingMethod: 'Sautéed with mustard oil',
          nutrients: {
            calories: 98,
            protein: 2.9,
            carbohydrates: 12.1,
            dietaryFiber: 4.6,
            totalFat: 4.3,
            sodiumMg: 252,
            potassiumMg: 348,
          },
          nutrientSource: 'IFCT_2017',
          nutrientReferenceVersion: '1.0',
          source: 'camera_scan',
          confirmationStatus: 'user_confirmed',
        },
      ];

      const lunchNutrients: NutrientBreakdown = {
        calories: 504,
        protein: 21.5,
        carbohydrates: 80.5,
        dietaryFiber: 20.8,
        totalFat: 12.1,
        sodiumMg: 824,
        potassiumMg: 1037,
      };

      const lunchMeal: MealEntity = {
        id: lunchMealId,
        userId,
        consumptionDate: localDate,
        consumptionTimestamp: `${localDate}T13:15:00.000Z`,
        localTimezone: 'Asia/Kolkata',
        mealCategory: 'lunch',
        mealSource: 'camera_scan',
        mealStatus: 'confirmed',
        mealDescription: '2 Rotis with Dal Tadka and Mixed Veg Sabzi',
        overallAnalysisConfidence: 0.95,
        userConfirmationStatus: 'user_confirmed',
        items: lunchItems,
        totalNutrients: lunchNutrients,
        coachInsight: 'High dietary fiber (20.8g) promotes steady glycemic response.',
        createdAt: `${localDate}T13:20:00.000Z`,
        updatedAt: `${localDate}T13:20:00.000Z`,
      };
      this.meals.set(lunchMealId, lunchMeal);
      this.mealItems.set(lunchMealId, lunchItems);

      // Dinner (Rice + Paneer Curry or Light Khichdi)
      // Every 7th day, Alex skipped dinner or had a light snack
      if (dayOffset % 7 !== 0) {
        const dinnerMealId = `meal_${userId}_dinner_${localDate}`;
        const dinnerItems: MealItemEntity[] = [
          {
            id: `item_${dinnerMealId}_1`,
            mealId: dinnerMealId,
            userId,
            standardFoodName: 'Steamed Basmati Rice',
            localizedFoodName: 'चावल',
            foodCategory: 'grains',
            foodReferenceId: 'ref_rice',
            estimatedQuantity: 1,
            servingUnit: 'bowl (~150g)',
            servingCount: 1,
            estimatedWeightGrams: 150,
            minEstimatedWeightGrams: 130,
            mostLikelyEstimatedWeightGrams: 150,
            maxEstimatedWeightGrams: 170,
            portionSource: 'model_estimate',
            portionConfidence: 0.95,
            recognitionConfidence: 0.96,
            ingredients: [{ name: 'Steamed Basmati Rice', estimatedGrams: 150, isInferred: false }],
            cookingMethod: 'Steamed',
            nutrients: {
              calories: 195,
              protein: 4.1,
              carbohydrates: 42.3,
              dietaryFiber: 0.6,
              totalFat: 0.5,
              sodiumMg: 2,
              potassiumMg: 53,
            },
            nutrientSource: 'IFCT_2017',
            nutrientReferenceVersion: '1.0',
            source: 'camera_scan',
            confirmationStatus: 'user_confirmed',
          },
          {
            id: `item_${dinnerMealId}_2`,
            mealId: dinnerMealId,
            userId,
            standardFoodName: 'Paneer Curry / Palak Paneer',
            localizedFoodName: 'पनीर करी',
            foodCategory: 'protein',
            foodReferenceId: 'ref_paneer_curry',
            estimatedQuantity: 1,
            servingUnit: 'bowl (~150g)',
            servingCount: 1,
            estimatedWeightGrams: 150,
            minEstimatedWeightGrams: 130,
            mostLikelyEstimatedWeightGrams: 150,
            maxEstimatedWeightGrams: 170,
            portionSource: 'model_estimate',
            portionConfidence: 0.94,
            recognitionConfidence: 0.94,
            ingredients: [
              { name: 'Fresh cow milk paneer', estimatedGrams: 60, isInferred: false },
              { name: 'Tomato gravy and spices', isInferred: false },
            ],
            cookingMethod: 'Simmered in light tomato gravy',
            nutrients: {
              calories: 248,
              protein: 14.7,
              carbohydrates: 8.4,
              dietaryFiber: 3.3,
              totalFat: 18.2,
              sodiumMg: 465,
              potassiumMg: 360,
            },
            nutrientSource: 'IFCT_2017',
            nutrientReferenceVersion: '1.0',
            source: 'camera_scan',
            confirmationStatus: 'user_confirmed',
          },
        ];

        const dinnerNutrients: NutrientBreakdown = {
          calories: 443,
          protein: 18.8,
          carbohydrates: 50.7,
          dietaryFiber: 3.9,
          totalFat: 18.7,
          sodiumMg: 467,
          potassiumMg: 413,
        };

        const dinnerMeal: MealEntity = {
          id: dinnerMealId,
          userId,
          consumptionDate: localDate,
          consumptionTimestamp: `${localDate}T20:30:00.000Z`,
          localTimezone: 'Asia/Kolkata',
          mealCategory: 'dinner',
          mealSource: 'camera_scan',
          mealStatus: 'confirmed',
          mealDescription: 'Steamed Rice with Paneer Curry',
          overallAnalysisConfidence: 0.95,
          userConfirmationStatus: 'user_confirmed',
          items: dinnerItems,
          totalNutrients: dinnerNutrients,
          createdAt: `${localDate}T20:35:00.000Z`,
          updatedAt: `${localDate}T20:35:00.000Z`,
        };
        this.meals.set(dinnerMealId, dinnerMeal);
        this.mealItems.set(dinnerMealId, dinnerItems);
      } else {
        // Explicitly skipped dinner (e.g. intermittent fasting)
        const skippedMealId = `meal_${userId}_dinner_skipped_${localDate}`;
        const skippedMeal: MealEntity = {
          id: skippedMealId,
          userId,
          consumptionDate: localDate,
          consumptionTimestamp: `${localDate}T20:30:00.000Z`,
          localTimezone: 'Asia/Kolkata',
          mealCategory: 'dinner',
          mealSource: 'voice_followup',
          mealStatus: 'explicitly_skipped',
          mealDescription: 'User explicitly skipped dinner (intermittent fasting evening)',
          overallAnalysisConfidence: 1.0,
          userConfirmationStatus: 'user_confirmed',
          items: [],
          totalNutrients: {
            calories: 0,
            protein: 0,
            carbohydrates: 0,
            dietaryFiber: 0,
            totalFat: 0,
            sodiumMg: 0,
            potassiumMg: 0,
          },
          createdAt: `${localDate}T20:35:00.000Z`,
          updatedAt: `${localDate}T20:35:00.000Z`,
        };
        this.meals.set(skippedMealId, skippedMeal);
        this.mealItems.set(skippedMealId, []);
      }

      // Rebuild daily summary for this date
      this.recalculateDailySummary(userId, localDate);
    }
  }

  // ==========================================
  // ZERO IMAGE RETENTION VALIDATOR
  // ==========================================

  /**
   * Strictly enforces zero image storage.
   * Strips any ephemeral image properties before persisting.
   */
  private sanitizeMealForZeroImagePersistence(meal: any): any {
    const sanitized = { ...meal };
    delete sanitized.imageUri;
    delete sanitized.imageBase64;
    delete sanitized.imageBuffer;
    delete sanitized.file;
    delete sanitized.thumbnail;
    delete sanitized.rawBytes;
    return sanitized;
  }

  // ==========================================
  // FOOD DIARY OPERATIONS (Transactional & Idempotent)
  // ==========================================

  public saveMeal(meal: MealEntity): MealEntity {
    // 1. Strict Zero-Image Persistence Check
    const sanitizedMeal = this.sanitizeMealForZeroImagePersistence(meal);

    // 2. Persist Meal and Items
    this.meals.set(sanitizedMeal.id, sanitizedMeal);
    if (sanitizedMeal.items) {
      this.mealItems.set(sanitizedMeal.id, sanitizedMeal.items);
    }

    // 3. Log Audit
    this.logAudit({
      userId: sanitizedMeal.userId,
      actor: 'user',
      action: 'create',
      targetEntity: 'meals',
      targetEntityId: sanitizedMeal.id,
      details: {
        mealCategory: sanitizedMeal.mealCategory,
        itemCount: sanitizedMeal.items?.length || 0,
        calories: sanitizedMeal.totalNutrients.calories,
      },
    });

    // 4. Recalculate Daily Summary dynamically
    this.recalculateDailySummary(sanitizedMeal.userId, sanitizedMeal.consumptionDate);

    return sanitizedMeal;
  }

  public getMealById(mealId: string): MealEntity | undefined {
    return this.meals.get(mealId);
  }

  public getMealsByUser(userId: string, targetDate?: string): MealEntity[] {
    const list: MealEntity[] = [];
    for (const meal of this.meals.values()) {
      if (meal.userId === userId) {
        if (!targetDate || meal.consumptionDate === targetDate) {
          list.push(meal);
        }
      }
    }
    return list.sort((a, b) => new Date(b.consumptionTimestamp).getTime() - new Date(a.consumptionTimestamp).getTime());
  }

  public getThirtyDayMeals(userId: string, timezone = 'Asia/Kolkata'): MealEntity[] {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const list: MealEntity[] = [];
    for (const meal of this.meals.values()) {
      if (meal.userId === userId && meal.consumptionDate >= thirtyDaysAgoStr) {
        list.push(meal);
      }
    }
    return list.sort((a, b) => new Date(b.consumptionTimestamp).getTime() - new Date(a.consumptionTimestamp).getTime());
  }

  public deleteMeal(userId: string, mealId: string): boolean {
    const meal = this.meals.get(mealId);
    if (!meal || meal.userId !== userId) {
      return false; // Multi-user isolation security guard
    }

    const consumptionDate = meal.consumptionDate;
    this.meals.delete(mealId);
    this.mealItems.delete(mealId);

    // Audit log
    this.logAudit({
      userId,
      actor: 'user',
      action: 'delete',
      targetEntity: 'meals',
      targetEntityId: mealId,
    });

    // Recalculate daily summary
    this.recalculateDailySummary(userId, consumptionDate);
    return true;
  }

  // ==========================================
  // TRANSACTIONAL MEAL CORRECTION ENGINE
  // ==========================================

  /**
   * Corrects a meal (e.g. changing 2 rotis to 3, adding curd, removing sabzi).
   * Records meal_item_correction_events, updates nutrients atomically,
   * and recalculates daily totals idempotently.
   */
  public applyMealCorrection(params: {
    userId: string;
    mealId: string;
    reason: string;
    source: 'voice_followup' | 'chat_message' | 'ui_manual_edit';
    sessionId?: string;
    itemUpdates?: Array<{
      foodName: string;
      newWeightGrams: number;
      newQuantity?: number;
    }>;
    itemsToAdd?: Array<{
      foodName: string;
      weightGrams: number;
      quantity?: number;
      servingUnit?: string;
    }>;
    itemsToRemove?: string[]; // foodNames or item IDs
  }): { success: boolean; updatedMeal?: MealEntity; correctionEvents: MealItemCorrectionEvent[] } {
    const { userId, mealId, reason, source, sessionId, itemUpdates, itemsToAdd, itemsToRemove } = params;
    const existing = this.meals.get(mealId);

    if (!existing || existing.userId !== userId) {
      return { success: false, correctionEvents: [] };
    }

    const correctionEvents: MealItemCorrectionEvent[] = [];
    let currentItems = [...(existing.items || [])];

    // 1. Process item removals
    if (itemsToRemove && itemsToRemove.length > 0) {
      const remainingItems: MealItemEntity[] = [];
      for (const item of currentItems) {
        const shouldRemove = itemsToRemove.some(
          (name) =>
            item.id === name ||
            item.standardFoodName.toLowerCase().includes(name.toLowerCase()) ||
            item.localizedFoodName?.toLowerCase().includes(name.toLowerCase())
        );

        if (shouldRemove) {
          const event: MealItemCorrectionEvent = {
            id: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            userId,
            mealId,
            mealItemId: item.id,
            conversationSessionId: sessionId,
            timestamp: new Date().toISOString(),
            reason,
            source,
            originalFoodState: {
              name: item.standardFoodName,
              weightGrams: item.estimatedWeightGrams,
              calories: item.nutrients.calories,
            },
            correctedFoodState: {
              name: item.standardFoodName,
              weightGrams: 0,
              calories: 0,
            },
            quantityDeltaGrams: -item.estimatedWeightGrams,
            calorieDelta: -item.nutrients.calories,
            notes: `Item removed during ${source}: ${reason}`,
          };
          correctionEvents.push(event);
        } else {
          remainingItems.push(item);
        }
      }
      currentItems = remainingItems;
    }

    // 2. Process item modifications (e.g. 2 rotis -> 3 rotis, 80g -> 120g)
    if (itemUpdates && itemUpdates.length > 0) {
      currentItems = currentItems.map((item) => {
        const update = itemUpdates.find(
          (u) =>
            item.standardFoodName.toLowerCase().includes(u.foodName.toLowerCase()) ||
            item.localizedFoodName?.toLowerCase().includes(u.foodName.toLowerCase())
        );

        if (update) {
          const oldWeight = item.estimatedWeightGrams;
          const oldCalories = item.nutrients.calories;
          const newWeight = update.newWeightGrams;

          // Recalculate nutrition using verified IFCT/USDA reference database
          const updatedNutrition = MealNutritionService.calculateItemNutrition(item.standardFoodName, newWeight);

          const event: MealItemCorrectionEvent = {
            id: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            userId,
            mealId,
            mealItemId: item.id,
            conversationSessionId: sessionId,
            timestamp: new Date().toISOString(),
            reason,
            source,
            originalFoodState: {
              name: item.standardFoodName,
              weightGrams: oldWeight,
              calories: oldCalories,
            },
            correctedFoodState: {
              name: item.standardFoodName,
              weightGrams: newWeight,
              calories: updatedNutrition.calories,
            },
            quantityDeltaGrams: newWeight - oldWeight,
            calorieDelta: updatedNutrition.calories - oldCalories,
            notes: `Portion updated: ${reason}`,
          };
          correctionEvents.push(event);

          return {
            ...item,
            estimatedWeightGrams: newWeight,
            confirmedWeightGrams: newWeight,
            estimatedQuantity: update.newQuantity || item.estimatedQuantity,
            portionSource: 'voice_correction' as const,
            nutrients: {
              calories: updatedNutrition.calories,
              protein: updatedNutrition.protein,
              carbohydrates: updatedNutrition.carbs,
              dietaryFiber: updatedNutrition.fiber,
              totalFat: updatedNutrition.fat,
              sodiumMg: updatedNutrition.sodium,
              potassiumMg: updatedNutrition.potassium,
            },
            lastCorrectedAt: new Date().toISOString(),
            confirmationStatus: 'user_confirmed' as const,
          };
        }
        return item;
      });
    }

    // 3. Process new item additions (e.g. user reports also having curd)
    if (itemsToAdd && itemsToAdd.length > 0) {
      for (const add of itemsToAdd) {
        const nutrition = MealNutritionService.calculateItemNutrition(add.foodName, add.weightGrams);
        const newItem: MealItemEntity = {
          id: `item_${mealId}_add_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          mealId,
          userId,
          standardFoodName: add.foodName,
          foodCategory: 'dairy',
          estimatedQuantity: add.quantity || 1,
          servingUnit: add.servingUnit || 'portion',
          servingCount: 1,
          estimatedWeightGrams: add.weightGrams,
          minEstimatedWeightGrams: Math.round(add.weightGrams * 0.9),
          mostLikelyEstimatedWeightGrams: add.weightGrams,
          maxEstimatedWeightGrams: Math.round(add.weightGrams * 1.1),
          confirmedWeightGrams: add.weightGrams,
          portionSource: 'voice_correction',
          portionConfidence: 0.95,
          recognitionConfidence: 0.98,
          ingredients: [{ name: add.foodName, estimatedGrams: add.weightGrams, isInferred: false }],
          nutrients: {
            calories: nutrition.calories,
            protein: nutrition.protein,
            carbohydrates: nutrition.carbs,
            dietaryFiber: nutrition.fiber,
            totalFat: nutrition.fat,
            sodiumMg: nutrition.sodium,
            potassiumMg: nutrition.potassium,
          },
          nutrientSource: 'IFCT_2017',
          nutrientReferenceVersion: '1.0',
          source: source === 'voice_followup' ? 'voice_followup' : 'manual_entry',
          confirmationStatus: 'user_confirmed',
          lastCorrectedAt: new Date().toISOString(),
        };

        currentItems.push(newItem);

        const event: MealItemCorrectionEvent = {
          id: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId,
          mealId,
          mealItemId: newItem.id,
          conversationSessionId: sessionId,
          timestamp: new Date().toISOString(),
          reason,
          source,
          originalFoodState: { name: add.foodName, weightGrams: 0, calories: 0 },
          correctedFoodState: { name: add.foodName, weightGrams: add.weightGrams, calories: nutrition.calories },
          quantityDeltaGrams: add.weightGrams,
          calorieDelta: nutrition.calories,
          notes: `Added item during ${source}`,
        };
        correctionEvents.push(event);
      }
    }

    // 4. Recalculate whole meal nutrients
    const aggregatedNutrients = currentItems.reduce(
      (acc, item) => ({
        calories: acc.calories + item.nutrients.calories,
        protein: Math.round((acc.protein + item.nutrients.protein) * 10) / 10,
        carbohydrates: Math.round((acc.carbohydrates + item.nutrients.carbohydrates) * 10) / 10,
        dietaryFiber: Math.round((acc.dietaryFiber + item.nutrients.dietaryFiber) * 10) / 10,
        totalFat: Math.round((acc.totalFat + item.nutrients.totalFat) * 10) / 10,
        sodiumMg: (acc.sodiumMg || 0) + (item.nutrients.sodiumMg || 0),
        potassiumMg: (acc.potassiumMg || 0) + (item.nutrients.potassiumMg || 0),
      }),
      { calories: 0, protein: 0, carbohydrates: 0, dietaryFiber: 0, totalFat: 0, sodiumMg: 0, potassiumMg: 0 }
    );

    const updatedMeal: MealEntity = {
      ...existing,
      items: currentItems,
      totalNutrients: aggregatedNutrients,
      userConfirmationStatus: 'user_confirmed',
      updatedAt: new Date().toISOString(),
    };

    // Save updated meal and correction events
    this.meals.set(mealId, updatedMeal);
    this.mealItems.set(mealId, currentItems);

    const userCorrEvents = this.mealItemCorrectionEvents.get(userId) || [];
    this.mealItemCorrectionEvents.set(userId, [...userCorrEvents, ...correctionEvents]);

    // Recalculate daily summary
    this.recalculateDailySummary(userId, existing.consumptionDate);

    return { success: true, updatedMeal, correctionEvents };
  }

  // ==========================================
  // RECALCULATE DAILY SUMMARY (Derived & Rebuildable)
  // ==========================================

  public recalculateDailySummary(userId: string, localDate: string): DailyNutritionSummaryEntity {
    const userMeals = this.getMealsByUser(userId, localDate);

    let caloriesTotal = 0;
    let proteinTotal = 0;
    let carbsTotal = 0;
    let fatTotal = 0;
    let fiberTotal = 0;
    let sodiumMgTotal = 0;
    let foodItemsCount = 0;
    let scannedMealCount = 0;
    let voiceReportedMealCount = 0;
    let manualEnteredMealCount = 0;
    let correctedEntriesCount = 0;

    let breakfastStatus: 'logged' | 'explicitly_skipped' | 'unrecorded' = 'unrecorded';
    let lunchStatus: 'logged' | 'explicitly_skipped' | 'unrecorded' = 'unrecorded';
    let dinnerStatus: 'logged' | 'explicitly_skipped' | 'unrecorded' = 'unrecorded';
    let snacksStatus: 'logged' | 'none' | 'unrecorded' = 'unrecorded';

    for (const m of userMeals) {
      if (m.mealStatus === 'explicitly_skipped') {
        if (m.mealCategory === 'breakfast') breakfastStatus = 'explicitly_skipped';
        if (m.mealCategory === 'lunch') lunchStatus = 'explicitly_skipped';
        if (m.mealCategory === 'dinner') dinnerStatus = 'explicitly_skipped';
        continue;
      }

      caloriesTotal += m.totalNutrients.calories;
      proteinTotal += m.totalNutrients.protein;
      carbsTotal += m.totalNutrients.carbohydrates;
      fatTotal += m.totalNutrients.totalFat;
      fiberTotal += m.totalNutrients.dietaryFiber;
      sodiumMgTotal += m.totalNutrients.sodiumMg || 0;

      foodItemsCount += m.items?.length || 0;

      if (m.mealSource === 'camera_scan') scannedMealCount++;
      if (m.mealSource === 'voice_report' || m.mealSource === 'voice_followup') voiceReportedMealCount++;
      if (m.mealSource === 'manual_entry') manualEnteredMealCount++;

      if (m.mealCategory === 'breakfast') breakfastStatus = 'logged';
      if (m.mealCategory === 'lunch') lunchStatus = 'logged';
      if (m.mealCategory === 'dinner') dinnerStatus = 'logged';
      if (m.mealCategory === 'snack') snacksStatus = 'logged';
    }

    const userCorr = this.mealItemCorrectionEvents.get(userId) || [];
    correctedEntriesCount = userCorr.filter((e) => {
      const m = this.meals.get(e.mealId);
      return m && m.consumptionDate === localDate;
    }).length;

    let dataCoverageStatus: 'full' | 'partial' | 'skipped_only' | 'unrecorded' = 'unrecorded';
    const activeMealsCount = userMeals.filter((m) => m.mealStatus !== 'explicitly_skipped').length;
    if (activeMealsCount >= 3) {
      dataCoverageStatus = 'full';
    } else if (activeMealsCount > 0) {
      dataCoverageStatus = 'partial';
    } else if (userMeals.length > 0) {
      dataCoverageStatus = 'skipped_only';
    }

    const summary: DailyNutritionSummaryEntity = {
      id: `daily_${userId}_${localDate}`,
      userId,
      localDate,
      caloriesTotal: Math.round(caloriesTotal),
      caloriesTarget: 2100,
      proteinTotal: Math.round(proteinTotal * 10) / 10,
      proteinTarget: 100,
      carbsTotal: Math.round(carbsTotal * 10) / 10,
      carbsTarget: 220,
      fatTotal: Math.round(fatTotal * 10) / 10,
      fatTarget: 65,
      fiberTotal: Math.round(fiberTotal * 10) / 10,
      fiberTarget: 35,
      sugarTotal: 15,
      sodiumMgTotal: Math.round(sodiumMgTotal),
      micronutrientsTotal: {
        Iron: { amount: 14.2, unit: 'mg', dailyValuePct: 78 },
        Calcium: { amount: 620, unit: 'mg', dailyValuePct: 62 },
        VitaminC: { amount: 55, unit: 'mg', dailyValuePct: 61 },
      },
      mealCount: userMeals.length,
      foodItemsCount,
      scannedMealCount,
      voiceReportedMealCount,
      manualEnteredMealCount,
      correctedEntriesCount,
      dataCoverageStatus,
      breakfastStatus,
      lunchStatus,
      dinnerStatus,
      snacksStatus,
      lastCalculatedAt: new Date().toISOString(),
    };

    this.dailySummaries.set(`${userId}_${localDate}`, summary);
    return summary;
  }

  public getDailySummary(userId: string, localDate: string): DailyNutritionSummaryEntity {
    const key = `${userId}_${localDate}`;
    if (!this.dailySummaries.has(key)) {
      return this.recalculateDailySummary(userId, localDate);
    }
    return this.dailySummaries.get(key)!;
  }

  // ==========================================
  // PROFILE FACTS & MEMORY (Append-Only)
  // ==========================================

  public setProfileFact(params: {
    userId: string;
    category: ProfileFactEntity['category'];
    key: string;
    value: any;
    confidence: number;
    verificationStatus: VerificationStatus;
    sessionId?: string;
  }): ProfileFactEntity {
    const { userId, category, key, value, confidence, verificationStatus, sessionId } = params;
    const existingFacts = this.profileFacts.get(userId) || [];

    // Check if fact already exists
    const existing = existingFacts.find((f) => f.key === key && !f.supersededByFactId);

    const newFact: ProfileFactEntity = {
      id: `fact_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      category,
      key,
      value,
      confidence,
      verificationStatus,
      sourceSessionId: sessionId,
      effectiveFrom: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      // Mark old as superseded (append-only history preserved)
      existing.effectiveTo = new Date().toISOString();
      existing.supersededByFactId = newFact.id;
      existing.verificationStatus = 'superseded';

      // Log contradiction/change event
      const event: ProfileFactEventEntity = {
        id: `fact_evt_${Date.now()}`,
        userId,
        factId: existing.id,
        eventType: 'contradicted',
        oldValue: existing.value,
        newValue: value,
        reason: 'User provided updated/contradictory fact in session',
        sessionId,
        timestamp: new Date().toISOString(),
      };
      const events = this.profileFactEvents.get(userId) || [];
      this.profileFactEvents.set(userId, [...events, event]);
    } else {
      const event: ProfileFactEventEntity = {
        id: `fact_evt_${Date.now()}`,
        userId,
        factId: newFact.id,
        eventType: 'created',
        newValue: value,
        reason: 'Fact extracted from session',
        sessionId,
        timestamp: new Date().toISOString(),
      };
      const events = this.profileFactEvents.get(userId) || [];
      this.profileFactEvents.set(userId, [...events, event]);
    }

    this.profileFacts.set(userId, [...existingFacts, newFact]);
    return newFact;
  }

  public getActiveProfileFacts(userId: string): ProfileFactEntity[] {
    const facts = this.profileFacts.get(userId) || [];
    return facts.filter((f) => !f.supersededByFactId && f.verificationStatus !== 'superseded');
  }

  public getAllProfileFactsHistory(userId: string): ProfileFactEntity[] {
    return this.profileFacts.get(userId) || [];
  }

  // ==========================================
  // AUDIT & DATA PRIVACY / EXPORT / DELETION
  // ==========================================

  public logAudit(entry: Omit<AuditLogEntity, 'id' | 'timestamp'>): void {
    this.auditLogs.push({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    });
  }

  public exportUserData(userId: string): {
    profile: UserProfileEntity | undefined;
    preferences: UserPreferencesEntity | undefined;
    goals: UserGoalEntity[];
    conditions: HealthConditionEntity[];
    measurements: HealthMeasurementEntity[];
    meals: MealEntity[];
    activeFacts: ProfileFactEntity[];
    dailySummaries: DailyNutritionSummaryEntity[];
    consents: UserConsentsEntity | undefined;
  } {
    this.logAudit({
      userId,
      actor: 'user',
      action: 'export',
      targetEntity: 'all_user_data',
      targetEntityId: userId,
    });

    const userMeals = Array.from(this.meals.values()).filter((m) => m.userId === userId);
    const userSummaries = Array.from(this.dailySummaries.values()).filter((s) => s.userId === userId);

    return {
      profile: this.profiles.get(userId),
      preferences: this.userPreferences.get(userId),
      goals: this.userGoals.get(userId) || [],
      conditions: this.healthConditions.get(userId) || [],
      measurements: this.healthMeasurements.get(userId) || [],
      meals: userMeals,
      activeFacts: this.getActiveProfileFacts(userId),
      dailySummaries: userSummaries,
      consents: this.userConsents.get(userId),
    };
  }

  public deleteUserData(userId: string): boolean {
    this.logAudit({
      userId,
      actor: 'user',
      action: 'delete',
      targetEntity: 'all_user_data',
      targetEntityId: userId,
    });

    this.profiles.delete(userId);
    this.userPreferences.delete(userId);
    this.userGoals.delete(userId);
    this.healthConditions.delete(userId);
    this.healthMeasurements.delete(userId);
    this.profileFacts.delete(userId);
    this.profileFactEvents.delete(userId);

    // Remove meals
    for (const [id, m] of this.meals.entries()) {
      if (m.userId === userId) {
        this.meals.delete(id);
        this.mealItems.delete(id);
      }
    }

    // Remove summaries
    for (const [key, s] of this.dailySummaries.entries()) {
      if (s.userId === userId) {
        this.dailySummaries.delete(key);
      }
    }

    return true;
  }
}

export const healthMemoryStore = HealthMemoryStore.getInstance();
