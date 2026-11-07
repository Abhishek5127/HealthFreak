import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import {
  Svg,
  Circle,
} from 'react-native-svg';
import {
  X,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Info,
  ArrowRight,
  History,
  Camera,
  Utensils,
  Trash2,
} from 'lucide-react-native';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { MealAnalysisResult } from '../../../types/meal';

interface NutritionDetailModalProps {
  visible: boolean;
  onClose: () => void;
  todaysNutrition: {
    caloriesTotal: number;
    caloriesTarget: number;
    proteinTotal: number;
    proteinTarget: number;
    carbsTotal: number;
    carbsTarget: number;
    fatTotal: number;
    fatTarget: number;
  };
  recentMeals: MealAnalysisResult[];
  goalMacroExplainer: string;
  onScanMeal: () => void;
  onOpenMealResult: (meal: MealAnalysisResult) => void;
  onDeleteMeal: (mealId: string) => void;
  onNavigateProgress: () => void;
  onNavigateCoach: () => void;
}

export const NutritionDetailModal: React.FC<NutritionDetailModalProps> = ({
  visible,
  onClose,
  todaysNutrition,
  recentMeals,
  goalMacroExplainer,
  onScanMeal,
  onOpenMealResult,
  onDeleteMeal,
  onNavigateProgress,
  onNavigateCoach,
}) => {
  const caloriePct = todaysNutrition.caloriesTarget > 0
    ? Math.min(100, Math.round((todaysNutrition.caloriesTotal / todaysNutrition.caloriesTarget) * 100))
    : 0;
  const proteinPct = todaysNutrition.proteinTarget > 0
    ? Math.min(100, Math.round((todaysNutrition.proteinTotal / todaysNutrition.proteinTarget) * 100))
    : 0;
  const carbsPct = todaysNutrition.carbsTarget > 0
    ? Math.min(100, Math.round((todaysNutrition.carbsTotal / todaysNutrition.carbsTarget) * 100))
    : 0;
  const fatsPct = todaysNutrition.fatTarget > 0
    ? Math.min(100, Math.round((todaysNutrition.fatTotal / todaysNutrition.fatTarget) * 100))
    : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Sheet Handle */}
          <View style={styles.handleBar} />

          {/* Header Row */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Personalized Nutrition</Text>
              <Text style={styles.sheetSubtitle}>Daily calorie budget & macro breakdown</Text>
            </View>
            <Pressable
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Daily Energy Budget Card */}
            <View style={styles.energyBudgetCard}>
              <View style={styles.energyBudgetTopRow}>
                <Text style={styles.energyBudgetTitle}>Daily Energy Budget</Text>
                <Text style={styles.energyBudgetSub}>Track your calories and stay on target</Text>
              </View>

              <View style={styles.energyBudgetMetricsRow}>
                {/* Circular Progress Gauge */}
                <View style={styles.circularGaugeBox}>
                  <Svg width={118} height={118} viewBox="0 0 120 120">
                    <Circle
                      cx={60}
                      cy={60}
                      r={46}
                      stroke="#2B312C"
                      strokeWidth={7.5}
                      strokeDasharray="216.77 72.26"
                      strokeLinecap="round"
                      fill="none"
                      transform="rotate(135 60 60)"
                    />
                    <Circle
                      cx={60}
                      cy={60}
                      r={46}
                      stroke={Colors.forestGreenLight}
                      strokeWidth={7.5}
                      strokeDasharray={`${Math.max(0.1, (caloriePct / 100) * 216.77)} 300`}
                      strokeLinecap="round"
                      fill="none"
                      transform="rotate(135 60 60)"
                    />
                    <Circle cx={60} cy={14} r={4.5} fill="#FFFFFF" />
                    <Circle cx={60} cy={14} r={7.5} stroke="rgba(75, 119, 97, 0.45)" strokeWidth={1.5} fill="none" />
                  </Svg>

                  <View style={styles.gaugeCenterContent}>
                    <Flame size={17} color={Colors.forestGreenLight} style={{ marginBottom: 2 }} />
                    <Text style={styles.gaugeKcalValue}>{todaysNutrition.caloriesTotal}</Text>
                    <Text style={styles.gaugeKcalTarget}>/ {todaysNutrition.caloriesTarget} kcal</Text>
                    <View style={styles.gaugePctBadge}>
                      <Text style={styles.gaugePctText}>{caloriePct}%</Text>
                    </View>
                  </View>
                </View>

                {/* 3 Macro Columns */}
                <View style={styles.macroColumnsBox}>
                  {/* Protein */}
                  <View style={styles.macroStatCol}>
                    <View style={styles.macroLabelRow}>
                      <Dumbbell size={13} color="#FB7185" style={{ marginRight: 4 }} />
                      <Text style={styles.macroStatName}>Protein</Text>
                    </View>
                    <Text style={styles.macroStatAmount}>
                      {todaysNutrition.proteinTotal} / {todaysNutrition.proteinTarget}g
                    </Text>
                    <View style={styles.macroTrackBg}>
                      <View
                        style={[
                          styles.macroTrackFill,
                          { width: `${proteinPct}%`, backgroundColor: '#FB7185' },
                        ]}
                      />
                    </View>
                    <Text style={styles.macroPctText}>{proteinPct}%</Text>
                  </View>

                  <View style={styles.macroDividerLine} />

                  {/* Carbs */}
                  <View style={styles.macroStatCol}>
                    <View style={styles.macroLabelRow}>
                      <Wheat size={13} color="#FBBF24" style={{ marginRight: 4 }} />
                      <Text style={styles.macroStatName}>Carbs</Text>
                    </View>
                    <Text style={styles.macroStatAmount}>
                      {todaysNutrition.carbsTotal} / {todaysNutrition.carbsTarget}g
                    </Text>
                    <View style={styles.macroTrackBg}>
                      <View
                        style={[
                          styles.macroTrackFill,
                          { width: `${carbsPct}%`, backgroundColor: '#FBBF24' },
                        ]}
                      />
                    </View>
                    <Text style={styles.macroPctText}>{carbsPct}%</Text>
                  </View>

                  <View style={styles.macroDividerLine} />

                  {/* Fats */}
                  <View style={styles.macroStatCol}>
                    <View style={styles.macroLabelRow}>
                      <Droplet size={13} color="#A78BFA" style={{ marginRight: 4 }} />
                      <Text style={styles.macroStatName}>Fats</Text>
                    </View>
                    <Text style={styles.macroStatAmount}>
                      {todaysNutrition.fatTotal} / {todaysNutrition.fatTarget}g
                    </Text>
                    <View style={styles.macroTrackBg}>
                      <View
                        style={[
                          styles.macroTrackFill,
                          { width: `${fatsPct}%`, backgroundColor: '#A78BFA' },
                        ]}
                      />
                    </View>
                    <Text style={styles.macroPctText}>{fatsPct}%</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 2. Amber Target Advice Banner */}
            <View style={styles.amberAdviceBanner}>
              <View style={styles.amberIconCircle}>
                <Info size={15} color="#F59E0B" />
              </View>
              <Text style={styles.amberAdviceText}>{goalMacroExplainer}</Text>
              <Pressable
                style={styles.amberTipsBtn}
                onPress={() => {
                  onClose();
                  onNavigateCoach();
                }}
              >
                <Text style={styles.amberTipsText}>View Tips</Text>
                <ArrowRight size={12} color={Colors.coralCTA} style={{ marginLeft: 2 }} />
              </Pressable>
            </View>

            {/* 3. 30-Day Food Diary Card */}
            <View style={styles.foodDiaryCard}>
              <View style={styles.diaryHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <History size={16} color={Colors.forestGreenLight} />
                  <Text style={styles.diaryHeaderTitle}>30-Day Food Diary</Text>
                  <View style={styles.diaryReadyBadge}>
                    <Text style={styles.diaryReadyText}>{recentMeals.length > 0 ? 'Active' : 'Ready'}</Text>
                  </View>
                </View>
                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => {
                    onClose();
                    onNavigateProgress();
                  }}
                >
                  <Text style={styles.diaryViewHistoryText}>View History</Text>
                  <ArrowRight size={13} color={Colors.forestGreenLight} style={{ marginLeft: 3 }} />
                </Pressable>
              </View>

              <View style={styles.diaryContentRow}>
                <Image
                  source={require('../../../../assets/images/nutrition/healthy_bowl_clean.png')}
                  style={styles.diaryBowlImage}
                  resizeMode="contain"
                />
                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                  <Text style={styles.diaryMainHeadline}>
                    {recentMeals.length} Meals Logged • {todaysNutrition.proteinTarget}g Target
                  </Text>
                  <Text style={styles.diarySubHeadline}>
                    Log your meals to track progress and hit your goals!
                  </Text>
                </View>
                <Pressable
                  style={styles.diaryLogMealBtn}
                  onPress={() => {
                    onClose();
                    onScanMeal();
                  }}
                >
                  <Camera size={13} color={Colors.forestGreenLight} style={{ marginRight: 4 }} />
                  <Text style={styles.diaryLogMealBtnText}>Scan Meal</Text>
                </Pressable>
              </View>

              {/* Logged Meals List */}
              {recentMeals.length > 0 && (
                <View style={styles.loggedMealsContainer}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.loggedMealsTitle}>Logged Today ({recentMeals.length}):</Text>
                    <Pressable
                      onPress={() => {
                        onClose();
                        onScanMeal();
                      }}
                    >
                      <Text style={{ fontSize: 11, color: Colors.forestGreenLight, fontWeight: '700' }}>+ Scan Another</Text>
                    </Pressable>
                  </View>
                  {recentMeals.map((meal) => (
                    <Pressable
                      key={meal.id}
                      style={styles.loggedMealItem}
                      onPress={() => {
                        onClose();
                        onOpenMealResult(meal);
                      }}
                    >
                      <View style={styles.loggedMealIcon}>
                        <Utensils size={14} color={Colors.lightSage} />
                      </View>
                      <View style={styles.loggedMealInfo}>
                        <Text style={styles.loggedMealName} numberOfLines={1}>{meal.mealName}</Text>
                        <Text style={styles.loggedMealSub}>
                          {meal.totalNutrition.calories} kcal • {meal.totalNutrition.proteinGrams}g P • {meal.totalNutrition.carbsGrams}g C • {meal.totalNutrition.fatGrams}g F
                        </Text>
                      </View>
                      <Pressable
                        style={{ padding: 6, marginLeft: 8 }}
                        onPress={(e) => {
                          e.stopPropagation();
                          onDeleteMeal(meal.id);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={16} color={Colors.coralCTA} />
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#161A17',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderColor: '#2A302B',
    maxHeight: '88%',
    paddingBottom: 28,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#353D37',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222823',
  },
  sheetTitle: {
    fontFamily: Typography.fontFamilies.serif,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontFamily: Typography.fontFamilies.sansRegular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#202622',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2C342E',
  },
  scrollArea: {
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 20,
  },

  // Daily Energy Budget Card
  energyBudgetCard: {
    backgroundColor: '#1E2320',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A302B',
    marginBottom: 12,
  },
  energyBudgetTopRow: {
    marginBottom: 14,
  },
  energyBudgetTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  energyBudgetSub: {
    color: Colors.textSecondary,
    fontSize: 11.5,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 2,
  },
  energyBudgetMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circularGaugeBox: {
    width: 118,
    height: 118,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gaugeCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gaugeKcalValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: Typography.fontFamilies.sansBold,
    lineHeight: 24,
  },
  gaugeKcalTarget: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 1,
  },
  gaugePctBadge: {
    backgroundColor: '#141815',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#2A302B',
    marginTop: 4,
  },
  gaugePctText: {
    color: Colors.lightSage,
    fontSize: 9.5,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  macroColumnsBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 12,
  },
  macroStatCol: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  macroDividerLine: {
    width: 1,
    height: 48,
    backgroundColor: '#2A302B',
  },
  macroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroStatName: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  macroStatAmount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
    marginTop: 3,
    marginBottom: 5,
  },
  macroTrackBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#2B312C',
    borderRadius: 2,
    overflow: 'hidden',
  },
  macroTrackFill: {
    height: '100%',
    borderRadius: 2,
  },
  macroPctText: {
    color: Colors.textSecondary,
    fontSize: 9.5,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 4,
  },

  // Amber Advice Banner
  amberAdviceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 113, 95, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 113, 95, 0.2)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  amberIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 113, 95, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  amberAdviceText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 11.5,
    lineHeight: 15.5,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  amberTipsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 113, 95, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 113, 95, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  amberTipsText: {
    color: Colors.coralCTA,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },

  // 30-Day Food Diary Card
  foodDiaryCard: {
    backgroundColor: '#1E2320',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A302B',
    marginBottom: 12,
  },
  diaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  diaryHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.fontFamilies.sansBold,
    marginLeft: 6,
  },
  diaryReadyBadge: {
    backgroundColor: 'rgba(75, 119, 97, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(75, 119, 97, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 8,
  },
  diaryReadyText: {
    color: Colors.forestGreenLight,
    fontSize: 9.5,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  diaryViewHistoryText: {
    color: Colors.forestGreenLight,
    fontSize: 11.5,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  diaryContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diaryBowlImage: {
    width: 68,
    height: 54,
    borderRadius: 10,
  },
  diaryMainHeadline: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  diarySubHeadline: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 2,
    lineHeight: 14,
  },
  diaryLogMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(75, 119, 97, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(75, 119, 97, 0.4)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  diaryLogMealBtnText: {
    color: Colors.forestGreenLight,
    fontSize: 11.5,
    fontFamily: Typography.fontFamilies.sansBold,
  },

  // Logged Meals Styles
  loggedMealsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#2A302B',
    paddingTop: 12,
    marginTop: 12,
  },
  loggedMealsTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansBold,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loggedMealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262C28',
    padding: 10,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#343C36',
  },
  loggedMealIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E2320',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  loggedMealInfo: {
    flex: 1,
  },
  loggedMealName: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  loggedMealSub: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 2,
  },
});
