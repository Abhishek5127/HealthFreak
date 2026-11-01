import {
  WellnessGoal,
  GenderType,
  ActivityLevel,
  DietaryPreference,
  SkinType,
  CalculatedNutritionPlan,
} from '../types';

export interface CalculationInput {
  goal: WellnessGoal;
  currentWeightKg: number;
  targetWeightKg: number;
  heightCm: number;
  age: number;
  gender: GenderType;
  activityLevel: ActivityLevel;
  dietaryPreference: DietaryPreference;
  skinType?: SkinType;
  skinConcerns?: string[];
  waterIntakeLiters?: number;
  sleepHours?: number;
}

/**
 * Calculates customized daily energy, protein, carb, fat, and hydration targets
 * using scientific clinical formulas (Mifflin-St Jeor BMR + Activity TDEE + Goal Macro Split).
 */
export function calculatePersonalizedNutrition(input: CalculationInput): CalculatedNutritionPlan {
  const {
    goal,
    currentWeightKg,
    targetWeightKg,
    heightCm,
    age,
    gender,
    activityLevel,
    dietaryPreference,
  } = input;

  // 1. Basal Metabolic Rate (BMR) via Mifflin-St Jeor
  const isFemale = gender === 'female';
  const bmr = 10 * currentWeightKg + 6.25 * heightCm - 5 * age + (isFemale ? -161 : 5);

  // 2. Physical Activity Level Multipliers
  const activityMultipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
  };
  const multiplier = activityMultipliers[activityLevel] || 1.375;
  const tdee = Math.round(bmr * multiplier);

  // 3. Goal-Specific Adjustments
  let dailyCalories = tdee;
  let calorieAdjustment = 0;
  let proteinMultiplier = 1.6; // grams per kg
  let fatRatio = 0.25; // 25% of calories from fat
  let headline = '';
  let subheadline = '';
  let keyBenefits: string[] = [];

  const weightDelta = +(targetWeightKg - currentWeightKg).toFixed(1);
  const absWeightDelta = Math.abs(weightDelta);

  switch (goal) {
    case 'weight_gain': {
      calorieAdjustment = 450; // Lean mass surplus
      dailyCalories = tdee + calorieAdjustment;
      proteinMultiplier = 2.0; // 2.0g/kg for muscle protein synthesis & hypertrophy
      fatRatio = 0.26;
      const weeksEst = Math.max(4, Math.round(absWeightDelta / 0.4));
      headline = `Weight Gain & Muscle Phase (+${absWeightDelta}kg)`;
      subheadline = `Daily Surplus of +450 kcal designed to build lean muscle mass over ~${weeksEst} weeks without excessive fat gain.`;
      keyBenefits = [
        `High Hypertrophy Protein: ${Math.round(currentWeightKg * proteinMultiplier)}g daily (2.0g/kg) to fuel muscle repair.`,
        'Caloric Surplus: +450 kcal clean surplus to support progressive overload.',
        'High-Glycogen Recovery: Complex carbs timed around workouts for maximum strength.',
      ];
      break;
    }

    case 'weight_loss': {
      calorieAdjustment = -500; // Safe, sustainable fat deficit
      dailyCalories = Math.max(1250, tdee + calorieAdjustment);
      proteinMultiplier = 1.85; // High protein to preserve lean muscle during deficit
      fatRatio = 0.25;
      const weeksEst = Math.max(4, Math.round(absWeightDelta / 0.5));
      headline = `Fat Loss & Caloric Deficit (-${absWeightDelta}kg)`;
      subheadline = `Target Deficit of -500 kcal to burn body fat sustainably over ~${weeksEst} weeks while sparing lean muscle.`;
      keyBenefits = [
        `Muscle-Preserving Protein: ${Math.round(currentWeightKg * proteinMultiplier)}g daily to prevent lean tissue loss.`,
        'Fat-Burning Deficit: -500 kcal daily deficit (~0.5 kg pure fat loss per week).',
        'High Satiety & Fiber: Nutrient-dense low-glycemic foods to eliminate cravings.',
      ];
      break;
    }

    case 'acne_control': {
      calorieAdjustment = 0;
      dailyCalories = tdee;
      proteinMultiplier = 1.45;
      fatRatio = 0.28; // Essential fatty acids (Omega-3s) to calm dermal inflammation
      headline = 'Dermal Clarity & Anti-Acne Protocol';
      subheadline = 'Anti-inflammatory nutrition protocol targeting sebum regulation, hormonal acne, and skin microbiome health.';
      keyBenefits = [
        'Insulin Spike Prevention: Low-GI meals prevent IGF-1 surges that trigger sebum & acne.',
        'Anti-Inflammatory Zinc & Omega-3s: Calms redness, active pustules, and cystic breakouts.',
        'Cellular Detox Hydration: Flushes metabolic waste and strengthens skin moisture barrier.',
      ];
      break;
    }

    case 'skincare_glow': {
      calorieAdjustment = 0;
      dailyCalories = tdee;
      proteinMultiplier = 1.4;
      fatRatio = 0.30; // Healthy lipids for skin barrier
      headline = 'Radiant Glow & Skin Barrier Restoration';
      subheadline = 'Collagen-supporting micronutrient plan with lipid barrier restoration and cellular plumping.';
      keyBenefits = [
        'Collagen Synthesis Support: Essential amino acids (proline, lysine) and Vitamin C.',
        'Hydration Lock: 3.5L water target to plump extracellular skin matrix.',
        'Antioxidant Shield: Polyphenols & carotenoids protect against premature aging.',
      ];
      break;
    }

    case 'hair_health': {
      calorieAdjustment = 100;
      dailyCalories = tdee + 100;
      proteinMultiplier = 1.7; // Keratin synthesis requires adequate amino acids
      fatRatio = 0.28;
      headline = 'Follicle Strength & Anti-Hair Fall Protocol';
      subheadline = 'Micro-nutrition focused on keratin synthesis, ferritin optimization, and scalp blood flow.';
      keyBenefits = [
        `Keratin Fuel: ${Math.round(currentWeightKg * proteinMultiplier)}g protein rich in sulfur amino acids.`,
        'Biotin & Iron Synergy: Enhances oxygen delivery to hair follicles.',
        'DHT Sensitivity Blunting: Antioxidants reduce follicle miniaturization.',
      ];
      break;
    }

    case 'pcos_pcod': {
      calorieAdjustment = -250;
      dailyCalories = Math.max(1300, tdee + calorieAdjustment);
      proteinMultiplier = 1.65;
      fatRatio = 0.30;
      headline = 'Hormonal Balance & PCOS Synchronization';
      subheadline = 'Insulin-steady meal cadence, cycle synchronization, and cortisol management.';
      keyBenefits = [
        'Steady Blood Glucose: Prevents reactive hypoglycemia and sugar crashes.',
        'Endocrine Support: Healthy fats (avocado, seeds, nuts) for hormone synthesis.',
        'Anti-Androgen Nutrients: Spearmint, inositol-rich legumes, and zinc.',
      ];
      break;
    }

    default: {
      calorieAdjustment = 0;
      dailyCalories = tdee;
      proteinMultiplier = 1.6;
      fatRatio = 0.25;
      headline = 'Metabolic Fitness & Vitality Plan';
      subheadline = 'Optimal macronutrient balance for all-day steady stamina and athletic recovery.';
      keyBenefits = [
        'Consistent Daily Energy: Balanced macro distribution for mitochondrial health.',
        'Cardiovascular Stamina: Micro-steps for habit compounding.',
        'Restorative Sleep: Meal timing for optimal circadian alignment.',
      ];
      break;
    }
  }

  // 4. Calculate Exact Grams
  const proteinGrams = Math.round(currentWeightKg * proteinMultiplier);
  const proteinCalories = proteinGrams * 4;

  const fatCalories = Math.round(dailyCalories * fatRatio);
  const fatGrams = Math.round(fatCalories / 9);

  const remainingCalories = Math.max(0, dailyCalories - (proteinCalories + fatCalories));
  const carbsGrams = Math.round(remainingCalories / 4);

  const fiberGrams = Math.round((dailyCalories / 1000) * 14); // 14g per 1000 kcal

  // 5. Hydration Target
  let waterLiters = +(currentWeightKg * 0.035).toFixed(1);
  if (goal === 'acne_control' || goal === 'skincare_glow') {
    waterLiters = Math.max(3.5, +(waterLiters + 0.6).toFixed(1));
  } else if (goal === 'weight_gain' || goal === 'weight_loss') {
    waterLiters = Math.max(3.2, waterLiters);
  } else {
    waterLiters = Math.max(2.8, waterLiters);
  }

  // 6. BMI
  const heightM = heightCm / 100;
  const bmi = +(currentWeightKg / (heightM * heightM)).toFixed(1);

  // 7. Curated Recommended Indian Superfoods based on Goal and Diet
  const recommendedFoods = getRecommendedFoods(goal, dietaryPreference);

  // 8. Projected Duration
  const projectedWeeks =
    absWeightDelta > 0
      ? Math.max(2, Math.round(absWeightDelta / (goal === 'weight_gain' ? 0.4 : 0.5)))
      : 8;

  return {
    dailyCalories,
    proteinGrams,
    carbsGrams,
    fatGrams,
    fiberGrams,
    waterLiters,
    bmi,
    tdee,
    calorieAdjustment,
    projectedWeeks,
    headline,
    subheadline,
    keyBenefits,
    recommendedFoods,
  };
}

