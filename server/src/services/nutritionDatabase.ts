import {
  FoodItem,
  ItemNutrition,
  MacroDistribution,
  Micronutrient,
  HealthBenefit,
  DietaryConsideration,
} from '../types/meal.js';

export interface VerifiedFoodProfile {
  canonicalName: string;
  aliases: string[];
  category: 'grain' | 'legume' | 'dairy' | 'vegetable' | 'protein' | 'fruit' | 'snack';
  defaultServingGrams: number;
  servingDescription: string;
  // Per 100 grams:
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number; // mg
    potassium: number; // mg
    vitA: number; // mcg
    vitC: number; // mg
    vitD: number; // IU
    iron: number; // mg
    calcium: number; // mg
    magnesium: number; // mg
    zinc: number; // mg
    folate: number; // mcg
  };
}

/**
 * Indian Food Composition Tables (IFCT / NIN Hyderabad) & USDA Verified Reference Data
 * Values standardized per 100g edible portion.
 */
export const VERIFIED_FOOD_DATABASE: VerifiedFoodProfile[] = [
  {
    canonicalName: 'Roti / Chapati',
    aliases: ['roti', 'chapati', 'fulka', 'phulka', 'whole wheat roti', 'flatbread'],
    category: 'grain',
    defaultServingGrams: 40,
    servingDescription: '1 medium roti (~40g)',
    per100g: {
      calories: 297,
      protein: 10.5,
      carbs: 58.2,
      fat: 2.5,
      fiber: 9.8,
      sugar: 1.2,
      sodium: 180,
      potassium: 310,
      vitA: 0,
      vitC: 0,
      vitD: 0,
      iron: 4.1,
      calcium: 38,
      magnesium: 110,
      zinc: 2.4,
      folate: 44,
    },
  },
  {
    canonicalName: 'Dal Tadka',
    aliases: ['dal tadka', 'yellow dal', 'arhar dal', 'toor dal', 'moong dal', 'dal fry', 'lentils', 'daal'],
    category: 'legume',
    defaultServingGrams: 150,
    servingDescription: '1 medium bowl / katori (~150g)',
    per100g: {
      calories: 112,
      protein: 6.8,
      carbs: 14.5,
      fat: 3.2,
      fiber: 4.2,
      sugar: 1.1,
      sodium: 290,
      potassium: 260,
      vitA: 45,
      vitC: 2.8,
      vitD: 0,
      iron: 1.9,
      calcium: 28,
      magnesium: 48,
      zinc: 1.2,
      folate: 65,
    },
  },
  {
    canonicalName: 'Dal Makhani',
    aliases: ['dal makhani', 'makhani dal', 'black dal', 'urad dal makhani'],
    category: 'legume',
    defaultServingGrams: 160,
    servingDescription: '1 medium bowl (~160g)',
    per100g: {
      calories: 165,
      protein: 5.8,
      carbs: 16.2,
      fat: 8.9,
      fiber: 4.8,
      sugar: 1.4,
      sodium: 380,
      potassium: 290,
      vitA: 85,
      vitC: 1.5,
      vitD: 8,
      iron: 2.2,
      calcium: 68,
      magnesium: 52,
      zinc: 1.4,
      folate: 52,
    },
  },
  {
    canonicalName: 'Paneer Butter Masala',
    aliases: ['paneer butter masala', 'paneer makhani', 'shahi paneer', 'paneer gravy', 'cottage cheese curry'],
    category: 'dairy',
    defaultServingGrams: 180,
    servingDescription: '1 serving (~180g)',
    per100g: {
      calories: 218,
      protein: 8.4,
      carbs: 9.6,
      fat: 16.5,
      fiber: 1.8,
      sugar: 3.2,
      sodium: 410,
      potassium: 210,
      vitA: 140,
      vitC: 4.2,
      vitD: 12,
      iron: 1.1,
      calcium: 240,
      magnesium: 32,
      zinc: 1.8,
      folate: 24,
    },
  },
  {
    canonicalName: 'Palak Paneer',
    aliases: ['palak paneer', 'spinach paneer', 'saag paneer'],
    category: 'vegetable',
    defaultServingGrams: 180,
    servingDescription: '1 serving (~180g)',
    per100g: {
      calories: 154,
      protein: 7.9,
      carbs: 5.8,
      fat: 11.2,
      fiber: 3.1,
      sugar: 1.5,
      sodium: 320,
      potassium: 380,
      vitA: 340,
      vitC: 14.5,
      vitD: 10,
      iron: 3.2,
      calcium: 280,
      magnesium: 62,
      zinc: 1.7,
      folate: 95,
    },
  },
  {
    canonicalName: 'Steamed Basmati Rice',
    aliases: ['steamed rice', 'basmati rice', 'white rice', 'chawal', 'plain rice', 'boiled rice'],
    category: 'grain',
    defaultServingGrams: 150,
    servingDescription: '1 cup cooked rice (~150g)',
    per100g: {
      calories: 130,
      protein: 2.7,
      carbs: 28.2,
      fat: 0.3,
      fiber: 0.6,
      sugar: 0.1,
      sodium: 4,
      potassium: 35,
      vitA: 0,
      vitC: 0,
      vitD: 0,
      iron: 0.8,
      calcium: 10,
      magnesium: 12,
      zinc: 0.8,
      folate: 48,
    },
  },
  {
    canonicalName: 'Vegetable Pulao / Biryani',
    aliases: ['pulao', 'veg pulao', 'vegetable biryani', 'veg biryani', 'jeera rice', 'fried rice'],
    category: 'grain',
    defaultServingGrams: 180,
    servingDescription: '1 medium plate (~180g)',
    per100g: {
      calories: 162,
      protein: 3.6,
      carbs: 26.5,
      fat: 4.8,
      fiber: 2.2,
      sugar: 1.0,
      sodium: 280,
      potassium: 140,
      vitA: 75,
      vitC: 5.2,
      vitD: 0,
      iron: 1.2,
      calcium: 24,
      magnesium: 22,
      zinc: 0.9,
      folate: 38,
    },
  },
  {
    canonicalName: 'Chole / Chickpea Curry',
    aliases: ['chole', 'chana masala', 'chickpeas', 'kabuli chana', 'chhole'],
    category: 'legume',
    defaultServingGrams: 160,
    servingDescription: '1 medium bowl (~160g)',
    per100g: {
      calories: 142,
      protein: 6.9,
      carbs: 19.8,
      fat: 4.2,
      fiber: 5.8,
      sugar: 2.1,
      sodium: 360,
      potassium: 290,
      vitA: 52,
      vitC: 6.8,
      vitD: 0,
      iron: 2.8,
      calcium: 45,
      magnesium: 46,
      zinc: 1.6,
      folate: 82,
    },
  },
  {
    canonicalName: 'Rajma Masala',
    aliases: ['rajma', 'rajma masala', 'red kidney beans curry'],
    category: 'legume',
    defaultServingGrams: 160,
    servingDescription: '1 medium bowl (~160g)',
    per100g: {
      calories: 135,
      protein: 7.2,
      carbs: 18.5,
      fat: 3.8,
      fiber: 6.2,
      sugar: 1.8,
      sodium: 340,
      potassium: 340,
      vitA: 42,
      vitC: 4.5,
      vitD: 0,
      iron: 2.9,
      calcium: 42,
      magnesium: 54,
      zinc: 1.5,
      folate: 92,
    },
  },
  {
    canonicalName: 'Idli',
    aliases: ['idli', 'steamed idli', 'rice idli', 'idlis'],
    category: 'grain',
    defaultServingGrams: 80,
    servingDescription: '2 pieces (~80g)',
    per100g: {
      calories: 132,
      protein: 4.8,
      carbs: 26.5,
      fat: 0.8,
      fiber: 2.4,
      sugar: 0.5,
      sodium: 195,
      potassium: 120,
      vitA: 0,
      vitC: 0,
      vitD: 0,
      iron: 1.1,
      calcium: 18,
      magnesium: 28,
      zinc: 0.9,
      folate: 32,
    },
  },
  {
    canonicalName: 'Masala Dosa',
    aliases: ['dosa', 'masala dosa', 'plain dosa', 'crispy dosa'],
    category: 'grain',
    defaultServingGrams: 150,
    servingDescription: '1 medium dosa with potato filling (~150g)',
    per100g: {
      calories: 186,
      protein: 4.2,
      carbs: 29.8,
      fat: 5.9,
      fiber: 2.8,
      sugar: 1.2,
      sodium: 290,
      potassium: 180,
      vitA: 35,
      vitC: 5.6,
      vitD: 0,
      iron: 1.6,
      calcium: 22,
      magnesium: 32,
      zinc: 1.1,
      folate: 36,
    },
  },
  {
    canonicalName: 'Sambhar',
    aliases: ['sambhar', 'sambar', 'vegetable stew', 'south indian sambar'],
    category: 'legume',
    defaultServingGrams: 150,
    servingDescription: '1 medium bowl (~150g)',
    per100g: {
      calories: 68,
      protein: 3.2,
      carbs: 9.4,
      fat: 1.9,
      fiber: 2.8,
      sugar: 2.1,
      sodium: 320,
      potassium: 240,
      vitA: 80,
      vitC: 8.4,
      vitD: 0,
      iron: 1.4,
      calcium: 34,
      magnesium: 28,
      zinc: 0.8,
      folate: 44,
    },
  },
  {
    canonicalName: 'Poha',
    aliases: ['poha', 'kanda poha', 'flattened rice', 'batata poha'],
    category: 'grain',
    defaultServingGrams: 140,
    servingDescription: '1 medium bowl (~140g)',
    per100g: {
      calories: 178,
      protein: 3.4,
      carbs: 31.5,
      fat: 4.6,
      fiber: 2.6,
      sugar: 1.8,
      sodium: 220,
      potassium: 150,
      vitA: 30,
      vitC: 6.2,
      vitD: 0,
      iron: 3.8,
      calcium: 26,
      magnesium: 34,
      zinc: 1.2,
      folate: 28,
    },
  },
  {
    canonicalName: 'Upma',
    aliases: ['upma', 'suji upma', 'rava upma', 'semolina upma'],
    category: 'grain',
    defaultServingGrams: 140,
    servingDescription: '1 medium bowl (~140g)',
    per100g: {
      calories: 165,
      protein: 3.8,
      carbs: 27.8,
      fat: 4.4,
      fiber: 2.1,
      sugar: 1.2,
      sodium: 240,
      potassium: 130,
      vitA: 25,
      vitC: 4.8,
      vitD: 0,
      iron: 1.8,
      calcium: 22,
      magnesium: 28,
      zinc: 0.9,
      folate: 22,
    },
  },
  {
    canonicalName: 'Aloo Paratha',
    aliases: ['paratha', 'aloo paratha', 'stuffed paratha', 'gobi paratha', 'paneer paratha'],
    category: 'grain',
    defaultServingGrams: 100,
    servingDescription: '1 medium paratha (~100g)',
    per100g: {
      calories: 254,
      protein: 5.6,
      carbs: 38.4,
      fat: 9.1,
      fiber: 4.2,
      sugar: 1.4,
      sodium: 310,
      potassium: 280,
      vitA: 20,
      vitC: 7.2,
      vitD: 0,
      iron: 2.1,
      calcium: 32,
      magnesium: 48,
      zinc: 1.3,
      folate: 32,
    },
  },
  {
    canonicalName: 'Mixed Vegetable Sabzi',
    aliases: ['sabzi', 'mixed vegetable', 'bhindi', 'aloo gobi', 'french beans', 'baingan bharta', 'tinda', 'lauki'],
    category: 'vegetable',
    defaultServingGrams: 140,
    servingDescription: '1 medium katori (~140g)',
    per100g: {
      calories: 82,
      protein: 2.4,
      carbs: 8.9,
      fat: 4.2,
      fiber: 3.6,
      sugar: 2.8,
      sodium: 230,
      potassium: 290,
      vitA: 180,
      vitC: 22.5,
      vitD: 0,
      iron: 1.6,
      calcium: 44,
      magnesium: 32,
      zinc: 0.8,
      folate: 48,
    },
  },
  {
    canonicalName: 'Curd / Plain Yogurt',
    aliases: ['curd', 'dahi', 'yogurt', 'plain curd', 'raita', 'cucumber raita', 'boondi raita'],
    category: 'dairy',
    defaultServingGrams: 120,
    servingDescription: '1 small bowl (~120g)',
    per100g: {
      calories: 61,
      protein: 3.5,
      carbs: 4.7,
      fat: 3.3,
      fiber: 0.0,
      sugar: 4.7,
      sodium: 46,
      potassium: 155,
      vitA: 28,
      vitC: 0.8,
      vitD: 2,
      iron: 0.1,
      calcium: 125,
      magnesium: 12,
      zinc: 0.6,
      folate: 18,
    },
  },
  {
    canonicalName: 'Cucumber Tomato Salad',
    aliases: ['salad', 'green salad', 'cucumber salad', 'kachumber', 'sliced cucumber and tomato', 'raw salad'],
    category: 'vegetable',
    defaultServingGrams: 100,
    servingDescription: '1 serving raw salad (~100g)',
    per100g: {
      calories: 22,
      protein: 1.1,
      carbs: 4.2,
      fat: 0.2,
      fiber: 1.8,
      sugar: 2.4,
      sodium: 12,
      potassium: 220,
      vitA: 95,
      vitC: 16.4,
      vitD: 0,
      iron: 0.6,
      calcium: 20,
      magnesium: 15,
      zinc: 0.3,
      folate: 24,
    },
  },
  {
    canonicalName: 'Grilled Chicken Breast',
    aliases: ['chicken breast', 'grilled chicken', 'tandoori chicken', 'chicken tikka', 'roasted chicken'],
    category: 'protein',
    defaultServingGrams: 150,
    servingDescription: '1 medium breast piece (~150g)',
    per100g: {
      calories: 165,
      protein: 31.0,
      carbs: 0.0,
      fat: 3.6,
      fiber: 0.0,
      sugar: 0.0,
      sodium: 180,
      potassium: 360,
      vitA: 15,
      vitC: 0,
      vitD: 5,
      iron: 1.0,
      calcium: 15,
      magnesium: 29,
      zinc: 1.0,
      folate: 12,
    },
  },
  {
    canonicalName: 'Chicken Curry',
    aliases: ['chicken curry', 'murgh kari', 'butter chicken', 'chicken masala'],
    category: 'protein',
    defaultServingGrams: 180,
    servingDescription: '1 bowl with gravy (~180g)',
    per100g: {
      calories: 175,
      protein: 18.2,
      carbs: 4.8,
      fat: 9.5,
      fiber: 1.1,
      sugar: 1.6,
      sodium: 380,
      potassium: 320,
      vitA: 65,
      vitC: 4.2,
      vitD: 4,
      iron: 1.4,
      calcium: 28,
      magnesium: 26,
      zinc: 1.4,
      folate: 18,
    },
  },
  {
    canonicalName: 'Boiled Egg / Egg Omelette',
    aliases: ['egg', 'boiled egg', 'egg omelette', 'omelette', 'egg bhurji', 'scrambled egg', 'two eggs'],
    category: 'protein',
    defaultServingGrams: 100,
    servingDescription: '2 large eggs (~100g)',
    per100g: {
      calories: 155,
      protein: 12.6,
      carbs: 1.1,
      fat: 10.6,
      fiber: 0.0,
      sugar: 1.1,
      sodium: 140,
      potassium: 138,
      vitA: 160,
      vitC: 0,
      vitD: 87, // ~2.2 mcg
      iron: 1.8,
      calcium: 56,
      magnesium: 12,
      zinc: 1.3,
      folate: 47,
    },
  },
  {
    canonicalName: 'Grilled Fish / Salmon',
    aliases: ['fish', 'grilled fish', 'fish curry', 'salmon', 'pomfret', 'rohu'],
    category: 'protein',
    defaultServingGrams: 140,
    servingDescription: '1 fillet (~140g)',
    per100g: {
      calories: 172,
      protein: 24.2,
      carbs: 0.5,
      fat: 8.1,
      fiber: 0.0,
      sugar: 0.0,
      sodium: 120,
      potassium: 390,
      vitA: 40,
      vitC: 0,
      vitD: 360,
      iron: 0.8,
      calcium: 22,
      magnesium: 30,
      zinc: 0.9,
      folate: 14,
    },
  },
  {
    canonicalName: 'Sprouted Moong Salad',
    aliases: ['sprouts', 'moong sprouts', 'sprouted moong', 'sprouts salad'],
    category: 'legume',
    defaultServingGrams: 120,
    servingDescription: '1 medium bowl (~120g)',
    per100g: {
      calories: 98,
      protein: 7.8,
      carbs: 16.2,
      fat: 0.8,
      fiber: 4.9,
      sugar: 2.1,
      sodium: 18,
      potassium: 320,
      vitA: 85,
      vitC: 18.2,
      vitD: 0,
      iron: 2.6,
      calcium: 38,
      magnesium: 48,
      zinc: 1.4,
      folate: 95,
    },
  },
  {
    canonicalName: 'Fresh Fruit Bowl',
    aliases: ['fruits', 'fruit bowl', 'apple', 'banana', 'papaya', 'pomegranate', 'mixed fruits'],
    category: 'fruit',
    defaultServingGrams: 150,
    servingDescription: '1 cup mixed cut fruits (~150g)',
    per100g: {
      calories: 58,
      protein: 0.8,
      carbs: 14.2,
      fat: 0.2,
      fiber: 2.6,
      sugar: 11.2,
      sodium: 2,
      potassium: 210,
      vitA: 110,
      vitC: 28.5,
      vitD: 0,
      iron: 0.4,
      calcium: 16,
      magnesium: 14,
      zinc: 0.2,
      folate: 22,
    },
  },
  {
    canonicalName: 'Samosa / Pakora Snack',
    aliases: ['samosa', 'pakora', 'bhajiya', 'fried snack', 'kachori'],
    category: 'snack',
    defaultServingGrams: 90,
    servingDescription: '1 piece samosa (~90g)',
    per100g: {
      calories: 308,
      protein: 4.5,
      carbs: 32.4,
      fat: 18.2,
      fiber: 3.2,
      sugar: 1.8,
      sodium: 440,
      potassium: 190,
      vitA: 25,
      vitC: 4.8,
      vitD: 0,
      iron: 1.8,
      calcium: 26,
      magnesium: 32,
      zinc: 0.9,
      folate: 26,
    },
  },
];

