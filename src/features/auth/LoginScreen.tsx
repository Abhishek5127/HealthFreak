import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
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
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import { ArrowRight, AlertCircle, X } from 'lucide-react-native';
import { useAuth } from '../../state/AuthContext';
import { Typography } from '../../theme/typography';
import { GoogleLogo } from '../../components/illustrations/GoogleLogo';
import { IOSButton } from '../../components/common/IOSButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUTTON_WIDTH = Math.min(SCREEN_WIDTH - 44, 380);

// 3 Ordered Wallpaper Artworks (Zero text on photos)
const SLIDES = [
  {
    id: 'fitness',
    image: require('../../../assets/loginUiImages/HealthFreak Fitness Doodle Wallpaper.png'),
    buttonText: 'Crush Your Goals',
  },
  {
    id: 'nutrition',
    image: require('../../../assets/loginUiImages/HealthFreak Nutrition Doodle Collage.png'),
    buttonText: 'Know Every Bite',
  },
  {
    id: 'call',
    image: require('../../../assets/loginUiImages/Neon HealthFreak Call Doodle Wallpaper.png'),
    buttonText: 'Your Health Wingman',
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

  // Button Press Bounce
  const buttonScale = useSharedValue(1);

  // Liquid Wave Animation Shared Values
  const waveProgress = useSharedValue(0);
  const waveOpacity = useSharedValue(0);
  const waveRippleScale = useSharedValue(0.1);
  const waveRippleOpacity = useSharedValue(0);
  const buttonTextOpacity = useSharedValue(1);
  const googleContentOpacity = useSharedValue(0);
  const googleContentScale = useSharedValue(0.85);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    contentTranslateY.value = withSpring(0, { damping: 16, stiffness: 95 });
  }, [contentTranslateY, screenOpacity]);

  // Synchronize button text visibility when user swipes between slides
  useEffect(() => {
    if (activeIndex !== 2) {
      buttonTextOpacity.value = 1;
      googleContentOpacity.value = 0;
      googleContentScale.value = 0.85;
    } else {
      if (isTransformedToGoogle) {
        googleContentOpacity.value = 1;
        googleContentScale.value = 1;
        buttonTextOpacity.value = 0;
      } else {
        buttonTextOpacity.value = 1;
        googleContentOpacity.value = 0;
        googleContentScale.value = 0.85;
      }
    }
  }, [activeIndex, isTransformedToGoogle, buttonTextOpacity, googleContentOpacity, googleContentScale]);

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

    // Button squish bounce
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 90 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );

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

    // 3. Dissolve 'Your Health Wingman' text
    buttonTextOpacity.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.ease) });

    // 4. Reveal 'Sign in with google' content
    googleContentOpacity.value = withDelay(
      260,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.ease) })
    );
    googleContentScale.value = withDelay(
      260,
      withSpring(1, { damping: 12, stiffness: 180 })
    );

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
    buttonScale.value = withSequence(
      withTiming(0.96, { duration: 80 }),
      withSpring(1, { damping: 12, stiffness: 220 })
    );

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

  // Dynamic Button Label
  const getButtonLabel = () => {
    if (activeIndex === 0) return 'Crush Your Goals';
    if (activeIndex === 1) return 'Know Every Bite';
    if (activeIndex === 2) {
      return isTransformedToGoogle ? 'Sign in with google' : 'Your Health Wingman';
    }
    return 'Crush Your Goals';
  };

  // Animated Styles
  const animatedRoot = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const animatedButton = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
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

  const animatedButtonText = useAnimatedStyle(() => ({
    opacity: buttonTextOpacity.value,
  }));

  const animatedGoogleContent = useAnimatedStyle(() => ({
    opacity: googleContentOpacity.value,
    transform: [{ scale: googleContentScale.value }],
  }));

  return (
    <Animated.View style={[styles.root, animatedRoot]}>
      {/* Full-bleed 3-slide artwork carousel (Zero text over photos) */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={handleScroll}
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
      </ScrollView>

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

        {/* PREMIUM MINIMAL iOS WARM ORANGE CAPSULE BUTTON */}
        <IOSButton
          onPress={handleButtonPress}
          disabled={isAuthenticating}
          loading={isAuthenticating}
          loadingText="Connecting with Google..."
          variant="orange"
          size="lg"
          style={{ width: BUTTON_WIDTH }}
        >
          {activeIndex === 2 && isTransformedToGoogle ? (
            /* State: Transformed "Sign in with google" with Google Logo */
            <Animated.View style={[styles.contentRow, animatedGoogleContent]}>
              <View style={styles.googleLogoCircle}>
                <GoogleLogo size={18} />
              </View>
              <Text style={styles.buttonLabel}>Sign in with google</Text>
            </Animated.View>
          ) : activeIndex === 2 ? (
            /* State: Slide 3 transition container */
            <View style={styles.contentWrapper}>
              <Animated.View style={[styles.contentRow, animatedButtonText]}>
                <Text style={styles.buttonLabel}>Your Health Wingman</Text>
                <ArrowRight size={18} color="#FFFBF7" strokeWidth={2.4} style={{ marginLeft: 8 }} />
              </Animated.View>

              {/* Pre-mounted Google content transitioning in */}
              <Animated.View
                style={[
                  styles.contentRow,
                  StyleSheet.absoluteFill,
                  animatedGoogleContent,
                ]}
              >
                <View style={styles.googleLogoCircle}>
                  <GoogleLogo size={18} />
                </View>
                <Text style={styles.buttonLabel}>Sign in with google</Text>
              </Animated.View>
            </View>
          ) : (
            /* States 1 & 2: "Crush Your Goals" & "Know Every Bite" */
            <Animated.View style={[styles.contentRow, animatedButtonText]}>
              <Text style={styles.buttonLabel}>{getButtonLabel()}</Text>
              <ArrowRight size={18} color="#FFFBF7" strokeWidth={2.4} style={{ marginLeft: 8 }} />
            </Animated.View>
          )}
        </IOSButton>
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
    backgroundColor: '#FF7738',
    shadowColor: '#E04A08',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 2,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  contentWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLogoCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  buttonLabel: {
    fontFamily: Platform.select({
      ios: 'System',
      default: Typography.fontFamilies.sansSemiBold,
    }),
    fontWeight: '600',
    fontSize: 16.5,
    color: '#FFFBF7',
    letterSpacing: -0.25,
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
