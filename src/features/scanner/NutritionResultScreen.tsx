import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Share,
  TextInput,
  ActivityIndicator,
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
  Check,
  Edit3,
  Trash2,
  HelpCircle,
} from 'lucide-react-native';

import { useApp } from '../../state/AppContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { FoodItem } from '../../types/meal';
import { GlassButton } from '../../components/common/GlassButton';
import { MealScannerService } from '../../services/mealScannerService';

export const NutritionResultScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    activeScannedMeal,
    setActiveScannedMeal,
    setActiveModal,
    saveMealToDiary,
    updateMealPortion,
    startCall,
    triggerHaptic,
  } = useApp();

  const [expandedFoodId, setExpandedFoodId] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>(
    activeScannedMeal?.mealType || 'lunch'
  );

  // Meal verification & adjustment states
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);
  const [correctionText, setCorrectionText] = useState<string>('');
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [refineFeedback, setRefineFeedback] = useState<string | null>(null);

  if (!activeScannedMeal) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: Colors.textSecondary }}>No scanned meal available</Text>
        <GlassButton
          title="Go Back"
          titleColor="#FFFFFF"
          size="md"
          height={48}
          borderRadius={14}
          onPress={() => setActiveModal(null)}
          style={{ marginTop: 16 }}
        />
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
    startCall(
      `Coach Alex here! I see you scanned ${meal.mealName} (${Math.round(macros.calories)} kcal). How can I help you adjust this meal or answer your questions?`
    );
  };

  const toggleExpand = (foodId: string) => {
    triggerHaptic('selection');
    setExpandedFoodId(expandedFoodId === foodId ? null : foodId);
  };

  const handlePortionChange = (foodId: string, currentWeight: number, delta: number) => {
    const newWeight = Math.max(20, currentWeight + delta);
    updateMealPortion(meal.id, foodId, newWeight);
  };

  const handleConfirmAccurate = () => {
    triggerHaptic('success');
    setIsVerified(true);
    setIsAdjusting(false);
    setRefineFeedback('✓ Meal confirmed accurate');
  };

  const handleQuickAddChip = (chipText: string) => {
    triggerHaptic('selection');
    setCorrectionText((prev) => (prev ? `${prev}, ${chipText}` : chipText));
  };

  const handleApplyCorrection = async () => {
    if (!correctionText.trim()) return;
    triggerHaptic('impact');
    setIsRefining(true);
    setRefineFeedback(null);

    try {
      const updated = await MealScannerService.refineMealWithCorrection(meal, correctionText);
      setActiveScannedMeal(updated);
      setIsVerified(true);
      setIsAdjusting(false);
      setCorrectionText('');
      setRefineFeedback('✓ Nutrition recalculated with your added ingredients!');
      triggerHaptic('success');
    } catch (err: any) {
      console.warn('Failed to refine meal:', err);
    } finally {
      setIsRefining(false);
    }
  };

  const handleRemoveFoodItem = (foodId: string) => {
    triggerHaptic('impact');
    const filtered = meal.foods.filter((f) => f.id !== foodId);
    if (filtered.length === 0) return;
    const recalculated = MealScannerService.recalculateClientNutrition(filtered);
    setActiveScannedMeal({
      ...meal,
      foods: recalculated.foods,
      totalNutrition: recalculated.totalNutrition,
      micronutrients: recalculated.micronutrients,
    });
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

        {/* 2.5 Meal Accuracy Verification & Correction Card */}
        <View style={styles.verificationCard}>
          <View style={styles.verificationHeader}>
            <View style={styles.verificationTitleRow}>
              <HelpCircle color={isVerified ? Colors.success : Colors.lightSage} size={18} style={{ marginRight: 8 }} />
              <Text style={styles.verificationTitle}>
                {isVerified ? 'Meal Verified' : 'Is this meal accurate?'}
              </Text>
            </View>
            {isVerified && (
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('selection');
                  setIsAdjusting(true);
                  setIsVerified(false);
                }}
              >
                <Text style={styles.reEditLink}>Edit / Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {refineFeedback && (
            <View style={styles.feedbackBanner}>
              <Text style={styles.feedbackBannerText}>{refineFeedback}</Text>
            </View>
          )}

          {!isAdjusting && !isVerified && (
            <>
              <Text style={styles.verificationSubtitle}>
                Blended ingredients (like whey protein, peanut butter, oil) can&apos;t always be seen by camera.
              </Text>
              <View style={styles.verificationButtonsRow}>
                <TouchableOpacity
                  style={styles.confirmAccurateBtn}
                  onPress={handleConfirmAccurate}
                  activeOpacity={0.8}
                >
                  <Check color="#FFFFFF" size={16} style={{ marginRight: 6 }} />
                  <Text style={styles.confirmAccurateBtnText}>Yes, looks accurate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.adjustMealBtn}
                  onPress={() => {
                    triggerHaptic('selection');
                    setIsAdjusting(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Edit3 color={Colors.lightSage} size={16} style={{ marginRight: 6 }} />
                  <Text style={styles.adjustMealBtnText}>No, adjust items</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {isAdjusting && (
            <View style={styles.adjustPanel}>
              <Text style={styles.adjustPromptText}>
                What else was in this meal? (e.g. whey scoop, peanut butter, ghee)
              </Text>

              <TextInput
                style={styles.correctionTextInput}
                placeholder="e.g. Added 1 scoop whey protein & 1 tbsp peanut butter..."
                placeholderTextColor={Colors.textMuted}
                value={correctionText}
                onChangeText={setCorrectionText}
                multiline
                numberOfLines={2}
              />

              <Text style={styles.quickAddLabel}>Quick add:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickAddScroll}>
                {[
                  '1 scoop whey protein',
                  '1 tbsp peanut butter',
                  '1 glass milk',
                  '1 tsp desi ghee',
                  '1 tbsp honey',
                  '1 extra roti',
                  '1 boiled egg',
                ].map((chip) => (
                  <TouchableOpacity
                    key={chip}
                    style={styles.quickChip}
                    onPress={() => handleQuickAddChip(chip)}
                  >
                    <Plus color={Colors.lightSage} size={12} style={{ marginRight: 4 }} />
                    <Text style={styles.quickChipText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.adjustActionsRow}>
                <TouchableOpacity
                  style={styles.cancelAdjustBtn}
                  onPress={() => {
                    triggerHaptic('selection');
                    setIsAdjusting(false);
                  }}
                >
                  <Text style={styles.cancelAdjustBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.applyAdjustBtn, isRefining && { opacity: 0.7 }]}
                  onPress={handleApplyCorrection}
                  disabled={isRefining || !correctionText.trim()}
                >
                  {isRefining ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Sparkles color="#FFFFFF" size={16} style={{ marginRight: 6 }} />
                      <Text style={styles.applyAdjustBtnText}>Update & Recalculate</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
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

                    {meal.foods.length > 1 && (
                      <View style={styles.foodExpandedFooter}>
                        <TouchableOpacity
                          style={styles.removeItemBtn}
                          onPress={() => handleRemoveFoodItem(food.id)}
                        >
                          <Trash2 color={Colors.coralCTA} size={14} style={{ marginRight: 6 }} />
                          <Text style={styles.removeItemBtnText}>Remove food item</Text>
                        </TouchableOpacity>
                      </View>
                    )}
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

        {/* 7. Coach Alex Commentary */}
        <View style={styles.coachCard}>
          <View style={styles.coachHeader}>
            <View style={styles.coachAvatar}>
              <Sparkles color={Colors.lightSage} size={20} />
            </View>
            <View>
              <Text style={styles.coachName}>HealthFreak AI Coach</Text>
              <Text style={styles.coachTagline}>Personalized to your health profile</Text>
            </View>
          </View>
          <Text style={styles.coachInsightText}>{meal.coachInsight}</Text>
        </View>
      </ScrollView>

      {/* 8. Bottom Sticky Floating Actions */}
      <View style={[styles.bottomStickyBar, { paddingBottom: insets.bottom + 12 }]}>
        <GlassButton
          onPress={handleAskCoach}
          icon={<Mic color={Colors.lightSage} size={20} />}
          titleColor={Colors.lightSage}
          size="md"
          height={52}
          borderRadius={14}
          style={{ width: 52, marginRight: 10 }}
        />

        <GlassButton
          onPress={handleSave}
          title="Save to Food Diary"
          titleColor="#FFFFFF"
          icon={<BookmarkCheck color="#FFFFFF" size={20} />}
          size="md"
          height={52}
          borderRadius={14}
          style={{ flex: 1 }}
        />
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
  // Verification & Adjustment Card Styles
  verificationCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.25)',
    marginBottom: Spacing.lg,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  verificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  reEditLink: {
    fontSize: 13,
    color: Colors.lightSage,
    fontWeight: '600',
  },
  feedbackBanner: {
    backgroundColor: 'rgba(74, 184, 122, 0.15)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  feedbackBannerText: {
    color: Colors.lightSage,
    fontSize: 12,
    fontWeight: '600',
  },
  verificationSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  verificationButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confirmAccurateBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.forestGreenLight,
  },
  confirmAccurateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  adjustMealBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  adjustMealBtnText: {
    color: Colors.lightSage,
    fontSize: 14,
    fontWeight: '600',
  },
  adjustPanel: {
    marginTop: 8,
  },
  adjustPromptText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  correctionTextInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: 14,
    minHeight: 52,
    marginBottom: 10,
  },
  quickAddLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 6,
  },
  quickAddScroll: {
    marginBottom: 12,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 184, 122, 0.12)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.25)',
  },
  quickChipText: {
    fontSize: 12,
    color: Colors.lightSage,
    fontWeight: '600',
  },
  adjustActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  cancelAdjustBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelAdjustBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  applyAdjustBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: Colors.lightSage,
  },
  applyAdjustBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  foodExpandedFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'flex-end',
  },
  removeItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeItemBtnText: {
    fontSize: 12,
    color: Colors.coralCTA,
    fontWeight: '600',
  },
});
