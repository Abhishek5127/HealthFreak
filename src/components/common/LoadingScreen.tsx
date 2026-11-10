import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { RemoteAssets } from '../../constants/remoteAssets';

const FALLBACK_STATIC_LOGO = require('../../../assets/logo/HealthFreakLogoBlackbg.png');

export interface LoadingScreenProps {
  message?: string;
  submessage?: string;
  size?: number;
}

export interface LoadingOverlayProps extends LoadingScreenProps {
  visible: boolean;
  onRequestClose?: () => void;
}

/**
 * Reusable inline / fullscreen Loading Screen with HealthFreak animated GIF logo
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  submessage,
  size = 110,
}) => {
  const haloScale = useSharedValue(1);
  const haloOpacity = useSharedValue(0.25);
  const textOpacity = useSharedValue(0.7);

  useEffect(() => {
    // Gentle breathing halo
    haloScale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    haloOpacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.18, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Subtle text pulse
    textOpacity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.55, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedHalo = useAnimatedStyle(() => ({
    transform: [{ scale: haloScale.value }],
    opacity: haloOpacity.value,
  }));

  const animatedText = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.logoWrapper, { width: size, height: size }]}>
        {/* Breathing emerald halo */}
        <Animated.View
          style={[
            styles.halo,
            {
              width: size * 1.4,
              height: size * 1.4,
              borderRadius: (size * 1.4) / 2,
            },
            animatedHalo,
          ]}
        />

        {/* Animated GIF Logo */}
        <Image
          source={{ uri: RemoteAssets.logo.mascotGif }}
          placeholder={FALLBACK_STATIC_LOGO}
          style={{ width: size, height: size }}
          contentFit="contain"
          autoplay
          cachePolicy="memory-disk"
        />
      </View>

      {/* Primary Message */}
      <Animated.Text style={[styles.messageText, animatedText]}>
        {message}
      </Animated.Text>

      {/* Optional Submessage */}
      {submessage ? (
        <Text style={styles.submessageText}>{submessage}</Text>
      ) : null}
    </View>
  );
};

/**
 * Fullscreen semi-transparent modal overlay for active fetching / background processing
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Fetching HealthFreak data...',
  submessage,
  size = 110,
  onRequestClose,
}) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View style={styles.modalBackdrop}>
        <LoadingScreen message={message} submessage={submessage} size={size} />
      </View>
    </Modal>
  );
};

/**
 * Compact inline card loader with the animated GIF logo for widget/card sections
 */
export const LoadingCard: React.FC<{
  message?: string;
  size?: number;
}> = ({ message = 'Syncing...', size = 64 }) => {
  return (
    <View style={styles.cardContainer}>
      <Image
        source={{ uri: RemoteAssets.logo.mascotGif }}
        placeholder={FALLBACK_STATIC_LOGO}
        style={{ width: size, height: size }}
        contentFit="contain"
        autoplay
        cachePolicy="memory-disk"
      />
      {message && <Text style={styles.cardMessageText}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 9, 6, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  halo: {
    position: 'absolute',
    backgroundColor: '#4AB87A',
    shadowColor: '#4AB87A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 28,
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  submessageText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansRegular,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 260,
    lineHeight: 18,
  },
  cardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.15)',
  },
  cardMessageText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 8,
  },
});
