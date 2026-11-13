"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseDb = void 0;
const pg_1 = require("pg");
const supabase_js_1 = require("@supabase/supabase-js");
const index_js_1 = require("../config/index.js");
let pool = null;
let supabaseClient = null;
class SupabaseDb {
    static isConfigured() {
        return Boolean(index_js_1.config.supabase.url && (index_js_1.config.supabase.serviceRoleKey || index_js_1.config.supabase.anonKey));
    }
    static getClient() {
        if (!supabaseClient) {
            supabaseClient = (0, supabase_js_1.createClient)(index_js_1.config.supabase.url || 'https://placeholder.supabase.co', index_js_1.config.supabase.serviceRoleKey || index_js_1.config.supabase.anonKey || 'placeholder');
        }
        return supabaseClient;
    }
    static getPool() {
        if (!index_js_1.config.supabase.databaseUrl) {
            return null;
        }
        if (!pool) {
            pool = new pg_1.Pool({
                connectionString: index_js_1.config.supabase.databaseUrl,
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
    static async testConnection() {
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
        }
        catch (err) {
            return { connected: false, error: err.message };
        }
    }
    /**
     * Health and startup migration audit (Rule E7).
     * Verifies that schema tables and columns from migrations 001-006 exist.
     */
    static async checkMigrations() {
        const p = this.getPool();
        if (!p) {
            // In-memory dev mode or no Postgres configured
            return { migrations_ok: true, missing: [] };
        }
        const missing = [];
        try {
            // Check tables
            const requiredTables = [
                'profiles',
                'user_issues',
                'health_conditions',
                'exercise_plans',
                'scheduled_followups',
                'call_transcript_turns', // 005
                'call_extraction_jobs', // 005
                'issue_history', // 006
            ];
            const tableRes = await p.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)`, [requiredTables]);
            const existingTables = new Set(tableRes.rows.map((r) => r.table_name));
            for (const t of requiredTables) {
                if (!existingTables.has(t)) {
                    missing.push(`table:${t}`);
                }
            }
            // Check migration 006 specific columns
            const requiredColumns = [
                { table: 'scheduled_followups', column: 'issue_id' },
                { table: 'health_conditions', column: 'source_issue_id' },
                { table: 'exercise_plans', column: 'constraint_issue_ids' },
                { table: 'exercise_plans', column: 'is_stale' },
            ];
            const colRes = await p.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND (table_name, column_name) IN (
          ('scheduled_followups', 'issue_id'),
          ('health_conditions', 'source_issue_id'),
          ('exercise_plans', 'constraint_issue_ids'),
          ('exercise_plans', 'is_stale')
        )`);
            const existingCols = new Set(colRes.rows.map((r) => `${r.table_name}.${r.column_name}`));
            for (const req of requiredColumns) {
                if (!existingCols.has(`${req.table}.${req.column}`)) {
                    missing.push(`column:${req.table}.${req.column}`);
                }
            }
            return {
                migrations_ok: missing.length === 0,
                missing,
            };
        }
        catch (err) {
            return {
                migrations_ok: false,
                missing: [`error:${err?.message || 'Failed to inspect schema'}`],
            };
        }
    }
    /**
     * Synchronizes a meal record and its items to Supabase PostgreSQL in background
     */
    static async syncMeal(meal) {
        const p = this.getPool();
        if (!p)
            return;
        try {
            // 1. Ensure user profile exists to satisfy foreign key
            await p.query(`INSERT INTO profiles (id, name, height_cm, created_at, updated_at)
         VALUES ($1, $2, 175.0, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING;`, [meal.userId, meal.userId.replace('usr_', '')]);
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
        }
        catch (err) {
            console.warn('[Supabase Sync Warning] Could not sync meal to remote DB:', err.message);
        }
    }
}
exports.SupabaseDb = SupabaseDb;
