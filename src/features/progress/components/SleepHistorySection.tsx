import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  Moon,
  BatteryCharging,
  TrendingUp,
  Info,
} from 'lucide-react-native';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { Spacing } from '../../../theme/spacing';
import { SleepHistoryItem, SleepSession } from '../../../services/sleepService';
import { MetricLineChart } from '../../../components/illustrations/MetricLineChart';

interface SleepHistorySectionProps {
  history: SleepHistoryItem[];
  currentSession: SleepSession;
}

export const SleepHistorySection: React.FC<SleepHistorySectionProps> = ({
  history,
  currentSession,
}) => {
  const safeHistory = history && history.length === 7 ? history : [];
  // In rolling 7-day FIFO window, the last index (6) is ALWAYS Today
  const todayIndex = Math.max(0, safeHistory.length - 1);
  const [selectedIdx, setSelectedIdx] = useState<number>(todayIndex);

  // Filter only real logged items (duration > 0)
  const loggedItems = safeHistory.filter((item) => item.durationMinutes > 0);
  const totalRecovery = loggedItems.reduce((acc, item) => acc + item.recoveryScore, 0);
  const avgRecovery = loggedItems.length > 0 ? Math.round(totalRecovery / loggedItems.length) : 0;

  const totalMinutes = loggedItems.reduce((acc, item) => acc + item.durationMinutes, 0);
  const avgMinutes = loggedItems.length > 0 ? Math.round(totalMinutes / loggedItems.length) : 0;
  const avgHours = Math.floor(avgMinutes / 60);
  const avgMinsRemainder = avgMinutes % 60;

  // Selected item for inspection
  const selectedItem = safeHistory[selectedIdx] || safeHistory[todayIndex];

  // Today's sleep duration
  const todayItem = safeHistory[todayIndex];
  const todayDurationMinutes = currentSession.durationMinutes > 0
    ? currentSession.durationMinutes
    : (todayItem?.durationMinutes || 0);

  const todayHours = Math.floor(todayDurationMinutes / 60);
  const todayMins = todayDurationMinutes % 60;
  const todayDurationText = todayDurationMinutes > 0
    ? (todayHours > 0 ? `${todayHours}h ${todayMins}m` : `${todayMins}m`)
    : '0h 0m';

  // Duration line chart data in hours (e.g. 6.0 for 6 hours, 0 for untracked)
  const durationChartData = safeHistory.map((item, idx) => {
    if (idx === todayIndex && currentSession.durationMinutes > 0) {
      return Number((currentSession.durationMinutes / 60).toFixed(1));
    }
    return Number((item.durationMinutes / 60).toFixed(1));
  });

  const getBarColor = (score: number) => {
    if (score >= 80) return Colors.forestGreenLight;
    if (score >= 65) return '#7AE69E';
    if (score >= 50) return Colors.softYellow;
    if (score > 0) return Colors.coralCTA;
    return Colors.textMuted;
  };

  // Dynamic rolling 7-day labels ending today
  const dayLabels = safeHistory.length === 7
    ? safeHistory.map((item) => item.dayLabel)
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <View style={styles.container}>
      {/* 1. Section Header with Icon & Subtitle */}
      <View style={styles.headerRow}>
        <View style={styles.headerIconCircle}>
          <Moon size={18} color={Colors.lightSage} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>7-Day Sleep & Recovery</Text>
          <Text style={styles.subtitle}>Circadian rhythm & sleep duration trend</Text>
        </View>
        <View style={styles.avgBadge}>
          <BatteryCharging size={13} color={avgRecovery > 0 ? Colors.forestGreenLight : Colors.textMuted} style={{ marginRight: 4 }} />
          <Text style={[styles.avgBadgeText, avgRecovery === 0 && { color: Colors.textMuted }]}>
            {avgRecovery}% Avg
          </Text>
        </View>
      </View>

      {/* 2. Three Metric Summary Tiles */}
      <View style={styles.statsRow}>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>AVG RECOVERY</Text>
          <View style={styles.statValRow}>
            <Text style={[styles.statValue, { color: avgRecovery > 0 ? Colors.forestGreenLight : Colors.textMuted }]}>
              {avgRecovery}%
            </Text>
          </View>
          <Text style={styles.statSub}>Weekly average</Text>
        </View>

        <View style={styles.statTile}>
          <Text style={styles.statLabel}>AVG DURATION</Text>
          <View style={styles.statValRow}>
            <Text style={styles.statValue}>
              {avgHours}h {avgMinsRemainder}m
            </Text>
          </View>
          <Text style={styles.statSub}>Per night logged</Text>
        </View>

        <View style={styles.statTile}>
          <Text style={styles.statLabel}>DAYS LOGGED</Text>
          <View style={styles.statValRow}>
            <Text style={[styles.statValue, { color: loggedItems.length > 0 ? '#7AE69E' : Colors.textMuted }]}>
              {loggedItems.length}/7
            </Text>
          </View>
          <Text style={styles.statSub}>This week</Text>
        </View>
      </View>

      {/* 3. Weekly Sleep Duration Line Chart (Pedometer-style real graph) */}
      <View style={styles.durationChartCard}>
        <View style={styles.chartHeaderRow}>
          <View>
            <Text style={styles.chartMetricValue}>{todayDurationText}</Text>
            <Text style={styles.chartMetricSub}>Sleep recorded today</Text>
          </View>
          <View style={styles.trendPill}>
            <TrendingUp size={13} color={todayDurationMinutes > 0 ? Colors.forestGreenLight : Colors.textMuted} />
            <Text
              style={[
                styles.trendPillText,
                todayDurationMinutes === 0 && { color: Colors.textMuted },
              ]}
            >
              {todayDurationMinutes >= 420
                ? 'Goal reached (7h+)'
                : todayDurationMinutes > 0
                ? `${todayDurationText} logged`
                : 'Ready to sleep'}
            </Text>
          </View>
        </View>

        <MetricLineChart
          data={durationChartData}
          labels={dayLabels}
          color={Colors.forestGreenLight}
          height={160}
          width={330}
          unit="hrs"
          activeDayIndex={todayIndex}
        />
      </View>

      {/* 4. Sleek Recovery Score by Day Bar Chart (100% Real Logs) */}
      <View style={styles.recoveryChartCard}>
        <View style={styles.recoveryHeaderRow}>
          <View>
            <Text style={styles.recoveryChartTitle}>Recovery Score by Day</Text>
            <Text style={styles.recoveryChartSub}>Tap bar to view details</Text>
          </View>
          <View style={styles.recoveryAvgPill}>
            <BatteryCharging size={12} color="#7AE69E" style={{ marginRight: 4 }} />
            <Text style={styles.recoveryAvgPillText}>{avgRecovery}% Avg</Text>
          </View>
        </View>

        <View style={styles.barsContainer}>
          {safeHistory.map((item, idx) => {
            const isSelected = idx === selectedIdx;
            const isToday = idx === todayIndex;
            const hasScore = item.recoveryScore > 0;
            const barHeightPct = hasScore ? Math.max(12, Math.min(100, item.recoveryScore)) : 0;
            const barColor = getBarColor(item.recoveryScore);

            return (
              <Pressable
                key={item.id || item.date || idx}
                style={styles.barCol}
                onPress={() => setSelectedIdx(idx)}
              >
                {/* Score label above bar */}
                <Text
                  style={[
                    styles.barScoreLabel,
                    hasScore
                      ? { color: isSelected ? barColor : Colors.textSecondary, fontWeight: '700' }
                      : { color: Colors.textMuted, opacity: 0.5 },
                  ]}
                >
                  {hasScore ? `${item.recoveryScore}%` : '-'}
                </Text>

                {/* Vertical Bar Capsule */}
                <View
                  style={[
                    styles.barTrack,
                    isSelected && styles.barTrackSelected,
                  ]}
                >
                  {hasScore ? (
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${barHeightPct}%`,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  ) : (
                    <View style={styles.barEmptyDot} />
                  )}
                </View>

                {/* Day of Week Label */}
                <Text
                  style={[
                    styles.barDayLabel,
                    isToday && styles.barDayLabelToday,
                    isSelected && styles.barDayLabelSelected,
                  ]}
                >
                  {dayLabels[idx]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Selected Day Inspection Info Pill */}
        {selectedItem && (
          <View style={styles.inspectionChip}>
            <Info size={13} color={Colors.lightSage} style={{ marginRight: 6 }} />
            <Text style={styles.inspectionChipText} numberOfLines={1}>
              <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>
                {dayLabels[selectedIdx]}
                {selectedIdx === todayIndex ? ' (Today): ' : ': '}
              </Text>
              {selectedItem.durationMinutes > 0
                ? `${Math.floor(selectedItem.durationMinutes / 60)}h ${selectedItem.durationMinutes % 60}m sleep • ${selectedItem.recoveryScore}% recovery (${selectedItem.qualityLabel})`
                : 'No sleep recorded on this day'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(75, 119, 97, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  avgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 184, 122, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.25)',
  },
  avgBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.forestGreenLight,
  },

  // Summary Tiles
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: 8,
  },
  statTile: {
    flex: 1,
    backgroundColor: '#1E2320',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statSub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Weekly Sleep Duration Line Chart Card (Matches pedometer card)
  durationChartCard: {
    backgroundColor: '#1E2320',
    borderRadius: 22,
    padding: 18,
    marginBottom: Spacing.md,
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
    color: Colors.forestGreenLight,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansBold,
  },

  // Recovery Bar Chart Card
  recoveryChartCard: {
    backgroundColor: '#1E2320',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#262D28',
  },
  recoveryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recoveryChartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  recoveryChartSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  recoveryAvgPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 184, 122, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recoveryAvgPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7AE69E',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 155,
    paddingBottom: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barScoreLabel: {
    fontSize: 10,
    marginBottom: 6,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  barTrack: {
    width: 14,
    height: 105,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    alignItems: 'center',
  },
  barTrackSelected: {
    borderWidth: 1.5,
    borderColor: '#7AE69E',
    backgroundColor: 'rgba(122, 230, 158, 0.08)',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barEmptyDot: {
    width: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 4,
  },
  barDayLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 8,
  },
  barDayLabelToday: {
    color: '#7AE69E',
    fontFamily: Typography.fontFamilies.sansBold,
  },
  barDayLabelSelected: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamilies.sansBold,
  },

  // Inspection Chip
  inspectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 14,
  },
  inspectionChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
});
