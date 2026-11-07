import React, { useEffect } from 'react';
import { Dimensions, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Typography } from '../../theme/typography';

const LOGO_GIF = require('../../../assets/logo/HealthFreakLogoTranasparent.gif');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOGO_CONTAINER_SIZE = Math.min(Math.round(SCREEN_WIDTH * 0.78), 300);

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  // GIF Logo entrance & scale (prominent presentation)
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);

  // "Health Freak" all-white Instrument Serif wordmark entrance
  const textTranslateY = useSharedValue(18);
  const textOpacity = useSharedValue(0);

  // Screen exit transition
  const containerOpacity = useSharedValue(1);

  const handleFinish = () => {
    containerOpacity.value = withTiming(0, { duration: 320 }, (finished) => {
      if (finished) {
        runOnJS(onFinish)();
      }
    });
  };

  useEffect(() => {
    // 1. GIF Logo smooth spring entrance
    logoOpacity.value = withDelay(
      100,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    logoScale.value = withDelay(
      100,
      withSpring(1, {
        damping: 14,
        stiffness: 90,
        mass: 0.8,
      })
    );

    // 2. "Health Freak" Instrument Serif title entrance
    textOpacity.value = withDelay(
      450,
      withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) })
    );
    textTranslateY.value = withDelay(
      450,
      withSpring(0, {
        damping: 15,
        stiffness: 100,
      })
    );

    // 3. Auto-transition to login / app
    const timer = setTimeout(() => {
      handleFinish();
    }, 2800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedContainer = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const animatedLogo = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const animatedText = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedContainer]}>
      <Pressable style={styles.pressableArea} onPress={handleFinish}>
        {/* Mascot GIF (Prominent size, tightly cropped to character) */}
        <Animated.View style={[styles.logoContainer, animatedLogo]}>
          <Image
            source={LOGO_GIF}
            style={styles.logoImage}
            contentFit="cover"
            autoplay
            cachePolicy="memory-disk"
          />
        </Animated.View>

        {/* "Health Freak" in Instrument Serif Font — Pure White, Snugly Grouped */}
        <Animated.View style={[styles.textContainer, animatedText]}>
          <Text style={styles.brandTitleText}>Health Freak</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 99999,
  },
  pressableArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: LOGO_CONTAINER_SIZE,
    height: LOGO_CONTAINER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: -14,
  },
  logoImage: {
    width: LOGO_CONTAINER_SIZE,
    height: LOGO_CONTAINER_SIZE,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleText: {
    fontFamily: Typography.fontFamilies.instrumentSerif,
    fontSize: 54,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