function getRecommendedFoods(
  goal: WellnessGoal,
  diet: DietaryPreference
): { name: string; tag: string; protein: string; cal: string }[] {
  const hasEggs = diet === 'eggetarian' || diet === 'non_vegetarian';
  const hasMeat = diet === 'non_vegetarian';

  if (goal === 'weight_gain') {
    const list = [
      { name: 'Paneer Bhurji with Multigrain Roti', tag: 'High Protein Bulk', protein: '28g', cal: '380 kcal' },
      { name: 'Banana Peanut Butter Oats Smoothie', tag: 'Clean Calorie Booster', protein: '24g', cal: '480 kcal' },
      { name: 'Roasted Chana & Sattu Shake', tag: 'Traditional Mass Drink', protein: '20g', cal: '310 kcal' },
    ];
    if (hasMeat) {
      list.push({ name: 'Grilled Chicken Breast with Brown Rice', tag: 'Lean Hypertrophy', protein: '38g', cal: '440 kcal' });
    } else if (hasEggs) {
      list.push({ name: '3-Egg Bhurji with Butter Toast', tag: 'Bioavailable Mass', protein: '22g', cal: '360 kcal' });
    } else {
      list.push({ name: 'Soya Chunks & Peas Pulao with Curd', tag: 'Plant Powerhouse', protein: '32g', cal: '420 kcal' });
    }
    return list;
  }

  if (goal === 'weight_loss') {
    const list = [
      { name: 'Sprouted Moong & Cucumber Chaat', tag: 'High Satiety & Low Cal', protein: '16g', cal: '190 kcal' },
      { name: 'Lauki & Yellow Moong Dal Soup', tag: 'Metabolic Flush', protein: '14g', cal: '180 kcal' },
      { name: 'Palak Paneer with Jowar Roti', tag: 'Slow-Burning Complex', protein: '22g', cal: '310 kcal' },
    ];
    if (hasMeat) {
      list.push({ name: 'Tandoori Chicken Tikka with Salad', tag: 'High Protein Zero Sugar', protein: '34g', cal: '280 kcal' });
    } else if (hasEggs) {
      list.push({ name: 'Egg White Omelette with Spinach', tag: 'Lean Deficit Meal', protein: '24g', cal: '170 kcal' });
    } else {
      list.push({ name: 'Tofu & Vegetable Stir Fry', tag: 'Low Carb Fiber', protein: '20g', cal: '220 kcal' });
    }
    return list;
  }

  if (goal === 'acne_control' || goal === 'skincare_glow') {
    return [
      { name: 'Golden Turmeric Lemon Water & Chia', tag: 'Anti-Inflammatory Flush', protein: '6g', cal: '90 kcal' },
      { name: 'Pumpkin & Sunflower Seed Trail Mix', tag: 'Zinc Rich Dermal Repair', protein: '12g', cal: '180 kcal' },
      { name: 'Methi Moong Dal Chilla with Mint Chutney', tag: 'Low-GI Sebum Control', protein: '18g', cal: '240 kcal' },
      { name: 'Walnut & Avocado Sprout Bowl', tag: 'Omega-3 Lipid Barrier', protein: '14g', cal: '290 kcal' },
    ];
  }

  // Default / Hair / Hormone
  return [
    { name: 'Sprouted Moong & Poha Breakfast', tag: 'Insulin Steady', protein: '18g', cal: '280 kcal' },
    { name: 'Paneer / Tofu Tikka with Bell Peppers', tag: 'Antioxidant Rich', protein: '24g', cal: '320 kcal' },
    { name: 'Curd Bowl with Flaxseed & Berries', tag: 'Probiotic & Omega-3', protein: '14g', cal: '210 kcal' },
    { name: 'Dal Tadka with Steamed Rice & Ghee', tag: 'Sattvic Recovery', protein: '16g', cal: '360 kcal' },
  ];
}
