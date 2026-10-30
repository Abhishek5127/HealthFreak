import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
}

export const DishaLogoEmblem: React.FC<LogoProps> = ({ size = 48 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Defs>
        <LinearGradient id="dishaGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#C9D9CA" />
          <Stop offset="100%" stopColor="#385D4B" />
        </LinearGradient>
      </Defs>
      {/* Outer rounded organic petal / wellness ring */}
      <Path
        d="M 32 8 C 45 8 56 19 56 32 C 56 45 45 56 32 56 C 19 56 8 45 8 32 C 8 19 19 8 32 8 Z"
        stroke="url(#dishaGrad)"
        strokeWidth="3.5"
        strokeDasharray="90 20"
      />
      {/* Inner blooming seed / sunlight center */}
      <Circle cx="32" cy="32" r="10" fill="#EAD66F" />
      {/* Gentle leaf curve */}
      <Path
        d="M 32 22 C 38 26 40 34 36 40 C 32 44 26 42 24 36 C 22 30 26 24 32 22 Z"
        fill="#385D4B"
        opacity={0.85}
      />
    </Svg>
  );
};

export const DishaWordmark: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const isLarge = size === 'lg';
  const isSmall = size === 'sm';

  return (
    <View style={styles.wordmarkContainer}>
      <Text
        style={[
          styles.brandTitle,
          isLarge && styles.brandTitleLg,
          isSmall && styles.brandTitleSm,
        ]}
      >
        Disha <Text style={styles.brandTitleAccent}>Health</Text>
      </Text>
      {!isSmall && (
        <Text style={styles.brandTagline}>
          Personalized Whole-Body Vitality
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wordmarkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes['2xl'],
    fontFamily: Typography.fontFamilies.serif,
    letterSpacing: Typography.letterSpacing.tight,
  },
  brandTitleLg: {
    fontSize: Typography.fontSizes['4xl'],
  },
  brandTitleSm: {
    fontSize: Typography.fontSizes.lg,
  },
  brandTitleAccent: {
    color: Colors.lightSage,
    fontFamily: Typography.fontFamilies.serifItalic,
  },
  brandTagline: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
    letterSpacing: Typography.letterSpacing.wide,
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
