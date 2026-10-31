import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Share2,
  Sparkles,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  CheckCircle2,
  Info,
  Mic,
  BookmarkCheck,
  Zap,
} from 'lucide-react-native';

import { useApp } from '../../state/AppContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { FoodItem } from '../../types/meal';

export const NutritionResultScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    activeScannedMeal,
    setActiveModal,
    saveMealToDiary,
    updateMealPortion,
    setIsVoiceActive,
    triggerHaptic,
  } = useApp();

  const [expandedFoodId, setExpandedFoodId] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>(
    activeScannedMeal?.mealType || 'lunch'
  );

  if (!activeScannedMeal) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: Colors.textSecondary }}>No scanned meal available</Text>
        <TouchableOpacity style={styles.primarySaveBtn} onPress={() => setActiveModal(null)}>
          <Text style={styles.primarySaveBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const meal = activeScannedMeal;
  const macros = meal.totalNutrition;

  const handleShare = async () => {
    triggerHaptic('selection');
    try {
      await Share.share({
        message: `I just scanned my meal "${meal.mealName}" on HealthFreak! Total: ${macros.calories} kcal, ${macros.proteinGrams}g Protein, ${macros.carbsGrams}g Carbs, ${macros.fatGrams}g Fat.`,
      });
    } catch {
      // Ignored
    }
  };

  const handleSave = async () => {
    triggerHaptic('success');
    await saveMealToDiary({
      ...meal,
      mealType: selectedMealType as any,
    });
    setActiveModal(null);
  };

  const handleAskCoach = () => {
    triggerHaptic('impact');
    setIsVoiceActive(true);
    setActiveModal('voice_overlay');
  };

  const toggleExpand = (foodId: string) => {
    triggerHaptic('selection');
    setExpandedFoodId(expandedFoodId === foodId ? null : foodId);
  };

  const handlePortionChange = (foodId: string, currentWeight: number, delta: number) => {
    const newWeight = Math.max(20, currentWeight + delta);
    updateMealPortion(meal.id, foodId, newWeight);
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setActiveModal(null)}
        >
          <ChevronLeft color={Colors.textPrimary} size={24} />
        </TouchableOpacity>

        <View style={styles.confidencePill}>
          <Sparkles color={Colors.lightSage} size={14} style={{ marginRight: 6 }} />
          <Text style={styles.confidenceText}>
            {Math.round(meal.recognitionConfidence * 100)}% Match
          </Text>
        </View>

        <TouchableOpacity style={styles.headerIconBtn} onPress={handleShare}>
          <Share2 color={Colors.textPrimary} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Hero Meal Card */}
        <View style={styles.heroCard}>
          {meal.imageUri ? (
            <Image
              source={{ uri: meal.imageUri }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Flame color={Colors.coralCTA} size={48} />
            </View>
          )}

          <View style={styles.heroDetails}>
            <View style={styles.mealTypeRow}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.mealTypeChip,
                    selectedMealType === type && styles.mealTypeChipActive,
                  ]}
                  onPress={() => {
                    triggerHaptic('selection');
                    setSelectedMealType(type);
                  }}
                >
                  <Text
                    style={[
                      styles.mealTypeChipText,
                      selectedMealType === type && styles.mealTypeChipTextActive,
                    ]}
                  >
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.mealTitle}>{meal.mealName}</Text>
            <Text style={styles.mealTime}>
              {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Analyzed with Gemini Vision
            </Text>
          </View>
        </View>

        {/* 3. Calorie & Macro Breakdown Dashboard */}
        <View style={styles.nutritionCard}>
          <View style={styles.calorieRow}>
            <View>
              <Text style={styles.calorieSubtitle}>TOTAL ENERGY</Text>
              <View style={styles.calorieNumberRow}>
                <Text style={styles.calorieNumber}>{macros.calories}</Text>
                <Text style={styles.calorieUnit}>kcal</Text>
              </View>
            </View>
            <View style={styles.calorieBadge}>
              <Zap color={Colors.softYellow} size={16} style={{ marginRight: 4 }} />
              <Text style={styles.calorieBadgeText}>
                {Math.round((macros.calories / 2100) * 100)}% Daily Goal
              </Text>
            </View>
          </View>

          {/* Macro Distribution Stacked Bar */}
          <View style={styles.stackedBarContainer}>
            <View
              style={[
                styles.stackedBarSegment,
                { flex: macros.proteinPercent || 1, backgroundColor: Colors.coralCTA },
              ]}
            />
            <View
              style={[
                styles.stackedBarSegment,
                { flex: macros.carbsPercent || 1, backgroundColor: Colors.softYellow },
              ]}
            />
            <View
              style={[
                styles.stackedBarSegment,
                { flex: macros.fatPercent || 1, backgroundColor: Colors.lightSage },
              ]}
            />
          </View>

          {/* 3 Macro Cards */}
          <View style={styles.macrosGrid}>
            {/* Protein */}
            <View style={styles.macroTile}>
              <View style={styles.macroTileHeader}>
                <Dumbbell color={Colors.coralCTA} size={16} />
                <Text style={styles.macroTileLabel}>Protein</Text>
              </View>
              <Text style={styles.macroTileValue}>{macros.proteinGrams}g</Text>
              <Text style={styles.macroTilePercent}>{macros.proteinPercent}% of kcal</Text>
            </View>

            {/* Carbs */}
            <View style={styles.macroTile}>
              <View style={styles.macroTileHeader}>
                <Wheat color={Colors.softYellow} size={16} />
                <Text style={styles.macroTileLabel}>Carbs</Text>
              </View>
              <Text style={styles.macroTileValue}>{macros.carbsGrams}g</Text>
              <Text style={styles.macroTilePercent}>{macros.fiberGrams}g fiber</Text>
            </View>

            {/* Fats */}
            <View style={styles.macroTile}>
              <View style={styles.macroTileHeader}>
                <Droplet color={Colors.lightSage} size={16} />
                <Text style={styles.macroTileLabel}>Fats</Text>
              </View>
              <Text style={styles.macroTileValue}>{macros.fatGrams}g</Text>
              <Text style={styles.macroTilePercent}>{macros.fatPercent}% of kcal</Text>
            </View>
          </View>
        </View>

        {/* 4. Detected Food Items & Interactive Portion Adjuster */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Detected Foods</Text>
          <Text style={styles.sectionBadge}>{meal.foods.length} items</Text>
        </View>

        <View style={styles.foodList}>
          {meal.foods.map((food: FoodItem) => {
            const isExpanded = expandedFoodId === food.id;

            return (
              <View key={food.id} style={styles.foodCard}>
                <TouchableOpacity
                  style={styles.foodCardHeader}
                  onPress={() => toggleExpand(food.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.foodHeaderLeft}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    {food.localizedName ? (
                      <Text style={styles.foodLocalizedName}>&ldquo;{food.localizedName}&rdquo;</Text>
                    ) : null}
                    <Text style={styles.foodNutritionSummary}>
                      {food.nutrition.calories} kcal • {food.nutrition.protein}g P • {food.nutrition.carbs}g C • {food.nutrition.fat}g F
                    </Text>
                  </View>

                  <View style={styles.foodHeaderRight}>
                    <View style={styles.portionPill}>
                      <Text style={styles.portionPillText}>{food.estimatedWeightGrams}g</Text>
                    </View>
                    {isExpanded ? (
                      <ChevronUp color={Colors.textSecondary} size={18} />
                    ) : (
                      <ChevronDown color={Colors.textSecondary} size={18} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Expanded Portion Adjuster & Ingredient Details */}
                {isExpanded && (
                  <View style={styles.foodExpandedBody}>
                    <View style={styles.stepperContainer}>
                      <Text style={styles.stepperLabel}>Adjust portion weight:</Text>
                      <View style={styles.stepperControls}>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => handlePortionChange(food.id, food.estimatedWeightGrams, -20)}
                        >
                          <Minus color={Colors.textPrimary} size={16} />
                        </TouchableOpacity>

                        <Text style={styles.stepperValue}>{food.estimatedWeightGrams} grams</Text>

                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => handlePortionChange(food.id, food.estimatedWeightGrams, 20)}
                        >
                          <Plus color={Colors.textPrimary} size={16} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {food.cookingMethod ? (
                      <View style={styles.ingredientRow}>
                        <Text style={styles.ingredientKey}>Cooking Method:</Text>
                        <Text style={styles.ingredientVal}>{food.cookingMethod}</Text>
                      </View>
                    ) : null}

                    {food.visibleIngredients.length > 0 ? (
                      <View style={styles.ingredientRow}>
                        <Text style={styles.ingredientKey}>Visible Ingredients:</Text>
                        <Text style={styles.ingredientVal}>
                          {food.visibleIngredients.join(', ')}
                        </Text>
                      </View>
                    ) : null}

                    {food.inferredIngredients.length > 0 ? (
                      <View style={styles.ingredientRow}>
                        <Text style={styles.ingredientKey}>Inferred Seasonings:</Text>
                        <Text style={styles.ingredientVal}>
                          {food.inferredIngredients.join(', ')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* 5. Micronutrient Profile */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Micronutrients & Minerals</Text>
          <Text style={styles.sectionBadge}>% Daily Value</Text>
        </View>

        <View style={styles.microsCard}>
          {meal.micronutrients.map((micro) => (
            <View key={micro.name} style={styles.microRow}>
              <View style={styles.microLabelCol}>
                <Text style={styles.microName}>{micro.name}</Text>
                <Text style={styles.microAmount}>
                  {micro.amount} {micro.unit}
                </Text>
              </View>

              <View style={styles.microBarCol}>
                <View style={styles.microBarTrack}>
                  <View
                    style={[
                      styles.microBarFill,
                      { width: `${Math.min(100, micro.dailyValuePercent)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.microPercent}>{micro.dailyValuePercent}%</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 6. Health Benefits & Grounded Considerations */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>What Your Body Gets</Text>
        </View>

        <View style={styles.benefitsList}>
          {meal.healthBenefits.map((benefit, i) => (
            <View key={i} style={styles.benefitCard}>
              <CheckCircle2 color={Colors.success} size={20} style={{ marginRight: 12, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDesc}>{benefit.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {meal.considerations.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Things to Keep in Mind</Text>
            </View>
            <View style={styles.considerationsList}>
              {meal.considerations.map((c, i) => (
                <View key={i} style={styles.considerationCard}>
                  <Info color={Colors.softYellow} size={20} style={{ marginRight: 12, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.considerationTitle}>{c.title}</Text>
                    <Text style={styles.considerationDesc}>{c.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* 7. Coach Disha Commentary */}
        <View style={styles.coachCard}>
          <View style={styles.coachHeader}>
            <View style={styles.coachAvatar}>
              <Sparkles color={Colors.lightSage} size={20} />
            </View>
            <View>
              <Text style={styles.coachName}>Disha AI Coach</Text>
              <Text style={styles.coachTagline}>Personalized to your health profile</Text>
            </View>
          </View>
          <Text style={styles.coachInsightText}>{meal.coachInsight}</Text>
        </View>
      </ScrollView>

      {/* 8. Bottom Sticky Floating Actions */}
      <View style={[styles.bottomStickyBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.secondaryVoiceBtn}
          onPress={handleAskCoach}
          activeOpacity={0.8}
        >
          <Mic color={Colors.lightSage} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primarySaveBtn}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <BookmarkCheck color={Colors.textInverted} size={20} style={{ marginRight: 8 }} />
          <Text style={styles.primarySaveBtnText}>Save to Food Diary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
    zIndex: 10,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.lightSage,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  heroCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.lg,
  },
  heroImage: {
    width: '100%',
    height: 200,
  },
  heroPlaceholder: {
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroDetails: {
    padding: Spacing.lg,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  mealTypeChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
  },
  mealTypeChipActive: {
    backgroundColor: Colors.forestGreenLight,
  },
  mealTypeChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  mealTypeChipTextActive: {
    color: Colors.textPrimary,
  },
  mealTitle: {
    fontFamily: Typography.fontFamilies.serif,
    fontSize: 24,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  mealTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  nutritionCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 24,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.xl,
  },
  calorieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  calorieSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  calorieNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  calorieNumber: {
    fontFamily: Typography.fontFamilies.serif,
    fontSize: 40,
    color: Colors.textPrimary,
    marginRight: 6,
  },
  calorieUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  calorieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 214, 111, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(234, 214, 111, 0.3)',
  },
  calorieBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.softYellow,
  },
  stackedBarContainer: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
    marginBottom: Spacing.lg,
  },
  stackedBarSegment: {
    height: '100%',
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  macroTile: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  macroTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  macroTileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  macroTileValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  macroTilePercent: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.lightSage,
  },
  foodList: {
    gap: 12,
    marginBottom: Spacing.xl,
  },
  foodCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  foodCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  foodHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  foodLocalizedName: {
    fontSize: 13,
    color: Colors.lightSage,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  foodNutritionSummary: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  foodHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  portionPill: {
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  portionPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  foodExpandedBody: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    paddingTop: Spacing.md,
    gap: 10,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    padding: 10,
    borderRadius: 14,
  },
  stepperLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  stepperValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  ingredientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  ingredientKey: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  ingredientVal: {
    fontSize: 12,
    color: Colors.lightSage,
    flex: 1,
  },
  microsCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.xl,
    gap: 14,
  },
  microRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  microLabelCol: {
    width: 110,
  },
  microName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  microAmount: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  microBarCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  microBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
  },
  microBarFill: {
    height: '100%',
    backgroundColor: Colors.forestGreenLight,
  },
  microPercent: {
    width: 35,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  benefitsList: {
    gap: 10,
    marginBottom: Spacing.xl,
  },
  benefitCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceCard,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  considerationsList: {
    gap: 10,
    marginBottom: Spacing.xl,
  },
  considerationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceCard,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(234, 214, 111, 0.25)',
  },
  considerationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.softYellow,
    marginBottom: 2,
  },
  considerationDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  coachCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 24,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.xl,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  coachAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.forestGreenDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.forestGreenLight,
  },
  coachName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  coachTagline: {
    fontSize: 12,
    color: Colors.lightSage,
  },
  coachInsightText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  bottomStickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 12,
  },
  secondaryVoiceBtn: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  primarySaveBtn: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.lightSage,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primarySaveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textInverted,
  },
});