export class MealNutritionService {
  /**
   * Find best matching food in verified database using token overlap & aliases
   */
  public static matchFoodItem(name: string): VerifiedFoodProfile {
    const cleanName = name.toLowerCase().trim();

    // 1. Direct match or alias check
    for (const food of VERIFIED_FOOD_DATABASE) {
      if (food.canonicalName.toLowerCase() === cleanName) return food;
      if (food.aliases.some((alias) => cleanName.includes(alias) || alias.includes(cleanName))) {
        return food;
      }
    }

    // 2. Token overlap check
    const searchTokens = cleanName.split(/[\s,/-]+/).filter((t) => t.length > 2);
    let bestMatch: VerifiedFoodProfile | null = null;
    let highestScore = 0;

    for (const food of VERIFIED_FOOD_DATABASE) {
      let score = 0;
      for (const token of searchTokens) {
        if (food.canonicalName.toLowerCase().includes(token)) score += 3;
        for (const alias of food.aliases) {
          if (alias.includes(token)) score += 2;
        }
      }
      if (score > highestScore) {
        highestScore = score;
        bestMatch = food;
      }
    }

    if (bestMatch && highestScore >= 2) {
      return bestMatch;
    }

    // 3. Fallback to generic mixed vegetable / grain dish if totally unknown
    return VERIFIED_FOOD_DATABASE.find((f) => f.canonicalName === 'Mixed Vegetable Sabzi')!;
  }

