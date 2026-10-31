export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface PortionWeightEstimate {
  min: number;
  max: number;
  mostLikely: number;
}

export interface ItemNutrition {
  calories: number;       // kcal
  protein: number;        // grams
  carbs: number;          // grams
  fat: number;            // grams
  fiber: number;          // grams
  sugar: number;          // grams
  sodium: number;         // mg
  potassium: number;      // mg
}

export interface FoodItem {
  id: string;
  name: string;
  localizedName?: string;
  estimatedWeightGrams: number;
  servingDescription: string;
  confidence: number;     // 0.0 to 1.0
  visibleIngredients: string[];
  inferredIngredients: string[];
  cookingMethod?: string;
  nutrition: ItemNutrition;
}

export interface MacroDistribution {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  sugarGrams: number;
  sodiumMg: number;
  potassiumMg: number;
  proteinPercent: number; // e.g. 25%
  carbsPercent: number;   // e.g. 50%
  fatPercent: number;     // e.g. 25%
}

export interface Micronutrient {
  name: string;
  amount: number;
  unit: 'mg' | 'mcg' | 'IU' | 'g';
  dailyValuePercent: number; // e.g. 45%
  category: 'vitamin' | 'mineral';
}

export interface HealthBenefit {
  title: string;
  description: string;
  category: 'muscle' | 'energy' | 'digestion' | 'heart' | 'immunity' | 'micronutrient';
}

export interface DietaryConsideration {
  title: string;
  description: string;
  type: 'info' | 'caution';
}

export interface MealAnalysisResult {
  id: string;
  userId: string;
  mealName: string;
  mealType: MealType;
  timestamp: string;
  imageUri?: string;
  recognitionConfidence: number;
  foods: FoodItem[];
  totalNutrition: MacroDistribution;
  micronutrients: Micronutrient[];
  healthBenefits: HealthBenefit[];
  considerations: DietaryConsideration[];
  coachInsight: string;
  uncertainties?: string[];
  status: 'draft' | 'saved';
}

export interface DailyNutritionSummary {
  date: string;
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
  waterIntakeMl: number;
  waterTargetMl: number;
  meals: MealAnalysisResult[];
}

