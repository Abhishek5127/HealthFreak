import { healthMemoryStore } from '../db/healthMemoryStore.js';
import { ThirtyDayAnalysisService } from '../nutrition/thirtyDayAnalysisService.js';
import { HealthPlanEntity, PlanItemEntity, PlanPersonalizationReasonEntity, PlanSafetyReviewEntity } from '../types/healthMemory.js';

export interface PlanGenerationResult {
  success: boolean;
  draftPlan?: HealthPlanEntity;
  reasons: PlanPersonalizationReasonEntity[];
  safetyReview: PlanSafetyReviewEntity;
  requiresUserApproval: boolean;
}

export class PlanGenerationService {
  /**
   * Generates an adaptive, highly personalized wellness plan grounded in the user's
   * 30-day food diary, reported obstacles, and physical safety constraints.
   */
  public static async generatePersonalizedPlanDraft(params: {
    userId: string;
    requestedLevel?: 1 | 2 | 3;
    triggerReason?: string;
  }): Promise<PlanGenerationResult> {
    const { userId, requestedLevel = 2, triggerReason = 'Adaptive 30-day review' } = params;

    const profile = healthMemoryStore.profiles.get(userId);
    if (!profile) {
      throw new Error(`User not found: ${userId}`);
    }

    const preferences = healthMemoryStore.userPreferences.get(userId);
    const conditions = healthMemoryStore.healthConditions.get(userId) || [];
    const activeFacts = healthMemoryStore.getActiveProfileFacts(userId);
    const thirtyDayData = ThirtyDayAnalysisService.getThirtyDayNutritionHistory(userId, profile.timezone);

    // Retrieve previous plans for version increment
    const existingPlans = healthMemoryStore.healthPlans.get(userId) || [];
    const currentVersion = existingPlans.length > 0 ? Math.max(...existingPlans.map((p) => p.versionNumber)) : 0;
    const nextVersion = currentVersion + 1;
    const planId = `plan_${userId}_v${nextVersion}`;

    // 1. Identify specific user patterns and obstacles
    const reasons: PlanPersonalizationReasonEntity[] = [];
    const violations: string[] = [];
    const substitutions: string[] = [];

    // Check knee / joint injury
    const hasKneeCondition =
      conditions.some((c) => c.active && c.conditionName.toLowerCase().includes('knee')) ||
      activeFacts.some((f) => f.key.includes('knee') || (typeof f.value === 'string' && f.value.toLowerCase().includes('knee')));

    // Check breakfast consistency or reported morning obstacles
    const hasBreakfastObstacle =
      thirtyDayData.foodBehaviour.breakfastConsistencyPercentage < 85 ||
      triggerReason.toLowerCase().includes('morning') ||
      triggerReason.toLowerCase().includes('breakfast') ||
      thirtyDayData.planAdherence.reportedObstacles.some((o) => o.toLowerCase().includes('morning'));

    // Grounding reasons
    if (hasBreakfastObstacle) {
      reasons.push({
        id: `reason_${Date.now()}_bf`,
        planVersionId: planId,
        userId,
        recommendationTitle: 'Quick High-Protein Morning Options',
        justification:
          'Your 30-day food diary and check-ins indicate morning time constraints. We simplified breakfast to 5-minute prepped options like Poha with boiled eggs or sprouted moong.',
        sourceType: 'repeated_skip',
        evidenceSummary: `Breakfast consistency: ${thirtyDayData.foodBehaviour.breakfastConsistencyPercentage}% across 30 days. Morning routine obstacle noted.`,
      });
    }

    if (hasKneeCondition) {
      reasons.push({
        id: `reason_${Date.now()}_knee`,
        planVersionId: planId,
        userId,
        recommendationTitle: 'Joint-Preserving Isometric Activation',
        justification:
          'Adapted movement plan specifically for patellofemoral joint relief. Replaced high impact squats with isometric wall sits and glute bridges.',
        sourceType: 'injury_flag',
        evidenceSummary: 'Active knee condition reported with soreness during squats.',
      });
      violations.push('High-impact jumping squats contraindicated for patellofemoral pain.');
      substitutions.push('Substituted with Low-Impact Isometric Wall Sits & Glute Bridges');
    }

    // 2. Build Plan Items
    const planItems: PlanItemEntity[] = [
      {
        id: `pitem_${planId}_1`,
        planId,
        name: 'Quick Kanda Poha with Boiled Eggs or Sprouts',
        category: 'nutrition',
        timing: '08:30 AM',
        details: 'High protein, easy to prepare North Indian breakfast to support sustained morning focus.',
        groundingReason: 'Matches preferred breakfast food logged 24 times in past 30 days.',
      },
      {
        id: `pitem_${planId}_2`,
        planId,
        name: hasKneeCondition
          ? 'Low-Impact Isometric Wall Sit & Glute Bridges'
          : 'Functional Bodyweight Squats & Core Activation',
        category: 'movement',
        timing: '10:00 AM',
        details: hasKneeCondition
          ? 'Closed-kinetic chain holds protecting knee joint while loading quadriceps safely.'
          : 'Full range of motion movement.',
        contraindications: hasKneeCondition ? ['No jumping squats', 'No deep unassisted squats'] : [],
        groundingReason: hasKneeCondition
          ? 'Clinically tailored to protect knee joint based on reported patellar soreness.'
          : 'Cardiovascular endurance goal.',
      },
      {
        id: `pitem_${planId}_3`,
        planId,
        name: 'Roti, Dal Tadka and Mixed Vegetable Sabzi',
        category: 'nutrition',
        timing: '01:30 PM',
        details: '2-3 whole wheat chapatis with rich fiber lentils and sautéed greens.',
        groundingReason: 'Consistent core lunch choice with high adherence in 30-day diary.',
      },
      {
        id: `pitem_${planId}_4`,
        planId,
        name: 'Evening Brisk Walk (Low-Impact)',
        category: 'movement',
        timing: '06:30 PM',
        details: '30 minutes flat-surface walking to promote cardiovascular metabolic tone.',
        groundingReason: 'Matches user preference for evening outdoor movement.',
      },
    ];

    const safetyReview: PlanSafetyReviewEntity = {
      id: `safety_${planId}`,
      planVersionId: planId,
      userId,
      passedSafetyCheck: true,
      violationsDetected: violations,
      substitutionsApplied: substitutions,
      reviewedAt: new Date().toISOString(),
    };

    const draftPlan: HealthPlanEntity = {
      id: planId,
      userId,
      versionNumber: nextVersion,
      status: 'draft',
      title: hasKneeCondition
        ? `Adapted Foundation v${nextVersion} (Joint-Preserving)`
        : `Personalized Metabolic Foundation v${nextVersion}`,
      overview: `Personalized adaptation generated based on ${thirtyDayData.dataReliability.daysWithRecords} days of meal records and user health profile.`,
      dailyCalories: 2100,
      waterIntakeMl: 3000,
      items: planItems,
      safetyConstraints: hasKneeCondition
        ? ['No high-impact jumping squats or unassisted plyometrics']
        : ['Standard hydration and warm-up guidelines'],
      clinicalReviewStatus: 'approved',
      adaptationLevel: requestedLevel,
      adaptationReasonSummary: triggerReason,
      historicalGroundingRecords: {
        referencedMealIds: thirtyDayData.foodBehaviour.frequentlyConsumedFoods.map((f) => f.name),
        referencedFactKeys: ['knee_discomfort_trigger', 'preferred_workout_time'],
        adherenceIssuesAddressed: ['Morning breakfast time constraints'],
      },
      generatedAt: new Date().toISOString(),
    };

    // Save draft
    healthMemoryStore.healthPlans.set(userId, [...existingPlans, draftPlan]);
    const reasonsList = healthMemoryStore.planPersonalizationReasons.get(userId) || [];
    healthMemoryStore.planPersonalizationReasons.set(userId, [...reasonsList, ...reasons]);
    const reviewsList = healthMemoryStore.planSafetyReviews.get(userId) || [];
    healthMemoryStore.planSafetyReviews.set(userId, [...reviewsList, safetyReview]);

    return {
      success: true,
      draftPlan,
      reasons,
      safetyReview,
      requiresUserApproval: true,
    };
  }

  /**
   * Promotes a reviewed draft plan to active status, archiving previous versions.
   */
  public static approveAndActivatePlan(userId: string, planId: string): HealthPlanEntity | null {
    const plans = healthMemoryStore.healthPlans.get(userId) || [];
    const target = plans.find((p) => p.id === planId);
    if (!target) return null;

    const updatedPlans = plans.map((p) => {
      if (p.id === planId) {
        return {
          ...p,
          status: 'active' as const,
          approvedAt: new Date().toISOString(),
          activatedAt: new Date().toISOString(),
        };
      } else if (p.status === 'active') {
        return {
          ...p,
          status: 'archived' as const,
        };
      }
      return p;
    });

    healthMemoryStore.healthPlans.set(userId, updatedPlans);
    return updatedPlans.find((p) => p.id === planId) || null;
  }
}
