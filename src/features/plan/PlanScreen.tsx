import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Calendar as CalendarIcon, Sparkles, ShieldCheck, CheckCircle2, Footprints } from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { usePedometer } from '../activity/hooks/usePedometer';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { PlanActivityCard } from '../../components/cards/PlanActivityCard';
import { ProgressRing } from '../../components/illustrations/ProgressRing';

const DAYS = [
  { dayNumber: 26, dayName: 'M' },
  { dayNumber: 27, dayName: 'T' },
  { dayNumber: 28, dayName: 'W' },
  { dayNumber: 29, dayName: 'T', isToday: true },
  { dayNumber: 30, dayName: 'F' },
  { dayNumber: 31, dayName: 'S' },
  { dayNumber: 1, dayName: 'S' },
];

export const PlanScreen: React.FC = () => {
  const { activities, toggleActivityCompletion, setActiveModal, openMealScanner } = useApp();
  const { todaySteps, stepGoal } = usePedometer();
  const [selectedDay, setSelectedDay] = useState<number>(29);

  const isGoalReached = todaySteps >= stepGoal && stepGoal > 0;
  const remaining = Math.max(0, stepGoal - todaySteps);
  const percentDisplay = stepGoal > 0 ? Math.round((todaySteps / stepGoal) * 100) : 0;

  const completedActivities = activities.filter((a) => a.completed).length;
  const totalActivities = activities.length;
  const completionPercentage = totalActivities > 0 ? completedActivities / totalActivities : 0;

  return (
    <ScreenContainer scrollable={true}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.pageTitle}>Your Plan</Text>
          <Text style={styles.pageSubtitle}>Tailored daily rhythm for metabolic health</Text>
        </View>
        <View style={styles.calendarIconCircle}>
          <CalendarIcon size={18} color={Colors.textPrimary} />
        </View>
      </View>

      {/* Adaptive Plan Version Banner */}
      <View style={styles.adaptivePlanBanner}>
        <View style={styles.adaptiveHeader}>
          <View style={styles.versionBadge}>
            <ShieldCheck size={14} color={Colors.lightSage} style={{ marginRight: 4 }} />
            <Text style={styles.versionBadgeText}>PLAN v2 • ACTIVE</Text>
          </View>
          <View style={styles.reviewBadge}>
            <CheckCircle2 size={12} color={Colors.success} style={{ marginRight: 3 }} />
            <Text style={styles.reviewBadgeText}>Safety Verified</Text>
          </View>
        </View>

        <Text style={styles.planAdaptiveTitle}>Low-Impact Metabolic Foundation</Text>
        <Text style={styles.planAdaptiveReason}>
          Adapted from your 30-day food diary and reported knee soreness: High-impact jumping substituted with joint-sparing wall sits; quick 5-min breakfasts prioritized.
        </Text>

        <View style={styles.safetyConstraintRow}>
          <Text style={styles.safetyConstraintText}>
            🛡️ Constraint Active: Low-impact closed kinetic chain only (Patellofemoral knee safety protocol)
          </Text>
        </View>
      </View>

      {/* Week Day Selector */}
      <View style={styles.daysRow}>
        {DAYS.map((d) => {
          const isSelected = selectedDay === d.dayNumber;
          return (
            <Pressable
              key={`${d.dayNumber}-${d.dayName}`}
              onPress={() => setSelectedDay(d.dayNumber)}
              style={[
                styles.dayPill,
                isSelected && styles.dayPillSelected,
              ]}
            >
              <Text style={[styles.dayNameText, isSelected && styles.dayNameSelected]}>
                {d.dayName}
              </Text>
              <Text style={[styles.dayNumberText, isSelected && styles.dayNumberSelected]}>
                {d.dayNumber}
              </Text>
              {d.isToday && <View style={styles.todayIndicatorDot} />}
            </Pressable>
          );
        })}
      </View>

      {/* Daily Completion Summary Banner with Progress Ring */}
      <View style={styles.summaryBanner}>
        <View style={styles.summaryRingContainer}>
          <ProgressRing
            size={64}
            strokeWidth={5}
            percentage={completionPercentage}
            color={Colors.coralCTA}
            bgColor="#2C352E"
          >
            <Text style={styles.ringPercentageText}>
              {Math.round(completionPercentage * 100)}%
            </Text>
          </ProgressRing>
        </View>

        <View style={styles.summaryTextColumn}>
          <Text style={styles.summaryTitle}>
            {completedActivities} of {totalActivities} Completed
          </Text>
          <Text style={styles.summarySubtitle}>
            {completionPercentage >= 0.8
              ? 'Outstanding commitment today!'
              : 'Keep the momentum going into this evening.'}
          </Text>
        </View>

        <Pressable
          style={styles.coachTipPill}
          onPress={() => setActiveModal('checkin')}
        >
          <Sparkles size={14} color={Colors.softYellow} />
        </Pressable>
      </View>

      {/* Activities Schedule */}
      <SectionHeader
        title="Today's Schedule"
        actionText="Log activity"
        onActionPress={() => setActiveModal('activity_session')}
      />

      {/* Daily Walking & Steps Card */}
      <Pressable
        style={styles.walkingCard}
        onPress={() => setActiveModal('activity_detail')}
      >
        <View style={styles.walkingHeader}>
          <View style={styles.walkingHeaderLeft}>
            <View style={styles.walkingIconBadge}>
              <Footprints size={18} color={isGoalReached ? '#4AB87A' : Colors.coralCTA} />
            </View>
            <View>
              <Text style={styles.walkingCategoryLabel}>DAILY WALKING</Text>
              <Text style={styles.walkingTitle}>Metabolic Step Rhythm</Text>
            </View>
          </View>
          <View style={[styles.walkingStatusBadge, isGoalReached && styles.walkingStatusBadgeCompleted]}>
            <Text style={[styles.walkingStatusText, isGoalReached && styles.walkingStatusTextCompleted]}>
              {isGoalReached ? 'Completed 🎯' : `${remaining.toLocaleString()} steps left`}
            </Text>
          </View>
        </View>

        <View style={styles.walkingProgressBlock}>
          <View style={styles.walkingValuesRow}>
            <Text style={styles.walkingStepsCurrent}>
              {todaySteps.toLocaleString()}{' '}
              <Text style={styles.walkingStepsTarget}>/ {stepGoal.toLocaleString()} steps</Text>
            </Text>
            <Text style={styles.walkingPercentText}>{percentDisplay}%</Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, Math.max(0, percentDisplay))}%` },
                isGoalReached && { backgroundColor: '#4AB87A' },
              ]}
            />
          </View>
        </View>

        <Text style={styles.walkingEncouragementText}>
          {isGoalReached
            ? 'Daily walking target accomplished! You are sustaining metabolic momentum.'
            : 'Keep moving. A short walk after meals balances postprandial glucose.'}
        </Text>
      </Pressable>

      <View style={styles.activitiesList}>
        {activities.map((activity) => (
          <PlanActivityCard
            key={activity.id}
            activity={activity}
            onToggleComplete={() => toggleActivityCompletion(activity.id)}
            onPressDetails={() => {
              if (activity.category === 'movement') {
                setActiveModal('activity_session');
              } else if (activity.category === 'nutrition') {
                openMealScanner();
              }
            }}
          />
        ))}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  topHeader: {
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
  calendarIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E2320',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A302B',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dayPill: {
    width: 44,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#181C19',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#242A25',
  },
  dayPillSelected: {
    backgroundColor: '#355544',
    borderColor: '#4E7A63',
  },
  dayNameText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginBottom: 4,
  },
  dayNameSelected: {
    color: '#D4E2D6',
  },
  dayNumberText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm + 1,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  dayNumberSelected: {
    color: '#FFFFFF',
  },
  todayIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.coralCTA,
    marginTop: 4,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2420',
    borderRadius: Spacing.borderRadius.xl,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#29332B',
  },
  summaryRingContainer: {
    marginRight: 14,
  },
  ringPercentageText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  summaryTextColumn: {
    flex: 1,
  },
  summaryTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.serif,
  },
  summarySubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 2,
    lineHeight: 16,
  },
  coachTipPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#262F28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activitiesList: {
    marginBottom: 30,
  },
  adaptivePlanBanner: {
    backgroundColor: '#1E2521',
    borderRadius: Spacing.borderRadius.lg,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A362D',
  },
  adaptiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  versionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.lightSage,
    letterSpacing: 0.5,
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 154, 111, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  reviewBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
  },
  planAdaptiveTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm + 1,
    fontFamily: Typography.fontFamilies.serif,
  },
  planAdaptiveReason: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 4,
    lineHeight: 16,
  },
  safetyConstraintRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  safetyConstraintText: {
    fontSize: 10.5,
    color: Colors.softYellow,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  walkingCard: {
    backgroundColor: '#161B18',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#242C26',
    marginBottom: 16,
  },
  walkingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walkingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walkingIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 113, 95, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  walkingCategoryLabel: {
    color: Colors.coralCTA,
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.8,
  },
  walkingTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  walkingStatusBadge: {
    backgroundColor: '#252D27',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  walkingStatusBadgeCompleted: {
    backgroundColor: 'rgba(74, 184, 122, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.4)',
  },
  walkingStatusText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  walkingStatusTextCompleted: {
    color: '#4AB87A',
    fontFamily: Typography.fontFamilies.sansBold,
  },
  walkingProgressBlock: {
    marginVertical: 6,
  },
  walkingValuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  walkingStepsCurrent: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  walkingStepsTarget: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
  },
  walkingPercentText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#242C26',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.coralCTA,
  },
  walkingEncouragementText: {
    color: '#8EA393',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansRegular,
    lineHeight: 16,
    marginTop: 8,
  },
});

