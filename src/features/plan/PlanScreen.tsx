import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Calendar as CalendarIcon, Sparkles, Dumbbell, Utensils, Heart } from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { PlanActivityCard } from '../../components/cards/PlanActivityCard';
import { ProgressRing } from '../../components/illustrations/ProgressRing';
import { CalendarScheduleScreen } from '../calendar/CalendarScheduleScreen';

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
  const [selectedDay, setSelectedDay] = useState<number>(29);
  const [planViewMode, setPlanViewMode] = useState<'rhythm' | 'calendar'>('rhythm');
  const [filterCategory, setFilterCategory] = useState<'all' | 'movement' | 'nutrition' | 'recovery'>('all');

  if (planViewMode === 'calendar') {
    return <CalendarScheduleScreen onClose={() => setPlanViewMode('rhythm')} />;
  }

  const completedActivities = activities.filter((a) => a.completed).length;
  const totalActivities = activities.length;
  const completionPercentage = totalActivities > 0 ? completedActivities / totalActivities : 0;

  const filteredActivities = activities.filter((act) => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'movement') return act.category === 'movement';
    if (filterCategory === 'nutrition') return act.category === 'nutrition';
    if (filterCategory === 'recovery') return act.category === 'habit' || act.category === 'symptom';
    return true;
  });

  return (
    <ScreenContainer scrollable={true}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.pageTitle}>Your Plan</Text>
          <Text style={styles.pageSubtitle}>Tailored daily rhythm for metabolic health</Text>
        </View>
        <Pressable
          onPress={() => setPlanViewMode('calendar')}
          style={styles.calendarIconCircle}
          hitSlop={10}
        >
          <CalendarIcon size={18} color="#FF6243" />
        </Pressable>
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

      {/* Routine Category Filter Pills */}
      <View style={styles.filterBar}>
        <Pressable
          style={[styles.filterChip, filterCategory === 'all' && styles.filterChipActive]}
          onPress={() => setFilterCategory('all')}
        >
          <Text style={[styles.filterChipText, filterCategory === 'all' && styles.filterChipTextActive]}>
            All ({activities.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterChip, filterCategory === 'movement' && styles.filterChipActive]}
          onPress={() => setFilterCategory('movement')}
        >
          <Dumbbell size={12} color={filterCategory === 'movement' ? '#FFFFFF' : Colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[styles.filterChipText, filterCategory === 'movement' && styles.filterChipTextActive]}>
            Workouts ({activities.filter((a) => a.category === 'movement').length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterChip, filterCategory === 'nutrition' && styles.filterChipActive]}
          onPress={() => setFilterCategory('nutrition')}
        >
          <Utensils size={12} color={filterCategory === 'nutrition' ? '#FFFFFF' : Colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[styles.filterChipText, filterCategory === 'nutrition' && styles.filterChipTextActive]}>
            Meals ({activities.filter((a) => a.category === 'nutrition').length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterChip, filterCategory === 'recovery' && styles.filterChipActive]}
          onPress={() => setFilterCategory('recovery')}
        >
          <Heart size={12} color={filterCategory === 'recovery' ? '#FFFFFF' : Colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[styles.filterChipText, filterCategory === 'recovery' && styles.filterChipTextActive]}>
            Habits
          </Text>
        </Pressable>
      </View>

      <View style={styles.activitiesList}>
        {filteredActivities.length > 0 ? (
          filteredActivities.map((activity) => (
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
          ))
        ) : (
          <View style={styles.emptyFilterState}>
            <Text style={styles.emptyFilterText}>No scheduled items in this category today.</Text>
          </View>
        )}
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
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#191F1B',
    borderWidth: 1,
    borderColor: '#263129',
  },
  filterChipActive: {
    backgroundColor: '#2F4F3D',
    borderColor: '#4D7D61',
  },
  filterChipText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamilies.sansBold,
  },
  emptyFilterState: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#191F1B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#252F28',
  },
  emptyFilterText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
});

