import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { DishaLogoEmblem, DishaWordmark } from '../../components/illustrations/DishaLogo';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const emblemOpacity = useSharedValue(0);
  const emblemScale = useSharedValue(0.85);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkTranslateY = useSharedValue(18);
  const haloScale = useSharedValue(0.6);
  const haloOpacity = useSharedValue(0);

  useEffect(() => {
    // 1. Halo expansion
    haloOpacity.value = withTiming(0.35, { duration: 900 });
    haloScale.value = withTiming(1.3, { duration: 1600, easing: Easing.out(Easing.ease) });

    // 2. Emblem entrance
    emblemOpacity.value = withDelay(200, withTiming(1, { duration: 700 }));
    emblemScale.value = withDelay(
      200,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.5)) })
    );

    // 3. Wordmark rise & fade
    wordmarkOpacity.value = withDelay(550, withTiming(1, { duration: 700 }));
    wordmarkTranslateY.value = withDelay(
      550,
      withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) })
    );

    // 4. Auto transition after 2.4s
    const timer = setTimeout(() => {
      onFinish();
    }, 2400);

    return () => clearTimeout(timer);
  }, []);

  const animatedEmblem = useAnimatedStyle(() => ({
    opacity: emblemOpacity.value,
    transform: [{ scale: emblemScale.value }],
  }));

  const animatedWordmark = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkTranslateY.value }],
  }));

  const animatedHalo = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Abstract Glowing Aura */}
      <Animated.View style={[styles.haloCircle, animatedHalo]} />

      {/* Disha Emblem */}
      <Animated.View style={[styles.emblemWrapper, animatedEmblem]}>
        <DishaLogoEmblem size={80} />
      </Animated.View>

      {/* Disha Wordmark */}
      <Animated.View style={[styles.wordmarkWrapper, animatedWordmark]}>
        <DishaWordmark size="lg" />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  haloCircle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.forestGreenLight,
  },
  emblemWrapper: {
    marginBottom: 24,
  },
  wordmarkWrapper: {
    alignItems: 'center',
  },
});
