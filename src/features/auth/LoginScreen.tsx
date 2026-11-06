import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
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
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  Camera,
  Activity,
  AlertCircle,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../state/AuthContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { HealthFreakLogo, HealthFreakWordmark } from '../../components/common/HealthFreakLogo';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { authState, error, signInWithGoogle, signInAsDemoUser, clearError } = useAuth();
  const [isEntering, setIsEntering] = useState(false);
  const isAuthenticating = authState === 'authenticating';

  // --- REANIMATED SHARED VALUES ---
  // Entrance on mount
  const screenOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const contentTranslateY = useSharedValue(28);
  const contentOpacity = useSharedValue(0);

  // Ambient breathing aura behind logo
  const auraScale = useSharedValue(1);
  const auraOpacity = useSharedValue(0.25);

  // App Entrance Transition (when user taps to enter)
  const portalScale = useSharedValue(0.3);
  const portalOpacity = useSharedValue(0);
  const exitScale = useSharedValue(1);
  const exitOpacity = useSharedValue(1);
  const entranceTextOpacity = useSharedValue(0);
  const entranceTextScale = useSharedValue(0.9);

  // 1. Mount Entrance Animation
  useEffect(() => {
    // Fade in whole screen
    screenOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });

    // Logo spring entrance
    logoScale.value = withSpring(1, { damping: 14, stiffness: 90 });

    // Content slide & fade
    contentOpacity.value = withDelay(180, withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) }));
    contentTranslateY.value = withDelay(180, withSpring(0, { damping: 16, stiffness: 95 }));

    // Continuous ambient breathing aura
    auraScale.value = withRepeat(
      withSequence(
        withTiming(1.28, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    auraOpacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // 2. Trigger Animated Entrance into App
  const handleEnterApp = () => {
    if (isEntering || isAuthenticating) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Haptics optional
    }

    setIsEntering(true);

    // Expand radiant energy portal
    portalOpacity.value = withTiming(0.85, { duration: 200 }, () => {
      portalOpacity.value = withTiming(0, { duration: 350 });
    });
    portalScale.value = withTiming(3.2, { duration: 520, easing: Easing.out(Easing.cubic) });

    // Dissolve standard login content
    exitOpacity.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.ease) });
    exitScale.value = withTiming(1.06, { duration: 320 });

    // Reveal energetic welcome text
    entranceTextOpacity.value = withDelay(120, withTiming(1, { duration: 260 }));
    entranceTextScale.value = withDelay(120, withSpring(1, { damping: 14, stiffness: 100 }));

    // Seamless handoff to authenticated state after transition
    setTimeout(() => {
      runOnJS(signInAsDemoUser)();
    }, 460);
  };

  // Animated Styles
  const animatedRoot = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const animatedLogo = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const animatedAura = useAnimatedStyle(() => ({
    opacity: auraOpacity.value,
    transform: [{ scale: auraScale.value }],
  }));

  const animatedContent = useAnimatedStyle(() => ({
    opacity: contentOpacity.value * exitOpacity.value,
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
      {/* Background Ambient Radiance */}
      <View style={styles.ambientTopGlow} pointerEvents="none" />
      <View style={styles.ambientBottomGlow} pointerEvents="none" />

      {/* Radiant Portal Wave (Plays on Entrance) */}
      <Animated.View style={[styles.portalWave, animatedPortal]} pointerEvents="none" />

      {/* Entering App Welcome Reveal */}
      {isEntering && (
        <Animated.View style={[styles.enteringOverlay, animatedEntranceText]} pointerEvents="none">
          <View style={styles.enteringBadge}>
            <Sparkles size={16} color={Colors.forestGreenLight} />
            <Text style={styles.enteringBadgeText}>SANCTUARY UNLOCKED</Text>
          </View>
          <Text style={styles.enteringTitle}>Welcome to HealthFreak</Text>
          <Text style={styles.enteringSub}>Preparing your personalized daily engine...</Text>
        </Animated.View>
      )}

      {/* Main Login Screen Content */}
      <Animated.View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top + 16, 36),
            paddingBottom: Math.max(insets.bottom + 20, 28),
          },
          animatedContent,
        ]}
      >
        {/* Top Hero: Animated Logo & Breathing Aura */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Animated.View style={[styles.auraCircle, animatedAura]} />
            <Animated.View style={animatedLogo}>
              <HealthFreakLogo size={84} animated withGlow />
            </Animated.View>
          </View>

          <HealthFreakWordmark
            size="lg"
            showTagline={false}
            style={styles.wordmark}
          />

          <View style={styles.taglinePill}>
            <Text style={styles.taglinePillText}>PEAK FITNESS & AI LONGEVITY</Text>
          </View>

          <Text style={styles.headline}>Unleash Your Vitality.</Text>
          <Text style={styles.subheadline}>
            Intelligent workouts, instant nutrition scans & real-time AI coaching tailored to your body.
          </Text>

          {/* Minimal 3-Chip Feature Strip */}
          <View style={styles.featureRow}>
            <View style={styles.featureChip}>
              <Zap size={13} color="#4AB87A" />
              <Text style={styles.featureChipText}>Gemini AI Coach</Text>
            </View>
            <View style={styles.featureChip}>
              <Camera size={13} color="#FF6243" />
              <Text style={styles.featureChipText}>Meal Vision</Text>
            </View>
            <View style={styles.featureChip}>
              <Activity size={13} color="#68BF7B" />
              <Text style={styles.featureChipText}>Daily Vitals</Text>
            </View>
          </View>
        </View>

        {/* Error Notification if any */}
        {error && (
          <View style={styles.errorToast}>
            <AlertCircle size={16} color="#FF6B6B" />
            <Text style={styles.errorToastText}>{error}</Text>
            <Pressable onPress={clearError} hitSlop={10}>
              <X size={15} color="#FF6B6B" />
            </Pressable>
          </View>
        )}

        {/* Action Area */}
        <View style={styles.actionSection}>
          {/* Primary High-Impact CTA: Start Journey (Instant 1-Tap Entrance) */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
            onPress={handleEnterApp}
            disabled={isEntering || isAuthenticating}
          >
            <View style={styles.primaryBtnRow}>
              <Sparkles size={18} color="#FFFFFF" style={styles.btnIconLeft} />
              <Text style={styles.primaryBtnText}>Start Your Journey</Text>
              <View style={styles.btnArrowCircle}>
                <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </View>
          </Pressable>

          <Text style={styles.instantAccessNotice}>
            Instant 1-tap demo access • No setup required
          </Text>

          {/* Clean Subtle Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Secondary Action: Minimal Google OAuth */}
          <GoogleSignInButton
            onPress={signInWithGoogle}
            isLoading={isAuthenticating}
            disabled={isAuthenticating || isEntering}
          />

          {/* Minimalist Privacy & Security Micro-Footer */}
          <View style={styles.footerRow}>
            <Shield size={13} color={Colors.forestGreenLight} />
            <Text style={styles.footerText}>
              Private • On-device health memory • Zero data sold
            </Text>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#090D0A',
    position: 'relative',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  ambientTopGlow: {
    position: 'absolute',
    top: -120,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 1.2,
    height: SCREEN_WIDTH * 1.2,
    borderRadius: (SCREEN_WIDTH * 1.2) / 2,
    backgroundColor: 'rgba(74, 184, 122, 0.08)',
    zIndex: 1,
  },
  ambientBottomGlow: {
    position: 'absolute',
    bottom: -150,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255, 98, 67, 0.05)',
    zIndex: 1,
  },
  portalWave: {
    position: 'absolute',
    top: '42%',
    alignSelf: 'center',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(74, 184, 122, 0.22)',
    borderWidth: 2,
    borderColor: 'rgba(74, 184, 122, 0.65)',
    zIndex: 50,
  },
  enteringOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
    paddingHorizontal: Spacing.xl,
  },
  enteringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(74, 184, 122, 0.16)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.35)',
    marginBottom: Spacing.md,
  },
  enteringBadgeText: {
    color: '#4AB87A',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 1.2,
  },
  enteringTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: Typography.fontFamilies.serif,
    textAlign: 'center',
    marginBottom: 8,
  },
  enteringSub: {
    color: '#8A998E',
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansRegular,
    textAlign: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  auraCircle: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(74, 184, 122, 0.2)',
  },
  wordmark: {
    marginBottom: 8,
  },
  taglinePill: {
    backgroundColor: 'rgba(74, 184, 122, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.25)',
    marginBottom: Spacing.md,
  },
  taglinePillText: {
    color: '#68BF7B',
    fontSize: 9.5,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 1.5,
  },
  headline: {
    color: '#F4F2EC',
    fontSize: 30,
    fontFamily: Typography.fontFamilies.serif,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subheadline: {
    color: '#8A998E',
    fontSize: 13.5,
    fontFamily: Typography.fontFamilies.sansRegular,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#131A15',
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#212D24',
  },
  featureChipText: {
    color: '#CFD9D1',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  errorToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.35)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: Spacing.sm,
    gap: 8,
  },
  errorToastText: {
    flex: 1,
    color: '#FFBABA',
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  actionSection: {
    width: '100%',
    paddingBottom: Spacing.xs,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6243',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    shadowColor: '#FF6243',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
  primaryBtnPressed: {
    backgroundColor: '#E65335',
    transform: [{ scale: 0.985 }],
  },
  primaryBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnIconLeft: {
    marginRight: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.3,
  },
  btnArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  instantAccessNotice: {
    color: '#6E7A71',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansRegular,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: Spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1C251E',
  },
  dividerText: {
    color: '#526156',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
    marginHorizontal: Spacing.md,
    letterSpacing: 1.2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  footerText: {
    color: '#657368',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansRegular,
  },
});
