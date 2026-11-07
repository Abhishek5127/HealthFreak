import React from 'react';
import { StyleProp, ViewStyle, TextStyle, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { GlassButton, GlassButtonSize } from './GlassButton';

export interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'coral' | 'white' | 'forest' | 'surface' | 'outline' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  titleColor?: string;
}

/**
 * PrimaryButton: Authentic Apple iOS Control Center Frosted Glass Capsule CTA.
 *
 * Rules:
 * - If title is white (#FFFFFF or variant='white'/'glass') -> Transparent frosted glass
 *   (exact style of login screen button & bottom bar).
 * - If title is colored (e.g. coral #FF715F, forest #4AB87A, sage #C9D9CA) ->
 *   Non-transparent lighter shade of that title color with frosted blur, specular rims, and top sheen.
 */
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
  titleColor,
}) => {
  // Determine default title color based on variant
  let resolvedColor = titleColor;

  if (!resolvedColor && textStyle) {
    const flat = StyleSheet.flatten(textStyle);
    if (flat && flat.color) {
      resolvedColor = flat.color as string;
    }
  }

  if (!resolvedColor) {
    switch (variant) {
      case 'white':
      case 'glass':
        resolvedColor = '#FFFFFF';
        break;
      case 'forest':
        resolvedColor = Colors.forestGreenLight;
        break;
      case 'surface':
      case 'outline':
        resolvedColor = Colors.lightSage;
        break;
      case 'coral':
      default:
        resolvedColor = Colors.coralCTA;
        break;
    }
  }

  const glassSize: GlassButtonSize = size;

  return (
    <GlassButton
      title={title}
      titleColor={resolvedColor}
      onPress={onPress}
      icon={icon}
      iconPosition={iconPosition}
      loading={loading}
      disabled={disabled}
      size={glassSize}
      style={style}
      textStyle={textStyle}
    />
  );
};
