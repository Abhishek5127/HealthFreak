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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import { Typography } from '../../theme/typography';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type IOSButtonVariant = 'orange' | 'cream' | 'neutral' | 'outline';
export type IOSButtonSize = 'sm' | 'md' | 'lg';

export interface IOSButtonProps {
  title?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  variant?: IOSButtonVariant;
  size?: IOSButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

/**
 * Premium, minimal iOS-inspired pill button component.
 *
 * Characteristics:
 * - Rounded capsule geometry with balanced proportions
 * - Subtle Apple-style micro-gradient (warm orange or cream neutral)
 * - Soft, understated diffuse shadow (no neon / harsh glow)
 * - SF Pro minimal typography with tight tracking
 * - Tactile spring press animation with scale-down feedback
 */
export const IOSButton: React.FC<IOSButtonProps> = ({
  title,
  children,
  onPress,
  variant = 'orange',
  size = 'md',
  icon,
  iconPosition = 'right',
  loading = false,
  loadingText,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  testID,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = () => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    scale.value = withTiming(0.965, {
      duration: 110,
      easing: Easing.out(Easing.ease),
    });
    opacity.value = withTiming(0.92, {
      duration: 110,
    });
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    scale.value = withSpring(1, {
      damping: 14,
      stiffness: 260,
      mass: 0.7,
    });
    opacity.value = withTiming(1, {
      duration: 140,
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const height = size === 'sm' ? 44 : size === 'lg' ? 60 : 54;
  const borderRadius = height / 2;

  const isOrange = variant === 'orange';
  const isCream = variant === 'cream';
  const isNeutral = variant === 'neutral';
  const isOutline = variant === 'outline';

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          height,
          borderRadius,
        },
        fullWidth ? styles.fullWidth : null,
        isOrange && styles.orangeShadow,
        isCream && styles.creamShadow,
        isNeutral && styles.neutralShadow,
        isOutline && styles.outlineContainer,
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {/* Subtle Apple-style micro-gradient background */}
      {isOrange && (
        <View style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <SvgGradient id="iosOrangeGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#FF7738" />
                <Stop offset="100%" stopColor="#F05814" />
              </SvgGradient>
            </Defs>
            <Rect width="100%" height="100%" rx={borderRadius} ry={borderRadius} fill="url(#iosOrangeGrad)" />
          </Svg>
          {/* Subtle top edge specular highlight (hairline) */}
          <View style={[styles.topSpecularHighlight, { borderRadius }]} />
        </View>
      )}

      {isCream && (
        <View style={[StyleSheet.absoluteFill, styles.creamBackground, { borderRadius }]}>
          {/* Hairline subtle inset border */}
          <View style={[styles.creamBorder, { borderRadius }]} />
        </View>
      )}

      {isNeutral && (
        <View style={[StyleSheet.absoluteFill, styles.neutralBackground, { borderRadius }]}>
          <View style={[styles.neutralBorder, { borderRadius }]} />
        </View>
      )}

      {/* Button Content */}
      <View style={styles.contentRow}>
        {loading ? (
          <>
            <ActivityIndicator
              size="small"
              color={isCream ? '#E65100' : '#FFFBF7'}
              style={styles.spinner}
            />
            {loadingText ? (
              <Text
                style={[
                  styles.label,
                  isOrange && styles.orangeLabel,
                  isCream && styles.creamLabel,
                  isNeutral && styles.neutralLabel,
                  isOutline && styles.outlineLabel,
                  size === 'sm' && styles.labelSm,
                  size === 'lg' && styles.labelLg,
                  textStyle,
                ]}
              >
                {loadingText}
              </Text>
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
                  isOrange && styles.orangeLabel,
                  isCream && styles.creamLabel,
                  isNeutral && styles.neutralLabel,
                  isOutline && styles.outlineLabel,
                  size === 'sm' && styles.labelSm,
                  size === 'lg' && styles.labelLg,
                  disabled && styles.disabledLabel,
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
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    position: 'relative',
    overflow: 'visible',
  },
  fullWidth: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  // Understated, soft iOS shadows
  orangeShadow: {
    backgroundColor: '#F05814',
    shadowColor: '#E04A08',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 3,
  },
  creamShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  neutralShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 2,
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#FF6B2B',
  },
  topSpecularHighlight: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  creamBackground: {
    backgroundColor: '#F7F4EE',
  },
  creamBorder: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: 'rgba(216, 208, 196, 0.75)',
  },
  neutralBackground: {
    backgroundColor: '#1E1C1A',
  },
  neutralBorder: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  // Typography - SF Pro minimal style
  label: {
    fontFamily: Platform.select({
      ios: 'System',
      default: Typography.fontFamilies.sansSemiBold,
    }),
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: -0.25,
    textAlign: 'center',
  },
  labelSm: {
    fontSize: 14.5,
  },
  labelLg: {
    fontSize: 17,
  },
  orangeLabel: {
    color: '#FFFBF7',
  },
  creamLabel: {
    color: '#E65100',
  },
  neutralLabel: {
    color: '#FFFBF7',
  },
  outlineLabel: {
    color: '#FF6B2B',
  },
  disabledLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  spinner: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