  /**
   * Calculate precise nutrition for a specific food item given its weight in grams
   */
  public static calculateItemNutrition(foodName: string, grams: number): ItemNutrition {
    const profile = this.matchFoodItem(foodName);
    const factor = grams / 100;

    return {
      calories: Math.round(profile.per100g.calories * factor),
      protein: parseFloat((profile.per100g.protein * factor).toFixed(1)),
      carbs: parseFloat((profile.per100g.carbs * factor).toFixed(1)),
      fat: parseFloat((profile.per100g.fat * factor).toFixed(1)),
      fiber: parseFloat((profile.per100g.fiber * factor).toFixed(1)),
      sugar: parseFloat((profile.per100g.sugar * factor).toFixed(1)),
      sodium: Math.round(profile.per100g.sodium * factor),
      potassium: Math.round(profile.per100g.potassium * factor),
    };
  }

  /**
   * Aggregate total meal macros and compute percentage distribution
   */
  public static aggregateMacros(foods: FoodItem[]): MacroDistribution {
    let calories = 0;
    let proteinGrams = 0;
    let carbsGrams = 0;
    let fatGrams = 0;
    let fiberGrams = 0;
    let sugarGrams = 0;
    let sodiumMg = 0;
    let potassiumMg = 0;

    for (const f of foods) {
      calories += f.nutrition.calories;
      proteinGrams += f.nutrition.protein;
      carbsGrams += f.nutrition.carbs;
      fatGrams += f.nutrition.fat;
      fiberGrams += f.nutrition.fiber;
      sugarGrams += f.nutrition.sugar;
      sodiumMg += f.nutrition.sodium;
      potassiumMg += f.nutrition.potassium;
    }

    // Macro kcal distribution: Protein = 4 kcal/g, Carbs = 4 kcal/g, Fat = 9 kcal/g
    const totalMacroKcal = proteinGrams * 4 + carbsGrams * 4 + fatGrams * 9;
    const proteinPercent = totalMacroKcal > 0 ? Math.round(((proteinGrams * 4) / totalMacroKcal) * 100) : 0;
    const carbsPercent = totalMacroKcal > 0 ? Math.round(((carbsGrams * 4) / totalMacroKcal) * 100) : 0;
    const fatPercent = totalMacroKcal > 0 ? Math.max(0, 100 - proteinPercent - carbsPercent) : 0;

    return {
      calories: Math.round(calories),
      proteinGrams: parseFloat(proteinGrams.toFixed(1)),
      carbsGrams: parseFloat(carbsGrams.toFixed(1)),
      fatGrams: parseFloat(fatGrams.toFixed(1)),
      fiberGrams: parseFloat(fiberGrams.toFixed(1)),
      sugarGrams: parseFloat(sugarGrams.toFixed(1)),
      sodiumMg: Math.round(sodiumMg),
      potassiumMg: Math.round(potassiumMg),
      proteinPercent,
      carbsPercent,
      fatPercent,
    };
  }

