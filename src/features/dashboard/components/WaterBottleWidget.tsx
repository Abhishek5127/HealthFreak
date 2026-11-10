import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
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
import { GlassButton } from '../../../components/common/GlassButton';
import {
  SPECULAR_LEFT,
  SPECULAR_RIGHT,
  GRAIN_TEXTURE,
} from '../../../utils/glassTheme';

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
    <View style={styles.shadowContainer}>
      <View style={styles.glassContainer}>
        {/* 1. Underlying Native Frosted Blur */}
        <View style={[StyleSheet.absoluteFill, styles.blurWrapper]}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 65 : 45}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          {/* Tint overlay layer for contrast and water blue luminescence */}
          <View style={[StyleSheet.absoluteFill, styles.neutralDarkTint]} />
        </View>

        {/* 2. Micro-etched Sandblasted Glass Grain Noise */}
        <Image
          source={GRAIN_TEXTURE}
          style={[StyleSheet.absoluteFill, styles.grainTexture]}
          contentFit="cover"
          pointerEvents="none"
        />

        {/* 3. Inset 3D Specular Curvature Caps */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.specularWrapper]}>
          <Image
            source={SPECULAR_LEFT}
            style={styles.specularCap}
            contentFit="fill"
          />
          <View style={styles.specularFlexSpacer} />
          <Image
            source={SPECULAR_RIGHT}
            style={styles.specularCap}
            contentFit="fill"
          />
        </View>

        {/* 4. Top Specular Sheen Line (Incidence Light) */}
        <View pointerEvents="none" style={styles.topSheenLine} />

        {/* 5. Card Content Inner */}
        <View style={styles.contentInner}>
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

            <GlassButton
              onPress={onOpenTargetModal}
              title={`${(waterTargetMl / 1000).toFixed(1)}L`}
              titleColor={Colors.lightSage}
              icon={<Sliders size={12} color={Colors.lightSage} />}
              size="xs"
              height={28}
              borderRadius={10}
              style={{ flexShrink: 0 }}
            />
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
        <GlassButton
          onPress={() => handleQuickAdd(150)}
          title="+150ml"
          titleColor="#FFFFFF"
          icon={<Plus size={12} color="#FFFFFF" />}
          size="xs"
          height={34}
          borderRadius={12}
          style={{ flex: 1 }}
        />

        <GlassButton
          onPress={() => handleQuickAdd(250)}
          title="+250ml"
          titleColor="#4FA3E2"
          icon={<Plus size={12} color="#4FA3E2" />}
          size="xs"
          height={34}
          borderRadius={12}
          style={{ flex: 1 }}
        />

        <GlassButton
          onPress={() => handleQuickAdd(500)}
          title="+500ml"
          titleColor="#4FA3E2"
          icon={<Plus size={12} color="#4FA3E2" />}
          size="xs"
          height={34}
          borderRadius={12}
          style={{ flex: 1 }}
        />

        {waterLoggedMl > 0 && (
          <GlassButton
            onPress={() => handleQuickAdd(-100)}
            icon={<Minus size={13} color="#FFFFFF" />}
            titleColor="#FFFFFF"
            size="xs"
            height={34}
            borderRadius={12}
            style={{ width: 34 }}
          />
        )}
      </View>

      {/* Daily Summary & Cloud Database Sync Indicator */}
      <View style={styles.summaryFooterRow}>
        <View style={styles.summaryIndicatorDot} />
        <Text style={styles.summaryFooterText}>
          {waterLoggedMl > 0
            ? `Daily intake: ${waterLoggedMl} ml (${Math.round((waterLoggedMl / waterTargetMl) * 100)}%) • Resets at midnight.`
            : `Daily intake resets each morning.`}
        </Text>
      </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    width: '100%',
    borderRadius: 24,
    marginVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
    overflow: 'hidden',
  },
  glassContainer: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.2,
    borderColor: 'rgba(79, 163, 226, 0.35)',
    borderTopColor: 'rgba(160, 215, 255, 0.78)',
    borderBottomColor: 'rgba(79, 163, 226, 0.18)',
    backgroundColor: Platform.select({
      ios: 'rgba(79, 163, 226, 0.14)',
      android: 'rgba(79, 163, 226, 0.25)',
      default: 'rgba(79, 163, 226, 0.18)',
    }),
  },
  blurWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  neutralDarkTint: {
    backgroundColor: Platform.select({
      ios: 'rgba(14, 20, 24, 0.52)',
      android: 'rgba(18, 24, 28, 0.75)',
      default: 'rgba(14, 20, 24, 0.58)',
    }),
  },
  grainTexture: {
    opacity: 0.055,
    borderRadius: 24,
  },
  specularWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: 0.22,
    borderRadius: 24,
  },
  specularCap: {
    width: 24,
    height: '100%',
    opacity: 0.9,
  },
  specularFlexSpacer: {
    flex: 1,
  },
  topSheenLine: {
    position: 'absolute',
    top: 1,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(160, 215, 255, 0.60)',
    opacity: 0.8,
  },
  contentInner: {
    padding: 16,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    minWidth: 0,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(79, 163, 226, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(122, 211, 250, 0.40)',
    borderTopColor: 'rgba(180, 230, 255, 0.75)',
    borderBottomColor: 'rgba(79, 163, 226, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  iconCircleGoalMet: {
    backgroundColor: 'rgba(74, 184, 122, 0.35)',
    borderColor: 'rgba(120, 240, 160, 0.50)',
    borderTopColor: 'rgba(180, 255, 200, 0.85)',
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
    backgroundColor: 'rgba(79, 163, 226, 0.18)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(79, 163, 226, 0.35)',
    borderTopColor: 'rgba(160, 215, 255, 0.65)',
    borderBottomColor: 'rgba(79, 163, 226, 0.18)',
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
    backgroundColor: 'rgba(79, 163, 226, 0.12)',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(79, 163, 226, 0.28)',
    borderTopColor: 'rgba(160, 215, 255, 0.55)',
    borderBottomColor: 'rgba(79, 163, 226, 0.15)',
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
    backgroundColor: 'rgba(74, 184, 122, 0.15)',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.35)',
    borderTopColor: 'rgba(180, 255, 200, 0.70)',
    borderBottomColor: 'rgba(74, 184, 122, 0.15)',
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
