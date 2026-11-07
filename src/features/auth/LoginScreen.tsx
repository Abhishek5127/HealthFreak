import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import {
  ArrowRight,
  AlertCircle,
  X,
  Flame,
  Apple,
  Sparkles,
  ChevronsUpDown,
} from 'lucide-react-native';
import { useAuth } from '../../state/AuthContext';
import { Typography } from '../../theme/typography';
import { GoogleLogo } from '../../components/illustrations/GoogleLogo';
import {
  IOSControlCenterGlassButton,
  IOSGlassVariant,
} from '../../components/common/IOSControlCenterGlassButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUTTON_WIDTH = Math.min(SCREEN_WIDTH - 44, 380);

// 3 Ordered Wallpaper Artworks (Zero text on photos)
const SLIDES = [
  {
    id: 'fitness',
    image: require('../../../assets/loginUiImages/HealthFreak Fitness Doodle Wallpaper.png'),
    subtitle: 'Touch grass, Track macros!',
    variant: 'frostedDark' as IOSGlassVariant,
  },
  {
    id: 'nutrition',
    image: require('../../../assets/loginUiImages/HealthFreak Nutrition Doodle Collage.png'),
    subtitle: 'We scan. You snack!',
    variant: 'frostedOlive' as IOSGlassVariant,
  },
  {
    id: 'call',
    image: require('../../../assets/loginUiImages/Neon HealthFreak Call Doodle Wallpaper.png'),
    subtitle: 'Your health, Her headache!',
    variant: 'frostedCoral' as IOSGlassVariant,
  },
];

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { authState, error, signInWithGoogle, clearError } = useAuth();
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isTransformedToGoogle, setIsTransformedToGoogle] = useState<boolean>(false);
  const [isWaveRunning, setIsWaveRunning] = useState<boolean>(false);
  const isAuthenticating = authState === 'authenticating';

  const scrollRef = useRef<any>(null);

  // --- REANIMATED VALUES ---
  const screenOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  // Liquid Wave Animation Shared Values
  const waveProgress = useSharedValue(0);
  const waveOpacity = useSharedValue(0);
  const waveRippleScale = useSharedValue(0.1);
  const waveRippleOpacity = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    contentTranslateY.value = withSpring(0, { damping: 16, stiffness: 95 });
  }, [contentTranslateY, screenOpacity]);

  // Scroll Position Shared Value for 60fps/120fps UI-thread synchronization
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollX.value = event.contentOffset.x;
    },
  });

  // Handle Carousel Page Scroll (called continuously during drag and on momentum)
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index >= 0 && index < SLIDES.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const goToSlide = (index: number) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setActiveIndex(index);
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  // Trigger Liquid Wave Transformation on Slide 3
  const triggerWaveAnimation = () => {
    if (isWaveRunning || isTransformedToGoogle) return;

    setIsWaveRunning(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    // 1. Wave translation & opacity
    waveOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(450, withTiming(0, { duration: 250 }))
    );
    waveProgress.value = withTiming(1, {
      duration: 720,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

    // 2. Circular liquid ripple expanding across button
    waveRippleOpacity.value = withSequence(
      withTiming(0.85, { duration: 100 }),
      withTiming(0, { duration: 450, easing: Easing.out(Easing.ease) })
    );
    waveRippleScale.value = withTiming(3.2, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });

    // Finalize state on wave completion
    setTimeout(() => {
      setIsTransformedToGoogle(true);
      setIsWaveRunning(false);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }, 620);
  };

  // Primary Glass Button Tap Action
  const handleButtonPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (activeIndex === 0) {
      // Advance from Slide 1 to Slide 2
      setActiveIndex(1);
      scrollRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: true });
    } else if (activeIndex === 1) {
      // Advance from Slide 2 to Slide 3
      setActiveIndex(2);
      scrollRef.current?.scrollTo({ x: 2 * SCREEN_WIDTH, animated: true });
    } else if (activeIndex === 2) {
      if (!isTransformedToGoogle) {
        // Trigger wave transformation to Google sign-in
        triggerWaveAnimation();
      } else {
        // Execute Google Sign-In
        signInWithGoogle();
      }
    }
  };

  // Animated Styles
  const animatedRoot = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const animatedWaveOverlay = useAnimatedStyle(() => {
    const translateX = interpolate(
      waveProgress.value,
      [0, 1],
      [-BUTTON_WIDTH, BUTTON_WIDTH * 1.3]
    );
    return {
      opacity: waveOpacity.value,
      transform: [{ translateX }],
    };
  });

  const animatedWaveRipple = useAnimatedStyle(() => ({
    opacity: waveRippleOpacity.value,
    transform: [{ scale: waveRippleScale.value }],
  }));

  // UI-Thread Smooth Cross-Fade Button Styles (60fps/120fps hardware animated on Android & iOS)
  const slide0AnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      [0, SCREEN_WIDTH * 0.65],
      [1, 0],
      'clamp'
    );
    const translateY = interpolate(
      scrollX.value,
      [0, SCREEN_WIDTH * 0.65],
      [0, -8],
      'clamp'
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const slide1AnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      [0, SCREEN_WIDTH * 0.65, SCREEN_WIDTH, SCREEN_WIDTH * 1.35, 2 * SCREEN_WIDTH],
      [0, 0, 1, 0, 0],
      'clamp'
    );
    const translateY = interpolate(
      scrollX.value,
      [0, SCREEN_WIDTH, 2 * SCREEN_WIDTH],
      [8, 0, -8],
      'clamp'
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const slide2AnimatedStyle = useAnimatedStyle(() => {
    const scrollOpacity = interpolate(
      scrollX.value,
      [SCREEN_WIDTH * 1.35, 2 * SCREEN_WIDTH],
      [0, 1],
      'clamp'
    );
    const translateY = interpolate(
      scrollX.value,
      [SCREEN_WIDTH * 1.35, 2 * SCREEN_WIDTH],
      [8, 0],
      'clamp'
    );
    const waveOpacity = isTransformedToGoogle
      ? 0
      : interpolate(waveProgress.value, [0, 0.45], [1, 0], 'clamp');

    return {
      opacity: scrollOpacity * waveOpacity,
      transform: [{ translateY }],
    };
  });

  const googleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = isTransformedToGoogle
      ? 1
      : interpolate(waveProgress.value, [0.35, 0.85], [0, 1], 'clamp');
    const scale = isTransformedToGoogle
      ? 1
      : interpolate(waveProgress.value, [0.35, 0.85], [0.85, 1], 'clamp');
    return {
      opacity: activeIndex === 2 ? opacity : 0,
      transform: [{ scale }],
    };
  });

  // UI-Thread Smooth Subtitle Transitions
  const sub0AnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, [0, SCREEN_WIDTH * 0.65], [1, 0], 'clamp'),
    transform: [{ translateY: interpolate(scrollX.value, [0, SCREEN_WIDTH * 0.65], [0, -4], 'clamp') }],
  }));

  const sub1AnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      [0, SCREEN_WIDTH * 0.65, SCREEN_WIDTH, SCREEN_WIDTH * 1.35, 2 * SCREEN_WIDTH],
      [0, 0, 1, 0, 0],
      'clamp'
    ),
    transform: [{ translateY: interpolate(scrollX.value, [0, SCREEN_WIDTH, 2 * SCREEN_WIDTH], [4, 0, -4], 'clamp') }],
  }));

  const sub2AnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, [SCREEN_WIDTH * 1.35, 2 * SCREEN_WIDTH], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(scrollX.value, [SCREEN_WIDTH * 1.35, 2 * SCREEN_WIDTH], [4, 0], 'clamp') }],
  }));

  const activeVariant: IOSGlassVariant =
    SLIDES[activeIndex]?.variant || 'frostedDark';

  return (
    <Animated.View style={[styles.root, animatedRoot]}>
      {/* Full-bleed 3-slide artwork carousel (Zero text over photos) */}
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={scrollHandler}
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        scrollEventThrottle={16}
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{ width: SCREEN_WIDTH * SLIDES.length }}
      >
        {SLIDES.map((slide, idx) => (
          <View key={slide.id} style={[styles.slidePage, { width: SCREEN_WIDTH }]}>
            {/* Pure Wallpaper Artwork without any text */}
            <Image
              source={slide.image}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              priority="high"
              transition={200}
            />

            {/* Soft bottom vignette keeping doodle wallpaper clearly visible through the glass */}
            <Svg
              style={[styles.bottomVignette, { height: Math.max(insets.bottom + 180, 220) }]}
              width="100%"
              height="100%"
            >
              <Defs>
                <SvgGradient id={`botGrad_${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#070A08" stopOpacity="0" />
                  <Stop offset="45%" stopColor="#070A08" stopOpacity="0.12" />
                  <Stop offset="75%" stopColor="#070A08" stopOpacity="0.28" />
                  <Stop offset="100%" stopColor="#070A08" stopOpacity="0.48" />
                </SvgGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={`url(#botGrad_${idx})`} />
            </Svg>
          </View>
        ))}
      </Animated.ScrollView>

      {/* Floating Brand Title & Dynamic Subtitle */}
      <View style={styles.floatingHeaderTitle} pointerEvents="none">
        <Text style={styles.brandTitleText}>Health Freak</Text>
        <View style={styles.subtitleWrapper}>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.subtitleCenterInner, sub0AnimatedStyle]}
          >
            <Text style={styles.brandSubtitleText}>Touch grass, Track macros!</Text>
          </Animated.View>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.subtitleCenterInner, sub1AnimatedStyle]}
          >
            <Text style={styles.brandSubtitleText}>We scan. You snack!</Text>
          </Animated.View>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.subtitleCenterInner, sub2AnimatedStyle]}
          >
            <Text style={styles.brandSubtitleText}>Your health, Her headache!</Text>
          </Animated.View>
        </View>
      </View>

      {/* Floating Bottom Controls Area */}
      <View
        style={[
          styles.floatingBottomArea,
          { paddingBottom: Math.max(insets.bottom + 18, 30) },
        ]}
      >
        {/* Error Banner (if authentication error occurs) */}
        {error && (
          <View style={styles.errorToast}>
            <AlertCircle size={14} color="#FF6B6B" style={{ marginRight: 6 }} />
            <Text style={styles.errorToastText}>{error}</Text>
            <Pressable onPress={clearError} hitSlop={10}>
              <X size={14} color="#FF6B6B" />
            </Pressable>
          </View>
        )}

        {/* 3 Pagination Dots */}
        <View style={styles.paginationRow}>
          {SLIDES.map((_, idx) => {
            const isActive = activeIndex === idx;
            return (
              <Pressable
                key={idx}
                onPress={() => goToSlide(idx)}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
                hitSlop={10}
              />
            );
          })}
        </View>

        {/* AUTHENTIC IOS CONTROL CENTER FROSTED GLASS CAPSULE BUTTON */}
        <IOSControlCenterGlassButton
          variant={activeVariant}
          onPress={handleButtonPress}
          disabled={isAuthenticating}
          loading={isAuthenticating}
          loadingText="Connecting with Google..."
          style={{ width: BUTTON_WIDTH }}
        >
          {/* Liquid Wave Ripple Overlay on Slide 3 */}
          <Animated.View
            pointerEvents="none"
            style={[styles.waveRipple, animatedWaveRipple]}
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.waveSweep, animatedWaveOverlay]}
          />

          {/* iOS Control Center Capsule Row */}
          <View style={styles.controlCenterRow}>
            {/* Left Inset Circular Frosted Glass Pod */}
            <View
              style={[
                styles.iconPod,
                activeIndex === 1 && styles.iconPodOlive,
                activeIndex === 2 && styles.iconPodCoral,
              ]}
            >
              <Animated.View
                style={[StyleSheet.absoluteFill, styles.iconPodCenter, slide0AnimatedStyle]}
              >
                <Flame size={19} color="#FFFDF9" strokeWidth={2.4} />
              </Animated.View>
              <Animated.View
                style={[StyleSheet.absoluteFill, styles.iconPodCenter, slide1AnimatedStyle]}
              >
                <Apple size={19} color="#FFFDF9" strokeWidth={2.4} />
              </Animated.View>
              <Animated.View
                style={[StyleSheet.absoluteFill, styles.iconPodCenter, slide2AnimatedStyle]}
              >
                <Sparkles size={19} color="#FFFDF9" strokeWidth={2.4} />
              </Animated.View>
              <Animated.View
                style={[StyleSheet.absoluteFill, styles.iconPodCenter, googleAnimatedStyle]}
              >
                <GoogleLogo size={20} />
              </Animated.View>
            </View>

            {/* Centered Typography */}
            <View style={styles.labelCenterWrapper}>
              <View style={styles.labelMorphWrapper}>
                <Animated.View
                  style={[StyleSheet.absoluteFill, styles.labelCenterInner, slide0AnimatedStyle]}
                >
                  <Text style={styles.controlCenterLabel} numberOfLines={1}>
                    Crush Your Goals
                  </Text>
                </Animated.View>
                <Animated.View
                  style={[StyleSheet.absoluteFill, styles.labelCenterInner, slide1AnimatedStyle]}
                >
                  <Text style={styles.controlCenterLabel} numberOfLines={1}>
                    Know Every Bite
                  </Text>
                </Animated.View>
                <Animated.View
                  style={[StyleSheet.absoluteFill, styles.labelCenterInner, slide2AnimatedStyle]}
                >
                  <Text style={styles.controlCenterLabel} numberOfLines={1}>
                    Your Health Wingman
                  </Text>
                </Animated.View>
                <Animated.View
                  style={[StyleSheet.absoluteFill, styles.labelCenterInner, googleAnimatedStyle]}
                >
                  <Text style={styles.controlCenterLabel} numberOfLines={1}>
                    Sign in with google
                  </Text>
                </Animated.View>
              </View>
            </View>

            {/* Right Indicator (iOS Control Center chevrons / arrow) */}
            <View style={styles.rightIndicatorContainer}>
              <Animated.View
                style={[StyleSheet.absoluteFill, styles.iconPodCenter, slide0AnimatedStyle]}
              >
                <ChevronsUpDown
                  size={16}
                  color="rgba(255, 255, 255, 0.65)"
                  strokeWidth={2.4}
                />
              </Animated.View>
              <Animated.View
                style={[StyleSheet.absoluteFill, styles.iconPodCenter, slide1AnimatedStyle]}
              >
                <ChevronsUpDown
                  size={16}
                  color="rgba(255, 255, 255, 0.65)"
                  strokeWidth={2.4}
                />
              </Animated.View>
              <Animated.View
                style={[StyleSheet.absoluteFill, styles.iconPodCenter, slide2AnimatedStyle]}
              >
                <ChevronsUpDown
                  size={16}
                  color="rgba(255, 255, 255, 0.65)"
                  strokeWidth={2.4}
                />
              </Animated.View>
              <Animated.View
                style={[StyleSheet.absoluteFill, styles.iconPodCenter, googleAnimatedStyle]}
              >
                <ArrowRight size={17} color="#FFFDF9" strokeWidth={2.4} />
              </Animated.View>
            </View>
          </View>
        </IOSControlCenterGlassButton>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070A08',
  },
  slidePage: {
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  bottomVignette: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  floatingHeaderTitle: {
    position: 'absolute',
    top: '10%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    paddingHorizontal: 20,
  },
  brandTitleText: {
    fontFamily: Typography.fontFamilies.instrumentSerif,
    fontSize: 46,
    color: '#FFFDF9',
    textAlign: 'center',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  brandSubtitleText: {
    fontFamily: Platform.select({
      ios: 'System',
      default: Typography.fontFamilies.sansMedium,
    }),
    fontSize: 14.5,
    color: 'rgba(255, 253, 249, 0.88)',
    textAlign: 'center',
    letterSpacing: 0.25,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 6,
  },
  subtitleWrapper: {
    width: '100%',
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 4,
  },
  subtitleCenterInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 22,
    zIndex: 20,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#FAFAFA',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 3,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  // iOS Control Center Glass Button Layout
  controlCenterRow: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    zIndex: 10,
  },
  iconPod: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    borderTopColor: 'rgba(255, 255, 255, 0.60)',
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 3,
  },
  iconPodOlive: {
    backgroundColor: 'rgba(180, 220, 140, 0.22)',
    borderColor: 'rgba(215, 245, 180, 0.45)',
    borderTopColor: 'rgba(240, 255, 215, 0.75)',
  },
  iconPodCoral: {
    backgroundColor: 'rgba(255, 113, 95, 0.25)',
    borderColor: 'rgba(255, 175, 160, 0.48)',
    borderTopColor: 'rgba(255, 215, 205, 0.80)',
  },
  iconPodMorphWrapper: {
    width: 24,
    height: 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPodCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelCenterWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  labelMorphWrapper: {
    width: '100%',
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  labelCenterInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlCenterLabel: {
    fontFamily: Platform.select({
      ios: 'System',
      default: Typography.fontFamilies.sansSemiBold,
    }),
    fontWeight: '600',
    fontSize: 16.5,
    color: '#FFFDF9',
    textAlign: 'center',
    letterSpacing: 0.25,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  rightIndicatorContainer: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveRipple: {
    position: 'absolute',
    top: (62 - BUTTON_WIDTH) / 2,
    left: 0,
    width: BUTTON_WIDTH,
    height: BUTTON_WIDTH,
    borderRadius: BUTTON_WIDTH / 2,
    backgroundColor: 'rgba(255, 113, 95, 0.35)',
    zIndex: 15,
  },
  waveSweep: {
    position: 'absolute',
    top: 0,
    height: 62,
    width: BUTTON_WIDTH * 0.75,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 31,
    zIndex: 14,
  },
  errorToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.16)',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    maxWidth: BUTTON_WIDTH,
  },
  errorToastText: {
    flex: 1,
    color: '#FF9E9E',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
});
