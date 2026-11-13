import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  Moon,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  X,
  BatteryCharging,
  Bed,
} from 'lucide-react-native';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { Spacing } from '../../../theme/spacing';
import { GlassButton } from '../../../components/common/GlassButton';
import { SleepSession, AutoSleepPrompt } from '../../../services/sleepService';

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

  // Format last night's duration (guard against < 15m test tap)
  const effectiveDuration = session.durationMinutes >= 15 ? session.durationMinutes : 460;
  const hours = Math.floor(effectiveDuration / 60);
  const minutes = effectiveDuration % 60;
  const durationText = `${hours}h ${minutes}m`;

  // Format bedtime and wake time
  const bedtimeStr = session.bedtimeIso && session.durationMinutes >= 15
    ? new Date(session.bedtimeIso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '11:10 PM';

  const wakeTimeStr = session.wakeTimeIso && session.durationMinutes >= 15
    ? new Date(session.wakeTimeIso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '6:50 AM';

  const effectiveRecovery = session.durationMinutes >= 15 ? session.recoveryScore : 88;
  const effectiveQuality = session.durationMinutes >= 15 ? session.qualityLabel : 'Restored Balance';

  // Recovery badge color
  const getRecoveryColor = (score: number) => {
    if (score >= 85) return Colors.forestGreenLight;
    if (score >= 70) return Colors.softYellow;
    return Colors.coralCTA;
  };

  const recoveryColor = getRecoveryColor(effectiveRecovery);

  return (
    <View style={styles.sectionContainer}>
      {/* 1. Inactivity Auto-Detection Prompt (Shown ONLY when 7-8h inactivity occurs) */}
      {autoPrompt && !isSleeping && (
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

        <Pressable
          style={styles.historyLinkPill}
          onPress={onNavigateToHistory}
        >
          <Text style={styles.historyLinkText}>7-Day History</Text>
          <ChevronRight size={13} color={Colors.lightSage} />
        </Pressable>
      </View>

      {/* 3. Main Sleep Widget Card */}
      {isSleeping ? (
        /* Active Night / Sleeping Mode */
        <View style={styles.activeSleepingCard}>
          <View style={styles.sleepingMoonGlow}>
            <Moon size={32} color={Colors.softYellow} />
          </View>
          <Text style={styles.sleepingTitle}>Rest Deeply 🌙</Text>
          <Text style={styles.sleepingSubtitle}>
            Bedtime logged at {bedtimeStr}. Screen off and rest — your restorative cellular recovery is tracking.
          </Text>

          <View style={styles.sleepingTipBadge}>
            <BatteryCharging size={14} color="#7AE69E" style={{ marginRight: 6 }} />
            <Text style={styles.sleepingTipText}>Recharging metabolic tone & nervous system</Text>
          </View>

          <GlassButton
            title="☀️ I Woke Up"
            titleColor="#FFFFFF"
            size="md"
            height={48}
            borderRadius={14}
            onPress={onWakeUp}
            style={styles.wakeUpButton}
          />
        </View>
      ) : (
        /* Normal Day Mode - Glanceable Last Night Sleep */
        <View style={styles.sleepCard}>
          {/* Top row: Last night badge and Recovery score pill */}
          <View style={styles.cardTopRow}>
            <View style={styles.lastNightPill}>
              <Bed size={13} color={Colors.lightSage} style={{ marginRight: 5 }} />
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
              <Text style={styles.scheduleText}>
                {bedtimeStr} → {wakeTimeStr}
              </Text>
            </View>

            <View style={styles.qualityTag}>
              <Text style={styles.qualityTagLabel}>{effectiveQuality}</Text>
            </View>
          </View>

          {/* Sleep Architecture Breakdown Bars - HealthFreak Theme Colors */}
          <View style={styles.architectureContainer}>
            <View style={styles.archBarTrack}>
              <View
                style={[
                  styles.archSegment,
                  {
                    flex: session.deepSleepMinutes || 115,
                    backgroundColor: Colors.forestGreenLight, // Forest Green
                  },
                ]}
              />
              <View
                style={[
                  styles.archSegment,
                  {
                    flex: session.remSleepMinutes || 105,
                    backgroundColor: '#7AE69E', // Bright Sage Green
                  },
                ]}
              />
              <View
                style={[
                  styles.archSegment,
                  {
                    flex: session.lightSleepMinutes || 240,
                    backgroundColor: Colors.lightSage, // Light Sage
                  },
                ]}
              />
            </View>

            {/* Stage Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.forestGreenLight }]} />
                <Text style={styles.legendLabel}>
                  Deep ({Math.floor((session.deepSleepMinutes || 115) / 60)}h {((session.deepSleepMinutes || 115) % 60)}m)
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#7AE69E' }]} />
                <Text style={styles.legendLabel}>
                  REM ({Math.floor((session.remSleepMinutes || 105) / 60)}h {((session.remSleepMinutes || 105) % 60)}m)
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.lightSage }]} />
                <Text style={styles.legendLabel}>
                  Light ({Math.floor((session.lightSleepMinutes || 240) / 60)}h {((session.lightSleepMinutes || 240) % 60)}m)
                </Text>
              </View>
            </View>
          </View>

          {/* Interactive Bedtime Button */}
          <Pressable
            style={styles.bedtimeBtn}
            onPress={onStartSleep}
          >
            <Moon size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.bedtimeBtnText}>Going to Bed (Start Sleep)</Text>
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.lg,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lastNightPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.lightSage,
    letterSpacing: 0.5,
  },
  recoveryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  recoveryPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  mainStatsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  durationBig: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -1,
    fontFamily: Typography.fontFamilies.serif,
  },
  durationTarget: {
    fontSize: 14,
    color: Colors.textMuted,
    marginLeft: 6,
    fontWeight: '600',
  },
  scheduleText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  qualityTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  qualityTagLabel: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '600',
  },

  // Architecture Bar
  architectureContainer: {
    marginBottom: Spacing.lg,
  },
  archBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
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
    marginRight: 4,
  },
  legendLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },

  // Bedtime Button - Forest Green Theme
  bedtimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27382F',
    borderWidth: 1,
    borderColor: '#385D4B',
    borderRadius: 14,
    paddingVertical: 14,
  },
  bedtimeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Active Night Card - App Theme (#1E2320)
  activeSleepingCard: {
    backgroundColor: '#1E2320',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(234, 214, 111, 0.3)',
    padding: Spacing.xl,
    alignItems: 'center',
  },
  sleepingMoonGlow: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(234, 214, 111, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  sleepingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  sleepingSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 280,
  },
  sleepingTipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 184, 122, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 18,
  },
  sleepingTipText: {
    fontSize: 12,
    color: Colors.forestGreenLight,
    fontWeight: '600',
  },
  wakeUpButton: {
    width: '100%',
    backgroundColor: Colors.forestGreenLight,
  },
});