  /**
   * Aggregate micronutrients and calculate Daily Value % against ICMR / RDA benchmarks
   */
  public static calculateMicronutrients(foods: FoodItem[]): Micronutrient[] {
    let vitA = 0; // mcg (DV: 900)
    let vitC = 0; // mg (DV: 90)
    let vitD = 0; // IU (DV: 800)
    let iron = 0; // mg (DV: 18)
    let calcium = 0; // mg (DV: 1000)
    let magnesium = 0; // mg (DV: 420)
    let zinc = 0; // mg (DV: 11)
    let folate = 0; // mcg (DV: 400)

    for (const f of foods) {
      const profile = this.matchFoodItem(f.name);
      const factor = f.estimatedWeightGrams / 100;
      vitA += profile.per100g.vitA * factor;
      vitC += profile.per100g.vitC * factor;
      vitD += profile.per100g.vitD * factor;
      iron += profile.per100g.iron * factor;
      calcium += profile.per100g.calcium * factor;
      magnesium += profile.per100g.magnesium * factor;
      zinc += profile.per100g.zinc * factor;
      folate += profile.per100g.folate * factor;
    }

    return [
      {
        name: 'Iron',
        amount: parseFloat(iron.toFixed(1)),
        unit: 'mg',
        dailyValuePercent: Math.min(100, Math.round((iron / 18) * 100)),
        category: 'mineral',
      },
      {
        name: 'Calcium',
        amount: Math.round(calcium),
        unit: 'mg',
        dailyValuePercent: Math.min(100, Math.round((calcium / 1000) * 100)),
        category: 'mineral',
      },
      {
        name: 'Magnesium',
        amount: Math.round(magnesium),
        unit: 'mg',
        dailyValuePercent: Math.min(100, Math.round((magnesium / 420) * 100)),
        category: 'mineral',
      },
      {
        name: 'Zinc',
        amount: parseFloat(zinc.toFixed(1)),
        unit: 'mg',
        dailyValuePercent: Math.min(100, Math.round((zinc / 11) * 100)),
        category: 'mineral',
      },
      {
        name: 'Folate (B9)',
        amount: Math.round(folate),
        unit: 'mcg',
        dailyValuePercent: Math.min(100, Math.round((folate / 400) * 100)),
        category: 'vitamin',
      },
      {
        name: 'Vitamin A',
        amount: Math.round(vitA),
        unit: 'mcg',
        dailyValuePercent: Math.min(100, Math.round((vitA / 900) * 100)),
        category: 'vitamin',
      },
      {
        name: 'Vitamin C',
        amount: parseFloat(vitC.toFixed(1)),
        unit: 'mg',
        dailyValuePercent: Math.min(100, Math.round((vitC / 90) * 100)),
        category: 'vitamin',
      },
      {
        name: 'Vitamin D',
        amount: Math.round(vitD),
        unit: 'IU',
        dailyValuePercent: Math.min(100, Math.round((vitD / 800) * 100)),
        category: 'vitamin',
      },
    ];
  }

