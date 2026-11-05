import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

const LOGO_GIF = require('../../../assets/logo/HealthFreakLogoTranasparent.gif');

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  // GIF Logo entrance & scale
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.7);

  // Ambient Halo Breathing
  const haloScale = useSharedValue(0.5);
  const haloOpacity = useSharedValue(0);

  // "Health Freak" Wordmark animations
  const textTranslateY = useSharedValue(32);
  const textOpacity = useSharedValue(0);

  // Tagline animation
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(16);

  // Glowing accent line width
  const accentLineWidth = useSharedValue(0);
  const accentLineOpacity = useSharedValue(0);

  // Overall screen exit fade
  const containerOpacity = useSharedValue(1);

  const handleFinish = () => {
    containerOpacity.value = withTiming(0, { duration: 350 }, (finished) => {
      if (finished) {
        runOnJS(onFinish)();
      }
    });
  };

  useEffect(() => {
    // 1. Ambient emerald halo expansion & breathing
    haloOpacity.value = withTiming(0.4, { duration: 1000, easing: Easing.out(Easing.ease) });
    haloScale.value = withSequence(
      withTiming(1.2, { duration: 1200, easing: Easing.out(Easing.cubic) }),
      withRepeat(
        withSequence(
          withTiming(1.35, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.15, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // 2. GIF Logo entrance with elastic spring
    logoOpacity.value = withDelay(150, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
    logoScale.value = withDelay(
      150,
      withSpring(1, {
        damping: 14,
        stiffness: 90,
        mass: 0.8,
      })
    );

    // 3. "Health Freak" text slide up and fade in
    textOpacity.value = withDelay(550, withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }));
    textTranslateY.value = withDelay(
      550,
      withSpring(0, {
        damping: 15,
        stiffness: 100,
      })
    );

    // 4. Tagline appearance
    taglineOpacity.value = withDelay(950, withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) }));
    taglineTranslateY.value = withDelay(
      950,
      withSpring(0, {
        damping: 16,
        stiffness: 110,
      })
    );

    // 5. Luminous accent beam expansion
    accentLineOpacity.value = withDelay(1100, withTiming(1, { duration: 600 }));
    accentLineWidth.value = withDelay(
      1100,
      withTiming(140, { duration: 900, easing: Easing.out(Easing.cubic) })
    );

    // 6. Auto-transition after complete entrance presentation (~3.0s)
    const timer = setTimeout(() => {
      handleFinish();
    }, 3100);

    return () => clearTimeout(timer);
  }, []);

  const animatedContainer = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const animatedLogo = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const animatedHalo = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  const animatedText = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const animatedTagline = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const animatedAccentLine = useAnimatedStyle(() => ({
    opacity: accentLineOpacity.value,
    width: accentLineWidth.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedContainer]}>
      <Pressable style={styles.pressableArea} onPress={handleFinish}>
        {/* Ambient Emerald Radial Glow */}
        <Animated.View style={[styles.haloCircle, animatedHalo]} />

        {/* Centered Animated GIF Logo */}
        <Animated.View style={[styles.logoContainer, animatedLogo]}>
          <Image
            source={LOGO_GIF}
            style={styles.logoImage}
            contentFit="contain"
            autoplay
            cachePolicy="memory-disk"
          />
        </Animated.View>

        {/* Animated "Health Freak" Wordmark */}
        <Animated.View style={[styles.textContainer, animatedText]}>
          <View style={styles.wordmarkRow}>
            <Text style={styles.healthText}>Health</Text>
            <Text style={styles.freakText}> Freak</Text>
          </View>
        </Animated.View>

        {/* Luminous Green Accent Line */}
        <Animated.View style={[styles.accentLine, animatedAccentLine]} />

        {/* Animated Subtitle / Tagline */}
        <Animated.View style={[styles.taglineContainer, animatedTagline]}>
          <Text style={styles.taglineText}>PERSONALIZED WELLNESS & VITALITY</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#050906',
    zIndex: 99999,
  },
  pressableArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  haloCircle: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#4AB87A',
    opacity: 0.18,
    // Add soft blur approximation via large shadow
    shadowColor: '#4AB87A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 50,
  },
  logoContainer: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 170,
    height: 170,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  healthText: {
    color: '#FFFFFF',
    fontSize: 38,
    fontFamily: Typography.fontFamilies.serif,
    letterSpacing: -0.5,
  },
  freakText: {
    color: '#4AB87A',
    fontSize: 38,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(74, 184, 122, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  accentLine: {
    height: 2,
    backgroundColor: '#4AB87A',
    borderRadius: 1,
    marginTop: 12,
    marginBottom: 12,
    shadowColor: '#4AB87A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  taglineContainer: {
    alignItems: 'center',
    marginTop: 2,
  },
  taglineText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
