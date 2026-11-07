import React, { useState } from 'react';
import {
  Image,
  View,
  Text,
  StyleSheet,
  Pressable,
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
  ChevronRight,
  Camera,
  Droplet,
  Sliders,
  Heart,
  Check,
  Sun,
  Activity,
  Database,
  RefreshCw,
  CheckCheck,
} from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { ActivitySyncService } from '../activity/services/activitySyncService';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { ProgressMetricCard } from '../../components/cards/ProgressMetricCard';
import { CheckInCharacterView } from '../../components/illustrations/CheckInCharacters';
import { SAMPLE_MEAL_TEMPLATES } from '../../mock-data/sampleMealTemplates';
import { StepCounterCard } from '../activity/components/StepCounterCard';
import { usePedometer } from '../activity/hooks/usePedometer';
import { WaterBottleWidget } from './components/WaterBottleWidget';
import { WaterTargetModal } from './components/WaterTargetModal';
import { NutritionDetailModal } from './components/NutritionDetailModal';
import { AppAvatar } from '../../components/common/AppAvatar';

export const DashboardScreen: React.FC = () => {
  const {
    userProfile,
    metrics,
    activities,
    setActiveModal,
    setActiveTab,
    openMealScanner,
    openMealResult,
    deleteMealFromDiary,
    todaysNutrition,
    recentMeals,
    waterLoggedMl,
    waterTargetMl,
    logWater,
    setCustomWaterTarget,
    resetWaterLogged,
    pedometerState,
    triggerHaptic,
  } = useApp();

  const [showWaterTargetModal, setShowWaterTargetModal] = useState<boolean>(false);
  const [showNutritionModal, setShowNutritionModal] = useState<boolean>(false);
  const [isSyncingData, setIsSyncingData] = useState<boolean>(false);
  const [lastSyncBadge, setLastSyncBadge] = useState<string>('Just now');

  const {
    todaySteps,
    stepGoal,
    distanceMeters,
    caloriesBurned,
    activeMinutes,
    permissionStatus,
    isAvailable,
    isTracking,
    requestPermissions,
  } = usePedometer();

  const handleManualSync = async () => {
    if (isSyncingData) return;
    setIsSyncingData(true);
    triggerHaptic?.('selection');
    try {
      await Promise.all([
        ActivitySyncService.syncDailyWater(
          userProfile.id || 'usr_synthetic_alex',
          waterLoggedMl,
          effectiveTargetMl
        ),
        ActivitySyncService.syncActivities(userProfile.id || 'usr_synthetic_alex', false),
      ]);
      setLastSyncBadge('Just now');
      triggerHaptic?.('success');
    } catch {
      // Graceful fallback
    } finally {
      setIsSyncingData(false);
    }
  };

  // Focus workout for Today's Highlight
  const focusWorkout =
    activities.find((a) => a.category === 'movement' && !a.completed) ||
    activities.find((a) => a.category === 'movement') ||
    activities[0];

  // Skincare AM/PM checklist state
  const [skincareMorningDone, setSkincareMorningDone] = useState<boolean>(false);
  const [skincareEveningDone, setSkincareEveningDone] = useState<boolean>(false);

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
  let baseWaterTargetL = assessment?.calculatedPlan?.waterLiters || 3.2;

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
    baseWaterTargetL = 3.5;
  } else if (currentGoal === 'skincare_glow') {
    goalTitle = 'Radiant Glow & Skin Barrier Restoration';
    goalSub = 'Collagen Amino Acids • Lipid Barrier Plumping • 3.5L Hydration';
    goalBadge = 'Cellular Glow';
    goalColor = '#F38BA8';
    goalIcon = <Heart size={20} color="#F38BA8" />;
    goalMacroExplainer = 'Collagen-supporting amino acids, Vitamin C, and healthy lipids for barrier elasticity.';
    baseWaterTargetL = 3.5;
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

  const effectiveTargetMl = waterTargetMl > 0 ? waterTargetMl : Math.round(baseWaterTargetL * 1000);
  const waterTargetL = +(effectiveTargetMl / 1000).toFixed(1);

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
    <ScreenContainer scrollable={true}>
      {/* 1. Header Section */}
      <View style={styles.headerRow}>
        <Pressable
          style={styles.avatarButton}
          onPress={() => setActiveTab('profile')}
        >
          <AppAvatar
            avatarId={userProfile.avatarUrl}
            size={40}
            borderWidth={1.5}
            borderColor="#52C480"
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

      {/* 3. Daily Energy & Readiness Check-In */}
      <Pressable
        style={styles.dailyCheckInCard}
        onPress={() => setActiveModal('checkin')}
      >
        <View style={styles.checkInLeft}>
          <View style={styles.checkInMiniAvatar}>
            <CheckInCharacterView mood={userProfile.currentMood} size={44} animate={false} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Sparkles size={12} color={Colors.softYellow} style={{ marginRight: 5 }} />
              <Text style={styles.checkInPromptLabel}>ENERGY & READINESS</Text>
            </View>
            <Text style={styles.checkInQuestion}>
              Feeling {userProfile.currentMood.charAt(0).toUpperCase() + userProfile.currentMood.slice(1)} Today
            </Text>
            <Text style={styles.checkInStatus}>
              {userProfile.lastCheckInTime ? `Calibrated ${userProfile.lastCheckInTime}` : 'Tap to sync workout intensity to your mood'}
            </Text>
          </View>
        </View>
        <View style={styles.checkInActionPill}>
          <Text style={styles.checkInActionText}>Recalibrate</Text>
          <ChevronRight size={14} color={Colors.coralCTA} />
        </View>
      </Pressable>

      {/* 6. DAILY NUTRITION & MACROS (COMPACT GLANCEABLE CARD) */}
      <View style={styles.compactNutritionHeaderRow}>
        <Text style={styles.compactSectionTitle}>Nutrition & Macros</Text>
        <Pressable
          style={styles.seeBreakdownBtn}
          onPress={() => setShowNutritionModal(true)}
        >
          <Text style={styles.seeBreakdownText}>View Breakdown</Text>
          <ChevronRight size={14} color={Colors.coralCTA} />
        </Pressable>
      </View>

      <Pressable
        style={styles.compactNutritionCard}
        onPress={() => setShowNutritionModal(true)}
      >
        <View style={styles.compactCardTopRow}>
          <View style={styles.compactCalorieLeft}>
            <View style={styles.compactFlameIconBox}>
              <Flame size={16} color={Colors.coralCTA} />
            </View>
            <View>
              <Text style={styles.compactKcalValue}>
                {todaysNutrition.caloriesTotal}{' '}
                <Text style={styles.compactKcalTarget}>/ {todaysNutrition.caloriesTarget} kcal</Text>
              </Text>
              <Text style={styles.compactKcalSub}>
                {Math.max(0, todaysNutrition.caloriesTarget - todaysNutrition.caloriesTotal)} kcal left • {caloriePct}% consumed
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.compactScanActionBtn}
            onPress={(e) => {
              e.stopPropagation();
              openMealScanner();
            }}
          >
            <Camera size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.compactScanActionText}>Scan Meal</Text>
          </Pressable>
        </View>

        {/* Content Row: Parallel Macros on the Left, Food Image on the Right directly under Scan Meal */}
        <View style={styles.compactCardBodyRow}>
          {/* Left: Protein, Carbs, Fats stacked parallel to each other */}
          <View style={styles.compactMacrosCol}>
            {/* Protein */}
            <View style={styles.compactMacroItem}>
              <View style={styles.compactMacroLabelRow}>
                <View style={styles.compactMacroTitleRow}>
                  <View style={[styles.compactMacroDot, { backgroundColor: '#FB7185' }]} />
                  <Text style={styles.compactMacroName}>Protein</Text>
                </View>
                <Text style={styles.compactMacroNumbers}>
                  {todaysNutrition.proteinTotal}
                  <Text style={styles.compactMacroTarget}>/{todaysNutrition.proteinTarget}g</Text>
                </Text>
              </View>
              <View style={styles.compactMacroTrack}>
                <View
                  style={[
                    styles.compactMacroFill,
                    { width: `${proteinPct}%`, backgroundColor: '#FB7185' },
                  ]}
                />
              </View>
            </View>

            {/* Carbs */}
            <View style={styles.compactMacroItem}>
              <View style={styles.compactMacroLabelRow}>
                <View style={styles.compactMacroTitleRow}>
                  <View style={[styles.compactMacroDot, { backgroundColor: '#FBBF24' }]} />
                  <Text style={styles.compactMacroName}>Carbs</Text>
                </View>
                <Text style={styles.compactMacroNumbers}>
                  {todaysNutrition.carbsTotal}
                  <Text style={styles.compactMacroTarget}>/{todaysNutrition.carbsTarget}g</Text>
                </Text>
              </View>
              <View style={styles.compactMacroTrack}>
                <View
                  style={[
                    styles.compactMacroFill,
                    { width: `${carbsPct}%`, backgroundColor: '#FBBF24' },
                  ]}
                />
              </View>
            </View>

            {/* Fats */}
            <View style={styles.compactMacroItem}>
              <View style={styles.compactMacroLabelRow}>
                <View style={styles.compactMacroTitleRow}>
                  <View style={[styles.compactMacroDot, { backgroundColor: '#A78BFA' }]} />
                  <Text style={styles.compactMacroName}>Fats</Text>
                </View>
                <Text style={styles.compactMacroNumbers}>
                  {todaysNutrition.fatTotal}
                  <Text style={styles.compactMacroTarget}>/{todaysNutrition.fatTarget}g</Text>
                </Text>
              </View>
              <View style={styles.compactMacroTrack}>
                <View
                  style={[
                    styles.compactMacroFill,
                    { width: `${fatsPct}%`, backgroundColor: '#A78BFA' },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Right: Food Image directly below Scan Meal */}
          <View style={styles.compactFoodImageBox}>
            <Image
              source={require('../../../assets/images/nutrition/healthy_bowl_clean.png')}
              style={styles.compactFoodImage}
              resizeMode="cover"
            />
          </View>
        </View>
      </Pressable>

      {/* Full Detailed Nutrition Bottom Sheet Modal */}
      <NutritionDetailModal
        visible={showNutritionModal}
        onClose={() => setShowNutritionModal(false)}
        todaysNutrition={todaysNutrition}
        recentMeals={recentMeals}
        goalMacroExplainer={goalMacroExplainer}
        onScanMeal={openMealScanner}
        onOpenMealResult={openMealResult}
        onDeleteMeal={deleteMealFromDiary}
        onNavigateProgress={() => setActiveTab('progress')}
        onNavigateCoach={() => setActiveTab('coach')}
      />

      {/* 7. GOAL-SPECIFIC FEATURE MODULE (WEIGHT LOSS / SKINCARE) */}

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
            <Pressable
              style={styles.massFoodChip}
              onPress={() => {
                const s = SAMPLE_MEAL_TEMPLATES.find((t) => t.id === 'sample_meal_poha') || SAMPLE_MEAL_TEMPLATES[0];
                openMealResult(s);
              }}
            >
              <Text style={styles.massFoodChipTitle}>Sprouted Moong Chaat 👆</Text>
              <Text style={styles.massFoodChipSub}>190 kcal • 16g Protein • Quick Log</Text>
            </Pressable>
            <Pressable
              style={styles.massFoodChip}
              onPress={() => {
                const s = SAMPLE_MEAL_TEMPLATES.find((t) => t.id === 'sample_meal_chicken_rice') || SAMPLE_MEAL_TEMPLATES[0];
                openMealResult(s);
              }}
            >
              <Text style={styles.massFoodChipTitle}>Tawa Chicken & Rice 👆</Text>
              <Text style={styles.massFoodChipSub}>510 kcal • 50g Protein • Quick Log</Text>
            </Pressable>
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

      {/* 8. INTERACTIVE DAILY HYDRATION WIDGET & SMILING BOTTLE */}
      <WaterBottleWidget
        waterLoggedMl={waterLoggedMl}
        waterTargetMl={effectiveTargetMl}
        onLogWater={(amount) => logWater(amount)}
        onOpenTargetModal={() => setShowWaterTargetModal(true)}
        onResetWater={resetWaterLogged}
      />

      {/* 8b. DAILY HEALTH & DATABASE SYNC SUMMARY */}
      <View style={styles.dbSummaryCard}>
        <View style={styles.dbSummaryHeader}>
          <View style={styles.dbSummaryTitleRow}>
            <View style={styles.dbIconBadge}>
              <Database size={15} color={Colors.forestGreenLight} />
            </View>
            <View>
              <Text style={styles.dbSummaryTitle}>Daily Activity & Database Sync</Text>
              <Text style={styles.dbSummarySub}>Stored locally & synced with cloud</Text>
            </View>
          </View>

          <Pressable
            style={styles.dbSyncActionBtn}
            onPress={handleManualSync}
            disabled={isSyncingData}
          >
            <RefreshCw
              size={13}
              color={Colors.forestGreenLight}
              style={[isSyncingData && { transform: [{ rotate: '45deg' }] }, { marginRight: 5 }]}
            />
            <Text style={styles.dbSyncActionText}>
              {isSyncingData ? 'Syncing...' : 'Sync Now'}
            </Text>
          </Pressable>
        </View>

        {/* 2x2 Metric Summary Grid */}
        <View style={styles.dbMetricsGrid}>
          {/* Steps */}
          <View style={styles.dbMetricTile}>
            <View style={styles.dbMetricTop}>
              <Footprints size={14} color="#7AE69E" />
              <Text style={styles.dbMetricLabel}>Daily Steps</Text>
            </View>
            <Text style={styles.dbMetricValue}>
              {pedometerState.steps.toLocaleString()}
            </Text>
            <View style={styles.dbProgressBarTrack}>
              <View
                style={[
                  styles.dbProgressBarFill,
                  {
                    width: `${Math.min(100, Math.round((pedometerState.steps / Math.max(1, pedometerState.stepGoal)) * 100))}%`,
                    backgroundColor: '#7AE69E',
                  },
                ]}
              />
            </View>
            <Text style={styles.dbMetricSub}>
              {Math.round((pedometerState.steps / Math.max(1, pedometerState.stepGoal)) * 100)}% of {pedometerState.stepGoal.toLocaleString()} goal
            </Text>
          </View>

          {/* Water */}
          <View style={styles.dbMetricTile}>
            <View style={styles.dbMetricTop}>
              <Droplet size={14} color="#7AD3FA" />
              <Text style={styles.dbMetricLabel}>Daily Hydration</Text>
            </View>
            <Text style={styles.dbMetricValue}>
              {waterLoggedMl} <Text style={{ fontSize: 13, color: Colors.textSecondary }}>ml</Text>
            </Text>
            <View style={styles.dbProgressBarTrack}>
              <View
                style={[
                  styles.dbProgressBarFill,
                  {
                    width: `${Math.min(100, Math.round((waterLoggedMl / Math.max(1, effectiveTargetMl)) * 100))}%`,
                    backgroundColor: '#7AD3FA',
                  },
                ]}
              />
            </View>
            <Text style={styles.dbMetricSub}>
              {Math.round((waterLoggedMl / Math.max(1, effectiveTargetMl)) * 100)}% of {effectiveTargetMl}ml
            </Text>
          </View>

          {/* Active Calories */}
          <View style={styles.dbMetricTile}>
            <View style={styles.dbMetricTop}>
              <Flame size={14} color="#FFA26B" />
              <Text style={styles.dbMetricLabel}>Burned</Text>
            </View>
            <Text style={styles.dbMetricValue}>
              {pedometerState.calories || 0} <Text style={{ fontSize: 13, color: Colors.textSecondary }}>kcal</Text>
            </Text>
            <Text style={styles.dbMetricSub}>
              Estimated active burn
            </Text>
          </View>

          {/* Distance */}
          <View style={styles.dbMetricTile}>
            <View style={styles.dbMetricTop}>
              <Activity size={14} color="#C4B5FD" />
              <Text style={styles.dbMetricLabel}>Distance</Text>
            </View>
            <Text style={styles.dbMetricValue}>
              {((pedometerState.distanceMeters || 0) / 1000).toFixed(2)} <Text style={{ fontSize: 13, color: Colors.textSecondary }}>km</Text>
            </Text>
            <Text style={styles.dbMetricSub}>
              {pedometerState.activeMinutes || 0} active minutes
            </Text>
          </View>
        </View>

        <View style={styles.dbStatusFooter}>
          <View style={styles.dbStatusPill}>
            <View style={styles.dbStatusDot} />
            <Text style={styles.dbStatusText}>Auto-resets at midnight • Database sync enabled</Text>
          </View>
          <View style={styles.dbSyncIndicator}>
            <CheckCheck size={13} color="#7AE69E" style={{ marginRight: 4 }} />
            <Text style={styles.dbSyncIndicatorText}>{lastSyncBadge}</Text>
          </View>
        </View>
      </View>

      {/* 9. Your Progress Section */}
      <SectionHeader
        title="Your progress"
        actionText="Detailed stats"
        onActionPress={() => setActiveModal('activity_detail')}
      />

      {/* Native Hardware Step Counter & Live Pedometer Card */}
      <StepCounterCard
        todaySteps={todaySteps}
        stepGoal={stepGoal}
        distanceMeters={distanceMeters}
        caloriesBurned={caloriesBurned}
        activeMinutes={activeMinutes}
        permissionStatus={permissionStatus}
        isAvailable={isAvailable}
        isTracking={isTracking}
        onPress={() => setActiveModal('activity_detail')}
        onRequestPermission={requestPermissions}
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
              onPress={() => setActiveModal('activity_detail')}
            />
          );
        })}
      </View>

      {/* 10. Today's Focus Workout */}
      <SectionHeader
        title="Today's Focus Workout"
        actionText="View all in Plan"
        onActionPress={() => setActiveTab('plan')}
      />
      {focusWorkout ? (
        <View style={styles.focusWorkoutCard}>
          <View style={styles.focusWorkoutTop}>
            <View style={styles.focusIconBadge}>
              <Dumbbell size={22} color={Colors.coralCTA} />
            </View>
            <View style={styles.focusInfoCol}>
              <View style={styles.focusBadgeRow}>
                <View style={styles.focusCategoryPill}>
                  <Text style={styles.focusCategoryPillText}>TARGET SESSION</Text>
                </View>
                <Text style={styles.focusTimeText}>{focusWorkout.time || '07:30 AM'}</Text>
              </View>
              <Text style={styles.focusTitleText}>{focusWorkout.title}</Text>
              <Text style={styles.focusMetaText}>
                ⏱️ {focusWorkout.duration || '45 min'}  •  🔥 {focusWorkout.calories || 280} kcal  •  🎯 {focusWorkout.tags?.slice(0, 2).join(' • ') || 'Hypertrophy'}
              </Text>
            </View>
          </View>

          <View style={styles.focusActionsRow}>
            <Pressable
              style={styles.focusStartBtn}
              onPress={() => {
                if (focusWorkout.category === 'movement') {
                  setActiveModal('activity_session');
                } else {
                  setActiveTab('plan');
                }
              }}
            >
              <Zap size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.focusStartBtnText}>
                {focusWorkout.completed ? 'Review Session' : 'Start Workout'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.focusPlanLinkBtn}
              onPress={() => setActiveTab('plan')}
            >
              <Text style={styles.focusPlanLinkText}>
                All {activities.length} Routines in Plan →
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <WaterTargetModal
        visible={showWaterTargetModal}
        currentTargetMl={effectiveTargetMl}
        onClose={() => setShowWaterTargetModal(false)}
        onSave={(newTarget) => setCustomWaterTarget(newTarget)}
      />
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
  checkInPromptLabel: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: 9,
    color: Colors.softYellow,
    letterSpacing: 0.5,
  },
  checkInActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#263128',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  checkInActionText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.xs - 1,
    color: Colors.coralCTA,
  },
  categoriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  // 6. Personalized Nutrition & Macros Section Styles
  nutritionSectionHeader: {
    marginBottom: 14,
    marginTop: 8,
  },
  // Compact Nutrition Widget Styles
  compactNutritionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 6,
  },
  compactSectionTitle: {
    fontFamily: Typography.fontFamilies.serif,
    fontSize: Typography.fontSizes.lg,
    color: Colors.textPrimary,
  },
  seeBreakdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#263128',
    gap: 4,
  },
  seeBreakdownText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.xs - 1,
    color: Colors.coralCTA,
  },
  compactNutritionCard: {
    backgroundColor: '#1E2320',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A302B',
    marginBottom: 16,
  },
  compactCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  compactCalorieLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactFlameIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 113, 95, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  compactKcalValue: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.md,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  compactKcalTarget: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
  },
  compactKcalSub: {
    color: Colors.textSecondary,
    fontSize: 10.5,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 1,
  },
  compactScanActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.forestGreenLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  compactScanActionText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  compactCardBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  compactMacrosCol: {
    flex: 1,
    marginRight: 14,
  },
  compactMacroItem: {
    marginBottom: 6,
  },
  compactMacroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  compactMacroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactMacroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  compactMacroName: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  compactMacroNumbers: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  compactMacroTarget: {
    color: Colors.textSecondary,
    fontSize: 9.5,
    fontFamily: Typography.fontFamilies.sansRegular,
  },
  compactMacroTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#2B312C',
    borderRadius: 2,
    overflow: 'hidden',
  },
  compactMacroFill: {
    height: '100%',
    borderRadius: 2,
  },
  compactFoodImageBox: {
    width: 80,
    height: 80,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#161A17',
    borderWidth: 1,
    borderColor: '#2A302B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactFoodImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
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
    marginBottom: 20,
  },
  pedometerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: -10,
    marginBottom: 24,
  },
  pedometerStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pedometerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  pedometerDotLive: {
    backgroundColor: '#4E9A6F',
  },
  pedometerDotIdle: {
    backgroundColor: Colors.textMuted,
  },
  pedometerStatusText: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSizes.xs - 1,
    color: Colors.textSecondary,
  },
  pedometerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pedometerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 2,
  },
  pedometerActionBtnText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.xs - 2,
    color: Colors.textPrimary,
  },
  pedometerResetBtn: {
    backgroundColor: 'rgba(255, 113, 95, 0.12)',
    borderColor: 'rgba(255, 113, 95, 0.25)',
  },
  pedometerResetBtnText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.xs - 2,
    color: '#FF715F',
  },
  focusWorkoutCard: {
    backgroundColor: '#181E1A',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#263329',
    marginBottom: 24,
  },
  focusWorkoutTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  focusIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 113, 95, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  focusInfoCol: {
    flex: 1,
  },
  focusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  focusCategoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(75, 119, 97, 0.25)',
  },
  focusCategoryPillText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: 9,
    color: Colors.forestGreenLight,
    letterSpacing: 0.5,
  },
  focusTimeText: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSizes.xs - 1,
    color: Colors.textSecondary,
  },
  focusTitleText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.sm + 1,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  focusMetaText: {
    fontFamily: Typography.fontFamilies.sansRegular,
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  focusActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  focusStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.forestGreenLight,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  focusStartBtnText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.xs,
    color: '#FFFFFF',
  },
  focusPlanLinkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  focusPlanLinkText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.xs,
    color: Colors.coralCTA,
  },
  dbSummaryCard: {
    backgroundColor: 'rgba(16, 26, 20, 0.78)',
    borderRadius: 22,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 4,
  },
  dbSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dbSummaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dbIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(74, 184, 122, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  dbSummaryTitle: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
  },
  dbSummarySub: {
    fontFamily: Typography.fontFamilies.sansRegular,
    fontSize: Typography.fontSizes.xs - 1,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  dbSyncActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 184, 122, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  dbSyncActionText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.xs - 1,
    color: Colors.forestGreenLight,
  },
  dbMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  dbMetricTile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 12,
  },
  dbMetricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  dbMetricLabel: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSizes.xs - 1,
    color: Colors.textSecondary,
  },
  dbMetricValue: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.lg,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  dbProgressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  dbProgressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  dbMetricSub: {
    fontFamily: Typography.fontFamilies.sansRegular,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  dbStatusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  dbStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dbStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7AE69E',
    marginRight: 6,
  },
  dbStatusText: {
    fontFamily: Typography.fontFamilies.sansRegular,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  dbSyncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dbSyncIndicatorText: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: 10,
    color: '#7AE69E',
  },
});
