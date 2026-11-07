import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import {
  Footprints,
  ChevronRight,
  ShieldAlert,
  Award,
} from 'lucide-react-native';
import { StepProgressRing } from './StepProgressRing';
import { PedometerPermissionModal } from './PedometerPermissionModal';
import { formatDistance } from '../utils/activityCalculations';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { PedometerPermissionState } from '../types/pedometer.types';

interface StepCounterCardProps {
  todaySteps: number;
  stepGoal: number;
  distanceMeters: number;
  caloriesBurned: number | null;
  activeMinutes: number;
  permissionStatus: PedometerPermissionState;
  isAvailable: boolean;
  isTracking: boolean;
  onPress: () => void;
  onRequestPermission: () => Promise<PedometerPermissionState>;
}

export const StepCounterCard: React.FC<StepCounterCardProps> = ({
  todaySteps,
  stepGoal,
  distanceMeters,
  caloriesBurned,
  activeMinutes,
  permissionStatus,
  isAvailable,
  isTracking,
  onPress,
  onRequestPermission,
}) => {
  const [showPermissionModal, setShowPermissionModal] = useState<boolean>(false);

  const percentage = stepGoal > 0 ? todaySteps / stepGoal : 0;
  const percentDisplay = Math.round(percentage * 100);
  const remaining = Math.max(0, stepGoal - todaySteps);
  const isGoalReached = todaySteps >= stepGoal && stepGoal > 0;

  const isWeb = Platform.OS === 'web';
  const needsPermission = !isWeb && permissionStatus !== 'granted';

  return (
    <Pressable
      style={({ pressed }) => [styles.cardContainer, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {/* Top Header Badge */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Footprints size={18} color={Colors.coralCTA} />
          </View>
          <View>
            <Text style={styles.categoryLabel}>DAILY PEDOMETER</Text>
            <Text style={styles.cardTitle}>Today&apos;s Movement</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {isGoalReached ? (
            <View style={styles.goalMetBadge}>
              <Award size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.goalMetText}>Goal Reached</Text>
            </View>
          ) : isTracking ? (
            <View style={styles.liveBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveBadgeText}>Live</Text>
            </View>
          ) : isWeb ? (
            <View style={styles.webBadge}>
              <Text style={styles.webBadgeText}>Mobile Sensor</Text>
            </View>
          ) : (
            <View style={styles.pausedBadge}>
              <Text style={styles.pausedBadgeText}>Tap to Enable</Text>
            </View>
          )}
          <ChevronRight size={18} color={Colors.textSecondary} style={{ marginLeft: 6 }} />
        </View>
      </View>

      {/* Main Stats with Progress Ring */}
      <View style={styles.mainStatsRow}>
        <View style={styles.statsLeft}>
          <Text style={styles.stepCountText}>{todaySteps.toLocaleString()}</Text>
          <Text style={styles.stepsUnitText}>STEPS TAKEN</Text>

          <View style={styles.goalProgressLine}>
            <Text style={styles.percentText}>{percentDisplay}% of daily goal</Text>
            <Text style={styles.remainingText}>
              {isGoalReached
                ? `+${(todaySteps - stepGoal).toLocaleString()} bonus steps`
                : `${remaining.toLocaleString()} steps remaining`}
            </Text>
          </View>
        </View>

        <View style={styles.statsRightRing}>
          <StepProgressRing
            size={88}
            strokeWidth={8}
            progress={percentage}
            color={isGoalReached ? '#4AB87A' : Colors.coralCTA}
            bgColor="#232B25"
          >
            <Footprints
              size={24}
              color={isGoalReached ? '#4AB87A' : Colors.coralCTA}
            />
          </StepProgressRing>
        </View>
      </View>

      {/* Permission Reminder Banner (if not yet granted on device) */}
      {needsPermission && (
        <Pressable
          style={styles.permissionActionBanner}
          onPress={(e) => {
            e.stopPropagation();
            setShowPermissionModal(true);
          }}
        >
          <ShieldAlert size={16} color={Colors.coralCTA} style={{ marginRight: 8 }} />
          <Text style={styles.permissionActionText}>
            Grant sensor permission to enable real-time counting
          </Text>
        </Pressable>
      )}

      {/* Bottom Sub-Metrics Strip */}
      <View style={styles.subMetricsStrip}>
        <View style={styles.subMetricCol}>
          <Text style={styles.subMetricLabel}>Distance</Text>
          <Text style={styles.subMetricVal}>{formatDistance(distanceMeters)}</Text>
        </View>

        <View style={styles.subDivider} />

        <View style={styles.subMetricCol}>
          <Text style={styles.subMetricLabel}>Active Calories</Text>
          <Text style={styles.subMetricVal}>
            {caloriesBurned !== null && caloriesBurned > 0
              ? `~${caloriesBurned} kcal`
              : caloriesBurned === 0
              ? '0 kcal'
              : 'Unavailable'}
          </Text>
        </View>

        <View style={styles.subDivider} />

        <View style={styles.subMetricCol}>
          <Text style={styles.subMetricLabel}>Movement</Text>
          <Text style={styles.subMetricVal}>{activeMinutes}m</Text>
        </View>
      </View>

      {/* Permission Explanation Modal */}
      <PedometerPermissionModal
        visible={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onRequestPermission={onRequestPermission}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#1E2320',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#242C26',
    marginVertical: 10,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 113, 95, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryLabel: {
    color: Colors.coralCTA,
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.8,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm + 1,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 184, 122, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.3)',
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4AB87A',
    marginRight: 5,
  },
  liveBadgeText: {
    color: '#4AB87A',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  goalMetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4AB87A',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  goalMetText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  pausedBadge: {
    backgroundColor: '#272E29',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  pausedBadgeText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  webBadge: {
    backgroundColor: '#242C26',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  webBadgeText: {
    color: '#8EA393',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  mainStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsLeft: {
    flex: 1,
  },
  stepCountText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes['3xl'],
    fontFamily: Typography.fontFamilies.serif,
    letterSpacing: -0.5,
  },
  stepsUnitText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 1,
    marginTop: -2,
    marginBottom: 8,
  },
  goalProgressLine: {
    marginTop: 4,
  },
  percentText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  remainingText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 2,
  },
  statsRightRing: {
    marginLeft: 16,
  },
  permissionActionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 113, 95, 0.1)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 113, 95, 0.25)',
    marginBottom: 14,
  },
  permissionActionText: {
    flex: 1,
    color: Colors.coralCTA,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  subMetricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111412',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#1D241F',
  },
  subMetricCol: {
    alignItems: 'center',
    flex: 1,
  },
  subMetricLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginBottom: 2,
  },
  subMetricVal: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  subDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#232A24',
  },
});
