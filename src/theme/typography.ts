import { Platform } from 'react-native';

export const Typography = {
  fontFamilies: {
    serif: 'DMSerifDisplay_400Regular',
    serifItalic: 'DMSerifDisplay_400Regular_Italic',
    sansRegular: 'Manrope_400Regular',
    sansMedium: 'Manrope_500Medium',
    sansSemiBold: 'Manrope_600SemiBold',
    sansBold: 'Manrope_700Bold',
  },
  fallbackSerif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  fallbackSans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),

  fontSizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 40,
    display: 48,
  },

  lineHeights: {
    tight: 1.15,
    normal: 1.35,
    relaxed: 1.5,
  },

  letterSpacing: {
    tighter: -0.5,
    tight: -0.2,
    normal: 0,
    wide: 0.5,
    wider: 1.0,
  },
};

