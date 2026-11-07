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
  ActivityIndicator,
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
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Rect,
  Path,
} from 'react-native-svg';
import { ArrowRight, Sparkles, AlertCircle, X } from 'lucide-react-native';
import { useAuth } from '../../state/AuthContext';
import { Typography } from '../../theme/typography';
import { HealthFreakLogo } from '../../components/common/HealthFreakLogo';
import { GoogleLogo } from '../../components/illustrations/GoogleLogo';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUTTON_WIDTH = Math.min(SCREEN_WIDTH - 48, 380);
const BUTTON_HEIGHT = 58;

// 3 Ordered Wallpaper Artworks
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
  const { authState, error, signInWithGoogle, signInAsDemoUser, clearError } = useAuth();
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isTransformedToGoogle, setIsTransformedToGoogle] = useState<boolean>(false);
  const [isWaveRunning, setIsWaveRunning] = useState<boolean>(false);
  const [isEntering, setIsEntering] = useState<boolean>(false);
  const isAuthenticating = authState === 'authenticating';

  const scrollRef = useRef<any>(null);

  // --- REANIMATED VALUES ---
  const screenOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(24);

  // Button Press Bounce
  const buttonScale = useSharedValue(1);

  // Liquid Wave Animation Shared Values
  const waveProgress = useSharedValue(0);
  const waveOpacity = useSharedValue(0);
  const waveRippleScale = useSharedValue(0.1);
  const waveRippleOpacity = useSharedValue(0);
  const wingmanTextOpacity = useSharedValue(1);
  const googleContentOpacity = useSharedValue(0);
  const googleContentScale = useSharedValue(0.85);

  // App Entrance Transition (radiant portal burst on exit)
  const portalScale = useSharedValue(0.3);
  const portalOpacity = useSharedValue(0);
  const exitScale = useSharedValue(1);
  const exitOpacity = useSharedValue(1);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.ease) });
    contentTranslateY.value = withSpring(0, { damping: 16, stiffness: 95 });
  }, [contentTranslateY, screenOpacity]);

  // Handle Carousel Page Scroll
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

  // Trigger Wave Transformation on Slide 3
  const triggerWaveAnimation = () => {
    if (isWaveRunning || isTransformedToGoogle) return;

    setIsWaveRunning(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    // Button squish bounce
    buttonScale.value = withSequence(
      withTiming(0.96, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );

    // 1. Wave translation & opacity
    waveOpacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withDelay(450, withTiming(0, { duration: 250 }))
    );
    waveProgress.value = withTiming(1, {
      duration: 720,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

    // 2. Liquid circular ripple expanding across button
    waveRippleOpacity.value = withSequence(
      withTiming(0.85, { duration: 120 }),
      withTiming(0, { duration: 450, easing: Easing.out(Easing.ease) })
    );
    waveRippleScale.value = withTiming(3.2, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });

    // 3. Fade out 'Your Health Wingman' text
    wingmanTextOpacity.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.ease) });

    // 4. Fade in 'Sign in with Google' content
    googleContentOpacity.value = withDelay(
      280,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.ease) })
    );
    googleContentScale.value = withDelay(
      280,
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
      // Advance to Slide 2
      scrollRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: true });
      setActiveIndex(1);
    } else if (activeIndex === 1) {
      // Advance to Slide 3
      scrollRef.current?.scrollTo({ x: 2 * SCREEN_WIDTH, animated: true });
      setActiveIndex(2);
    } else if (activeIndex === 2) {
      if (!isTransformedToGoogle) {
        // Trigger wave transformation to Google sign-in
        triggerWaveAnimation();
      } else {
        // Already transformed: execute Google Sign-In
        signInWithGoogle();
      }
    }
  };

  // Guest Demo Entrance
  const handleEnterAsGuest = () => {
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

  const animatedButton = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const animatedPortal = useAnimatedStyle(() => ({
    opacity: portalOpacity.value,
    transform: [{ scale: portalScale.value }],
  }));

  // Wave Overlay Animated Style
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

  // Circular Liquid Ripple Animated Style
  const animatedWaveRipple = useAnimatedStyle(() => ({
    opacity: waveRippleOpacity.value,
    transform: [{ scale: waveRippleScale.value }],
  }));

  const animatedWingmanText = useAnimatedStyle(() => ({
    opacity: wingmanTextOpacity.value,
  }));

  const animatedGoogleContent = useAnimatedStyle(() => ({
    opacity: googleContentOpacity.value,
    transform: [{ scale: googleContentScale.value }],
  }));

  // Determine current button text
  const currentSlide = SLIDES[activeIndex] || SLIDES[0];

  return (
    <Animated.View style={[styles.root, animatedRoot]}>
      {/* Radiant Portal Effect during transition */}
      <Animated.View
        pointerEvents="none"
        style={[styles.portalAura, animatedPortal]}
      />

      <Animated.View style={[StyleSheet.absoluteFill, animatedContent]}>
        {/* Full-bleed 3-slide artwork carousel */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={StyleSheet.absoluteFill}
          contentContainerStyle={{ width: SCREEN_WIDTH * 3 }}
        >
          {SLIDES.map((slide, idx) => (
            <View key={slide.id} style={[styles.slidePage, { width: SCREEN_WIDTH }]}>
              {/* Wallpaper image with smooth scaling */}
              <Image
                source={slide.image}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                priority="high"
                transition={200}
              />

              {/* Top ambient dark vignette for header contrast */}
              <Svg
                style={[styles.topVignette, { height: Math.max(insets.top + 100, 150) }]}
                width="100%"
                height="100%"
              >
                <Defs>
                  <SvgGradient id={`topGrad_${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#070A08" stopOpacity="0.85" />
                    <Stop offset="55%" stopColor="#070A08" stopOpacity="0.45" />
                    <Stop offset="100%" stopColor="#070A08" stopOpacity="0" />
                  </SvgGradient>
                </Defs>
                <Rect width="100%" height="100%" fill={`url(#topGrad_${idx})`} />
              </Svg>

              {/* Bottom ambient dark vignette for controls contrast */}
              <Svg
                style={[styles.bottomVignette, { height: Math.max(insets.bottom + 230, 270) }]}
                width="100%"
                height="100%"
              >
                <Defs>
                  <SvgGradient id={`botGrad_${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#070A08" stopOpacity="0" />
                    <Stop offset="45%" stopColor="#070A08" stopOpacity="0.65" />
                    <Stop offset="85%" stopColor="#070A08" stopOpacity="0.94" />
                    <Stop offset="100%" stopColor="#070A08" stopOpacity="0.98" />
                  </SvgGradient>
                </Defs>
                <Rect width="100%" height="100%" fill={`url(#botGrad_${idx})`} />
              </Svg>
            </View>
          ))}
        </ScrollView>

        {/* Minimal Floating Top Header */}
        <View
          style={[
            styles.floatingHeader,
            { paddingTop: Math.max(insets.top + 6, 20) },
          ]}
        >
          <HealthFreakLogo
            size={34}
            showWordmark={true}
            orientation="horizontal"
          />

          {/* Quick Demo Access Pill */}
          <Pressable
            onPress={handleEnterAsGuest}
            style={({ pressed }) => [
              styles.guestPillBtn,
              pressed && styles.guestPillBtnPressed,
            ]}
            hitSlop={10}
          >
            <Sparkles size={12} color="#7AE69E" style={{ marginRight: 5 }} />
            <Text style={styles.guestPillText}>Explore Demo</Text>
          </Pressable>
        </View>

        {/* Floating Bottom Controls Area */}
        <View
          style={[
            styles.floatingBottomArea,
            { paddingBottom: Math.max(insets.bottom + 12, 24) },
          ]}
        >
          {/* Error Banner */}
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

          {/* THE #ff715f FULL GLASS BUTTON */}
          <Animated.View style={[styles.buttonOuterWrapper, animatedButton]}>
            <Pressable
              onPress={handleButtonPress}
              disabled={isAuthenticating || isEntering}
              style={styles.glassButton}
            >
              {/* Glassmorphism SVG Background Gradient */}
              <Svg
                style={StyleSheet.absoluteFill}
                width={BUTTON_WIDTH}
                height={BUTTON_HEIGHT}
              >
                <Defs>
                  <SvgGradient id="glassBtnGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#FF8B79" stopOpacity={0.42} />
                    <Stop offset="30%" stopColor="#FF715F" stopOpacity={0.34} />
                    <Stop offset="70%" stopColor="#E85845" stopOpacity={0.38} />
                    <Stop offset="100%" stopColor="#BC3827" stopOpacity={0.52} />
                  </SvgGradient>
                </Defs>
                <Rect
                  x="0"
                  y="0"
                  width={BUTTON_WIDTH}
                  height={BUTTON_HEIGHT}
                  rx="29"
                  ry="29"
                  fill="url(#glassBtnGrad)"
                />
              </Svg>

              {/* Upper Specular Glass Sheen Highlight */}
              <View style={styles.glassSheenHighlight} />

              {/* Expanding Liquid Circular Ripple (Wave Origin) */}
              <Animated.View
                pointerEvents="none"
                style={[styles.liquidWaveRipple, animatedWaveRipple]}
              />

              {/* Animated Wave Crest Layer (sweeping across button) */}
              <Animated.View
                pointerEvents="none"
                style={[styles.waveOverlayContainer, animatedWaveOverlay]}
              >
                <Svg width={BUTTON_WIDTH * 1.5} height={BUTTON_HEIGHT} viewBox="0 0 540 60">
                  <Defs>
                    <SvgGradient id="waveCrestGrad" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0} />
                      <Stop offset="30%" stopColor="#FFFFFF" stopOpacity={0.65} />
                      <Stop offset="50%" stopColor="#FFE0D9" stopOpacity={0.95} />
                      <Stop offset="70%" stopColor="#FF715F" stopOpacity={0.7} />
                      <Stop offset="100%" stopColor="#FF715F" stopOpacity={0} />
                    </SvgGradient>
                  </Defs>
                  {/* Wave crest ribbons */}
                  <Path
                    d="M 0 25 C 45 8, 90 42, 135 25 C 180 8, 225 42, 270 25 C 315 8, 360 42, 405 25 C 450 8, 495 42, 540 25 V 60 H 0 Z"
                    fill="url(#waveCrestGrad)"
                  />
                  <Path
                    d="M 0 35 C 40 48, 85 18, 130 35 C 175 52, 220 22, 265 35 C 310 48, 355 18, 400 35 C 445 52, 490 22, 540 35 V 60 H 0 Z"
                    fill="rgba(255, 255, 255, 0.45)"
                  />
                </Svg>
              </Animated.View>

              {/* BUTTON CONTENT */}
              {isAuthenticating ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.glassButtonText}>Connecting with Google...</Text>
                </View>
              ) : activeIndex === 2 && isTransformedToGoogle ? (
                /* State 3B: Transformed "Sign in with google" with Google Logo */
                <Animated.View style={[styles.buttonContentRow, animatedGoogleContent]}>
                  <View style={styles.googleLogoCircle}>
                    <GoogleLogo size={20} />
                  </View>
                  <Text style={styles.glassButtonText}>Sign in with google</Text>
                </Animated.View>
              ) : activeIndex === 2 ? (
                /* State 3A: "Your Health Wingman" transitioning on click */
                <View style={styles.buttonContentWrapper}>
                  <Animated.View style={[styles.buttonContentRow, animatedWingmanText]}>
                    <Text style={styles.glassButtonText}>Your Health Wingman</Text>
                    <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </Animated.View>

                  {/* Pre-mounted Google content that transitions in with wave */}
                  <Animated.View
                    style={[
                      styles.buttonContentRow,
                      StyleSheet.absoluteFill,
                      animatedGoogleContent,
                    ]}
                  >
                    <View style={styles.googleLogoCircle}>
                      <GoogleLogo size={20} />
                    </View>
                    <Text style={styles.glassButtonText}>Sign in with google</Text>
                  </Animated.View>
                </View>
              ) : (
                /* States 1 & 2: "Crush Your Goals" & "Know Every Bite" */
                <View style={styles.buttonContentRow}>
                  <Text style={styles.glassButtonText}>{currentSlide.buttonText}</Text>
                  <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </View>
              )}
            </Pressable>
          </Animated.View>

          {/* Subtle Bottom Caption / Direct Guest Entry */}
          <Pressable
            onPress={handleEnterAsGuest}
            disabled={isEntering || isAuthenticating}
            style={({ pressed }) => [
              styles.subtleGuestLink,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={12}
          >
            <Text style={styles.subtleGuestText}>
              Want to explore first? <Text style={styles.subtleGuestBold}>Continue as Guest</Text>
            </Text>
          </Pressable>
        </View>
      </Animated.View>
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
  topVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottomVignette: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  guestPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  guestPillBtnPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  guestPillText: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSizes.xs - 1,
    color: '#E5ECE7',
  },
  floatingBottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
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
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    width: 26,
    backgroundColor: '#FF715F',
    shadowColor: '#FF715F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 4,
  },
  dotInactive: {
    width: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  buttonOuterWrapper: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    borderRadius: 29,
    shadowColor: '#FF715F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.58,
    shadowRadius: 22,
    elevation: 10,
    marginBottom: 16,
  },
  glassButton: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 113, 95, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.38)',
    borderTopColor: 'rgba(255, 255, 255, 0.65)',
    borderBottomColor: 'rgba(255, 113, 95, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  glassSheenHighlight: {
    position: 'absolute',
    top: 2,
    left: 20,
    right: 20,
    height: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    pointerEvents: 'none',
  },
  liquidWaveRipple: {
    position: 'absolute',
    width: BUTTON_WIDTH * 0.7,
    height: BUTTON_WIDTH * 0.7,
    borderRadius: (BUTTON_WIDTH * 0.7) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    alignSelf: 'center',
  },
  waveOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BUTTON_WIDTH * 1.5,
    height: BUTTON_HEIGHT,
  },
  buttonContentWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLogoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  glassButtonText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtleGuestLink: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  subtleGuestText: {
    fontFamily: Typography.fontFamilies.sansRegular,
    fontSize: Typography.fontSizes.xs,
    color: 'rgba(255, 255, 255, 0.52)',
  },
  subtleGuestBold: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    color: '#FF8B79',
    textDecorationLine: 'underline',
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
  portalAura: {
    position: 'absolute',
    top: '35%',
    left: '25%',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FF715F',
    shadowColor: '#FF715F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 60,
    elevation: 20,
    zIndex: 999,
  },
});
