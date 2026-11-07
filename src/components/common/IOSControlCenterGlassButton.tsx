import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronsUpDown } from 'lucide-react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPECULAR_LEFT = require('../../../assets/liquidGlass/specular-map-left.png');
const SPECULAR_RIGHT = require('../../../assets/liquidGlass/specular-map-right.png');
const GRAIN_TEXTURE = require('../../../assets/images/glass_grain_texture.png');

export type IOSGlassVariant = 'frostedDark' | 'frostedOlive' | 'frostedCoral';

export interface IOSControlCenterGlassButtonProps {
  /** Text label displayed in the center of the capsule */
  title?: string;
  /** Primary icon rendered inside the circular glass pod on the left */
  icon?: React.ReactNode;
  /** Right accessory indicator (defaults to iOS-style vertical chevrons) */
  rightIndicator?: React.ReactNode;
  /** Hide the right indicator icon */
  hideRightIndicator?: boolean;
  /** Glass theme variant */
  variant?: IOSGlassVariant;
  /** Press handler */
  onPress?: () => void;
  /** Loading state with spinner */
  loading?: boolean;
  /** Custom text to display during loading */
  loadingText?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Custom capsule height (defaults to 62px) */
  height?: number;
  /** Container style overrides */
  style?: StyleProp<ViewStyle>;
  /** Label text style overrides */
  textStyle?: StyleProp<TextStyle>;
  /** Optional custom children to replace default layout */
  children?: React.ReactNode;
  /** Accessibility / Test ID */
  testID?: string;
}

/**
 * Authentic Apple iOS Control Center Frosted Glass Capsule Button:
 * - Pill capsule geometry with circular inset frosted glass icon puck
 * - Real optical blur substrate via expo-blur (BlurView)
 * - Micro-etched sandblasted frosted grain noise layer
 * - Optical specular rim highlight with brighter top edge reflection
 * - Inset 3D specular curvature caps from physical lens reflection maps
 * - Tactile Apple spring physics with light haptic feedback
 */