  /**
   * Derive grounded physiological benefits from actual meal composition
   */
  public static deriveHealthBenefits(macros: MacroDistribution, foods: FoodItem[]): HealthBenefit[] {
    const benefits: HealthBenefit[] = [];

    // Protein check
    if (macros.proteinGrams >= 20) {
      benefits.push({
        title: 'Lean Muscle Repair & Satiety',
        description: `Delivers ${macros.proteinGrams}g high-quality protein to support cellular tissue rebuilding and prolong fullness between meals.`,
        category: 'muscle',
      });
    }

    // Fiber check
    if (macros.fiberGrams >= 6) {
      benefits.push({
        title: 'Sustained Glycemic Release',
        description: `${macros.fiberGrams}g dietary fiber slows glucose absorption, preventing post-meal insulin spikes and supporting gut microbiome.`,
        category: 'digestion',
      });
    }

    // Micronutrient / vegetable check
    const hasVegetables = foods.some(
      (f) =>
        f.name.toLowerCase().includes('salad') ||
        f.name.toLowerCase().includes('spinach') ||
        f.name.toLowerCase().includes('palak') ||
        f.name.toLowerCase().includes('sabzi')
    );
    if (hasVegetables) {
      benefits.push({
        title: 'Cellular Antioxidant Defense',
        description: 'Plant phytonutrients, polyphenols, and potassium help buffer oxidative stress and regulate cellular electrolyte balance.',
        category: 'immunity',
      });
    }

    // Fermented check (Idli, Dosa, Curd)
    const hasFermented = foods.some(
      (f) =>
        f.name.toLowerCase().includes('curd') ||
        f.name.toLowerCase().includes('dahi') ||
        f.name.toLowerCase().includes('raita') ||
        f.name.toLowerCase().includes('idli')
    );
    if (hasFermented) {
      benefits.push({
        title: 'Probiotic & Digestive Assimilation',
        description: 'Active lactic fermentation cultures assist gut digestion and increase non-heme iron and zinc bioavailability.',
        category: 'digestion',
      });
    }

    // Fallback if small meal
    if (benefits.length === 0) {
      benefits.push({
        title: 'Quick Sustained Energy',
        description: 'Provides balanced complex carbohydrates to replenish glycogen stores without excessive digestive fatigue.',
        category: 'energy',
      });
    }

    return benefits;
  }

