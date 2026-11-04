import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StepSummary } from '../types/pedometer.types';
import { formatDayAbbr, isToday } from '../utils/stepDateUtils';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';

interface StepHistoryChartProps {
  history: StepSummary[];
  stepGoal: number;
}

export const StepHistoryChart: React.FC<StepHistoryChartProps> = ({
  history,
  stepGoal,
}) => {
  // Ensure we have 7 items
  const displayItems = history.slice(-7);
  const maxSteps = Math.max(stepGoal * 1.15, ...displayItems.map((d) => d.steps), 1000);
  const chartHeight = 140;

  const formatStepCount = (steps: number) => {
    if (steps >= 1000) {
      return `${(steps / 1000).toFixed(1)}k`;
    }
    return `${steps}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.chartHeader}>
        <Text style={styles.title}>Weekly Step Volume</Text>
        <Text style={styles.goalLabel}>Goal: {stepGoal.toLocaleString()} steps</Text>
      </View>

      <View style={[styles.barsWrapper, { height: chartHeight }]}>
        {/* Subtle horizontal goal line */}
        <View
          style={[
            styles.goalLine,
            {
              bottom: Math.min((stepGoal / maxSteps) * chartHeight, chartHeight - 4),
            },
          ]}
        />

        {displayItems.map((item) => {
          const isItemToday = isToday(item.date);
          const barHeight = Math.max(
            8,
            Math.min((item.steps / maxSteps) * chartHeight, chartHeight)
          );
          const goalMet = item.steps >= stepGoal && item.steps > 0;

          return (
            <View key={item.date} style={styles.barColumn}>
              <Text style={styles.barValueText}>
                {item.steps > 0 ? formatStepCount(item.steps) : '0'}
              </Text>

              <View style={styles.track}>
                <View
                  style={[
                    styles.bar,
                    { height: barHeight },
                    isItemToday
                      ? styles.barToday
                      : goalMet
                      ? styles.barGoalMet
                      : styles.barNormal,
                  ]}
                />
              </View>

              <Text
                style={[
                  styles.dayLabel,
                  isItemToday && styles.dayLabelToday,
                ]}
              >
                {formatDayAbbr(item.date)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#171B18',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#242A25',
    marginVertical: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm + 1,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  goalLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  barsWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    position: 'relative',
    paddingBottom: 24,
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 113, 95, 0.4)',
    borderStyle: 'dashed',
    zIndex: 1,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    zIndex: 2,
  },
  barValueText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginBottom: 4,
  },
  track: {
    width: 14,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 14,
    borderRadius: 7,
  },
  barToday: {
    backgroundColor: Colors.coralCTA,
  },
  barGoalMet: {
    backgroundColor: '#4AB87A',
  },
  barNormal: {
    backgroundColor: '#2E3831',
  },
  dayLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 6,
  },
  dayLabelToday: {
    color: Colors.coralCTA,
    fontFamily: Typography.fontFamilies.sansBold,
  },
});