export const IOSControlCenterGlassButton: React.FC<IOSControlCenterGlassButtonProps> = ({
  title,
  icon,
  rightIndicator,
  hideRightIndicator = false,
  variant = 'frostedDark',
  onPress,
  loading = false,
  loadingText,
  disabled = false,
  height = 62,
  style,
  textStyle,
  children,
  testID,
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    scale.value = withTiming(0.965, {
      duration: 90,
      easing: Easing.out(Easing.ease),
    });
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 260,
      mass: 0.6,
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const borderRadius = height / 2;
  const iconPodSize = Math.max(height - 18, 42);

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.container,
        { height, borderRadius },
        variant === 'frostedDark' && styles.borderDark,
        variant === 'frostedOlive' && styles.borderOlive,
        variant === 'frostedCoral' && styles.borderCoral,
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {/* 1. Underlying Native Frosted Blur (expo-blur) */}
      <View style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 65 : 45}
          tint={variant === 'frostedCoral' ? 'dark' : 'dark'}
          style={StyleSheet.absoluteFill}
        />
        {/* Tint overlay layer for contrast over vibrant wallpapers */}
        <View
          style={[
            StyleSheet.absoluteFill,
            variant === 'frostedDark' && styles.tintDark,
            variant === 'frostedOlive' && styles.tintOlive,
            variant === 'frostedCoral' && styles.tintCoral,
          ]}
        />
      </View>

      {/* 2. Micro-etched Sandblasted Glass Grain Noise */}
      <Image
        source={GRAIN_TEXTURE}
        style={[StyleSheet.absoluteFill, styles.grainTexture, { borderRadius }]}
        contentFit="cover"
        pointerEvents="none"
      />

      {/* 3. Inset 3D Specular Curvature Caps (from liquid-glass lens reflections) */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.specularWrapper, { borderRadius }]}>
        <Image
          source={SPECULAR_LEFT}
          style={[styles.specularCap, { width: height / 2, height }]}
          contentFit="fill"
        />
        <View style={styles.specularFlexSpacer} />
        <Image
          source={SPECULAR_RIGHT}
          style={[styles.specularCap, { width: height / 2, height }]}
          contentFit="fill"
        />
      </View>

      {/* 4. Top Specular Sheen Line (Incidence Light) */}
      <View pointerEvents="none" style={styles.topSheenLine} />

      {/* 5. Capsule Content */}
      {loading ? (
        <View style={styles.contentRow}>
          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 10 }} />
          {loadingText ? (
            <Text style={[styles.titleText, textStyle]}>{loadingText}</Text>
          ) : null}
        </View>
      ) : children ? (
        children
      ) : (
        <View style={styles.contentRow}>
          {/* Left Inset Circular Frosted Glass Pod */}
          {icon ? (
            <View
              style={[
                styles.iconPod,
                { width: iconPodSize, height: iconPodSize, borderRadius: iconPodSize / 2 },
                variant === 'frostedOlive' && styles.iconPodOlive,
                variant === 'frostedCoral' && styles.iconPodCoral,
              ]}
            >
              {icon}
            </View>
          ) : (
            <View style={{ width: 14 }} />
          )}

          {/* Centered Typography */}
          <Text
            style={[styles.titleText, textStyle]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>

          {/* Right Indicator (iOS Control Center chevrons) */}
          {!hideRightIndicator ? (
            <View style={styles.rightIndicatorContainer}>
              {rightIndicator ? (
                rightIndicator
              ) : (
                <ChevronsUpDown size={16} color="rgba(255, 255, 255, 0.62)" strokeWidth={2.4} />
              )}
            </View>
          ) : (
            <View style={{ width: 14 }} />
          )}
        </View>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 20,
    elevation: 8,
  },
  // Variant Borders (Optical Glass Specular Rims)
  borderDark: {
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    borderTopColor: 'rgba(255, 255, 255, 0.72)',
    borderBottomColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(18, 22, 20, 0.35)',
  },
  borderOlive: {
    borderWidth: 1.2,
    borderColor: 'rgba(215, 235, 180, 0.38)',
    borderTopColor: 'rgba(240, 255, 215, 0.82)',
    borderBottomColor: 'rgba(160, 190, 130, 0.20)',
    backgroundColor: 'rgba(24, 32, 22, 0.40)',
  },
  borderCoral: {
    borderWidth: 1.2,
    borderColor: 'rgba(255, 175, 160, 0.40)',
    borderTopColor: 'rgba(255, 220, 210, 0.85)',
    borderBottomColor: 'rgba(255, 113, 95, 0.22)',
    backgroundColor: 'rgba(38, 20, 18, 0.42)',
  },
  // Substrate Tints
  tintDark: {
    backgroundColor: 'rgba(14, 18, 16, 0.52)',
  },
  tintOlive: {
    backgroundColor: 'rgba(32, 44, 28, 0.50)',
  },
  tintCoral: {
    backgroundColor: 'rgba(48, 22, 18, 0.48)',
  },
  // Grain Texture
  grainTexture: {
    opacity: 0.055,
  },
  // Specular Curvature Maps
  specularWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: 0.22,
  },
  specularCap: {
    opacity: 0.9,
  },
  specularFlexSpacer: {
    flex: 1,
  },
  // Top Specular Sheen
  topSheenLine: {
    position: 'absolute',
    top: 1,
    left: 28,
    right: 28,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    opacity: 0.75,
  },
  // Content Layout
  contentRow: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    zIndex: 10,
  },
  // Left Circular Inset Frosted Pod
  iconPod: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.30)',
    borderTopColor: 'rgba(255, 255, 255, 0.60)',
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
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
  // Centered Typography
  titleText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontSize: 16.5,
    fontWeight: '600',
    letterSpacing: 0.35,
    color: '#FFFDF9',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
    paddingHorizontal: 8,
  },
  // Right Indicator
  rightIndicatorContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
});