  /**
   * Grounded considerations to keep in mind (oil, sodium, GI, pairings)
   */
  public static deriveDietaryConsiderations(macros: MacroDistribution, foods: FoodItem[]): DietaryConsideration[] {
    const considerations: DietaryConsideration[] = [];

    if (macros.fatGrams > 28) {
      considerations.push({
        title: 'Hidden Cooking Fats & Gravies',
        description: 'Restaurant or rich home preparations may contain ghee or butter. If strictly watching calorie density, consider portioning gravy.',
        type: 'caution',
      });
    }

    if (macros.sodiumMg > 750) {
      considerations.push({
        title: 'Moderate Sodium Content',
        description: `${macros.sodiumMg}mg sodium detected across dishes. Ensure adequate hydration (500ml water) over the next 2 hours.`,
        type: 'info',
      });
    }

    const hasLegumes = foods.some((f) => f.name.toLowerCase().includes('dal') || f.name.toLowerCase().includes('chole'));
    const hasRawSalad = foods.some((f) => f.name.toLowerCase().includes('salad') || f.name.toLowerCase().includes('lemon'));
    if (hasLegumes && !hasRawSalad) {
      considerations.push({
        title: 'Boost Iron Absorption',
        description: 'Lentils provide plant iron. Squeezing fresh lemon (Vitamin C) over your dal significantly boosts non-heme iron uptake.',
        type: 'info',
      });
    }

    return considerations;
  }

