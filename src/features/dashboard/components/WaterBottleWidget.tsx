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
  Easing,
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

  // Exact bouncy squish & smooth luminous floating text animations matching web preview
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const floatOpacity = useSharedValue(0);
  const floatTranslateY = useSharedValue(0);
  const floatScale = useSharedValue(0.85);

  const triggerTapEffect = (amount: number) => {
    // 1. Realistic bottle squish & bounce (matching water_widget_preview.html)
    scaleX.value = withSequence(
      withTiming(1.10, { duration: 90, easing: Easing.out(Easing.ease) }),
      withTiming(0.96, { duration: 110, easing: Easing.inOut(Easing.ease) }),
      withSpring(1, { damping: 12, stiffness: 220 })
    );
    scaleY.value = withSequence(
      withTiming(0.88, { duration: 90, easing: Easing.out(Easing.ease) }),
      withTiming(1.05, { duration: 110, easing: Easing.inOut(Easing.ease) }),
      withSpring(1, { damping: 12, stiffness: 220 })
    );

    // 2. Smooth aesthetic floating text (+150ml) rising upward with soft luminous glow
    const sign = amount > 0 ? `+${amount}ml` : `${amount}ml`;
    setFeedbackText(sign);

    floatTranslateY.value = 8;
    floatScale.value = 0.88;
    floatOpacity.value = 0;

    floatTranslateY.value = withTiming(-38, {
      duration: 700,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    floatScale.value = withTiming(1, { duration: 200 });
    floatOpacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withTiming(0.95, { duration: 320 }),
      withTiming(0, { duration: 260 })
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
    transform: [{ scaleX: scaleX.value }, { scaleY: scaleY.value }],
  }));

  const animatedFloatTextStyle = useAnimatedStyle(() => ({
    opacity: floatOpacity.value,
    transform: [
      { translateY: floatTranslateY.value },
      { scale: floatScale.value },
    ],
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
          style={({ pressed }) => [styles.bottleTapWrapper, pressed && { opacity: 0.92 }]}
          onPress={handleBottleTap}
        >
          <Animated.View style={[styles.bottleGraphicWrapper, animatedBottleStyle]}>
            <WaterBottleGraphic
              fillPercentage={fillPercentage}
              currentMl={waterLoggedMl}
              targetMl={waterTargetMl}
              width={70}
              height={116}
            />
          </Animated.View>

          {/* Aesthetic Luminous Floating Text (+150ml) Matching Web Preview */}
          <Animated.View style={[styles.floatingTextWrapper, animatedFloatTextStyle]} pointerEvents="none">
            <Text style={styles.floatingAestheticText}>{feedbackText}</Text>
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

          {/* Remaining or Celebration Status */}
          {isGoalMet ? (
            <View style={styles.goalAchievedCard}>
              <View style={styles.celebrationRow}>
                <Sparkles size={14} color="#7AD3FA" style={{ marginRight: 6 }} />
                <Text style={styles.goalAchievedTitle}>Target Achieved!</Text>
              </View>
              <Text style={styles.goalAchievedDesc}>Cellular hydration optimized for metabolic peak</Text>
            </View>
          ) : (
            <View style={styles.remainingCard}>
              <Text style={styles.remainingTitle}>
                {remainingMl.toLocaleString()} ml remaining
              </Text>
              <Text style={styles.remainingDesc}>
                {remainingMl > 0 ? `~${Math.ceil(remainingMl / 250)} glasses to hit daily target` : 'Almost there!'}
              </Text>
            </View>
          )}

          {/* Dynamic Progress Bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                isGoalMet && styles.progressBarGoalMet,
                { width: `${Math.min(100, Math.max(3, fillPercentage))}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Quick Action Logging Buttons */}
      <View style={styles.actionsBar}>
        <Pressable
          style={[styles.quickAddBtn, styles.quickAddBtnPrimary]}
          onPress={() => handleQuickAdd(150)}
        >
          <Plus size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.quickAddBtnTextPrimary}>+150ml</Text>
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

      {/* Daily Summary & Cloud Database Sync Indicator */}
      <View style={styles.summaryFooterRow}>
        <View style={styles.summaryIndicatorDot} />
        <Text style={styles.summaryFooterText}>
          {waterLoggedMl > 0
            ? `Daily intake: ${waterLoggedMl} ml (${Math.round((waterLoggedMl / waterTargetMl) * 100)}%) • Resets at midnight • Stored in database`
            : `Daily intake resets each morning • Tap to log • Stored in database`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: 'rgba(16, 26, 20, 0.78)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 0,
    borderColor: 'transparent',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 4,
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 0,
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
    width: 86,
    position: 'relative',
  },
  bottleGraphicWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingTextWrapper: {
    position: 'absolute',
    top: 34,
    left: '50%',
    marginLeft: -45,
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  floatingAestheticText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Typography.fontFamilies.sansBold,
    textShadowColor: 'rgba(122, 211, 250, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  tapPromptPill: {
    backgroundColor: 'rgba(74, 184, 122, 0.14)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 0,
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 0,
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
    backgroundColor: 'rgba(79, 163, 226, 0.15)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 0,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
    borderTopWidth: 0,
    paddingTop: 10,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 0,
    flex: 1,
  },
  quickAddBtnPrimary: {
    backgroundColor: '#2C82C9',
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
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  summaryFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  summaryIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4AB87A',
    marginRight: 6,
  },
  summaryFooterText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansRegular,
    flex: 1,
  },
});
