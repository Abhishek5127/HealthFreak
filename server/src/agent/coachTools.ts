import { ToolDefinition, AgentContext, ToolCallResult } from '../providers/VoiceProviderInterface.js';
import { db } from '../db/index.js';
import { PlanService } from '../services/planService.js';

export const COACH_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_user_profile',
    description: 'Retrieves user health goals, known conditions, current energy level, and stored memory facts.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'update_user_memory',
    description: 'Stores an important lifestyle fact, symptom, or user preference in persistent memory.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Name of the fact (e.g. knee_pain, preferred_workout_time)' },
        value: { type: 'string', description: 'The fact or observation details' },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'record_daily_checkin',
    description: 'Logs today check-in details such as mood, energy level, and reported physical symptoms.',
    parameters: {
      type: 'object',
      properties: {
        mood: { type: 'string', description: 'Mood (calm, energized, balanced, lowEnergy, tense)' },
        energyScore: { type: 'number', description: 'Energy from 1 to 10' },
        symptoms: { type: 'string', description: 'Any physical discomfort or notes' },
      },
      required: ['mood', 'energyScore'],
    },
  },
  {
    name: 'get_active_plan',
    description: 'Gets current active nutritional guidance and movement plan for the user.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'draft_plan_adjustment',
    description: 'Requests a validated modification to the user movement or nutrition plan. Runs through backend health-safety validation.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Clinical or lifestyle reason (e.g. knee pain adjustment)' },
        modificationType: { type: 'string', description: 'lower_intensity, substitute_movement, meal_adjustment' },
      },
      required: ['reason', 'modificationType'],
    },
  },
];

export async function executeCoachTool(
  toolName: string,
  args: Record<string, any>,
  context: AgentContext
): Promise<ToolCallResult> {
  const { userId, callId } = context;
  const user = db.getUser(userId);

  if (!user) {
    return {
      toolName,
      output: null,
      error: `User not found for ID ${userId}`,
    };
  }

  try {
    switch (toolName) {
      case 'get_user_profile': {
        const memory = db.getUserMemory(userId);
        const plan = db.getActivePlan(userId);
        return {
          toolName,
          output: {
            name: user.name,
            languagePreference: user.languagePreference,
            healthGoals: user.healthGoals,
            knownConditions: user.knownConditions,
            currentEnergyLevel: user.currentEnergyLevel,
            memory,
            activePlanTitle: plan?.title || 'None',
          },
        };
      }

      case 'update_user_memory': {
        const { key, value } = args;
        db.updateMemoryFact(userId, key, value, 0.95, callId);
        return {
          toolName,
          output: { success: true, message: `Saved ${key} to user memory.` },
        };
      }

      case 'record_daily_checkin': {
        const { mood, energyScore, symptoms } = args;
        db.updateMemoryFact(userId, 'last_checkin_mood', mood, 0.9, callId);
        db.updateMemoryFact(userId, 'last_checkin_energy', energyScore, 0.9, callId);
        if (symptoms) {
          db.updateMemoryFact(userId, 'reported_symptoms', symptoms, 0.95, callId);
        }
        return {
          toolName,
          output: { success: true, message: 'Daily check-in recorded successfully.' },
        };
      }

      case 'get_active_plan': {
        const plan = db.getActivePlan(userId);
        if (!plan) {
          return { toolName, output: { hasActivePlan: false, message: 'No active plan found.' } };
        }
        return {
          toolName,
          output: {
            hasActivePlan: true,
            title: plan.title,
            overview: plan.overview,
            dailyCalories: plan.dailyCalories,
            items: plan.items.map((i) => ({ name: i.name, timing: i.timing, category: i.category })),
            safetyConstraints: plan.safetyConstraints,
          },
        };
      }

      case 'draft_plan_adjustment': {
        const { reason, modificationType } = args;
        const currentActive = db.getActivePlan(userId);

        // Generate tailored draft plan through the validation service
        const newItems = currentActive?.items ? [...currentActive.items] : [];
        if (modificationType === 'substitute_movement' || reason.toLowerCase().includes('knee')) {
          // Replace any high impact movements
          const safeItems = newItems.map((item) => {
            if (item.category === 'movement') {
              return {
                name: 'Low-Impact Isometric Wall Sits & Hip Bridge',
                category: 'movement' as const,
                timing: item.timing,
                details: 'Joint-sparing closed kinetic chain movement protecting patellofemoral joint.',
              };
            }
            return {
              name: item.name,
              category: item.category,
              timing: item.timing,
              details: item.details,
            };
          });

          const result = await PlanService.generatePlanDraft(userId, {
            title: 'Joint-Friendly Adjusted Health Routine',
            overview: `Adapted on ${new Date().toLocaleDateString()} due to ${reason}. Joint preservation focus.`,
            dailyCalories: currentActive?.dailyCalories || 2000,
            waterIntakeMl: currentActive?.waterIntakeMl || 3000,
            items: safeItems.length > 0 ? safeItems : [
              { name: 'Oatmeal & Almond Milk', category: 'nutrition', timing: '8:30 AM', details: 'With chia seeds' },
              { name: 'Low-Impact Wall Sit', category: 'movement', timing: '10:00 AM', details: 'Joint-friendly hold' },
            ],
            safetyConstraints: ['No high-impact jumping or deep unassisted squats'],
          });

          return {
            toolName,
            output: {
              success: result.success,
              draftPlanId: result.plan?.id,
              safetyConstraints: result.plan?.safetyConstraints,
              requiresUserConfirmation: true,
              message: 'Draft plan created with knee safety protocols. Awaiting Alex confirmation.',
            },
          };
        }

        return {
          toolName,
          output: { success: true, message: 'Adjustment noted for next scheduled plan update.' },
        };
      }

      default:
        return {
          toolName,
          output: null,
          error: `Unknown tool: ${toolName}`,
        };
    }
  } catch (err: any) {
    return {
      toolName,
      output: null,
      error: err.message || 'Error executing tool',
    };
  }
}

