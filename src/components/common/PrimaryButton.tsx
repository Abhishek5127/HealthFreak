import React from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'coral' | 'white' | 'forest' | 'surface' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  variant = 'coral',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withSpring(0.96, { damping: 14, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 200 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getContainerStyle = () => {
    switch (variant) {
      case 'white':
        return styles.whiteContainer;
      case 'forest':
        return styles.forestContainer;
      case 'surface':
        return styles.surfaceContainer;
      case 'outline':
        return styles.outlineContainer;
      case 'coral':
      default:
        return styles.coralContainer;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'white':
        return styles.whiteText;
      case 'forest':
        return styles.forestText;
      case 'surface':
        return styles.surfaceText;
      case 'outline':
        return styles.outlineText;
      case 'coral':
      default:
        return styles.coralText;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return styles.sizeSm;
      case 'lg':
        return styles.sizeLg;
      case 'md':
      default:
        return styles.sizeMd;
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.baseContainer,
        getContainerStyle(),
        getSizeStyle(),
        disabled && styles.disabledContainer,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'white' ? Colors.forestGreen : Colors.textPrimary}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && <View style={styles.leftIcon}>{icon}</View>}
          <Text
            style={[
              styles.baseText,
              getTextStyle(),
              disabled && styles.disabledText,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && <View style={styles.rightIcon}>{icon}</View>}
        </View>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    borderRadius: Spacing.borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  sizeSm: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  sizeMd: {
    paddingVertical: 15,
    paddingHorizontal: 28,
  },
  sizeLg: {
    paddingVertical: 18,
    paddingHorizontal: 34,
  },
  coralContainer: {
    backgroundColor: Colors.coralCTA,
    shadowColor: Colors.coralCTA,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  coralText: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamilies.sansBold,
  },
  whiteContainer: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  whiteText: {
    color: Colors.textInverted,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  forestContainer: {
    backgroundColor: Colors.forestGreen,
  },
  forestText: {
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  surfaceContainer: {
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  surfaceText: {
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.lightSage,
  },
  outlineText: {
    color: Colors.lightSage,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  disabledContainer: {
    opacity: 0.45,
  },
  disabledText: {
    color: Colors.textMuted,
  },
  baseText: {
    fontSize: Typography.fontSizes.base,
    letterSpacing: Typography.letterSpacing.normal,
  },
});

