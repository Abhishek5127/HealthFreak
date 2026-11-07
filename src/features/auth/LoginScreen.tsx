import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Dumbbell,
  Utensils,
  TrendingUp,
  Clock,
  Activity,
  Camera,
  Sparkles,
  AlertCircle,
  X,
  Footprints,
  Flame,
  Moon,
  Droplet,
  Mic,
  Check,
  Zap,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuth } from '../../state/AuthContext';
import { Typography } from '../../theme/typography';
import { HealthFreakLogo } from '../../components/common/HealthFreakLogo';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { authState, error, signInWithGoogle, signInAsDemoUser, clearError } = useAuth();
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isEntering, setIsEntering] = useState<boolean>(false);
  const isAuthenticating = authState === 'authenticating';

  const scrollRef = useRef<any>(null);
  const autoAdvanceTimerRef = useRef<any>(null);

  // --- REANIMATED SHARED VALUES ---
  const screenOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  // App Entrance Transition (radiant portal burst on exit)
  const portalScale = useSharedValue(0.3);
  const portalOpacity = useSharedValue(0);
  const exitScale = useSharedValue(1);
  const exitOpacity = useSharedValue(1);
  const entranceTextOpacity = useSharedValue(0);
  const entranceTextScale = useSharedValue(0.92);

  // 1. Initial mount animation
  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.ease) });
    contentTranslateY.value = withSpring(0, { damping: 16, stiffness: 95 });
  }, [contentTranslateY, screenOpacity]);

  // 2. Gentle auto-advance for carousel (pauses when user interacts)
  const resetAutoAdvance = () => {
    if (autoAdvanceTimerRef.current) {
      clearInterval(autoAdvanceTimerRef.current);
    }
    autoAdvanceTimerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % 5;
        scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, 5500);
  };

  useEffect(() => {
    resetAutoAdvance();
    return () => {
      if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current);
    };
  }, []);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index >= 0 && index < 5 && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const scrollToSlide = (index: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    resetAutoAdvance();
    setActiveIndex(index);
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  // 3. Trigger Animated Entrance into App
  const handleEnterApp = () => {
    if (isEntering || isAuthenticating) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}

    setIsEntering(true);

    portalOpacity.value = withTiming(0.85, { duration: 180 }, () => {
      portalOpacity.value = withTiming(0, { duration: 320 });
    });
    portalScale.value = withTiming(3.2, { duration: 500, easing: Easing.out(Easing.cubic) });

    exitOpacity.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.ease) });
    exitScale.value = withTiming(1.05, { duration: 300 });

    entranceTextOpacity.value = withDelay(100, withTiming(1, { duration: 250 }));
    entranceTextScale.value = withDelay(100, withSpring(1, { damping: 14, stiffness: 100 }));

    setTimeout(() => {
      runOnJS(signInAsDemoUser)();
    }, 450);
  };

  // Animated Styles
  const animatedRoot = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const animatedContent = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
    transform: [
      { translateY: contentTranslateY.value },
      { scale: exitScale.value },
    ],
  }));

  const animatedPortal = useAnimatedStyle(() => ({
    opacity: portalOpacity.value,
    transform: [{ scale: portalScale.value }],
  }));

  const animatedEntranceText = useAnimatedStyle(() => ({
    opacity: entranceTextOpacity.value,
    transform: [{ scale: entranceTextScale.value }],
  }));

  return (
    <Animated.View style={[styles.root, animatedRoot]}>
      {/* Subtle ambient lighting top and bottom */}
      <View style={styles.ambientTopGlow} pointerEvents="none" />
      <View style={styles.ambientCenterGlow} pointerEvents="none" />

      {/* Radiant Portal Wave (Plays on Entrance) */}
      <Animated.View style={[styles.portalWave, animatedPortal]} pointerEvents="none" />

      {/* Entering App Welcome Overlay */}
      {isEntering && (
        <Animated.View style={[styles.enteringOverlay, animatedEntranceText]} pointerEvents="none">
          <View style={styles.enteringBadge}>
            <Sparkles size={16} color="#52C480" />
            <Text style={styles.enteringBadgeText}>SANCTUARY UNLOCKED</Text>
          </View>
          <Text style={styles.enteringTitle}>Welcome to HealthFreak</Text>
          <Text style={styles.enteringSub}>Preparing your personalized daily engine...</Text>
        </Animated.View>
      )}

      {/* Top Fixed Brand Header matching screenshot */}
      <View
        style={[
          styles.topBrandRow,
          { paddingTop: Math.max(insets.top + 8, 22) },
        ]}
      >
        <HealthFreakLogo
          size={28}
          showWordmark={true}
          orientation="horizontal"
          wordmarkSize="sm"
        />
      </View>

      {/* Main Swipeable 5-Slide Carousel */}
      <Animated.View style={[{ flex: 1 }, animatedContent]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onScrollBeginDrag={() => {
            if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current);
          }}
          onScrollEndDrag={resetAutoAdvance}
          scrollEventThrottle={16}
          style={styles.carouselScrollView}
          contentContainerStyle={styles.carouselContentContainer}
        >
          {/* ==================== SLIDE 1: AI Health Partner ==================== */}
          <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
            <View style={styles.slideHeader}>
              <Text style={styles.slideHeadline}>
                {'Your AI Health\nCoach — '}
                <Text style={styles.greenHighlight}>Always With You.</Text>
              </Text>
              <Text style={styles.slideSubtitle}>
                24/7 personalized voice & chat guidance tailored to your biology.
              </Text>
            </View>

            {/* Showcase Card: AI Coach Disha */}
            <View style={styles.showcaseCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardBadgePill}>
                  <Sparkles size={11} color="#52C480" style={{ marginRight: 5 }} />
                  <Text style={styles.cardBadgeText}>AI HEALTH PARTNER</Text>
                </View>
                <View style={styles.livePulseRow}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.liveText}>Live • 24/7 Active</Text>
                </View>
              </View>

              <View style={styles.coachProfileRow}>
                <View style={styles.coachAvatarCircle}>
                  <Sparkles size={20} color="#52C480" />
                </View>
                <View style={styles.coachInfoCol}>
                  <Text style={styles.coachNameText}>Disha AI Coach</Text>
                  <Text style={styles.coachMetaText}>Adaptive Biometric Companion</Text>
                </View>
              </View>

              <View style={styles.chatBubble}>
                <Text style={styles.chatBubbleText}>
                  &ldquo;Good morning Alex! I&apos;ve calibrated your daily macros and programmed a targeted hypertrophy session for today. Ready to crush it?&rdquo;
                </Text>
              </View>

              <View style={styles.cardFooterStrip}>
                <View style={styles.featureChip}>
                  <Mic size={11} color="#52C480" style={{ marginRight: 4 }} />
                  <Text style={styles.featureChipText}>LiveKit Voice Calls</Text>
                </View>
                <View style={styles.featureChip}>
                  <Activity size={11} color="#52C480" style={{ marginRight: 4 }} />
                  <Text style={styles.featureChipText}>Real-Time Recalibration</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ==================== SLIDE 2: Workouts ==================== */}
          <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
            <View style={styles.slideHeader}>
              <Text style={styles.slideHeadline}>
                {'Train. Eat.\nTrack. '}
                <Text style={styles.greenHighlight}>Repeat.</Text>
              </Text>
              <Text style={styles.slideSubtitle}>
                Tailored hypertrophy routines & adaptive progressive overload.
              </Text>
            </View>

            {/* Showcase Card: Precision Workout */}
            <View style={styles.showcaseCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardBadgePill}>
                  <Dumbbell size={11} color="#52C480" style={{ marginRight: 5 }} />
                  <Text style={styles.cardBadgeText}>TAILORED ROUTINE</Text>
                </View>
                <Text style={styles.timeTagText}>07:30 AM</Text>
              </View>

              <Text style={styles.workoutCardTitle}>Hypertrophy Push & Overhead Press</Text>
              <View style={styles.workoutMetaRow}>
                <View style={styles.metaChip}>
                  <Clock size={11} color="#52C480" style={{ marginRight: 4 }} />
                  <Text style={styles.metaChipText}>45 min</Text>
                </View>
                <View style={styles.metaChip}>
                  <Flame size={11} color="#FF715F" style={{ marginRight: 4 }} />
                  <Text style={styles.metaChipText}>280 kcal</Text>
                </View>
                <View style={styles.metaChip}>
                  <Zap size={11} color="#EAD66F" style={{ marginRight: 4 }} />
                  <Text style={styles.metaChipText}>Progressive Overload</Text>
                </View>
              </View>

              <View style={styles.exerciseList}>
                <View style={styles.exerciseItem}>
                  <View style={styles.checkCircleActive}>
                    <Check size={10} color="#FFFFFF" />
                  </View>
                  <Text style={styles.exerciseNameText}>Incline Dumbbell Bench Press</Text>
                  <Text style={styles.exerciseSetsText}>3 × 10</Text>
                </View>
                <View style={styles.exerciseItem}>
                  <View style={styles.checkCircleActive}>
                    <Check size={10} color="#FFFFFF" />
                  </View>
                  <Text style={styles.exerciseNameText}>Standing Barbell Overhead Press</Text>
                  <Text style={styles.exerciseSetsText}>3 × 8</Text>
                </View>
                <View style={styles.exerciseItem}>
                  <View style={styles.checkCircleActive}>
                    <Check size={10} color="#FFFFFF" />
                  </View>
                  <Text style={styles.exerciseNameText}>Cable Lateral Raises</Text>
                  <Text style={styles.exerciseSetsText}>4 × 12</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ==================== SLIDE 3: Nutrition Scanner ==================== */}
          <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
            <View style={styles.slideHeader}>
              <Text style={styles.slideHeadline}>
                {'Know Your Food.\n'}
                <Text style={styles.greenHighlight}>Eat Smarter.</Text>
              </Text>
              <Text style={styles.slideSubtitle}>
                Instant meal photo scanning with clinical macro & protein analysis.
              </Text>
            </View>

            {/* Showcase Card: AI Meal Scanner */}
            <View style={styles.showcaseCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardBadgePill}>
                  <Camera size={11} color="#52C480" style={{ marginRight: 5 }} />
                  <Text style={styles.cardBadgeText}>AI MEAL SCANNER</Text>
                </View>
                <View style={styles.accuracyPill}>
                  <Text style={styles.accuracyText}>98% Match</Text>
                </View>
              </View>

              <View style={styles.scannerRow}>
                <View style={styles.miniReticleFrame}>
                  <View style={[styles.miniReticleCorner, styles.mTL]} />
                  <View style={[styles.miniReticleCorner, styles.mTR]} />
                  <View style={[styles.miniReticleCorner, styles.mBL]} />
                  <View style={[styles.miniReticleCorner, styles.mBR]} />
                  <Utensils size={22} color="#52C480" />
                </View>
                <View style={styles.scannedFoodInfo}>
                  <Text style={styles.scannedFoodTitle}>Sprouted Moong & Paneer Bowl</Text>
                  <Text style={styles.scannedFoodSub}>High Protein • Clean Surplus</Text>
                  <View style={styles.verifiedRow}>
                    <ShieldCheck size={11} color="#52C480" style={{ marginRight: 4 }} />
                    <Text style={styles.verifiedText}>IFCT 2024 Verified Database</Text>
                  </View>
                </View>
              </View>

              <View style={styles.macroPillsRow}>
                <View style={styles.macroPill}>
                  <Text style={styles.macroPillVal}>480</Text>
                  <Text style={styles.macroPillLbl}>kcal</Text>
                </View>
                <View style={[styles.macroPill, { borderColor: 'rgba(255, 113, 95, 0.4)' }]}>
                  <Text style={[styles.macroPillVal, { color: '#FF715F' }]}>34g</Text>
                  <Text style={styles.macroPillLbl}>Protein</Text>
                </View>
                <View style={[styles.macroPill, { borderColor: 'rgba(234, 214, 111, 0.4)' }]}>
                  <Text style={[styles.macroPillVal, { color: '#EAD66F' }]}>42g</Text>
                  <Text style={styles.macroPillLbl}>Carbs</Text>
                </View>
                <View style={[styles.macroPill, { borderColor: 'rgba(160, 201, 168, 0.4)' }]}>
                  <Text style={[styles.macroPillVal, { color: '#A0C9A8' }]}>14g</Text>
                  <Text style={styles.macroPillLbl}>Fats</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ==================== SLIDE 4: Pedometer ==================== */}
          <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
            <View style={styles.slideHeader}>
              <Text style={styles.slideHeadline}>
                {'Real-Time Steps &\n'}
                <Text style={styles.greenHighlight}>Movement Pulse.</Text>
              </Text>
              <Text style={styles.slideSubtitle}>
                Hardware sensor tracking for daily steps, active burn & distance.
              </Text>
            </View>

            {/* Showcase Card: Daily Pedometer */}
            <View style={styles.showcaseCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardBadgePill}>
                  <Footprints size={11} color="#52C480" style={{ marginRight: 5 }} />
                  <Text style={styles.cardBadgeText}>HARDWARE PEDOMETER</Text>
                </View>
                <View style={styles.liveSensorPill}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.liveSensorText}>Sensor Active</Text>
                </View>
              </View>

              <View style={styles.stepStatsRow}>
                <View>
                  <Text style={styles.stepBigNumber}>8,450</Text>
                  <Text style={styles.stepTargetText}>/ 10,000 daily goal (85%)</Text>
                </View>
                <View style={styles.goalPillBadge}>
                  <TrendingUp size={13} color="#52C480" style={{ marginRight: 4 }} />
                  <Text style={styles.goalPillText}>+1.2k vs avg</Text>
                </View>
              </View>

              <View style={styles.stepProgressTrack}>
                <View style={[styles.stepProgressBar, { width: '85%' }]} />
              </View>

              <View style={styles.subMetricsRow}>
                <View style={styles.subMetricItem}>
                  <Text style={styles.subMetricVal}>6.2 km</Text>
                  <Text style={styles.subMetricLbl}>Distance</Text>
                </View>
                <View style={styles.subMetricDivider} />
                <View style={styles.subMetricItem}>
                  <Text style={styles.subMetricVal}>340 kcal</Text>
                  <Text style={styles.subMetricLbl}>Active Energy</Text>
                </View>
                <View style={styles.subMetricDivider} />
                <View style={styles.subMetricItem}>
                  <Text style={styles.subMetricVal}>68 min</Text>
                  <Text style={styles.subMetricLbl}>Movement</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ==================== SLIDE 5: Habits & Streaks ==================== */}
          <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
            <View style={styles.slideHeader}>
              <Text style={styles.slideHeadline}>
                {'Build Healthier\nHabits '}
                <Text style={styles.greenHighlight}>that Stick.</Text>
              </Text>
              <Text style={styles.slideSubtitle}>
                Daily streaks, circadian sleep logging & metabolic consistency.
              </Text>
            </View>

            {/* Showcase Card: Consistency & Streaks */}
            <View style={styles.showcaseCard}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardBadgePill, { backgroundColor: 'rgba(255, 113, 95, 0.15)', borderColor: 'rgba(255, 113, 95, 0.3)' }]}>
                  <Flame size={11} color="#FF715F" style={{ marginRight: 5 }} />
                  <Text style={[styles.cardBadgeText, { color: '#FF715F' }]}>HABIT CONSISTENCY</Text>
                </View>
                <View style={styles.scorePill}>
                  <Text style={styles.scorePillText}>92% Score</Text>
                </View>
              </View>

              <View style={styles.streakHeroRow}>
                <View style={styles.streakFlameCircle}>
                  <Flame size={24} color="#FF715F" />
                </View>
                <View style={styles.streakTextCol}>
                  <Text style={styles.streakNumberHeadline}>12-Day Active Streak</Text>
                  <Text style={styles.streakSubNote}>All daily routines completed consecutively</Text>
                </View>
              </View>

              <View style={styles.biometricPairRow}>
                <View style={styles.biometricBox}>
                  <View style={styles.biometricBoxHeader}>
                    <Moon size={12} color="#EAD66F" style={{ marginRight: 5 }} />
                    <Text style={styles.biometricBoxTitle}>Circadian Sleep</Text>
                  </View>
                  <Text style={styles.biometricBoxValue}>7h 45m</Text>
                  <Text style={styles.biometricBoxSub}>88% Recovery Score</Text>
                </View>

                <View style={styles.biometricBox}>
                  <View style={styles.biometricBoxHeader}>
                    <Droplet size={12} color="#4FA3E2" style={{ marginRight: 5 }} />
                    <Text style={styles.biometricBoxTitle}>Hydration</Text>
                  </View>
                  <Text style={styles.biometricBoxValue}>3.2 L</Text>
                  <Text style={styles.biometricBoxSub}>Daily Target Met</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Bottom Controls: Pagination Dots + Google Sign-In Pill + Guest Mode */}
      <View
        style={[
          styles.bottomControlsArea,
          { paddingBottom: Math.max(insets.bottom + 14, 24) },
        ]}
      >
        {/* Error banner if authentication encounters an issue */}
        {error && (
          <View style={styles.errorToast}>
            <AlertCircle size={15} color="#FF6B6B" style={{ marginRight: 8 }} />
            <Text style={styles.errorToastText}>{error}</Text>
            <Pressable onPress={clearError} hitSlop={10}>
              <X size={15} color="#FF6B6B" />
            </Pressable>
          </View>
        )}

        {/* 5 Pagination Dots */}
        <View style={styles.paginationRow}>
          {[0, 1, 2, 3, 4].map((idx) => {
            const isActive = activeIndex === idx;
            return (
              <Pressable
                key={idx}
                onPress={() => scrollToSlide(idx)}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
                hitSlop={10}
              />
            );
          })}
        </View>

        {/* Primary White Button: Continue with Google (exact match to screenshot) */}
        <GoogleSignInButton
          onPress={signInWithGoogle}
          isLoading={isAuthenticating}
          disabled={isAuthenticating || isEntering}
          variant="light"
        />

        {/* Clean, Subtle 1-Tap Guest Demo Link */}
        <Pressable
          onPress={handleEnterApp}
          disabled={isEntering || isAuthenticating}
          style={({ pressed }) => [
            styles.guestLinkBtn,
            pressed && styles.guestLinkBtnPressed,
          ]}
          hitSlop={10}
        >
          <Sparkles size={13} color="#52C480" style={{ marginRight: 6 }} />
          <Text style={styles.guestLinkText}>Instant Demo Access (Explore as Guest)</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#090D0A',
    position: 'relative',
  },
  ambientTopGlow: {
    position: 'absolute',
    top: -80,
    left: '10%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(56, 125, 80, 0.12)',
    pointerEvents: 'none',
  },
  ambientCenterGlow: {
    position: 'absolute',
    top: '32%',
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(82, 196, 128, 0.08)',
    pointerEvents: 'none',
  },
  portalWave: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    width: 300,
    height: 300,
    marginLeft: -150,
    marginTop: -150,
    borderRadius: 150,
    backgroundColor: 'rgba(82, 196, 128, 0.28)',
    zIndex: 9999,
  },
  enteringOverlay: {
    position: 'absolute',
    top: '38%',
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 10000,
  },
  enteringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(82, 196, 128, 0.16)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(82, 196, 128, 0.35)',
  },
  enteringBadgeText: {
    color: '#52C480',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 1.2,
    marginLeft: 6,
  },
  enteringTitle: {
    fontSize: 28,
    fontFamily: Typography.fontFamilies.serif,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  enteringSub: {
    fontSize: 14,
    fontFamily: Typography.fontFamilies.sansMedium,
    color: '#9EAF9F',
    textAlign: 'center',
  },

  // Top Fixed Header
  topBrandRow: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Carousel
  carouselScrollView: {
    flex: 1,
  },
  carouselContentContainer: {
    flexGrow: 1,
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 10,
  },
  slideHeader: {
    paddingTop: 4,
    paddingBottom: 6,
  },
  slideHeadline: {
    fontSize: 28,
    fontFamily: Typography.fontFamilies.sansBold,
    color: '#FFFFFF',
    letterSpacing: -0.6,
    lineHeight: 34,
    marginBottom: 4,
  },
  greenHighlight: {
    color: '#52C480',
  },
  slideSubtitle: {
    fontSize: Typography.fontSizes.xs + 1.5,
    fontFamily: Typography.fontFamilies.sansMedium,
    color: '#8E9F91',
    lineHeight: 18,
  },

  // Premium Showcase Card Container (fills the center void beautifully)
  showcaseCard: {
    backgroundColor: '#121814',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#223226',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
    marginVertical: 6,
    width: '100%',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(82, 196, 128, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(82, 196, 128, 0.28)',
  },
  cardBadgeText: {
    color: '#52C480',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.8,
  },
  livePulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#52C480',
    marginRight: 6,
  },
  liveText: {
    color: '#8E9F91',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },

  // Slide 1 (AI Coach) Sub-elements
  coachProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  coachAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(82, 196, 128, 0.16)',
    borderWidth: 1.2,
    borderColor: '#52C480',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coachInfoCol: {
    flex: 1,
  },
  coachNameText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  coachMetaText: {
    color: '#8E9F91',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 2,
  },
  chatBubble: {
    backgroundColor: '#18221B',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#243628',
    marginBottom: 12,
  },
  chatBubbleText: {
    color: '#D4E2D7',
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: Typography.fontFamilies.sansRegular,
    fontStyle: 'italic',
  },
  cardFooterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#19251D',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#283B2E',
  },
  featureChipText: {
    color: '#A0B4A4',
    fontSize: 10.5,
    fontFamily: Typography.fontFamilies.sansMedium,
  },

  // Slide 2 (Workouts) Sub-elements
  timeTagText: {
    color: '#8E9F91',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  workoutCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Typography.fontFamilies.sansBold,
    marginBottom: 8,
  },
  workoutMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#19251D',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  metaChipText: {
    color: '#D4E2D7',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  exerciseList: {
    gap: 7,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18221B',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#243628',
  },
  checkCircleActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#52C480',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  exerciseNameText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  exerciseSetsText: {
    color: '#8E9F91',
    fontSize: 11.5,
    fontFamily: Typography.fontFamilies.sansBold,
  },

  // Slide 3 (AI Food Scanner) Sub-elements
  accuracyPill: {
    backgroundColor: 'rgba(82, 196, 128, 0.16)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  accuracyText: {
    color: '#52C480',
    fontSize: 10.5,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  scannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  miniReticleFrame: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#18241D',
    borderWidth: 1,
    borderColor: '#263A2C',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 14,
  },
  miniReticleCorner: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderColor: '#52C480',
  },
  mTL: {
    top: 3,
    left: 3,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 3,
  },
  mTR: {
    top: 3,
    right: 3,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 3,
  },
  mBL: {
    bottom: 3,
    left: 3,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 3,
  },
  mBR: {
    bottom: 3,
    right: 3,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 3,
  },
  scannedFoodInfo: {
    flex: 1,
  },
  scannedFoodTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.fontFamilies.sansBold,
    marginBottom: 2,
  },
  scannedFoodSub: {
    color: '#8E9F91',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginBottom: 4,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    color: '#52C480',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  macroPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroPill: {
    flex: 1,
    backgroundColor: '#18221B',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#263A2C',
  },
  macroPillVal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  macroPillLbl: {
    color: '#8E9F91',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 2,
  },

  // Slide 4 (Pedometer) Sub-elements
  liveSensorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(82, 196, 128, 0.14)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  liveSensorText: {
    color: '#52C480',
    fontSize: 10.5,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  stepStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  stepBigNumber: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: Typography.fontFamilies.sansBold,
    lineHeight: 36,
  },
  stepTargetText: {
    color: '#8E9F91',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 2,
  },
  goalPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#19261E',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#293E30',
  },
  goalPillText: {
    color: '#52C480',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  stepProgressTrack: {
    height: 8,
    backgroundColor: '#19261E',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  stepProgressBar: {
    height: '100%',
    backgroundColor: '#52C480',
    borderRadius: 4,
  },
  subMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18221B',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#243628',
  },
  subMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  subMetricVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  subMetricLbl: {
    color: '#8E9F91',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 2,
  },
  subMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#263A2C',
  },

  // Slide 5 (Habits & Streaks) Sub-elements
  scorePill: {
    backgroundColor: 'rgba(255, 113, 95, 0.16)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  scorePillText: {
    color: '#FF715F',
    fontSize: 10.5,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  streakHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A231C',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2B3B2E',
    marginBottom: 12,
  },
  streakFlameCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 113, 95, 0.16)',
    borderWidth: 1.2,
    borderColor: '#FF715F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  streakTextCol: {
    flex: 1,
  },
  streakNumberHeadline: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  streakSubNote: {
    color: '#8E9F91',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 2,
  },
  biometricPairRow: {
    flexDirection: 'row',
    gap: 8,
  },
  biometricBox: {
    flex: 1,
    backgroundColor: '#18221B',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#243628',
  },
  biometricBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  biometricBoxTitle: {
    color: '#A0B4A4',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  biometricBoxValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Typography.fontFamilies.sansBold,
    marginBottom: 2,
  },
  biometricBoxSub: {
    color: '#6F8574',
    fontSize: 9.5,
    fontFamily: Typography.fontFamilies.sansMedium,
  },

  // Bottom Controls
  bottomControlsArea: {
    paddingHorizontal: 26,
    alignItems: 'center',
  },
  errorToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    marginBottom: 14,
    width: '100%',
  },
  errorToastText: {
    flex: 1,
    color: '#FF6B6B',
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 18,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#52C480',
    shadowColor: '#52C480',
    shadowOpacity: 0.45,
    shadowRadius: 6,
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#1E2C22',
  },
  guestLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 6,
  },
  guestLinkBtnPressed: {
    opacity: 0.7,
  },
  guestLinkText: {
    color: '#8A9D8D',
    fontSize: Typography.fontSizes.xs + 0.5,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
});
