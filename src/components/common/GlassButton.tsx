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
import { Typography } from '../../theme/typography';
import {
  getGlassTheme,
  SPECULAR_LEFT,
  SPECULAR_RIGHT,
  GRAIN_TEXTURE,
} from '../../utils/glassTheme';

export type GlassButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface GlassButtonProps {
  title?: string;
  titleColor?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  rightIndicator?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  size?: GlassButtonSize;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
  testID?: string;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  title,
  titleColor,
  onPress,
  icon,
  iconPosition = 'left',
  rightIndicator,
  loading = false,
  disabled = false,
  size = 'md',
  height: customHeight,
  borderRadius: customRadius,
  style,
  containerStyle,
  contentStyle,
  textStyle,
  children,
  testID,
}) => {
  const scale = useSharedValue(1);

  // Extract explicit color from textStyle if titleColor is not provided
  let effectiveTitleColor = titleColor;
  if (!effectiveTitleColor && textStyle) {
    const flatText = StyleSheet.flatten(textStyle);
    if (flatText && flatText.color) {
      effectiveTitleColor = flatText.color as string;
    }
  }

  const theme = getGlassTheme(effectiveTitleColor);

  const defaultHeight =
    size === 'xs' ? 32 : size === 'sm' ? 42 : size === 'lg' ? 60 : 52;
  const height = customHeight ?? defaultHeight;
  const borderRadius = customRadius ?? height / 2;

  const handlePressIn = () => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    scale.value = withTiming(0.965, {
      duration: 85,
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

  const specularCapWidth = Math.min(borderRadius, 32);

  return (
    <Animated.View
      style={[
        styles.shadowContainer,
        { borderRadius },
        disabled && styles.disabledContainer,
        animatedStyle,
        style,
      ]}
      renderToHardwareTextureAndroid={true}
    >
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        unstable_pressDelay={0}
        android_disableSound={true}
        style={[
          styles.glassContainer,
          {
            height,
            borderRadius,
            backgroundColor: theme.substrateColor,
            borderColor: theme.borderColor,
            borderTopColor: theme.borderTopColor,
            borderBottomColor: theme.borderBottomColor,
          },
          containerStyle,
        ]}
      >
        {/* 1. Underlying Native Frosted Blur */}
        <View style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 65 : 45}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          {/* Tint overlay layer for contrast */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: theme.tintOverlayColor },
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

        {/* 3. Inset 3D Specular Curvature Caps */}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.specularWrapper, { borderRadius }]}
        >
          <Image
            source={SPECULAR_LEFT}
            style={[styles.specularCap, { width: specularCapWidth, height }]}
            contentFit="fill"
          />
          <View style={styles.specularFlexSpacer} />
          <Image
            source={SPECULAR_RIGHT}
            style={[styles.specularCap, { width: specularCapWidth, height }]}
            contentFit="fill"
          />
        </View>

        {/* 4. Top Specular Sheen Line */}
        <View
          pointerEvents="none"
          style={[
            styles.topSheenLine,
            {
              backgroundColor: theme.topSheenColor,
              left: Math.max(14, borderRadius * 0.5),
              right: Math.max(14, borderRadius * 0.5),
            },
          ]}
        />

        {/* 5. Capsule Content */}
        {loading ? (
          <View style={[styles.contentRow, contentStyle]}>
            <ActivityIndicator size="small" color={theme.textColor} />
          </View>
        ) : children ? (
          <View style={[styles.childrenWrapper, contentStyle]}>{children}</View>
        ) : (
          <View style={[styles.contentRow, contentStyle]}>
            {icon && iconPosition === 'left' ? (
              <View style={styles.leftIconWrapper}>{icon}</View>
            ) : null}

            {title ? (
              <Text
                style={[
                  styles.titleText,
                  size === 'xs' && styles.textXs,
                  size === 'sm' && styles.textSm,
                  size === 'lg' && styles.textLg,
                  {
                    color: theme.textColor,
                    textShadowColor: theme.textShadowColor,
                  },
                  textStyle,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {title}
              </Text>
            ) : null}

            {icon && iconPosition === 'right' ? (
              <View style={styles.rightIconWrapper}>{icon}</View>
            ) : null}

            {rightIndicator ? (
              <View style={styles.rightIndicatorWrapper}>{rightIndicator}</View>
            ) : null}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  glassContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1.2,
    paddingHorizontal: 16,
  },
  grainTexture: {
    opacity: 0.055,
  },
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
  topSheenLine: {
    position: 'absolute',
    top: 1,
    height: 1,
    opacity: 0.75,
  },
  childrenWrapper: {
    zIndex: 10,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  leftIconWrapper: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIconWrapper: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIndicatorWrapper: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSizes.base,
    letterSpacing: 0.3,
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  textXs: {
    fontSize: Typography.fontSizes.xs - 1,
  },
  textSm: {
    fontSize: Typography.fontSizes.sm,
  },
  textLg: {
    fontSize: Typography.fontSizes.md,
  },
  disabledContainer: {
    opacity: 0.45,
  },
});

