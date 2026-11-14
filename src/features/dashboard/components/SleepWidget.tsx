import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import {
  Moon,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  X,
  BatteryCharging,
  Bed,
  Plus,
  Clock,
  Sun,
} from 'lucide-react-native';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { Spacing } from '../../../theme/spacing';
import { SleepSession, AutoSleepPrompt } from '../../../services/sleepService';
import { requestPinWidget } from 'react-native-android-widget';

interface SleepWidgetProps {
  session: SleepSession;
  autoPrompt: AutoSleepPrompt | null;
  onStartSleep: () => void;
  onWakeUp: () => void;
  onConfirmAutoSleep: () => void;
  onDismissAutoSleep: () => void;
  onNavigateToHistory: () => void;
}

export const SleepWidget: React.FC<SleepWidgetProps> = ({
  session,
  autoPrompt,
  onStartSleep,
  onWakeUp,
  onConfirmAutoSleep,
  onDismissAutoSleep,
  onNavigateToHistory,
}) => {
  const isSleeping = session.isSleeping;
  const hasLogged = session.durationMinutes > 0;

  // Format last night's duration (real recorded time, 0h 0m if unlogged)
  const hours = Math.floor(session.durationMinutes / 60);
  const minutes = session.durationMinutes % 60;
  const durationText = hasLogged
    ? hours > 0
      ? `${hours}h ${minutes}m`
      : `${minutes}m`
    : '0h 0m';

  // Real-time bedtime and wake-up formatting
  const bedtimeStr = session.bedtimeIso
    ? new Date(session.bedtimeIso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '--:--';

  const wakeTimeStr = session.wakeTimeIso
    ? new Date(session.wakeTimeIso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '--:--';

  const scheduleText = hasLogged && session.bedtimeIso && session.wakeTimeIso
    ? `${bedtimeStr} → ${wakeTimeStr}`
    : 'No sleep logged yet';

  const effectiveRecovery = hasLogged ? session.recoveryScore : 0;
  const effectiveQuality = hasLogged ? session.qualityLabel : 'Not logged yet';

  // Active sleeping bedtime string (shows exact real-time when user pressed "Going to Bed")
  const activeBedtimeStr = session.bedtimeIso
    ? new Date(session.bedtimeIso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  // Recovery badge color
  const getRecoveryColor = (score: number) => {
    if (score >= 85) return Colors.forestGreenLight;
    if (score >= 70) return Colors.softYellow;
    if (score > 0) return Colors.coralCTA;
    return Colors.textMuted;
  };

  const recoveryColor = getRecoveryColor(effectiveRecovery);

  const handlePinWidget = async () => {
    if (Platform.OS !== 'android') return;
    try {
      await requestPinWidget({ widgetName: 'SleepTrackingWidget' });
    } catch (e) {
      console.warn('[SleepWidget] Pin widget error:', e);
    }
  };

  return (
    <View style={styles.sectionContainer}>
      {/* 1. Inactivity Auto-Detection Prompt (Shown ONLY on 7-8h inactivity when no sleep has been recorded yet) */}
      {autoPrompt && !isSleeping && session.durationMinutes === 0 && (
        <View style={styles.autoPromptCard}>
          <View style={styles.autoPromptHeader}>
            <View style={styles.autoPromptBadge}>
              <Sparkles size={12} color={Colors.lightSage} style={{ marginRight: 4 }} />
              <Text style={styles.autoPromptBadgeText}>INACTIVITY DETECTED</Text>
            </View>
            <Pressable
              onPress={onDismissAutoSleep}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.dismissBtn}
            >
              <X size={16} color={Colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.autoPromptBody}>
            <View style={styles.autoPromptIconWrap}>
              <Moon size={22} color={Colors.lightSage} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.autoPromptQuestion}>
                Did you sleep from {autoPrompt.bedtimeFormatted} to {autoPrompt.wakeTimeFormatted}?
              </Text>
              <Text style={styles.autoPromptSubtext}>
                {autoPrompt.durationFormatted} restful gap detected • ~{autoPrompt.estimatedRecoveryScore}% recovery
              </Text>
            </View>
          </View>

          <View style={styles.autoPromptActions}>
            <Pressable
              style={styles.autoDismissTextBtn}
              onPress={onDismissAutoSleep}
            >
              <Text style={styles.autoDismissText}>No, ignore</Text>
            </Pressable>

            <Pressable
              style={styles.autoConfirmBtn}
              onPress={onConfirmAutoSleep}
            >
              <CheckCircle2 size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.autoConfirmBtnText}>Yes, Confirm & Log</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 2. Section Header with Link to 7-Day Graph */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconCircle}>
            <Moon size={16} color={Colors.lightSage} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Sleep & Recovery</Text>
            <Text style={styles.sectionSubtitle}>Last night&apos;s circadian metrics</Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          {Platform.OS === 'android' && (
            <Pressable
              style={styles.pinWidgetBtn}
              onPress={handlePinWidget}
            >
              <Plus size={11} color="#7AE69E" style={{ marginRight: 3 }} />
              <Text style={styles.pinWidgetText}>Add Widget</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.historyLinkPill}
            onPress={onNavigateToHistory}
          >
            <Text style={styles.historyLinkText}>7-Day History</Text>
            <ChevronRight size={13} color={Colors.lightSage} />
          </Pressable>
        </View>
      </View>

      {/* 3. Main Sleep Widget Card */}
      {isSleeping ? (
        /* Active Night / Sleeping Mode */
        <View style={styles.activeSleepingCard}>
          <View style={styles.sleepingMoonGlow}>
            <Moon size={32} color="#7AE69E" />
          </View>
          <Text style={styles.sleepingTitle}>Sleep in Progress</Text>
          <Text style={styles.sleepingSubtitle}>
            Bedtime logged at {activeBedtimeStr}
          </Text>

          <Pressable
            style={styles.wakeUpActionBtn}
            onPress={onWakeUp}
          >
            <Sun size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.wakeUpActionBtnText}>I Woke Up</Text>
          </Pressable>
        </View>
      ) : (
        /* Normal Day Mode - Glanceable Last Night Sleep */
        <View style={styles.sleepCard}>
          {/* Top row: Last night badge and Recovery score pill */}
          <View style={styles.cardTopRow}>
            <View style={styles.lastNightPill}>
              <Bed size={13} color="#7AE69E" style={{ marginRight: 5 }} />
              <Text style={styles.lastNightPillText}>LAST NIGHT</Text>
            </View>

            <View style={[styles.recoveryPill, { borderColor: `${recoveryColor}40`, backgroundColor: `${recoveryColor}15` }]}>
              <BatteryCharging size={13} color={recoveryColor} style={{ marginRight: 4 }} />
              <Text style={[styles.recoveryPillText, { color: recoveryColor }]}>
                {effectiveRecovery}% Recovery
              </Text>
            </View>
          </View>

          {/* Main Duration & Time Window */}
          <View style={styles.mainStatsRow}>
            <View>
              <View style={styles.durationRow}>
                <Text style={styles.durationBig}>{durationText}</Text>
                <Text style={styles.durationTarget}>/ 8h 00m</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Clock size={12} color="#7AE69E" style={{ marginRight: 5 }} />
                <Text style={styles.scheduleText}>{scheduleText}</Text>
              </View>
            </View>

            <View style={[styles.qualityTag, { borderColor: `${recoveryColor}35`, backgroundColor: `${recoveryColor}12` }]}>
              <Text style={[styles.qualityTagLabel, { color: recoveryColor }]}>{effectiveQuality}</Text>
            </View>
          </View>

          {/* Sleep Architecture Breakdown Bars - HealthFreak Theme Colors */}
          <View style={styles.architectureContainer}>
            <View style={styles.archBarTrack}>
              {hasLogged ? (
                <>
                  <View
                    style={[
                      styles.archSegment,
                      {
                        flex: Math.max(1, session.deepSleepMinutes),
                        backgroundColor: '#2E7D52', // Deep Forest Green
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.archSegment,
                      {
                        flex: Math.max(1, session.remSleepMinutes),
                        backgroundColor: '#7AE69E', // Bright Sage Green
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.archSegment,
                      {
                        flex: Math.max(1, session.lightSleepMinutes),
                        backgroundColor: '#B6DEC0', // Light Mint Sage
                      },
                    ]}
                  />
                </>
              ) : (
                <View
                  style={[
                    styles.archSegment,
                    {
                      flex: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    },
                  ]}
                />
              )}
            </View>

            {/* Stage Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: hasLogged ? '#2E7D52' : Colors.textMuted }]} />
                <Text style={styles.legendLabel}>
                  Deep ({hasLogged ? (session.deepSleepMinutes >= 60 ? `${Math.floor(session.deepSleepMinutes / 60)}h ${session.deepSleepMinutes % 60}m` : `${session.deepSleepMinutes}m`) : '0m'})
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: hasLogged ? '#7AE69E' : Colors.textMuted }]} />
                <Text style={styles.legendLabel}>
                  REM ({hasLogged ? (session.remSleepMinutes >= 60 ? `${Math.floor(session.remSleepMinutes / 60)}h ${session.remSleepMinutes % 60}m` : `${session.remSleepMinutes}m`) : '0m'})
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: hasLogged ? '#B6DEC0' : Colors.textMuted }]} />
                <Text style={styles.legendLabel}>
                  Light ({hasLogged ? (session.lightSleepMinutes >= 60 ? `${Math.floor(session.lightSleepMinutes / 60)}h ${session.lightSleepMinutes % 60}m` : `${session.lightSleepMinutes}m`) : '0m'})
                </Text>
              </View>
            </View>
          </View>

          {/* Interactive Bedtime Button */}
          <Pressable
            style={styles.bedtimeBtn}
            onPress={onStartSleep}
          >
            <Moon size={16} color="#7AE69E" style={{ marginRight: 8 }} />
            <Text style={styles.bedtimeBtnText}>Going to Bed</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: Spacing.xl,
  },
  // Auto-detection prompt banner - App theme (#1E2320)
  autoPromptCard: {
    backgroundColor: '#1E2320',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(75, 119, 97, 0.35)',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  autoPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  autoPromptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(75, 119, 97, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  autoPromptBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.lightSage,
    letterSpacing: 0.5,
  },
  dismissBtn: {
    padding: 2,
  },
  autoPromptBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  autoPromptIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(75, 119, 97, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  autoPromptQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  autoPromptSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  autoPromptActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  autoDismissTextBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  autoDismissText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  autoConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.forestGreenLight,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  autoConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Section Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(75, 119, 97, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinWidgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 184, 122, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.3)',
  },
  pinWidgetText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7AE69E',
  },
  historyLinkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  historyLinkText: {
    fontSize: 12,
    color: Colors.lightSage,
    fontWeight: '600',
    marginRight: 2,
  },

  // Normal Card - App Theme (#1E2320)
  sleepCard: {
    backgroundColor: '#1E2320',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2D3830',
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  lastNightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 184, 122, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.25)',
  },
  lastNightPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7AE69E',
    letterSpacing: 0.8,
  },
  recoveryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  recoveryPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  mainStatsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 4,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  durationBig: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  durationTarget: {
    fontSize: 13,
    color: '#7D9083',
    marginLeft: 6,
    fontWeight: '600',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  scheduleText: {
    fontSize: 12,
    color: '#9CB0A2',
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  qualityTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  qualityTagLabel: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Architecture Bar
  architectureContainer: {
    marginBottom: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  archBarTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  archSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  legendLabel: {
    fontSize: 11,
    color: '#9CB0A2',
    fontFamily: Typography.fontFamilies.sansMedium,
  },

  // Bedtime Button - Forest Green Theme
  bedtimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#24382C',
    borderWidth: 1.2,
    borderColor: '#3D6B52',
    borderRadius: 16,
    paddingVertical: 14,
  },
  bedtimeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Active Night Card - App Theme (#1E2320)
  activeSleepingCard: {
    backgroundColor: '#1E2320',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(75, 119, 97, 0.45)',
    padding: Spacing.xl,
    alignItems: 'center',
  },
  sleepingMoonGlow: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(75, 119, 97, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(122, 230, 158, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  sleepingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sleepingSubtitle: {
    fontSize: 13,
    color: '#A8B5AB',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 280,
  },
  wakeUpActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4B7761',
    borderWidth: 1,
    borderColor: '#7AE69E',
    borderRadius: 16,
    paddingVertical: 14,
    width: '100%',
  },
  wakeUpActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
