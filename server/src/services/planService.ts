import { z } from 'zod';
import { db, HealthPlan, PlanItem } from '../db/index.js';

// Strict schema validation for generated plans
export const PlanItemSchema = z.object({
  name: z.string().min(3),
  category: z.enum(['nutrition', 'movement', 'recovery']),
  timing: z.string(),
  details: z.string().min(5),
  contraindications: z.array(z.string()).optional(),
});

export const PlanGenerationDraftSchema = z.object({
  title: z.string().min(5),
  overview: z.string().min(10),
  dailyCalories: z.number().int().min(1000).max(4500),
  waterIntakeMl: z.number().int().min(1500).max(6000),
  items: z.array(PlanItemSchema).min(2),
  safetyConstraints: z.array(z.string()),
});

export type PlanGenerationDraft = z.infer<typeof PlanGenerationDraftSchema>;

export class PlanService {
  /**
   * Health safety validator engine.
   * Checks conditions and filters/flags contraindicated exercises or dietary hazards.
   */
  public static validateSafetyConstraints(draft: PlanGenerationDraft, knownConditions: string[]): {
    isValid: boolean;
    violations: string[];
    sanitizedDraft: PlanGenerationDraft;
  } {
    const violations: string[] = [];
    const sanitizedItems: PlanItem[] = [];

    // Joint / Knee pain rules
    const hasKneePain = knownConditions.some((c) =>
      c.toLowerCase().includes('knee') || c.toLowerCase().includes('joint')
    );
    const forbiddenKneeKeywords = ['jumping squat', 'plyometric burpee', 'box jump', 'heavy lunges', 'jump rope'];

    // Cardiovascular / Hypertension rules
    const hasCardioCondition = knownConditions.some((c) =>
      c.toLowerCase().includes('hypertension') || c.toLowerCase().includes('heart')
    );
    const forbiddenCardioKeywords = ['max heart rate sprint', 'valsalva heavy deadlift'];

    for (const item of draft.items) {
      const lowerName = item.name.toLowerCase();
      const lowerDetails = item.details.toLowerCase();

      let itemViolation = false;

      if (hasKneePain) {
        for (const kw of forbiddenKneeKeywords) {
          if (lowerName.includes(kw) || lowerDetails.includes(kw)) {
            violations.push(`Contraindicated for knee condition: "${item.name}" contains ${kw}`);
            itemViolation = true;
          }
        }
      }

      if (hasCardioCondition) {
        for (const kw of forbiddenCardioKeywords) {
          if (lowerName.includes(kw) || lowerDetails.includes(kw)) {
            violations.push(`Contraindicated for cardiovascular condition: "${item.name}" contains ${kw}`);
            itemViolation = true;
          }
        }
      }

      if (!itemViolation) {
        sanitizedItems.push({
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          ...item,
        });
      } else {
        // Substitute with a clinically approved safe alternative
        if (hasKneePain) {
          sanitizedItems.push({
            id: `item_safe_${Date.now()}`,
            name: 'Low-Impact Isometric Wall Sit & Glute Bridges',
            category: 'movement',
            timing: item.timing,
            details: 'Joint-sparing closed-chain isometric hold to strengthen quadriceps without shear force.',
          });
        }
      }
    }

    const sanitizedDraft: PlanGenerationDraft = {
      ...draft,
      items: sanitizedItems,
      safetyConstraints: Array.from(new Set([
        ...draft.safetyConstraints,
        ...(hasKneePain ? ['No high-impact jumping or plyometrics (Knee safety protocol)'] : []),
        ...(hasCardioCondition ? ['Sub-maximal steady state exertion only (Cardio safety protocol)'] : []),
      ])),
    };

    return {
      isValid: violations.length === 0,
      violations,
      sanitizedDraft,
    };
  }

  /**
   * Generates or adapts a plan based on user facts and safety constraints.
   */
  public static async generatePlanDraft(
    userId: string,
    unvalidatedPayload: any
  ): Promise<{ success: boolean; plan?: HealthPlan; errors?: string[] }> {
    const user = db.getUser(userId);
    if (!user) {
      return { success: false, errors: ['User not found'] };
    }

    // 1. Zod Schema Validation
    const parseResult = PlanGenerationDraftSchema.safeParse(unvalidatedPayload);
    if (!parseResult.success) {
      return {
        success: false,
        errors: parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }

    // 2. Health Safety Constraint Check
    const safetyCheck = this.validateSafetyConstraints(parseResult.data, user.knownConditions);

    // 3. Save as DRAFT (requires explicit user confirmation before becoming active)
    const savedDraft = db.saveDraftPlan(userId, {
      title: safetyCheck.sanitizedDraft.title,
      overview: safetyCheck.sanitizedDraft.overview,
      dailyCalories: safetyCheck.sanitizedDraft.dailyCalories,
      waterIntakeMl: safetyCheck.sanitizedDraft.waterIntakeMl,
      items: safetyCheck.sanitizedDraft.items as PlanItem[],
      safetyConstraints: safetyCheck.sanitizedDraft.safetyConstraints,
    });

    return {
      success: true,
      plan: savedDraft,
      errors: safetyCheck.violations.length > 0 ? safetyCheck.violations : undefined,
    };
  }

  /**
   * Confirms a draft plan and promotes it to active.
   */
  public static confirmDraftPlan(userId: string, planId: string): HealthPlan | undefined {
    return db.confirmPlan(userId, planId);
  }
}

