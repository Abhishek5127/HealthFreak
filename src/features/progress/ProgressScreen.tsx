import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  Flame,
  TrendingUp,
  FileText,
  Moon,
  Droplet,
  ChevronRight,
  History,
  Sun,
  Plus,
} from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { ProgressRing } from '../../components/illustrations/ProgressRing';
import { MetricLineChart } from '../../components/illustrations/MetricLineChart';

export const ProgressScreen: React.FC = () => {
  const {
    userProfile,
    activities,
    todaysNutrition,
    recentMeals,
    waterLoggedMl,
    waterTargetMl,
    logWater,
    pedometerState,
    weeklySteps,
    sleepSession,
    startSleep,
    wakeUp,
    setActiveModal,
    openMealResult,
    openMealScanner,
  } = useApp();
  const [timeRange, setTimeRange] = useState<'Week' | 'Month'>('Week');

  // Real-time daily score calculation
  const completedTasksCount = activities.filter((a) => a.completed).length;
  const totalTasksCount = activities.length;
  const completionRatio = totalTasksCount > 0 ? completedTasksCount / totalTasksCount : 0;
  const scorePercent = Math.round(completionRatio * 100);

  const streakDays = userProfile.streakDays || 0;

  // Real Monday-Sunday weekly steps chart data
  const currentDayOfWeekIdx = (new Date().getDay() + 6) % 7;
  const chartData =
    weeklySteps && weeklySteps.length === 7
      ? weeklySteps
      : [0, 0, 0, 0, 0, 0, 0].map((v, i) => (i === currentDayOfWeekIdx ? pedometerState.steps : 0));

  const hasMeals = recentMeals.length > 0;

  return (
    <ScreenContainer scrollable={true}>
      {/* Header with Time Range Toggle */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Progress & Insights</Text>
          <Text style={styles.pageSubtitle}>Long-term metabolic & habit trajectory</Text>
        </View>

        {/* Range Toggle */}
        <View style={styles.rangeToggle}>
          <Pressable
            style={[styles.rangeBtn, timeRange === 'Week' && styles.rangeBtnActive]}
            onPress={() => setTimeRange('Week')}
          >
            <Text
              style={[
                styles.rangeBtnText,
                timeRange === 'Week' && styles.rangeBtnTextActive,
              ]}
            >
              Week
            </Text>
          </Pressable>

          <Pressable
            style={[styles.rangeBtn, timeRange === 'Month' && styles.rangeBtnActive]}
            onPress={() => setTimeRange('Month')}
          >
            <Text
              style={[
                styles.rangeBtnText,
                timeRange === 'Month' && styles.rangeBtnTextActive,
              ]}
            >
              Month
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Consistency Hero Banner */}
      <View style={styles.consistencyBanner}>
        <View style={styles.consistencyLeft}>
          <View style={styles.streakCrownRow}>
            <Flame size={20} color={streakDays > 0 ? Colors.coralCTA : Colors.textMuted} />
            <Text style={styles.streakCountText}>{streakDays} Day{streakDays === 1 ? '' : 's'}</Text>
          </View>
          <Text style={styles.consistencyTitle}>
            {streakDays > 0 ? `${streakDays}-Day Streak` : 'Start Your Streak'}
          </Text>
          <Text style={styles.consistencySubtitle}>
            {streakDays > 0
              ? `Consistent for ${streakDays} consecutive day${streakDays > 1 ? 's' : ''}! Complete today's sessions to advance.`
              : "Complete all of today's routine sessions to start your 1-day streak!"}
          </Text>
        </View>

        <ProgressRing
          size={84}
          strokeWidth={7}
          percentage={completionRatio}
          color={Colors.forestGreenLight}
          bgColor="#28342C"
        >
          <View style={styles.ringCenterText}>
            <Text style={styles.ringPercentNumber}>{scorePercent}%</Text>
            <Text style={styles.ringPercentLabel}>Score</Text>
          </View>
        </ProgressRing>
      </View>

      {/* Interactive Activity Trend Line Chart */}
      <SectionHeader
        title="Weekly Activity Volume"
        actionText="Detailed log"
        onActionPress={() => setActiveModal('activity_detail')}
      />
      <Pressable style={styles.chartCard} onPress={() => setActiveModal('activity_detail')}>
        <View style={styles.chartHeaderRow}>
          <View>
            <Text style={styles.chartMetricValue}>{pedometerState.steps.toLocaleString()}</Text>
            <Text style={styles.chartMetricSub}>Steps walked today</Text>
          </View>
          <View style={styles.trendPill}>
            <TrendingUp size={14} color={pedometerState.steps > 0 ? Colors.success : Colors.textMuted} />
            <Text style={styles.trendPillText}>
              {pedometerState.steps > 0 ? `${pedometerState.steps.toLocaleString()} active` : 'Ready to walk'}
            </Text>
          </View>
        </View>

        <MetricLineChart
          data={chartData}
          labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
          color={Colors.coralCTA}
          height={160}
          width={330}
        />
      </Pressable>

      {/* 30-Day Nutrition & Food Diary Analytics */}
      <SectionHeader
        title={timeRange === 'Week' ? '7-Day Nutrition Insights' : '30-Day Food Diary & Trends'}
        actionText="Food diary"
        onActionPress={() => {
          if (hasMeals && recentMeals[0]) {
            openMealResult(recentMeals[0]);
          } else {
            openMealScanner();
          }
        }}
      />
      <View style={styles.nutritionTrendCard}>
        <View style={styles.nutritionHeaderRow}>
          <View>
            <Text style={styles.nutritionCoverageHeadline}>
              {hasMeals ? `${recentMeals.length} Meal${recentMeals.length > 1 ? 's' : ''} Logged Today` : '0 Days Tracked'}
            </Text>
            <Text style={styles.nutritionCoverageSub}>
              {hasMeals ? 'IFCT Verified • High Confidence Food Data' : 'Log meals with AI scanner to see insights'}
            </Text>
          </View>
          <View style={styles.coverageBadgePill}>
            <History size={12} color={hasMeals ? Colors.success : Colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.coverageBadgeText, !hasMeals && { color: Colors.textMuted }]}>
              {hasMeals ? `${Math.min(100, Math.round((recentMeals.length / 3) * 100))}% Today` : '0% Coverage'}
            </Text>
          </View>
        </View>

        {/* Macro Averages Grid */}
        <View style={styles.macroAvgGrid}>
          <View style={styles.macroAvgBox}>
            <Text style={styles.macroAvgNum}>{todaysNutrition.caloriesTotal.toLocaleString()}</Text>
            <Text style={styles.macroAvgLabel}>Avg Daily kcal</Text>
          </View>
          <View style={styles.macroAvgBox}>
            <Text style={[styles.macroAvgNum, { color: Colors.coralCTA }]}>{todaysNutrition.proteinTotal}g</Text>
            <Text style={styles.macroAvgLabel}>Avg Protein</Text>
          </View>
          <View style={styles.macroAvgBox}>
            <Text style={[styles.macroAvgNum, { color: Colors.softYellow }]}>{todaysNutrition.carbsTotal}g</Text>
            <Text style={styles.macroAvgLabel}>Avg Carbs</Text>
          </View>
          <View style={styles.macroAvgBox}>
            <Text style={[styles.macroAvgNum, { color: Colors.lightSage }]}>{todaysNutrition.fiberTotal}g</Text>
            <Text style={styles.macroAvgLabel}>Avg Fiber</Text>
          </View>
        </View>

        {/* Frequent Food Habits */}
        <View style={styles.frequentFoodRow}>
          <Text style={styles.frequentFoodTitle}>Top Logged Foods:</Text>
          <Text style={styles.frequentFoodList}>
            {hasMeals
              ? `• ${recentMeals.map((m) => m.mealName).slice(0, 3).join(' • ')}`
              : 'No foods logged yet. Use the AI Meal Scanner to log your first meal.'}
          </Text>
        </View>
      </View>

      {/* Key Biomarkers & Wellness Metrics Grid */}
      <SectionHeader title="Circadian & Metabolic Biomarkers" />
      <View style={styles.metricsGrid}>
        {/* Interactive Sleep Phase Card */}
        <View style={styles.gridCard}>
          <View
            style={[
              styles.gridIconCircle,
              {
                backgroundColor: sleepSession.isSleeping
                  ? 'rgba(234, 214, 111, 0.18)'
                  : 'rgba(78, 154, 111, 0.15)',
              },
            ]}
          >
            <Moon
              size={18}
              color={sleepSession.isSleeping ? Colors.softYellow : Colors.success}
            />
          </View>
          <Text style={styles.gridValue}>
            {sleepSession.isSleeping
              ? 'Sleeping 🌙'
              : sleepSession.durationMinutes > 0
              ? `${Math.floor(sleepSession.durationMinutes / 60)}h ${sleepSession.durationMinutes % 60}m`
              : '0h 0m'}
          </Text>
          <Text style={styles.gridLabel}>Circadian Sleep</Text>
          <Text style={styles.gridStatus}>
            {sleepSession.isSleeping
              ? `• Soya: ${new Date(sleepSession.bedtimeIso || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : sleepSession.durationMinutes > 0
              ? `• ${sleepSession.recoveryScore}% recovery`
              : '• Ready to log tonight'}
          </Text>

          {sleepSession.isSleeping ? (
            <Pressable style={styles.biomarkerActionBtnActive} onPress={wakeUp}>
              <Sun size={12} color="#FFFFFF" />
              <Text style={styles.biomarkerActionText}>{"I'm Awake ☀️"}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.biomarkerActionBtn} onPress={startSleep}>
              <Moon size={12} color="#FFFFFF" />
              <Text style={styles.biomarkerActionText}>Going to Sleep 🌙</Text>
            </Pressable>
          )}
        </View>

        {/* Cellular Hydration Card */}
        <View style={styles.gridCard}>
          <View style={[styles.gridIconCircle, { backgroundColor: 'rgba(55, 104, 165, 0.15)' }]}>
            <Droplet size={18} color="#5B9FE2" />
          </View>
          <Text style={styles.gridValue}>{(waterLoggedMl / 1000).toFixed(1)} L</Text>
          <Text style={styles.gridLabel}>Cellular Hydration</Text>
          <Text style={styles.gridStatus}>
            {waterLoggedMl >= waterTargetMl
              ? '• Daily target met (Synced)'
              : `• ${Math.round((waterLoggedMl / Math.max(1, waterTargetMl)) * 100)}% of ${(waterTargetMl / 1000).toFixed(1)} L`}
          </Text>

          <Pressable style={styles.biomarkerActionBtn} onPress={() => logWater(250)}>
            <Plus size={12} color="#FFFFFF" />
            <Text style={styles.biomarkerActionText}>+250 ml Water</Text>
          </Pressable>
        </View>
      </View>

      {/* Lab Reports Link Card */}
      <Pressable
        style={styles.labReportBanner}
        onPress={() => setActiveModal('lab_report')}
      >
        <View style={styles.labReportIconCircle}>
          <FileText size={20} color={Colors.coralCTA} />
        </View>
        <View style={styles.labReportTextCol}>
          <Text style={styles.labReportTitle}>Review Diagnostic Lab Reports</Text>
          <Text style={styles.labReportSubtitle}>
            HbA1c, Fasting Insulin, Thyroid (TSH) & Vitamin D interpretations
          </Text>
        </View>
        <ChevronRight size={18} color={Colors.textSecondary} />
      </Pressable>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  pageTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes['2xl'],
    fontFamily: Typography.fontFamilies.serif,
    letterSpacing: Typography.letterSpacing.tight,
  },
  pageSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 2,
  },
  rangeToggle: {
    flexDirection: 'row',
    backgroundColor: '#1E2320',
    borderRadius: Spacing.borderRadius.round,
    padding: 3,
    borderWidth: 1,
    borderColor: '#2A302B',
  },
  rangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Spacing.borderRadius.round,
  },
  rangeBtnActive: {
    backgroundColor: '#355544',
  },
  rangeBtnText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  rangeBtnTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamilies.sansBold,
  },
  consistencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E2521',
    borderRadius: Spacing.borderRadius.xl,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A362E',
  },
  consistencyLeft: {
    flex: 1,
    paddingRight: 14,
  },
  streakCrownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  streakCountText: {
    color: Colors.coralCTA,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  consistencyTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.lg,
    fontFamily: Typography.fontFamilies.serif,
  },
  consistencySubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 4,
    lineHeight: 17,
  },
  ringCenterText: {
    alignItems: 'center',
  },
  ringPercentNumber: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  ringPercentLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  chartCard: {
    backgroundColor: '#1E2320',
    borderRadius: Spacing.borderRadius.xl,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#262D28',
    alignItems: 'center',
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
  },
  chartMetricValue: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xl,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  chartMetricSub: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(78, 154, 111, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Spacing.borderRadius.round,
  },
  trendPillText: {
    color: Colors.success,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#1E2320',
    borderRadius: Spacing.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262D28',
  },
  gridIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridValue: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.md + 1,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  gridLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 2,
  },
  gridStatus: {
    color: Colors.lightSage,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 6,
  },
  biomarkerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27332A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginTop: 10,
    gap: 4,
  },
  biomarkerActionBtnActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF715F',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginTop: 10,
    gap: 4,
  },
  biomarkerActionText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.xs - 1,
    color: '#FFFFFF',
  },
  labReportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202722',
    borderRadius: Spacing.borderRadius.lg,
    padding: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#2D382F',
  },
  labReportIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2B352E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  labReportTextCol: {
    flex: 1,
  },
  labReportTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm + 1,
    fontFamily: Typography.fontFamilies.serif,
  },
  labReportSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 2,
    lineHeight: 16,
  },
  nutritionTrendCard: {
    backgroundColor: '#1E2320',
    borderRadius: Spacing.borderRadius.xl,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#262D28',
  },
  nutritionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  nutritionCoverageHeadline: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm + 1,
    fontFamily: Typography.fontFamilies.serif,
  },
  nutritionCoverageSub: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 2,
  },
  coverageBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 154, 111, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  coverageBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
  },
  macroAvgGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: Spacing.borderRadius.md,
    padding: 12,
    marginBottom: 12,
  },
  macroAvgBox: {
    alignItems: 'center',
  },
  macroAvgNum: {
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.sansBold,
    color: Colors.textPrimary,
  },
  macroAvgLabel: {
    fontSize: 9.5,
    fontFamily: Typography.fontFamilies.sansMedium,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  frequentFoodRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  frequentFoodTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.lightSage,
    marginBottom: 2,
  },
  frequentFoodList: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});

