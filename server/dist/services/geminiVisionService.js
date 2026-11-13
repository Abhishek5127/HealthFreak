"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiMealVisionProvider = void 0;
const genai_1 = require("@google/genai");
const zod_1 = require("zod");
const index_js_1 = require("../config/index.js");
const nutritionDatabase_js_1 = require("./nutritionDatabase.js");
const VisionFoodItemSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string(),
    localizedName: zod_1.z.string().optional(),
    estimatedWeightGrams: zod_1.z.number().positive(),
    servingDescription: zod_1.z.string().optional(),
    confidence: zod_1.z.number().min(0).max(1).default(0.85),
    visibleIngredients: zod_1.z.array(zod_1.z.string()).default([]),
    inferredIngredients: zod_1.z.array(zod_1.z.string()).default([]),
    cookingMethod: zod_1.z.string().optional(),
});
const VisionResponseSchema = zod_1.z.object({
    status: zod_1.z.enum(['success', 'not_food', 'blurry', 'uncertain']),
    mealName: zod_1.z.string().default('Nutritious Meal'),
    mealType: zod_1.z.enum(['breakfast', 'lunch', 'dinner', 'snack']).default('lunch'),
    recognitionConfidence: zod_1.z.number().min(0).max(1).default(0.9),
    foods: zod_1.z.array(VisionFoodItemSchema).default([]),
    uncertainties: zod_1.z.array(zod_1.z.string()).default([]),
});
class GeminiMealVisionProvider {
    static ai = null;
    static getClient() {
        if (!this.ai) {
            this.ai = new genai_1.GoogleGenAI({ apiKey: index_js_1.config.gemini.apiKey });
        }
        return this.ai;
    }
    /**
     * Primary vision prompt instructing multimodal image understanding for Indian & Global cuisine
     */
    static SYSTEM_PROMPT = `
You are an expert AI food-recognition vision system for a premium Cal AI-style nutrition tracker.
Your job is to analyze photographs of meals and recognize all visible food items on the plate, tray, or bowl.

Crucial instructions:
1. Identify MULTIPLE distinct items on a single plate (e.g. Indian thali: Roti, Dal Tadka, Paneer Butter Masala, Steamed Rice, Cucumber Salad, Curd).
2. For Indian cuisine, provide both canonical English name and localized Hindi/regional name (e.g. "Roti / Chapati", "Dal Tadka", "Chole", "Poha", "Idli", "Palak Paneer").
3. Estimate realistic portion weights in grams:
   - 1 Roti: ~40g, 2 Rotis: ~80g
   - 1 Katori/Bowl of Dal or Sabzi: ~140-160g
   - 1 Cup cooked rice: ~150g
   - 1 Serving raw salad: ~100g
   - 1 Serving Curd/Raita: ~120g
   - 1 Piece Chicken breast: ~150g
   - 2 Boiled eggs: ~100g
   - 2 Idlis: ~80g, 1 Masala Dosa: ~150g
4. List visible ingredients (what you can physically see) vs inferred ingredients (spices, oil, salt).
5. Identify cooking methods (e.g. tawa-roasted, tempered, simmered curry, steamed, raw, deep-fried).
6. Classify meal type: 'breakfast' | 'lunch' | 'dinner' | 'snack'.
7. If image contains no food, set status: "not_food". If image is unrecognizably blurry, set status: "blurry".
8. DO NOT calculate calories or micronutrients yourself. Only identify food names, portions in grams, and ingredients.

Return STRICT JSON matching this schema:
{
  "status": "success",
  "mealName": "Balanced Indian Thali",
  "mealType": "lunch",
  "recognitionConfidence": 0.94,
  "foods": [
    {
      "name": "Roti / Chapati",
      "localizedName": "Phulka",
      "estimatedWeightGrams": 80,
      "servingDescription": "2 medium rotis (~80g)",
      "confidence": 0.96,
      "visibleIngredients": ["Whole wheat flour"],
      "inferredIngredients": ["Water", "Pinch of salt"],
      "cookingMethod": "Tawa roasted with light puffing"
    },
    {
      "name": "Dal Tadka",
      "localizedName": "Pili Daal",
      "estimatedWeightGrams": 150,
      "servingDescription": "1 medium bowl (~150g)",
      "confidence": 0.92,
      "visibleIngredients": ["Yellow toor dal", "Cumin seeds", "Tomato bits", "Coriander garnish"],
      "inferredIngredients": ["Turmeric", "Ghee or mustard oil", "Garlic", "Hing"],
      "cookingMethod": "Pressure cooked and tempered with cumin ghee tadka"
    }
  ],
  "uncertainties": []
}
`;
    /**
     * Analyze an image buffer or base64 string using Gemini Vision with model fallback
     */
    static async analyzeMealImage(imageBuffer, mimeType = 'image/jpeg', userContext) {
        const base64Data = imageBuffer.toString('base64');
        // Model fallback chain: primary (configurable) -> fast flash-lite -> latest
        const modelsToTry = [
            index_js_1.config.gemini.visionModel || process.env.GEMINI_VISION_MODEL || 'gemini-3.8-flash',
            'gemini-3.5-flash-lite',
            'gemini-flash-latest',
        ];
        let rawVisionOutput = null;
        let lastError = null;
        const ai = this.getClient();
        const promptText = userContext?.userNote?.trim()
            ? `${this.SYSTEM_PROMPT}\n\nIMPORTANT USER NOTE / HIDDEN INGREDIENTS: "${userContext.userNote.trim()}". The user noted these ingredients or preparation details (e.g. blended protein powder, peanut butter, oil/ghee, extra items). Include them in the recognized foods list with accurate estimated weights.`
            : this.SYSTEM_PROMPT;
        for (const model of modelsToTry) {
            try {
                console.log(`[Gemini Vision] Analyzing meal photo with model: ${model}...`);
                const response = await ai.models.generateContent({
                    model,
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                {
                                    inlineData: {
                                        mimeType: mimeType || 'image/jpeg',
                                        data: base64Data,
                                    },
                                },
                                {
                                    text: promptText,
                                },
                            ],
                        },
                    ],
                    config: {
                        responseMimeType: 'application/json',
                    },
                });
                const text = response.text?.trim();
                if (text) {
                    const parsedJson = JSON.parse(text);
                    const validated = VisionResponseSchema.parse(parsedJson);
                    rawVisionOutput = validated;
                    console.log(`[Gemini Vision] Successfully analyzed meal with ${model}: "${validated.mealName}" (${validated.foods.length} items detected)`);
                    break;
                }
            }
            catch (err) {
                console.warn(`[Gemini Vision] Model ${model} failed or high demand:`, err?.message || err);
                lastError = err;
            }
        }
        // If Gemini API could not be reached, report error
        if (!rawVisionOutput || rawVisionOutput.foods.length === 0) {
            console.warn('[Gemini Vision] No foods recognized or models exhausted:', lastError?.message);
            if (lastError) {
                throw new Error(`Gemini Vision analysis error: ${lastError.message}`);
            }
            throw new Error('No food detected in image. Please point camera directly at your plate.');
        }
        // Now convert vision output to fully calculated Nutrition Report
        return this.buildNutritionReport(rawVisionOutput, userContext);
    }
    /**
     * Convert validated vision output + nutrition database calculations into final MealAnalysisResult
     */
    static buildNutritionReport(visionData, userContext) {
        const mealId = `meal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();
        const foodItems = visionData.foods.map((rawFood, idx) => {
            const weight = Math.max(20, Math.round(rawFood.estimatedWeightGrams));
            const calculatedNutrition = nutritionDatabase_js_1.MealNutritionService.calculateItemNutrition(rawFood.name, weight);
            return {
                id: rawFood.id || `food_${idx + 1}_${Date.now()}`,
                name: rawFood.name,
                localizedName: rawFood.localizedName,
                estimatedWeightGrams: weight,
                servingDescription: rawFood.servingDescription || `${weight}g serving`,
                confidence: rawFood.confidence,
                visibleIngredients: rawFood.visibleIngredients,
                inferredIngredients: rawFood.inferredIngredients,
                cookingMethod: rawFood.cookingMethod,
                nutrition: calculatedNutrition,
            };
        });
        // 1. Total Macros
        const totalNutrition = nutritionDatabase_js_1.MealNutritionService.aggregateMacros(foodItems);
        // 2. Micronutrients
        const micronutrients = nutritionDatabase_js_1.MealNutritionService.calculateMicronutrients(foodItems);
        // 3. Health Benefits
        const healthBenefits = nutritionDatabase_js_1.MealNutritionService.deriveHealthBenefits(totalNutrition, foodItems);
        // 4. Considerations
        const considerations = nutritionDatabase_js_1.MealNutritionService.deriveDietaryConsiderations(totalNutrition, foodItems);
        // 5. Coach Insight
        const coachInsight = nutritionDatabase_js_1.MealNutritionService.generateCoachInsight(userContext?.name || 'Alex', userContext?.healthGoals || ['Metabolic fitness', 'Weight management'], totalNutrition, visionData.mealType);
        return {
            id: mealId,
            userId: 'usr_synthetic_alex',
            mealName: visionData.mealName,
            mealType: visionData.mealType,
            timestamp: now,
            recognitionConfidence: visionData.recognitionConfidence,
            foods: foodItems,
            totalNutrition,
            micronutrients,
            healthBenefits,
            considerations,
            coachInsight,
            uncertainties: visionData.uncertainties,
            status: 'draft',
        };
    }
    /**
     * Realistic default plate if offline / demo mode
     */
    static generateFallbackVisionOutput() {
        return {
            status: 'success',
            mealName: 'Nutritious Indian Lunch Thali',
            mealType: 'lunch',
            recognitionConfidence: 0.93,
            foods: [
                {
                    id: 'food_f1',
                    name: 'Roti / Chapati',
                    localizedName: 'Phulka',
                    estimatedWeightGrams: 80,
                    servingDescription: '2 medium rotis (~80g)',
                    confidence: 0.96,
                    visibleIngredients: ['Whole wheat flour'],
                    inferredIngredients: ['Water', 'Pinch of salt'],
                    cookingMethod: 'Tawa roasted without excess ghee',
                },
                {
                    id: 'food_f2',
                    name: 'Dal Tadka',
                    localizedName: 'Pili Daal',
                    estimatedWeightGrams: 150,
                    servingDescription: '1 medium bowl (~150g)',
                    confidence: 0.94,
                    visibleIngredients: ['Yellow lentils', 'Cumin', 'Tomato bits', 'Fresh coriander'],
                    inferredIngredients: ['Turmeric', 'Light ghee tempering', 'Ginger'],
                    cookingMethod: 'Pressure cooked with cumin tadka',
                },
                {
                    id: 'food_f3',
                    name: 'Paneer Butter Masala',
                    localizedName: 'Paneer Sabzi',
                    estimatedWeightGrams: 120,
                    servingDescription: '1 small katori (~120g)',
                    confidence: 0.91,
                    visibleIngredients: ['Paneer cubes', 'Tomato onion gravy'],
                    inferredIngredients: ['Garam masala', 'Kasuri methi', 'Light cream'],
                    cookingMethod: 'Simmered spiced tomato gravy',
                },
                {
                    id: 'food_f4',
                    name: 'Cucumber Tomato Salad',
                    localizedName: 'Kachumber',
                    estimatedWeightGrams: 90,
                    servingDescription: '1 small side bowl (~90g)',
                    confidence: 0.97,
                    visibleIngredients: ['Sliced cucumber', 'Diced tomatoes', 'Green chilli'],
                    inferredIngredients: ['Lemon juice', 'Chaat masala'],
                    cookingMethod: 'Raw and freshly cut',
                },
            ],
            uncertainties: ['Cooking oil amount is estimated from appearance'],
        };
    }
}
exports.GeminiMealVisionProvider = GeminiMealVisionProvider;
