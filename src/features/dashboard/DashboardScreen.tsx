import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import {
  Bell,
  Crown,
  Footprints,
  Flame,
  Clock,
  Dumbbell,
  Sparkles,
  Zap,
  Salad,
  ChevronRight,
  Camera,
  Utensils,
  History,
  Droplet,
  Sliders,
  Plus,
  Heart,
  Check,
  Sun,
  Activity,
} from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { HeroCard } from '../../components/cards/HeroCard';
import { CategoryTile } from '../../components/cards/CategoryTile';
import { ProgressMetricCard } from '../../components/cards/ProgressMetricCard';
import { PlanActivityCard } from '../../components/cards/PlanActivityCard';
import { CheckInCharacterView } from '../../components/illustrations/CheckInCharacters';

export const DashboardScreen: React.FC = () => {
  const {
    userProfile,
    metrics,
    activities,
    toggleActivityCompletion,
    setActiveModal,
    setActiveTab,
    openMealScanner,
    openMealResult,
    todaysNutrition,
    recentMeals,
    waterLoggedMl,
    logWater,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('Gym');

  // Skincare AM/PM checklist state
  const [skincareMorningDone, setSkincareMorningDone] = useState<boolean>(true);
  const [skincareEveningDone, setSkincareEveningDone] = useState<boolean>(false);

  const categories = [
    { label: 'Gym', icon: <Dumbbell size={20} color={selectedCategory === 'Gym' ? '#FFFFFF' : Colors.textSecondary} /> },
    { label: 'Yoga', icon: <Sparkles size={20} color={selectedCategory === 'Yoga' ? '#FFFFFF' : Colors.textSecondary} /> },
    { label: 'Fitness', icon: <Zap size={20} color={selectedCategory === 'Fitness' ? '#FFFFFF' : Colors.textSecondary} /> },
    { label: 'Run', icon: <Footprints size={20} color={selectedCategory === 'Run' ? '#FFFFFF' : Colors.textSecondary} /> },
    { label: 'Nutrition', icon: <Salad size={20} color={selectedCategory === 'Nutrition' ? '#FFFFFF' : Colors.textSecondary} /> },
  ];

  // Survey assessment data
  const assessment = userProfile.surveyAssessment;
  const currentGoal = userProfile.selectedGoal || 'weight_gain';

  // Goal-specific styling and details
  let goalTitle = 'Weight Gain & Muscle Phase';
  let goalSub = 'Target: 65 kg → 72 kg (+7.0 kg) • High Hypertrophy';
  let goalBadge = 'Lean Mass Surplus';
  let goalColor = Colors.forestGreenLight;
  let goalIcon = <Dumbbell size={20} color={Colors.forestGreenLight} />;
  let goalMacroExplainer = '2.0g protein/kg of body weight to fuel muscle protein synthesis while keeping surplus lean.';
  let isSurplus = false;
  let isDeficit = false;
  let waterTargetL = assessment?.calculatedPlan?.waterLiters || 3.2;

  if (currentGoal === 'weight_gain') {
    isSurplus = true;
    goalTitle = assessment?.calculatedPlan?.headline || 'Weight Gain & Muscle Phase';
    goalSub = assessment
      ? `Current: ${assessment.currentWeightKg} kg → Goal: ${assessment.targetWeightKg} kg (+${(assessment.targetWeightKg - assessment.currentWeightKg).toFixed(1)} kg)`
      : 'Current: 65 kg → Goal: 72 kg (+7.0 kg) • 2.0g/kg Protein';
    goalBadge = 'Surplus (+450 kcal)';
    goalColor = Colors.forestGreenLight;
    goalIcon = <Dumbbell size={20} color={Colors.forestGreenLight} />;
    goalMacroExplainer = `Target: ${todaysNutrition.proteinTarget}g protein (2.0g/kg) to fuel muscle repair with clean complex carbs.`;
  } else if (currentGoal === 'weight_loss') {
    isDeficit = true;
    goalTitle = assessment?.calculatedPlan?.headline || 'Fat Loss & Caloric Deficit Phase';
    goalSub = assessment
      ? `Current: ${assessment.currentWeightKg} kg → Goal: ${assessment.targetWeightKg} kg (-${(assessment.currentWeightKg - assessment.targetWeightKg).toFixed(1)} kg)`
      : 'Current: 82 kg → Goal: 74 kg (-8.0 kg) • Fat Burn Focus';
    goalBadge = 'Deficit (-500 kcal)';
    goalColor = Colors.coralCTA;
    goalIcon = <Flame size={20} color={Colors.coralCTA} />;
    goalMacroExplainer = `Target: ${todaysNutrition.proteinTarget}g protein shields lean muscle during deficit while burning body fat.`;
  } else if (currentGoal === 'acne_control') {
    goalTitle = 'Clear Skin & Anti-Acne Protocol';
    goalSub = 'Low-GI Sebum Regulation • 3.5L Daily Hydration • Zinc & Omega-3';
    goalBadge = 'Dermal Clarity';
    goalColor = '#45D09E';
    goalIcon = <Sparkles size={20} color="#45D09E" />;
    goalMacroExplainer = 'Low glycemic load meals to prevent insulin/IGF-1 surges that trigger excess sebum & acne.';
    waterTargetL = 3.5;
  } else if (currentGoal === 'skincare_glow') {
    goalTitle = 'Radiant Glow & Skin Barrier Restoration';
    goalSub = 'Collagen Amino Acids • Lipid Barrier Plumping • 3.5L Hydration';
    goalBadge = 'Cellular Glow';
    goalColor = '#F38BA8';
    goalIcon = <Heart size={20} color="#F38BA8" />;
    goalMacroExplainer = 'Collagen-supporting amino acids, Vitamin C, and healthy lipids for barrier elasticity.';
    waterTargetL = 3.5;
  } else if (currentGoal === 'hair_health') {
    goalTitle = 'Follicle Strength & Anti-Hair Fall';
    goalSub = 'Keratin Amino Acids • Scalp Blood Flow • Biotin & Ferritin';
    goalBadge = 'Follicle Health';
    goalColor = Colors.lightSage;
    goalIcon = <Droplet size={20} color={Colors.lightSage} />;
    goalMacroExplainer = 'Sulfur amino acids (cysteine, lysine) to support keratin synthesis and stop shedding.';
  } else if (currentGoal === 'pcos_pcod') {
    goalTitle = 'Hormonal Balance & PCOS Harmony';
    goalSub = 'Cycle Synchronization • Insulin Steady • Adrenal Cortisol Calm';
    goalBadge = 'Endocrine Balance';
    goalColor = '#D48BAA';
    goalIcon = <Activity size={20} color="#D48BAA" />;
    goalMacroExplainer = 'Low-carb, high-healthy-fat distribution to steady blood sugar and regulate cycles.';
  } else {
    goalTitle = userProfile.goalLabel || 'Metabolic Fitness & Energy';
    goalSub = 'Balanced macros for steady blood sugar and all-day vitality';
    goalBadge = 'Vitality';
    goalColor = Colors.softYellow;
    goalIcon = <Sun size={20} color={Colors.softYellow} />;
    goalMacroExplainer = 'Mitochondrial fuel balance to beat the afternoon slump and steady metabolic rate.';
  }

  const waterLoggedLiters = +(waterLoggedMl / 1000).toFixed(1);
  const waterProgressRatio = Math.min(1, waterLoggedLiters / waterTargetL);

  return (
    <ScreenContainer scrollable={true}>
      {/* 1. Header Section */}
      <View style={styles.headerRow}>
        <Pressable
          style={styles.avatarButton}
          onPress={() => setActiveTab('profile')}
        >
          <Image
            source={require('../../../assets/images/user_avatar.jpg')}
            style={styles.avatarImage}
          />
        </Pressable>

        <View style={styles.greetingContainer}>
          <Text style={styles.welcomeLabel}>Welcome back</Text>
          <Text style={styles.userNameText}>{userProfile.name}</Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconCircleButton}
            onPress={() => setActiveTab('coach')}
            hitSlop={8}
          >
            <Bell size={18} color={Colors.textPrimary} />
          </Pressable>

          <Pressable
            style={styles.streakBadge}
            onPress={() => setActiveTab('progress')}
          >
            <Crown size={15} color={Colors.streakCrown} fill={Colors.streakCrown} />
            <Text style={styles.streakText}>{userProfile.streakDays}</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. PERSONALIZED GOAL PROTOCOL SPOTLIGHT BANNER */}
      <View style={[styles.protocolBannerCard, { borderColor: goalColor + '40' }]}>
        <View style={styles.protocolBannerTop}>
          <View style={[styles.protocolGoalIconCircle, { backgroundColor: goalColor + '20' }]}>
            {goalIcon}
          </View>
          <View style={styles.protocolGoalTextCol}>
            <View style={styles.protocolBadgeRow}>
              <View style={[styles.protocolPill, { backgroundColor: goalColor + '20', borderColor: goalColor + '40' }]}>
                <Text style={[styles.protocolPillText, { color: goalColor }]}>{goalBadge}</Text>
              </View>
              {isSurplus && (
                <View style={styles.surplusTag}>
                  <Text style={styles.surplusTagText}>Anabolic Surplus</Text>
                </View>
              )}
              {isDeficit && (
                <View style={styles.deficitTag}>
                  <Text style={styles.deficitTagText}>Fat Deficit</Text>
                </View>
              )}
            </View>
            <Text style={styles.protocolHeadlineText}>{goalTitle}</Text>
            <Text style={styles.protocolSubText}>{goalSub}</Text>
          </View>
        </View>

        <View style={styles.protocolBannerBottom}>
          <View style={styles.protocolTargetPillGroup}>
            <View style={styles.targetMetricChip}>
              <Text style={styles.targetMetricChipLabel}>PROTEIN</Text>
              <Text style={[styles.targetMetricChipVal, { color: Colors.coralCTA }]}>{todaysNutrition.proteinTarget}g</Text>
            </View>
            <View style={styles.targetMetricChip}>
              <Text style={styles.targetMetricChipLabel}>CARBS</Text>
              <Text style={[styles.targetMetricChipVal, { color: Colors.softYellow }]}>{todaysNutrition.carbsTarget}g</Text>
            </View>
            <View style={styles.targetMetricChip}>
              <Text style={styles.targetMetricChipLabel}>FATS</Text>
              <Text style={[styles.targetMetricChipVal, { color: Colors.lightSage }]}>{todaysNutrition.fatTarget}g</Text>
            </View>
            <View style={styles.targetMetricChip}>
              <Text style={styles.targetMetricChipLabel}>WATER</Text>
              <Text style={[styles.targetMetricChipVal, { color: '#4FA3E2' }]}>{waterTargetL}L</Text>
            </View>
          </View>

          <Pressable
            style={styles.retakeSurveyBtn}
            onPress={() => setActiveModal('onboarding')}
          >
            <Sliders size={13} color={Colors.lightSage} style={{ marginRight: 5 }} />
            <Text style={styles.retakeSurveyBtnText}>Edit Goal</Text>
          </Pressable>
        </View>
      </View>

      {/* 3. Hero Card (Forest Green with Sun character) */}
      <HeroCard
        titlePrimary="Not sure"
        italicWord1="what"
        italicWord2="train"
        subtitle="Tell us how you feel, we'll recommend workouts matching your energy & mood."
        buttonLabel="Find my match"
        onCheckInPress={() => setActiveModal('checkin')}
      />

      {/* 4. Daily Status & Quick Check-in pill */}
      <Pressable
        style={styles.dailyCheckInCard}
        onPress={() => setActiveModal('checkin')}
      >
        <View style={styles.checkInLeft}>
          <View style={styles.checkInMiniAvatar}>
            <CheckInCharacterView mood={userProfile.currentMood} size={42} animate={false} />
          </View>
          <View>
            <Text style={styles.checkInQuestion}>How are you feeling today?</Text>
            <Text style={styles.checkInStatus}>
              Logged as <Text style={styles.checkInStatusHighlight}>{userProfile.currentMood.toUpperCase()}</Text> • {userProfile.lastCheckInTime || 'Today'}
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color={Colors.textSecondary} />
      </Pressable>

      {/* 5. Categories Section */}
      <SectionHeader
        title="Categories"
        actionText="See all"
        onActionPress={() => setActiveTab('plan')}
      />
      <View style={styles.categoriesRow}>
        {categories.map((cat) => (
          <CategoryTile
            key={cat.label}
            label={cat.label}
            icon={cat.icon}
            isSelected={selectedCategory === cat.label}
            onPress={() => {
              setSelectedCategory(cat.label);
              if (cat.label === 'Nutrition') {
                openMealScanner();
              }
            }}
          />
        ))}
      </View>

      {/* 6. DAILY NUTRITION & AI MEAL SCANNER (PERSONALIZED MACRO TARGETS) */}
      <SectionHeader
        title="Personalized Nutrition & Macros"
        actionText="Scan Food"
        onActionPress={openMealScanner}
      />
      <View style={styles.nutritionCard}>
        <View style={styles.nutritionTopRow}>
          <View>
            <Text style={styles.nutritionKcalLabel}>DAILY ENERGY BUDGET</Text>
            <View style={styles.nutritionKcalRow}>
              <Text style={styles.nutritionKcalValue}>{todaysNutrition.caloriesTotal}</Text>
              <Text style={styles.nutritionKcalTarget}> / {todaysNutrition.caloriesTarget} kcal</Text>
            </View>
          </View>

          <Pressable style={styles.scanMealBtn} onPress={openMealScanner}>
            <Camera size={16} color={Colors.textInverted} style={{ marginRight: 6 }} />
            <Text style={styles.scanMealBtnText}>Scan Meal</Text>
          </Pressable>
        </View>

        {/* Dynamic Macro Progress Bars */}
        <View style={styles.nutritionMacroGrid}>
          {/* Protein */}
          <View style={styles.macroCol}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroNumbers}>{todaysNutrition.proteinTotal}/{todaysNutrition.proteinTarget}g</Text>
            </View>
            <View style={styles.macroTrack}>
              <View
                style={[
                  styles.macroBar,
                  {
                    width: `${Math.min(100, (todaysNutrition.proteinTotal / todaysNutrition.proteinTarget) * 100)}%`,
                    backgroundColor: Colors.coralCTA,
                  },
                ]}
              />
            </View>
          </View>

          {/* Carbs */}
          <View style={styles.macroCol}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroNumbers}>{todaysNutrition.carbsTotal}/{todaysNutrition.carbsTarget}g</Text>
            </View>
            <View style={styles.macroTrack}>
              <View
                style={[
                  styles.macroBar,
                  {
                    width: `${Math.min(100, (todaysNutrition.carbsTotal / todaysNutrition.carbsTarget) * 100)}%`,
                    backgroundColor: Colors.softYellow,
                  },
                ]}
              />
            </View>
          </View>

          {/* Fats */}
          <View style={styles.macroCol}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>Fats</Text>
              <Text style={styles.macroNumbers}>{todaysNutrition.fatTotal}/{todaysNutrition.fatTarget}g</Text>
            </View>
            <View style={styles.macroTrack}>
              <View
                style={[
                  styles.macroBar,
                  {
                    width: `${Math.min(100, (todaysNutrition.fatTotal / todaysNutrition.fatTarget) * 100)}%`,
                    backgroundColor: Colors.lightSage,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Clinical Macro Insight Strip */}
        <View style={styles.macroExplainerCard}>
          <Sparkles size={14} color={Colors.coralCTA} style={{ marginRight: 6, marginTop: 2 }} />
          <Text style={styles.macroExplainerText}>{goalMacroExplainer}</Text>
        </View>

        {/* Logged Meals Carousel / Items */}
        {recentMeals.length > 0 ? (
          <View style={styles.loggedMealsContainer}>
            <Text style={styles.loggedMealsTitle}>Logged Today ({recentMeals.length}):</Text>
            {recentMeals.map((meal) => (
              <Pressable
                key={meal.id}
                style={styles.loggedMealItem}
                onPress={() => openMealResult(meal)}
              >
                <View style={styles.loggedMealIcon}>
                  <Utensils size={14} color={Colors.lightSage} />
                </View>
                <View style={styles.loggedMealInfo}>
                  <Text style={styles.loggedMealName} numberOfLines={1}>{meal.mealName}</Text>
                  <Text style={styles.loggedMealSub}>
                    {meal.totalNutrition.calories} kcal • {meal.foods.length} items • {meal.totalNutrition.proteinGrams}g Protein
                  </Text>
                </View>
                <ChevronRight size={16} color={Colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable style={styles.emptyNutritionPrompt} onPress={openMealScanner}>
            <Camera size={20} color={Colors.lightSage} style={{ marginRight: 10 }} />
            <Text style={styles.emptyNutritionText}>
              Point camera at your meal to calculate calories and macros automatically
            </Text>
          </Pressable>
        )}

        {/* 30-Day Nutrition & Follow-Up Strip */}
        <Pressable
          style={styles.thirtyDayDiaryCard}
          onPress={() => setActiveTab('progress')}
        >
          <View style={styles.thirtyDayHeaderRow}>
            <View style={styles.thirtyDayTitleCol}>
              <View style={styles.badgeRow}>
                <History size={13} color={Colors.lightSage} style={{ marginRight: 4 }} />
                <Text style={styles.thirtyDayBadgeText}>30-DAY FOOD DIARY</Text>
                <View style={styles.coveragePill}>
                  <Text style={styles.coverageText}>93% Logged</Text>
                </View>
              </View>
              <Text style={styles.thirtyDayHeadline}>28 Days Logged • {todaysNutrition.proteinTarget}g Target</Text>
              <Text style={styles.thirtyDaySub}>
                Roti, Dal Tadka, Poha & Paneer tracked at item level
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.textSecondary} />
          </View>
        </Pressable>
      </View>

      {/* 7. GOAL-SPECIFIC FEATURE MODULE (WEIGHT GAIN / LOSS / SKINCARE) */}
      {currentGoal === 'weight_gain' && (
        <View style={styles.goalFeatureCard}>
          <View style={styles.goalFeatureHeader}>
            <View style={styles.goalFeatureIcon}>
              <Dumbbell size={18} color={Colors.forestGreenLight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.goalFeatureTitle}>Hypertrophy Surplus & Mass Fuel</Text>
              <Text style={styles.goalFeatureSub}>
                {Math.max(0, todaysNutrition.caloriesTarget - todaysNutrition.caloriesTotal)} kcal left to hit today&apos;s surplus
              </Text>
            </View>
            <View style={styles.featurePillTag}>
              <Text style={styles.featurePillTagText}>+450 kcal</Text>
            </View>
          </View>

          <View style={styles.massFoodsRow}>
            <View style={styles.massFoodChip}>
              <Text style={styles.massFoodChipTitle}>Banana Sattu Shake</Text>
              <Text style={styles.massFoodChipSub}>480 kcal • 24g Protein</Text>
            </View>
            <View style={styles.massFoodChip}>
              <Text style={styles.massFoodChipTitle}>Paneer Bhurji & 3 Roti</Text>
              <Text style={styles.massFoodChipSub}>380 kcal • 28g Protein</Text>
            </View>
          </View>
        </View>
      )}

      {currentGoal === 'weight_loss' && (
        <View style={styles.goalFeatureCard}>
          <View style={styles.goalFeatureHeader}>
            <View style={styles.goalFeatureIcon}>
              <Flame size={18} color={Colors.coralCTA} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.goalFeatureTitle}>Caloric Deficit & Satiety Shield</Text>
              <Text style={styles.goalFeatureSub}>
                {Math.max(0, todaysNutrition.caloriesTarget - todaysNutrition.caloriesTotal)} kcal remaining in daily deficit budget
              </Text>
            </View>
            <View style={[styles.featurePillTag, { backgroundColor: 'rgba(255,113,95,0.15)' }]}>
              <Text style={[styles.featurePillTagText, { color: Colors.coralCTA }]}>-500 kcal Deficit</Text>
            </View>
          </View>

          <View style={styles.massFoodsRow}>
            <View style={styles.massFoodChip}>
              <Text style={styles.massFoodChipTitle}>Sprouted Moong Chaat</Text>
              <Text style={styles.massFoodChipSub}>190 kcal • 16g Protein • High Fiber</Text>
            </View>
            <View style={styles.massFoodChip}>
              <Text style={styles.massFoodChipTitle}>Lauki Yellow Dal Soup</Text>
              <Text style={styles.massFoodChipSub}>180 kcal • 14g Protein • Low GI</Text>
            </View>
          </View>
        </View>
      )}

      {(currentGoal === 'acne_control' || currentGoal === 'skincare_glow') && (
        <View style={styles.goalFeatureCard}>
          <View style={styles.goalFeatureHeader}>
            <View style={styles.goalFeatureIcon}>
              <Sparkles size={18} color="#45D09E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.goalFeatureTitle}>Anti-Acne Dermal Routine & Protocol</Text>
              <Text style={styles.goalFeatureSub}>Sebum balance, gut-skin axis, and cellular plumping</Text>
            </View>
            <View style={[styles.featurePillTag, { backgroundColor: 'rgba(69, 208, 158, 0.15)' }]}>
              <Text style={[styles.featurePillTagText, { color: '#45D09E' }]}>Clear Skin</Text>
            </View>
          </View>

          <View style={styles.skincareChecklist}>
            <Pressable
              style={styles.skincareItem}
              onPress={() => setSkincareMorningDone(!skincareMorningDone)}
            >
              <View style={[styles.checkSquare, skincareMorningDone && styles.checkSquareActive]}>
                {skincareMorningDone && <Check size={14} color="#FFFFFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.skincareItemTitle}>☀️ AM: BHA Salicylic Cleanser + SPF 50+</Text>
                <Text style={styles.skincareItemSub}>Unclogs follicular pores & shields hyperpigmentation</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.skincareItem}
              onPress={() => setSkincareEveningDone(!skincareEveningDone)}
            >
              <View style={[styles.checkSquare, skincareEveningDone && styles.checkSquareActive]}>
                {skincareEveningDone && <Check size={14} color="#FFFFFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.skincareItemTitle}>🌙 PM: Double Cleanse + Ceramide Barrier Cream</Text>
                <Text style={styles.skincareItemSub}>Locks hydration and rebuilds skin lipid stratum</Text>
              </View>
            </Pressable>
          </View>
        </View>
      )}

      {/* 8. INTERACTIVE DAILY HYDRATION TRACKER */}
      <View style={styles.waterTrackerCard}>
        <View style={styles.waterTopRow}>
          <View style={styles.waterIconCircle}>
            <Droplet size={18} color="#4FA3E2" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.waterCardTitle}>Daily Cellular Hydration</Text>
            <Text style={styles.waterCardSub}>
              Logged {waterLoggedLiters}L / {waterTargetL}L Target ({Math.round(waterLoggedMl / 250)} glasses)
            </Text>
          </View>
          <Pressable style={styles.quickAddWaterBtn} onPress={() => logWater(250)}>
            <Plus size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.quickAddWaterText}>+250ml</Text>
          </Pressable>
        </View>

        <View style={styles.waterProgressTrack}>
          <View
            style={[
              styles.waterProgressBar,
              { width: `${waterProgressRatio * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* 9. Your Progress Section */}
      <SectionHeader
        title="Your progress"
        actionText="See activity"
        onActionPress={() => setActiveTab('progress')}
      />
      <View style={styles.progressCardsRow}>
        {metrics.map((metric) => {
          let IconComponent = Footprints;
          if (metric.id === 'calories') IconComponent = Flame;
          if (metric.id === 'activity') IconComponent = Clock;

          return (
            <ProgressMetricCard
              key={metric.id}
              title={metric.title}
              value={metric.value}
              unit={metric.unit}
              percentage={metric.percentage}
              color={metric.color}
              icon={<IconComponent size={18} color={metric.color} />}
              onPress={() => setActiveTab('progress')}
            />
          );
        })}
      </View>

      {/* 10. Today's sessions / Tailored Routine */}
      <SectionHeader
        title="Today's sessions"
        actionText="See all"
        onActionPress={() => setActiveTab('plan')}
      />
      <View style={styles.sessionsList}>
        {activities.slice(0, 3).map((activity) => (
          <PlanActivityCard
            key={activity.id}
            activity={activity}
            onToggleComplete={() => toggleActivityCompletion(activity.id)}
            onPressDetails={() => {
              if (activity.category === 'movement') {
                setActiveModal('activity_session');
              } else {
                setActiveTab('plan');
              }
            }}
          />
        ))}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  avatarButton: {
    marginRight: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#364038',
    backgroundColor: '#242925',
  },
  greetingContainer: {
    flex: 1,
  },
  welcomeLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  userNameText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.md,
    fontFamily: Typography.fontFamilies.serif,
    letterSpacing: Typography.letterSpacing.tight,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E2320',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A302B',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E2320',
    borderRadius: Spacing.borderRadius.round,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#2A302B',
  },
  streakText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  protocolBannerCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    padding: Spacing.md,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  protocolBannerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  protocolGoalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  protocolGoalTextCol: {
    flex: 1,
  },
  protocolBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  protocolPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  protocolPillText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.xs - 2,
    letterSpacing: 0.5,
  },
  surplusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(75, 119, 97, 0.25)',
  },
  surplusTagText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.xs - 2,
    color: Colors.forestGreenLight,
  },
  deficitTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 113, 95, 0.2)',
  },
  deficitTagText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.xs - 2,
    color: Colors.coralCTA,
  },
  protocolHeadlineText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.md,
    color: Colors.textPrimary,
  },
  protocolSubText: {
    fontFamily: Typography.fontFamilies.sansRegular,
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  protocolBannerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  protocolTargetPillGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  targetMetricChip: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  targetMetricChipLabel: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: 8,
    color: Colors.textSecondary,
  },
  targetMetricChipVal: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.xs,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  retakeSurveyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  retakeSurveyBtnText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.xs - 1,
    color: Colors.lightSage,
  },
  dailyCheckInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A201C',
    borderRadius: Spacing.borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#262F28',
  },
  checkInLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkInMiniAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#262F28',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkInQuestion: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  checkInStatus: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 2,
  },
  checkInStatusHighlight: {
    color: Colors.coralCTA,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  categoriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  nutritionCard: {
    backgroundColor: '#1E2320',
    borderRadius: Spacing.borderRadius.xl,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A302B',
  },
  nutritionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  nutritionKcalLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: Typography.letterSpacing.wider,
    marginBottom: 2,
  },
  nutritionKcalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  nutritionKcalValue: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xl + 2,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  nutritionKcalTarget: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansRegular,
  },
  scanMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.forestGreenLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Spacing.borderRadius.round,
  },
  scanMealBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  nutritionMacroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  macroCol: {
    flex: 1,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  macroLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  macroNumbers: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  macroTrack: {
    height: 5,
    backgroundColor: '#2B312C',
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroBar: {
    height: '100%',
    borderRadius: 3,
  },
  macroExplainerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 113, 95, 0.08)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 113, 95, 0.18)',
  },
  macroExplainerText: {
    flex: 1,
    fontFamily: Typography.fontFamilies.sansRegular,
    fontSize: Typography.fontSizes.xs - 1,
    color: Colors.textPrimary,
    lineHeight: 16,
  },
  loggedMealsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#2A302B',
    paddingTop: 12,
    marginBottom: 12,
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
  emptyNutritionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262C28',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#364038',
  },
  emptyNutritionText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
    lineHeight: 18,
  },
  thirtyDayDiaryCard: {
    backgroundColor: '#171B18',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#29332C',
  },
  thirtyDayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thirtyDayTitleCol: {
    flex: 1,
    paddingRight: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  thirtyDayBadgeText: {
    color: Colors.lightSage,
    fontSize: Typography.fontSizes.xs - 2,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.8,
    marginRight: 6,
  },
  coveragePill: {
    backgroundColor: 'rgba(75, 119, 97, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  coverageText: {
    color: Colors.forestGreenLight,
    fontSize: 9,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  thirtyDayHeadline: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  thirtyDaySub: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 2,
  },
  goalFeatureCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 18,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 18,
  },
  goalFeatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalFeatureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  goalFeatureTitle: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
  },
  goalFeatureSub: {
    fontFamily: Typography.fontFamilies.sansRegular,
    fontSize: Typography.fontSizes.xs - 1,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  featurePillTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(75, 119, 97, 0.2)',
  },
  featurePillTagText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.xs - 2,
    color: Colors.forestGreenLight,
  },
  massFoodsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  massFoodChip: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    padding: 10,
    borderRadius: 10,
  },
  massFoodChipTitle: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.xs,
    color: Colors.textPrimary,
  },
  massFoodChipSub: {
    fontFamily: Typography.fontFamilies.sansRegular,
    fontSize: 10,
    color: Colors.forestGreenLight,
    marginTop: 2,
  },
  skincareChecklist: {
    gap: 8,
  },
  skincareItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    padding: 10,
    borderRadius: 10,
  },
  checkSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkSquareActive: {
    backgroundColor: '#45D09E',
    borderColor: '#45D09E',
  },
  skincareItemTitle: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.xs,
    color: Colors.textPrimary,
  },
  skincareItemSub: {
    fontFamily: Typography.fontFamilies.sansRegular,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  waterTrackerCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 18,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 20,
  },
  waterTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  waterIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(79, 163, 226, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  waterCardTitle: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
  },
  waterCardSub: {
    fontFamily: Typography.fontFamilies.sansRegular,
    fontSize: Typography.fontSizes.xs - 1,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  quickAddWaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3578B8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  quickAddWaterText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.xs,
    color: '#FFFFFF',
  },
  waterProgressTrack: {
    height: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  waterProgressBar: {
    height: '100%',
    backgroundColor: '#4FA3E2',
    borderRadius: 4,
  },
  progressCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
  },
  sessionsList: {
    gap: 12,
    marginBottom: 32,
  },
});
