import { Pool } from 'pg';
import { config } from '../config/index.js';

let pool: Pool | null = null;

export class SupabaseDb {
  public static getPool(): Pool | null {
    if (!config.supabase.databaseUrl) {
      return null;
    }

    if (!pool) {
      pool = new Pool({
        connectionString: config.supabase.databaseUrl,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
      });

      pool.on('error', (err) => {
        console.warn('[Supabase Pool Warning]:', err.message);
      });
    }

    return pool;
  }

  /**
   * Tests active connectivity to Supabase
   */
  public static async testConnection(): Promise<{ connected: boolean; version?: string; error?: string }> {
    const p = this.getPool();
    if (!p) {
      return { connected: false, error: 'DATABASE_URL not configured in environment.' };
    }

    try {
      const res = await p.query('SELECT current_database(), current_user, version();');
      return {
        connected: true,
        version: res.rows[0]?.version || 'PostgreSQL',
      };
    } catch (err: any) {
      return { connected: false, error: err.message };
    }
  }

  /**
   * Synchronizes a meal record and its items to Supabase PostgreSQL in background
   */
  public static async syncMeal(meal: any): Promise<void> {
    const p = this.getPool();
    if (!p) return;

    try {
      // 1. Ensure user profile exists to satisfy foreign key
      await p.query(
        `INSERT INTO profiles (id, name, height_cm, created_at, updated_at)
         VALUES ($1, $2, 175.0, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING;`,
        [meal.userId, meal.userId.replace('usr_', '')]
      );

      // 2. Upsert Meal
      await p.query(`
        INSERT INTO meals (
          id, user_id, consumption_date, consumption_timestamp, local_timezone,
          meal_category, meal_source, meal_status, meal_description, overall_analysis_confidence,
          user_confirmation_status, notes, total_nutrients, coach_insight, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE SET
          meal_status = EXCLUDED.meal_status,
          total_nutrients = EXCLUDED.total_nutrients,
          updated_at = NOW();
      `, [
        meal.id,
        meal.userId,
        meal.consumptionDate,
        meal.consumptionTimestamp,
        meal.localTimezone || 'Asia/Kolkata',
        meal.mealCategory,
        meal.mealSource,
        meal.mealStatus,
        meal.mealDescription,
        meal.overallAnalysisConfidence || 0.95,
        meal.userConfirmationStatus || 'user_confirmed',
        meal.notes || null,
        JSON.stringify(meal.totalNutrients),
        meal.coachInsight || null,
        meal.createdAt || new Date().toISOString(),
        meal.updatedAt || new Date().toISOString(),
      ]);

      // 3. Upsert Meal Items if present
      if (Array.isArray(meal.items) && meal.items.length > 0) {
        for (const item of meal.items) {
          await p.query(`
            INSERT INTO meal_items (
              id, meal_id, user_id, standard_food_name, localized_food_name,
              original_user_provided_name, food_category, food_reference_id,
              regional_dish_name, recognition_confidence, estimated_quantity,
              serving_unit, serving_count, estimated_weight_grams,
              min_estimated_weight_grams, most_likely_estimated_weight_grams,
              max_estimated_weight_grams, confirmed_weight_grams, portion_source,
              portion_confidence, ingredients, cooking_method, cooking_oil_info,
              recipe_profile_ref, nutrients, source
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
            )
            ON CONFLICT (id) DO UPDATE SET
              estimated_weight_grams = EXCLUDED.estimated_weight_grams,
              confirmed_weight_grams = EXCLUDED.confirmed_weight_grams,
              nutrients = EXCLUDED.nutrients;
          `, [
            item.id,
            meal.id,
            meal.userId,
            item.standardFoodName || 'Food Item',
            item.localizedFoodName || null,
            item.originalUserProvidedName || null,
            item.foodCategory || 'mixed',
            item.foodReferenceId || null,
            item.regionalDishName || null,
            item.recognitionConfidence || 0.95,
            item.estimatedQuantity || 1,
            item.servingUnit || 'portion',
            item.servingCount || 1,
            item.estimatedWeightGrams || 100,
            item.minEstimatedWeightGrams || null,
            item.mostLikelyEstimatedWeightGrams || null,
            item.maxEstimatedWeightGrams || null,
            item.confirmedWeightGrams || null,
            item.portionSource || 'model_estimate',
            item.portionConfidence || 0.9,
            JSON.stringify(item.ingredients || []),
            item.cookingMethod || null,
            item.cookingOilInfo || null,
            item.recipeProfileRef || null,
            JSON.stringify(item.nutrients || {}),
            item.source || meal.mealSource || 'ai_camera',
          ]);
        }
      }
    } catch (err: any) {
      console.warn('[Supabase Sync Warning] Could not sync meal to remote DB:', err.message);
    }
  }
}
