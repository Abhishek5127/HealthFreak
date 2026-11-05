import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import {
  Droplet,
  Plus,
  Minus,
  Sliders,
  Sparkles,
} from 'lucide-react-native';
import { WaterBottleGraphic } from './WaterBottleGraphic';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';

interface WaterBottleWidgetProps {
  waterLoggedMl: number;
  waterTargetMl: number;
  onLogWater: (amountMl: number) => void;
  onOpenTargetModal: () => void;
  onResetWater?: () => void;
}

export const WaterBottleWidget: React.FC<WaterBottleWidgetProps> = ({
  waterLoggedMl,
  waterTargetMl,
  onLogWater,
  onOpenTargetModal,
  onResetWater,
}) => {
  const [feedbackText, setFeedbackText] = useState<string | null>(null);

  const fillPercentage = waterTargetMl > 0 ? (waterLoggedMl / waterTargetMl) * 100 : 0;
  const isGoalMet = fillPercentage >= 100;
  const remainingMl = Math.max(0, waterTargetMl - waterLoggedMl);

  // Animation values for tap bounce and floating +100ml pill
  const scale = useSharedValue(1);
  const pillOpacity = useSharedValue(0);
  const pillTranslateY = useSharedValue(0);

  const triggerTapEffect = (amount: number) => {
    // 1. Bottle squish & bounce
    scale.value = withSequence(
      withTiming(0.92, { duration: 80 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );

    // 2. Floating feedback pill
    const sign = amount > 0 ? `+${amount}ml` : `${amount}ml`;
    setFeedbackText(sign);
    pillTranslateY.value = 10;
    pillOpacity.value = 1;
    pillTranslateY.value = withTiming(-20, { duration: 600 });
    pillOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 400 })
    );
  };

  const handleBottleTap = () => {
    triggerTapEffect(150);
    onLogWater(150);
  };

  const handleQuickAdd = (amount: number) => {
    triggerTapEffect(amount);
    onLogWater(amount);
  };

  const animatedBottleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedPillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ translateY: pillTranslateY.value }],
  }));

  return (
    <View style={styles.cardContainer}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconCircle, isGoalMet && styles.iconCircleGoalMet]}>
            <Droplet size={18} color={isGoalMet ? '#FFFFFF' : '#4FA3E2'} />
          </View>
          <View>
            <Text style={styles.widgetSubLabel}>SMART HYDRATION WIDGET</Text>
            <Text style={styles.widgetTitle}>Daily Water Bottle</Text>
          </View>
        </View>

        <Pressable
          onPress={onOpenTargetModal}
          style={styles.targetSettingBtn}
          accessibilityLabel="Adjust Water Target"
        >
          <Sliders size={15} color={Colors.textSecondary} style={{ marginRight: 5 }} />
          <Text style={styles.targetSettingText}>{(waterTargetMl / 1000).toFixed(1)}L Goal</Text>
        </Pressable>
      </View>

      {/* Main Interactive Bottle Section */}
      <View style={styles.mainContentRow}>
        {/* Left Side: Interactive Tappable Bottle */}
        <Pressable
          style={({ pressed }) => [styles.bottleTapWrapper, pressed && { opacity: 0.88 }]}
          onPress={handleBottleTap}
        >
          <Animated.View style={[styles.bottleGraphicWrapper, animatedBottleStyle]}>
            <WaterBottleGraphic
              fillPercentage={fillPercentage}
              currentMl={waterLoggedMl}
              targetMl={waterTargetMl}
              width={105}
              height={175}
            />
          </Animated.View>

          {/* Floating animated tap badge */}
          <Animated.View style={[styles.floatingPill, animatedPillStyle]}>
            <Text style={styles.floatingPillText}>{feedbackText}</Text>
          </Animated.View>

          <View style={styles.tapPromptPill}>
            <Text style={styles.tapPromptText}>Tap +150ml</Text>
          </View>
        </Pressable>

        {/* Right Side: Hydration Stats & Progress */}
        <View style={styles.statsColumn}>
          {/* Progress Percent & Current Volume */}
          <View>
            <View style={styles.percentRow}>
              <Text style={styles.percentText}>{Math.round(fillPercentage)}%</Text>
              <Text style={styles.percentSubLabel}>intake completed</Text>
            </View>

            <Text style={styles.volumeText}>
              {waterLoggedMl.toLocaleString()} <Text style={styles.volumeTargetText}>/ {waterTargetMl.toLocaleString()} ml</Text>
            </Text>
          </View>

          {/* Goal Status or Remaining Notice */}
          {isGoalMet ? (
            <View style={styles.goalAchievedCard}>
              <View style={styles.celebrationRow}>
                <Sparkles size={14} color="#FFD166" style={{ marginRight: 5 }} />
                <Text style={styles.goalAchievedTitle}>Hydration Achieved! 😊</Text>
              </View>
              <Text style={styles.goalAchievedDesc}>
                Minimum daily requirement met. Your bottle is smiling!
              </Text>
            </View>
          ) : (
            <View style={styles.remainingCard}>
              <Text style={styles.remainingTitle}>
                {remainingMl.toLocaleString()} ml remaining
              </Text>
              <Text style={styles.remainingDesc}>
                ~{Math.ceil(remainingMl / 100)} sips or {Math.ceil(remainingMl / 250)} glasses to hit target.
              </Text>
            </View>
          )}

          {/* Progress bar line */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${Math.min(100, Math.max(0, fillPercentage))}%` },
                isGoalMet && styles.progressBarGoalMet,
              ]}
            />
          </View>
        </View>
      </View>

      {/* Bottom Quick-Action Buttons */}
      <View style={styles.actionsBar}>
        <Pressable
          style={[styles.quickAddBtn, styles.quickAddBtnPrimary]}
          onPress={() => handleQuickAdd(100)}
        >
          <Plus size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.quickAddBtnTextPrimary}>+100ml Sip</Text>
        </Pressable>

        <Pressable
          style={styles.quickAddBtn}
          onPress={() => handleQuickAdd(250)}
        >
          <Plus size={14} color="#4FA3E2" style={{ marginRight: 4 }} />
          <Text style={styles.quickAddBtnText}>+250ml Glass</Text>
        </Pressable>

        <Pressable
          style={styles.quickAddBtn}
          onPress={() => handleQuickAdd(500)}
        >
          <Plus size={14} color="#4FA3E2" style={{ marginRight: 4 }} />
          <Text style={styles.quickAddBtnText}>+500ml Bottle</Text>
        </Pressable>

        {waterLoggedMl > 0 && (
          <Pressable
            style={styles.undoBtn}
            onPress={() => handleQuickAdd(-100)}
            accessibilityLabel="Undo 100ml"
          >
            <Minus size={14} color={Colors.textSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#161C18',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#242D26',
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(79, 163, 226, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconCircleGoalMet: {
    backgroundColor: '#2C82C9',
  },
  widgetSubLabel: {
    color: '#4FA3E2',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.8,
  },
  widgetTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm + 1,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  targetSettingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202822',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D3830',
  },
  targetSettingText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  mainContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 14,
  },
  bottleTapWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    position: 'relative',
  },
  bottleGraphicWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingPill: {
    position: 'absolute',
    top: 40,
    backgroundColor: '#2C82C9',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    zIndex: 10,
  },
  floatingPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  tapPromptPill: {
    backgroundColor: '#202922',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#2E3B31',
  },
  tapPromptText: {
    color: '#4FA3E2',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  statsColumn: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: 'center',
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 2,
  },
  percentText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes['3xl'],
    fontFamily: Typography.fontFamilies.serif,
    letterSpacing: -0.5,
  },
  percentSubLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  volumeText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm + 1,
    fontFamily: Typography.fontFamilies.sansBold,
    marginBottom: 10,
  },
  volumeTargetText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
  },
  remainingCard: {
    backgroundColor: '#121714',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#202722',
    marginBottom: 12,
  },
  remainingTitle: {
    color: '#4FA3E2',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  remainingDesc: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 2,
  },
  goalAchievedCard: {
    backgroundColor: 'rgba(79, 163, 226, 0.12)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(79, 163, 226, 0.35)',
    marginBottom: 12,
  },
  celebrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalAchievedTitle: {
    color: '#7AD3FA',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  goalAchievedDesc: {
    color: '#A9DCF8',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#202822',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#4FA3E2',
  },
  progressBarGoalMet: {
    backgroundColor: '#2C82C9',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#202822',
    paddingTop: 12,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#202822',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E3B31',
    flex: 1,
  },
  quickAddBtnPrimary: {
    backgroundColor: '#2C82C9',
    borderColor: '#4FA3E2',
  },
  quickAddBtnText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  quickAddBtnTextPrimary: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  undoBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#202822',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2E3B31',
  },
});
