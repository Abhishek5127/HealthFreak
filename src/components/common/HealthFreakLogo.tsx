import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

const LOGO_ANIMATED_GIF = require('../../../assets/logo/HealthFreakLogoTranasparent.gif');
const LOGO_STATIC_PNG = require('../../../assets/logo/HealthFreakLogoTransparent.png');
const LOGO_BLACK_BG_PNG = require('../../../assets/logo/HealthFreakLogoBlackbg.png');

export interface HealthFreakLogoProps {
  size?: number;
  animated?: boolean;
  withGlow?: boolean;
  withBlackBg?: boolean;
  showWordmark?: boolean;
  wordmarkSize?: 'sm' | 'md' | 'lg' | 'xl';
  orientation?: 'horizontal' | 'vertical';
  style?: ViewStyle;
}

export const HealthFreakWordmark: React.FC<{
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  tagline?: string;
  style?: ViewStyle;
}> = ({
  size = 'md',
  showTagline = true,
  tagline = 'PERSONALIZED WELLNESS & VITALITY',
  style,
}) => {
  return (
    <View style={[styles.wordmarkContainer, style]}>
      <View style={styles.brandRow}>
        <Text
          style={[
            styles.brandHealth,
            size === 'sm' && styles.brandHealthSm,
            size === 'md' && styles.brandHealthMd,
            size === 'lg' && styles.brandHealthLg,
            size === 'xl' && styles.brandHealthXl,
          ]}
        >
          Health
        </Text>
        <Text
          style={[
            styles.brandFreak,
            size === 'sm' && styles.brandFreakSm,
            size === 'md' && styles.brandFreakMd,
            size === 'lg' && styles.brandFreakLg,
            size === 'xl' && styles.brandFreakXl,
          ]}
        >
          {' '}Freak
        </Text>
      </View>

      {showTagline && size !== 'sm' && (
        <Text
          style={[
            styles.brandTagline,
            size === 'xl' && styles.brandTaglineLg,
          ]}
        >
          {tagline}
        </Text>
      )}
    </View>
  );
};

export const HealthFreakLogo: React.FC<HealthFreakLogoProps> = ({
  size = 64,
  animated = true,
  withGlow = false,
  withBlackBg = false,
  showWordmark = false,
  wordmarkSize = 'md',
  orientation = 'vertical',
  style,
}) => {
  const source = withBlackBg
    ? LOGO_BLACK_BG_PNG
    : animated
    ? LOGO_ANIMATED_GIF
    : LOGO_STATIC_PNG;

  const logoNode = (
    <View
      style={[
        styles.logoWrapper,
        { width: size, height: size },
        withGlow && styles.glowActive,
      ]}
    >
      {withGlow && (
        <View
          style={[
            styles.glowHalo,
            {
              width: size * 1.35,
              height: size * 1.35,
              borderRadius: (size * 1.35) / 2,
            },
          ]}
        />
      )}
      <Image
        source={source}
        style={{ width: size, height: size }}
        contentFit="contain"
        autoplay={animated}
        cachePolicy="memory-disk"
      />
    </View>
  );

  if (!showWordmark) {
    return <View style={style}>{logoNode}</View>;
  }

  const isVertical = orientation === 'vertical';

  return (
    <View
      style={[
        styles.combinedContainer,
        isVertical ? styles.containerVertical : styles.containerHorizontal,
        style,
      ]}
    >
      {logoNode}
      <HealthFreakWordmark
        size={wordmarkSize}
        style={isVertical ? styles.wordmarkVerticalMargin : styles.wordmarkHorizontalMargin}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowActive: {
    // shadow effects for iOS
    shadowColor: '#4AB87A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    // elevation for Android
    elevation: 8,
  },
  glowHalo: {
    position: 'absolute',
    backgroundColor: 'rgba(74, 184, 122, 0.16)',
    zIndex: -1,
  },
  combinedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerVertical: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  containerHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmarkVerticalMargin: {
    marginTop: 12,
  },
  wordmarkHorizontalMargin: {
    marginLeft: 12,
  },
  wordmarkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandHealth: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamilies.serif,
    letterSpacing: -0.5,
  },
  brandHealthSm: {
    fontSize: 18,
  },
  brandHealthMd: {
    fontSize: 24,
  },
  brandHealthLg: {
    fontSize: 32,
  },
  brandHealthXl: {
    fontSize: 42,
  },
  brandFreak: {
    color: '#4AB87A',
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: -0.5,
  },
  brandFreakSm: {
    fontSize: 18,
  },
  brandFreakMd: {
    fontSize: 24,
  },
  brandFreakLg: {
    fontSize: 32,
  },
  brandFreakXl: {
    fontSize: 42,
  },
  brandTagline: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansMedium,
    letterSpacing: 2.5,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  brandTaglineLg: {
    fontSize: 12,
    letterSpacing: 3.5,
    marginTop: 8,
  },
});

