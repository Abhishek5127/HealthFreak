import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Footprints, Flame, Clock } from 'lucide-react-native';
import { formatDistance, formatActiveTime } from '../utils/activityCalculations';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';

interface ActivitySummaryCardProps {
  distanceMeters: number;
  caloriesBurned: number | null;
  activeMinutes: number;
}

export const ActivitySummaryCard: React.FC<ActivitySummaryCardProps> = ({
  distanceMeters,
  caloriesBurned,
  activeMinutes,
}) => {
  return (
    <View style={styles.metricsRow}>
      {/* 1. Distance */}
      <View style={styles.metricCard}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(78, 154, 111, 0.15)' }]}>
          <Footprints size={18} color="#4E9A6F" />
        </View>
        <Text style={styles.metricLabel}>Distance</Text>
        <Text style={styles.metricValue}>{formatDistance(distanceMeters)}</Text>
        <Text style={styles.subtext}>Estimated stride</Text>
      </View>

      {/* 2. Active Calories */}
      <View style={styles.metricCard}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(234, 214, 111, 0.15)' }]}>
          <Flame size={18} color="#EAD66F" />
        </View>
        <Text style={styles.metricLabel}>Active Calories</Text>
        <Text style={styles.metricValue}>
          {caloriesBurned !== null && caloriesBurned > 0
            ? `~${caloriesBurned} kcal`
            : caloriesBurned === 0
            ? '0 kcal'
            : 'Unavailable'}
        </Text>
        <Text style={styles.subtext}>Movement burn</Text>
      </View>

      {/* 3. Movement Time */}
      <View style={styles.metricCard}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 113, 95, 0.15)' }]}>
          <Clock size={18} color={Colors.coralCTA} />
        </View>
        <Text style={styles.metricLabel}>Movement</Text>
        <Text style={styles.metricValue}>{formatActiveTime(activeMinutes)}</Text>
        <Text style={styles.subtext}>Brisk cadence</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginVertical: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#171B18',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#242A25',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm + 1,
    fontFamily: Typography.fontFamilies.sansBold,
    marginBottom: 2,
    textAlign: 'center',
  },
  subtext: {
    color: '#6E7A71',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansRegular,
    textAlign: 'center',
  },
});

