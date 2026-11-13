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
  Clock,
} from 'lucide-react-native';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { Spacing } from '../../../theme/spacing';
import { SleepHistoryItem, SleepSession } from '../../../services/sleepService';

interface SleepHistorySectionProps {
  history: SleepHistoryItem[];
  currentSession: SleepSession;
}

export const SleepHistorySection: React.FC<SleepHistorySectionProps> = ({
  history,
  currentSession,
}) => {
  const safeHistory = history && history.length > 0 ? history : [];
  const [selectedIdx, setSelectedIdx] = useState<number>(Math.max(0, safeHistory.length - 1));

  // Compute 7-day stats
  const totalRecovery = safeHistory.reduce((acc, item) => acc + item.recoveryScore, 0);
  const avgRecovery = safeHistory.length > 0 ? Math.round(totalRecovery / safeHistory.length) : 88;

  const totalMinutes = safeHistory.reduce((acc, item) => acc + item.durationMinutes, 0);
  const avgMinutes = safeHistory.length > 0 ? Math.round(totalMinutes / safeHistory.length) : 460;
  const avgHours = Math.floor(avgMinutes / 60);
  const avgMinsRemainder = avgMinutes % 60;

  const selectedItem = safeHistory[selectedIdx] || safeHistory[safeHistory.length - 1];

  const getBarColor = (score: number) => {
    if (score >= 88) return Colors.forestGreenLight;
    if (score >= 78) return '#7AE69E';
    if (score >= 68) return Colors.softYellow;
    return Colors.coralCTA;
  };

  const formatTimeStr = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '11:00 PM';
    }
  };

  const formatDateDisplay = (dateStr: string, idx: number) => {
    if (idx === safeHistory.length - 1) return 'Last Night / Today';
    if (idx === safeHistory.length - 2) return 'Yesterday';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Header with Icon & Subtitle */}
      <View style={styles.headerRow}>
        <View style={styles.headerIconCircle}>
          <Moon size={18} color={Colors.lightSage} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>7-Day Sleep & Recovery</Text>
          <Text style={styles.subtitle}>Daily circadian recovery and sleep duration</Text>
        </View>
        <View style={styles.avgBadge}>
          <BatteryCharging size={13} color={Colors.forestGreenLight} style={{ marginRight: 4 }} />
          <Text style={styles.avgBadgeText}>{avgRecovery}% Avg</Text>
        </View>
      </View>

      {/* 2. Three Metric Summary Tiles */}
      <View style={styles.statsRow}>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>AVG RECOVERY</Text>
          <View style={styles.statValRow}>
            <Text style={[styles.statValue, { color: Colors.forestGreenLight }]}>{avgRecovery}%</Text>
          </View>
          <Text style={styles.statSub}>Optimal restoration</Text>
        </View>

        <View style={styles.statTile}>
          <Text style={styles.statLabel}>AVG DURATION</Text>
          <View style={styles.statValRow}>
            <Text style={styles.statValue}>{avgHours}h {avgMinsRemainder}m</Text>
          </View>
          <Text style={styles.statSub}>Per night target</Text>
        </View>

        <View style={styles.statTile}>
          <Text style={styles.statLabel}>CONSISTENCY</Text>
          <View style={styles.statValRow}>
            <Text style={[styles.statValue, { color: '#7AE69E' }]}>94%</Text>
          </View>
          <Text style={styles.statSub}>Circadian alignment</Text>
        </View>
      </View>

      {/* 3. 7-Day Interactive Visual Bar Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeaderRow}>
          <Text style={styles.chartTitle}>Recovery Score by Day</Text>
          <Text style={styles.chartHint}>Tap bar to inspect</Text>
        </View>

        <View style={styles.barsContainer}>
          {safeHistory.map((item, idx) => {
            const isSelected = idx === selectedIdx;
            const barHeightPct = Math.max(30, Math.min(100, item.recoveryScore));
            const barColor = getBarColor(item.recoveryScore);

            return (
              <Pressable
                key={item.id || item.date}
                style={styles.barCol}
                onPress={() => setSelectedIdx(idx)}
              >
                {/* Score Pill above Bar */}
                <Text
                  style={[
                    styles.barScoreLabel,
                    isSelected && { color: barColor, fontWeight: '700' },
                  ]}
                >
                  {item.recoveryScore}%
                </Text>

                {/* Vertical Bar Track & Fill */}
                <View style={[styles.barTrack, isSelected && styles.barTrackSelected]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${barHeightPct}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>

                {/* Day of Week Label */}
                <Text style={[styles.barDayLabel, isSelected && styles.barDayLabelSelected]}>
                  {item.dayLabel.charAt(0)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 4. Selected Day Deep-Dive Detail Card (#1E2320 theme) */}
      {selectedItem && (
        <View style={styles.selectedDetailCard}>
          <View style={styles.selectedHeader}>
            <View>
              <Text style={styles.selectedDateTitle}>
                {formatDateDisplay(selectedItem.date, selectedIdx)}
              </Text>
              <Text style={styles.selectedWindowText}>
                {formatTimeStr(selectedItem.bedtimeIso)} → {formatTimeStr(selectedItem.wakeTimeIso)}
              </Text>
            </View>

            <View
              style={[
                styles.selectedScorePill,
                {
                  backgroundColor: `${getBarColor(selectedItem.recoveryScore)}18`,
                  borderColor: `${getBarColor(selectedItem.recoveryScore)}45`,
                },
              ]}
            >
              <BatteryCharging size={14} color={getBarColor(selectedItem.recoveryScore)} style={{ marginRight: 5 }} />
              <Text style={[styles.selectedScoreText, { color: getBarColor(selectedItem.recoveryScore) }]}>
                {selectedItem.recoveryScore}% Recovery
              </Text>
            </View>
          </View>

          {/* Quality badge & Duration */}
          <View style={styles.selectedQualityRow}>
            <View style={styles.durationBadge}>
              <Clock size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text style={styles.durationBadgeText}>
                {Math.floor(selectedItem.durationMinutes / 60)}h {selectedItem.durationMinutes % 60}m
              </Text>
            </View>
            <Text style={styles.qualityDescription}>{selectedItem.qualityLabel}</Text>
          </View>

          {/* Stages Breakdown */}
          <View style={styles.stagesRow}>
            <View style={styles.stageCol}>
              <View style={[styles.stageDot, { backgroundColor: Colors.forestGreenLight }]} />
              <Text style={styles.stageVal}>
                {Math.floor((selectedItem.deepSleepMinutes || 115) / 60)}h {(selectedItem.deepSleepMinutes || 115) % 60}m
              </Text>
              <Text style={styles.stageKey}>Deep Sleep</Text>
            </View>

            <View style={styles.stageCol}>
              <View style={[styles.stageDot, { backgroundColor: '#7AE69E' }]} />
              <Text style={styles.stageVal}>
                {Math.floor((selectedItem.remSleepMinutes || 105) / 60)}h {(selectedItem.remSleepMinutes || 105) % 60}m
              </Text>
              <Text style={styles.stageKey}>REM Sleep</Text>
            </View>

            <View style={styles.stageCol}>
              <View style={[styles.stageDot, { backgroundColor: Colors.lightSage }]} />
              <Text style={styles.stageVal}>
                {Math.floor((selectedItem.lightSleepMinutes || 240) / 60)}h {(selectedItem.lightSleepMinutes || 240) % 60}m
              </Text>
              <Text style={styles.stageKey}>Light Sleep</Text>
            </View>
          </View>
        </View>
      )}

      {/* 5. 7-Day Day-by-Day Historical List (#1E2320 theme) */}
      <View style={styles.historyListContainer}>
        <Text style={styles.historyListTitle}>Past 7 Days Breakdown</Text>

        {[...safeHistory].reverse().map((item, revIdx) => {
          const actualIdx = safeHistory.length - 1 - revIdx;
          const color = getBarColor(item.recoveryScore);
          const hours = Math.floor(item.durationMinutes / 60);
          const mins = item.durationMinutes % 60;

          return (
            <Pressable
              key={item.id || item.date}
              style={[
                styles.historyItemCard,
                selectedIdx === actualIdx && styles.historyItemCardActive,
              ]}
              onPress={() => setSelectedIdx(actualIdx)}
            >
              <View style={styles.itemLeft}>
                <View style={[styles.itemDayBadge, { backgroundColor: `${color}18` }]}>
                  <Text style={[styles.itemDayText, { color }]}>{item.dayLabel}</Text>
                </View>
                <View>
                  <Text style={styles.itemNameText}>
                    {formatDateDisplay(item.date, actualIdx)}
                  </Text>
                  <Text style={styles.itemSubText}>
                    {formatTimeStr(item.bedtimeIso)} - {formatTimeStr(item.wakeTimeIso)} • {item.qualityLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.itemRight}>
                <Text style={styles.itemDuration}>{hours}h {mins}m</Text>
                <Text style={[styles.itemRecovery, { color }]}>{item.recoveryScore}%</Text>
              </View>
            </Pressable>
          );
        })}
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

  // Stat Tiles - App Theme (#1E2320)
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  statTile: {
    flex: 1,
    backgroundColor: '#1E2320',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
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
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamilies.serif,
  },
  statSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 3,
  },

  // Chart Card - App Theme (#1E2320)
  chartCard: {
    backgroundColor: '#1E2320',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  chartHint: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingBottom: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barScoreLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginBottom: 6,
    fontWeight: '500',
  },
  barTrack: {
    width: 22,
    height: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 11,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  barTrackSelected: {
    borderColor: 'rgba(74, 184, 122, 0.4)',
    backgroundColor: 'rgba(74, 184, 122, 0.1)',
  },
  barFill: {
    width: '100%',
    borderRadius: 11,
  },
  barDayLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 8,
    fontWeight: '600',
  },
  barDayLabelSelected: {
    color: Colors.textPrimary,
    fontWeight: '800',
  },

  // Selected Detail Card - App Theme (#1E2320)
  selectedDetailCard: {
    backgroundColor: '#1E2320',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  selectedDateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  selectedWindowText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  selectedScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectedScoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectedQualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  durationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  qualityDescription: {
    fontSize: 12,
    color: Colors.lightSage,
    fontWeight: '600',
  },
  stagesRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  stageCol: {
    flex: 1,
    alignItems: 'center',
  },
  stageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  stageVal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  stageKey: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // 7-Day History List - App Theme (#1E2320)
  historyListContainer: {
    backgroundColor: '#1E2320',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
  },
  historyListTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  historyItemCardActive: {
    backgroundColor: 'rgba(74, 184, 122, 0.12)',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemDayBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemDayText: {
    fontSize: 12,
    fontWeight: '800',
  },
  itemNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  itemSubText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemDuration: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemRecovery: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
});
