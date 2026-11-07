import React, { useEffect } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Typography } from '../../theme/typography';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPECULAR_LEFT = require('../../../assets/liquidGlass/specular-map-left.png');
const SPECULAR_MIDDLE = require('../../../assets/liquidGlass/specular-map-middle.png');
const SPECULAR_RIGHT = require('../../../assets/liquidGlass/specular-map-right.png');

const CHROME_BG = require('../../../assets/liquidGlass/chrome3.png');
const SILK_BG = require('../../../assets/liquidGlass/silk3.png');
const ROCKS_BG = require('../../../assets/liquidGlass/rocks3.png');

export type LiquidGlassTheme = 'chrome' | 'silk' | 'prismatic';

export interface LiquidGlassButtonProps {
  theme: LiquidGlassTheme;
  title?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  height?: number;
  testID?: string;
}

/**
 * Authentic Liquid Glass button component recreated from the liquid-glass repository:
 * - Fluid refractive background layer (chrome, silk, or prismatic rocks) with subtle liquid drift
 * - Inset specular curvature mapping via specular-map textures (left, middle, right)
 * - Optical chromatic aberration fringe (RGB prism edge splitting)
 * - 3 distinct themes matching the liquid-glass library
 * - Smooth spring physics with slight liquid tilt on press
 */
