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
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
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
  Calendar,
  Sparkles,
  AlertCircle,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../state/AuthContext';
import { Typography } from '../../theme/typography';
import { HealthFreakLogo } from '../../components/common/HealthFreakLogo';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MASCOT_IMG = require('../../../assets/logo/HealthFreakLogoTransparent.png');
const TRAINER_IMG = require('../../../assets/images/trainer_hero.jpg');

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

  // Mascot subtle floating animation for Slide 1
  const mascotBobY = useSharedValue(0);

  // App Entrance Transition (radiant portal burst on exit)
  const portalScale = useSharedValue(0.3);
  const portalOpacity = useSharedValue(0);
  const exitScale = useSharedValue(1);
  const exitOpacity = useSharedValue(1);
  const entranceTextOpacity = useSharedValue(0);
  const entranceTextScale = useSharedValue(0.92);

  // 1. Initial mount animation & mascot breathing bob
  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.ease) });
    contentTranslateY.value = withSpring(0, { damping: 16, stiffness: 95 });

    mascotBobY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

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

  const animatedMascot = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotBobY.value }],
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
        >
          {/* ==================== SLIDE 1 ==================== */}
          {/* Your AI Health Coach — Always With You. */}
          <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
            <View style={styles.slideTextTop}>
              <Text style={styles.slideHeadline}>
                {'Your\nAI Health\nCoach —\n'}
                <Text style={styles.greenHighlight}>Always With You.</Text>
              </Text>
              <Text style={styles.slideSubtitle}>
                {'Workouts • Nutrition • Habits • Insights\nAll Personalized For You.'}
              </Text>
            </View>

            {/* Visual: HealthFreak mascot lifting dumbbells on curved hill */}
            <View style={styles.mascotVisualArea}>
              <Animated.View style={[styles.mascotWrapper, animatedMascot]}>
                <Image
                  source={MASCOT_IMG}
                  style={styles.mascotImage}
                  contentFit="contain"
                />
              </Animated.View>
              {/* Soft curved pedestal / hill */}
              <View style={styles.curvedPedestal} />
            </View>
          </View>

          {/* ==================== SLIDE 2 ==================== */}
          {/* Train. Eat. Track. Repeat. */}
          <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
            {/* 3 Staggered Floating Feature Cards */}
            <View style={styles.cardsVisualArea}>
              {/* Card 1: Workout */}
              <View style={[styles.floatingCard, styles.floatingCardDark]}>
                <View style={styles.cardIconCircleDark}>
                  <Dumbbell size={18} color="#52C480" />
                </View>
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTitleLight}>Workout</Text>
                  <Text style={styles.cardSubtitleLight}>Get stronger</Text>
                </View>
              </View>

              {/* Card 2: Nutrition (Vibrant Highlight Card) */}
              <View style={[styles.floatingCard, styles.floatingCardActive]}>
                <View style={styles.cardIconCircleActive}>
                  <Utensils size={18} color="#0D1A11" />
                </View>
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTitleDark}>Nutrition</Text>
                  <Text style={styles.cardSubtitleDark}>Eat better</Text>
                </View>
              </View>

              {/* Card 3: Progress */}
              <View style={[styles.floatingCard, styles.floatingCardDark]}>
                <View style={styles.cardIconCircleDark}>
                  <TrendingUp size={18} color="#52C480" />
                </View>
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTitleLight}>Progress</Text>
                  <Text style={styles.cardSubtitleLight}>Track & improve</Text>
                </View>
              </View>
            </View>

            <View style={styles.slideTextBottom}>
              <Text style={styles.slideHeadline}>
                {'Train. Eat.\nTrack. '}
                <Text style={styles.greenHighlight}>Repeat.</Text>
              </Text>
              <Text style={styles.slideSubtitle}>
                Everything you need for a healthier, fitter you.
              </Text>
            </View>
          </View>

          {/* ==================== SLIDE 3 ==================== */}
          {/* Smarter Fitness with AI. */}
          <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
            {/* Visual: Athletic Trainer with floating metric pills */}
            <View style={styles.trainerVisualArea}>
              <View style={styles.trainerFrame}>
                <Image
                  source={TRAINER_IMG}
                  style={styles.trainerImage}
                  contentFit="cover"
                />
                <View style={styles.trainerImageFade} />
              </View>

              {/* Floating Pill: 45 min */}
              <View style={styles.floatingPillLeft}>
                <Clock size={14} color="#52C480" style={{ marginRight: 6 }} />
                <Text style={styles.floatingPillText}>45 min</Text>
              </View>

              {/* Floating Pill: 540 kcal */}
              <View style={styles.floatingPillRight}>
                <Activity size={14} color="#52C480" style={{ marginRight: 6 }} />
                <Text style={styles.floatingPillText}>540 kcal</Text>
              </View>
            </View>

            <View style={styles.slideTextBottom}>
              <Text style={styles.slideHeadline}>
                {'Smarter Fitness\n'}
                <Text style={styles.greenHighlight}>with AI.</Text>
              </Text>
              <Text style={styles.slideSubtitle}>
                Personalized workouts, meal plans and real progress tracking.
              </Text>
            </View>
          </View>

          {/* ==================== SLIDE 4 ==================== */}
          {/* Know Your Food. Eat Smarter. */}
          <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
            {/* Visual: Viewfinder reticle brackets with fresh salad plate */}
            <View style={styles.foodVisualArea}>
              {/* Scan Meal Floating Badge */}
              <View style={styles.scanMealBadge}>
                <Camera size={14} color="#52C480" style={{ marginRight: 8 }} />
                <View>
                  <Text style={styles.scanMealTitle}>Scan Meal</Text>
                  <Text style={styles.scanMealSub}>Get instant insights</Text>
                </View>
              </View>

              {/* Camera reticle brackets */}
              <View style={styles.reticleFrame}>
                <View style={[styles.reticleCorner, styles.reticleTL]} />
                <View style={[styles.reticleCorner, styles.reticleTR]} />
                <View style={[styles.reticleCorner, styles.reticleBL]} />
                <View style={[styles.reticleCorner, styles.reticleBR]} />

                {/* Stylized healthy bowl plate inside reticle */}
                <View style={styles.foodPlateCircle}>
                  <View style={styles.foodPlateInner}>
                    <View style={styles.foodGarnishRow}>
                      <View style={[styles.foodMorsel, { backgroundColor: '#478A58' }]} />
                      <View style={[styles.foodMorsel, { backgroundColor: '#D47E3B', width: 34 }]} />
                      <View style={[styles.foodMorsel, { backgroundColor: '#C94A4A' }]} />
                    </View>
                    <View style={styles.foodGarnishRow}>
                      <View style={[styles.foodMorsel, { backgroundColor: '#D9B55D', width: 44 }]} />
                      <View style={[styles.foodMorsel, { backgroundColor: '#3A7047', width: 28 }]} />
                    </View>
                    <View style={styles.foodGarnishRow}>
                      <View style={[styles.foodMorsel, { backgroundColor: '#C94A4A', width: 20 }]} />
                      <View style={[styles.foodMorsel, { backgroundColor: '#D47E3B', width: 38 }]} />
                    </View>
                  </View>
                  <Text style={styles.foodPlateLabel}>🥗 Fresh Protein Bowl</Text>
                </View>
              </View>
            </View>

            <View style={styles.slideTextBottom}>
              <Text style={styles.slideHeadline}>
                {'Know Your Food.\n'}
                <Text style={styles.greenHighlight}>Eat Smarter.</Text>
              </Text>
              <Text style={styles.slideSubtitle}>
                Scan your meals and get instant nutrition analysis with AI.
              </Text>
            </View>
          </View>

          {/* ==================== SLIDE 5 ==================== */}
          {/* Build Healthier Habits that Stick. */}
          <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
            {/* Visual: Glowing 3D Progress Bar Chart */}
            <View style={styles.chartVisualArea}>
              {/* Floating Streak Pill */}
              <View style={styles.streakBadge}>
                <Calendar size={15} color="#52C480" style={{ marginRight: 8 }} />
                <View>
                  <Text style={styles.streakNumber}>12</Text>
                  <Text style={styles.streakLabel}>Day Streak</Text>
                </View>
              </View>

              {/* Glowing progressive green vertical bars */}
              <View style={styles.barsRow}>
                <View style={[styles.barCol, { height: 26, backgroundColor: '#183323' }]} />
                <View style={[styles.barCol, { height: 46, backgroundColor: '#214630' }]} />
                <View style={[styles.barCol, { height: 68, backgroundColor: '#2A5C3E' }]} />
                <View style={[styles.barCol, { height: 96, backgroundColor: '#377850' }]} />
                <View style={[styles.barCol, styles.barColPeak]} />
              </View>
            </View>

            <View style={styles.slideTextBottom}>
              <Text style={styles.slideHeadline}>
                {'Build Healthier\nHabits '}
                <Text style={styles.greenHighlight}>that Stick.</Text>
              </Text>
              <Text style={styles.slideSubtitle}>
                Stay consistent, earn streaks and see real results.
              </Text>
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
  slideContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingTop: 8,
    paddingBottom: 16,
  },

  // Typography for Headlines & Subtitles
  slideTextTop: {
    marginTop: 8,
  },
  slideTextBottom: {
    marginBottom: 8,
  },
  slideHeadline: {
    fontSize: 34,
    fontFamily: Typography.fontFamilies.sansBold,
    color: '#FFFFFF',
    letterSpacing: -0.6,
    lineHeight: 40,
    marginBottom: 10,
  },
  greenHighlight: {
    color: '#52C480',
  },
  slideSubtitle: {
    fontSize: Typography.fontSizes.sm + 0.5,
    fontFamily: Typography.fontFamilies.sansMedium,
    color: '#8A9C8D',
    lineHeight: 20,
  },

  // Slide 1 Visuals: Mascot on Hill
  mascotVisualArea: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    marginBottom: 12,
  },
  mascotWrapper: {
    zIndex: 2,
    marginBottom: -16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotImage: {
    width: 148,
    height: 148,
  },
  curvedPedestal: {
    width: 250,
    height: 90,
    borderTopLeftRadius: 125,
    borderTopRightRadius: 125,
    backgroundColor: '#163321',
    borderWidth: 1.2,
    borderColor: '#265437',
    borderBottomWidth: 0,
    zIndex: 1,
  },

  // Slide 2 Visuals: Stacked Cards
  cardsVisualArea: {
    height: 230,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  floatingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  floatingCardDark: {
    width: 250,
    height: 56,
    backgroundColor: '#142017',
    borderWidth: 1.2,
    borderColor: '#223527',
  },
  floatingCardActive: {
    width: 275,
    height: 62,
    backgroundColor: '#52C480',
    borderWidth: 1.2,
    borderColor: '#6FE09C',
    shadowColor: '#52C480',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  cardIconCircleDark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1C2E22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardIconCircleActive: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#38A763',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardTextCol: {
    flex: 1,
  },
  cardTitleLight: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  cardSubtitleLight: {
    color: '#7D9684',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 1,
  },
  cardTitleDark: {
    color: '#0B180F',
    fontSize: 15,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  cardSubtitleDark: {
    color: '#15331E',
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    marginTop: 1,
  },

  // Slide 3 Visuals: Trainer Hero
  trainerVisualArea: {
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 10,
  },
  trainerFrame: {
    width: 175,
    height: 195,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#233928',
    backgroundColor: '#131B15',
  },
  trainerImage: {
    width: '100%',
    height: '100%',
  },
  trainerImageFade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(9, 13, 10, 0.15)',
  },
  floatingPillLeft: {
    position: 'absolute',
    bottom: 6,
    left: 28,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 26, 20, 0.94)',
    borderWidth: 1.2,
    borderColor: '#2A4331',
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingPillRight: {
    position: 'absolute',
    top: 36,
    right: 28,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 26, 20, 0.94)',
    borderWidth: 1.2,
    borderColor: '#2A4331',
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansBold,
  },

  // Slide 4 Visuals: Reticle & Bowl
  foodVisualArea: {
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  scanMealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 29, 22, 0.95)',
    borderWidth: 1.2,
    borderColor: '#2A4331',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  scanMealTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  scanMealSub: {
    color: '#849E8A',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  reticleFrame: {
    width: 165,
    height: 165,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  reticleCorner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#52C480',
  },
  reticleTL: {
    top: 0,
    left: 0,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderTopLeftRadius: 6,
  },
  reticleTR: {
    top: 0,
    right: 0,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderTopRightRadius: 6,
  },
  reticleBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderBottomLeftRadius: 6,
  },
  reticleBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomRightRadius: 6,
  },
  foodPlateCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#162319',
    borderWidth: 2,
    borderColor: '#263C2B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodPlateInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#203225',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  foodGarnishRow: {
    flexDirection: 'row',
    gap: 4,
  },
  foodMorsel: {
    width: 24,
    height: 10,
    borderRadius: 5,
  },
  foodPlateLabel: {
    position: 'absolute',
    bottom: 8,
    color: '#B9CCBD',
    fontSize: 9,
    fontFamily: Typography.fontFamilies.sansBold,
  },

  // Slide 5 Visuals: Glowing Bar Chart
  chartVisualArea: {
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 29, 22, 0.95)',
    borderWidth: 1.2,
    borderColor: '#2A4331',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 16,
    alignSelf: 'center',
  },
  streakNumber: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  streakLabel: {
    color: '#849E8A',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  barsRow: {
    height: 130,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  barCol: {
    width: 24,
    borderRadius: 12,
  },
  barColPeak: {
    height: 124,
    backgroundColor: '#52C480',
    shadowColor: '#52C480',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
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