  /**
   * Generate personalized coach advice referencing user goals and current meal
   */
  public static generateCoachInsight(
    userName: string,
    userGoals: string[],
    macros: MacroDistribution,
    mealType: string
  ): string {
    const firstName = userName.split(' ')[0] || 'Friend';
    const isWeightLoss = userGoals.some((g) => g.toLowerCase().includes('weight'));
    const isEndurance = userGoals.some((g) => g.toLowerCase().includes('cardio') || g.toLowerCase().includes('endurance'));
    const isMuscle = userGoals.some((g) => g.toLowerCase().includes('muscle') || g.toLowerCase().includes('hypertrophy'));

    if (isMuscle) {
      return `Shabash ${firstName}! This ${mealType} gives you ${macros.proteinGrams}g of protein (${macros.proteinPercent}% of total calories). Ideal fuel for muscle protein synthesis and post-workout recovery.`;
    }

    if (isWeightLoss) {
      return `Great mindful plating, ${firstName}. At ${macros.calories} kcal with ${macros.fiberGrams}g fiber, this meal will keep your hunger hormones steady without pushing you over your daily caloric target.`;
    }

    if (isEndurance) {
      return `Solid fuel for your daily cardio, ${firstName}! The combination of complex carbs (${macros.carbsGrams}g) and steady proteins will replenish glycogen stores without causing energy slumps.`;
    }

    return `Looking very balanced, ${firstName}! Total calories come out to ~${macros.calories} kcal with solid micronutrient variety. Enjoy your meal mindfully!`;
  }
}