export const LiquidGlassButton: React.FC<LiquidGlassButtonProps> = ({
  theme,
  title,
  children,
  onPress,
  icon,
  iconPosition = 'right',
  loading = false,
  loadingText,
  disabled = false,
  style,
  textStyle,
  height = 60,
  testID,
}) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const liquidDrift = useSharedValue(0);

  // Subtle continuous liquid drift animation
  useEffect(() => {
    liquidDrift.value = withRepeat(
      withTiming(1, { duration: 12000, easing: Easing.linear }),
      -1,
      true
    );
  }, [liquidDrift]);

  const handlePressIn = () => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    scale.value = withTiming(0.965, {
      duration: 100,
      easing: Easing.out(Easing.ease),
    });
    rotation.value = withTiming(-0.8, {
      duration: 120,
      easing: Easing.out(Easing.ease),
    });
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    scale.value = withSpring(1, {
      damping: 14,
      stiffness: 240,
      mass: 0.7,
    });
    rotation.value = withSpring(0, {
      damping: 14,
      stiffness: 240,
    });
  };

  const animatedButton = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const animatedLiquidLayer = useAnimatedStyle(() => {
    const rotate = `${liquidDrift.value * 360}deg`;
    return {
      transform: [{ rotate }, { scale: 1.4 }],
    };
  });

  const borderRadius = height / 2;
  const isChrome = theme === 'chrome';
  const isSilk = theme === 'silk';
  const isPrismatic = theme === 'prismatic';

  const bgSource = isChrome ? CHROME_BG : isSilk ? SILK_BG : ROCKS_BG;

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
        isChrome && styles.chromeBorder,
        isSilk && styles.silkBorder,
        isPrismatic && styles.prismaticBorder,
        disabled && styles.disabled,
        animatedButton,
        style,
      ]}
    >
      {/* 1. Underlying Swirling Liquid Refraction Texture */}
      <View style={[StyleSheet.absoluteFill, styles.liquidBgContainer, { borderRadius }]}>
        <Animated.View style={[styles.liquidBgImageWrapper, animatedLiquidLayer]}>
          <Image
            source={bgSource}
            style={styles.liquidBgImage}
            contentFit="cover"
            priority="high"
          />
        </Animated.View>
      </View>

      {/* 2. Liquid Glass Tint Overlay Layer */}
      <View
        style={[
          StyleSheet.absoluteFill,
          isChrome && styles.chromeOverlay,
          isSilk && styles.silkOverlay,
          isPrismatic && styles.prismaticOverlay,
          { borderRadius },
        ]}
      />

      {/* 3. Chromatic Aberration RGB Edge Fringe (Prism refraction) */}
      <View
        pointerEvents="none"
        style={[
          styles.chromaticFringeCyan,
          { borderRadius },
          isSilk && styles.chromaticFringeEmerald,
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.chromaticFringeMagenta,
          { borderRadius },
          isSilk && styles.chromaticFringeAmber,
        ]}
      />

      {/* 4. Specular Map Curvature Layers (Left, Middle, Right from liquid-glass) */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.specularWrapper, { borderRadius }]}>
        <Image
          source={SPECULAR_LEFT}
          style={[styles.specularCap, { width: height / 2, height }]}
          contentFit="fill"
        />
        <Image
          source={SPECULAR_MIDDLE}
          style={[styles.specularMiddle, { height }]}
          contentFit="fill"
        />
        <Image
          source={SPECULAR_RIGHT}
          style={[styles.specularCap, { width: height / 2, height }]}
          contentFit="fill"
        />
      </View>

      {/* 5. Inset Specular Rim Highlight Line */}
      <View pointerEvents="none" style={styles.topSheenLine} />

      {/* 6. Content */}
      <View style={styles.contentRow}>
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            {loadingText ? (
              <Text style={[styles.label, textStyle]}>{loadingText}</Text>
            ) : null}
          </>
        ) : children ? (
          children
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <View style={styles.iconLeft}>{icon}</View>
            )}
            {title ? (
              <Text
                style={[
                  styles.label,
                  isChrome && styles.chromeLabel,
                  isSilk && styles.silkLabel,
                  isPrismatic && styles.prismaticLabel,
                  textStyle,
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
            ) : null}
            {icon && iconPosition === 'right' && (
              <View style={styles.iconRight}>{icon}</View>
            )}
          </>
        )}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 20,
    elevation: 8,
  },
  // Theme Borders & Shadows
  chromeBorder: {
    borderWidth: 1.3,
    borderColor: 'rgba(255, 255, 255, 0.40)',
    borderTopColor: 'rgba(255, 255, 255, 0.85)',
    borderBottomColor: 'rgba(255, 255, 255, 0.20)',
    backgroundColor: '#09090B',
  },
  silkBorder: {
    borderWidth: 1.3,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderTopColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: '#171B19',
  },
  prismaticBorder: {
    borderWidth: 1.3,
    borderColor: 'rgba(255, 255, 255, 0.38)',
    borderTopColor: 'rgba(255, 255, 255, 0.88)',
    borderBottomColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: '#0E1118',
  },
  // Liquid Background Container
  liquidBgContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liquidBgImageWrapper: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liquidBgImage: {
    width: '100%',
    height: '100%',
    opacity: 0.45,
  },
  // Tint Overlays
  chromeOverlay: {
    backgroundColor: 'rgba(9, 9, 11, 0.52)',
  },
  silkOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  prismaticOverlay: {
    backgroundColor: 'rgba(14, 18, 28, 0.42)',
  },
  // Chromatic Aberration Fringe (RGB Prism Split)
  chromaticFringeCyan: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.35)',
    transform: [{ translateX: -0.8 }, { translateY: -0.8 }],
    opacity: 0.7,
  },
  chromaticFringeMagenta: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: 'rgba(255, 30, 140, 0.30)',
    transform: [{ translateX: 0.8 }, { translateY: 0.8 }],
    opacity: 0.7,
  },
  chromaticFringeEmerald: {
    borderColor: 'rgba(80, 250, 160, 0.32)',
  },
  chromaticFringeAmber: {
    borderColor: 'rgba(255, 200, 80, 0.30)',
  },
  // Specular Curvature Mapping Layers
  specularWrapper: {
    flexDirection: 'row',
    opacity: 0.75,
  },
  specularCap: {},
  specularMiddle: {
    flex: 1,
  },
  topSheenLine: {
    position: 'absolute',
    top: 1.5,
    left: 24,
    right: 24,
    height: 1.2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    zIndex: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  label: {
    fontFamily: Platform.select({
      ios: 'System',
      default: Typography.fontFamilies.sansSemiBold,
    }),
    fontWeight: '600',
    fontSize: 16.5,
    letterSpacing: -0.2,
    textAlign: 'center',
    color: '#FAFAFA',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  chromeLabel: {
    color: '#FAFAFA',
  },
  silkLabel: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
  },
  prismaticLabel: {
    color: '#FAFAFA',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
