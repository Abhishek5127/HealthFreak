import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GoogleLogo } from '../illustrations/GoogleLogo';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

interface GoogleSignInButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'light' | 'dark';
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onPress,
  isLoading = false,
  disabled = false,
  variant = 'light',
}) => {
  const handlePress = () => {
    if (isLoading || disabled) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics optional
    }
    onPress();
  };

  const isInteractive = !isLoading && !disabled;
  const isLight = variant === 'light';

  return (
    <Pressable
      onPress={handlePress}
      disabled={!isInteractive}
      style={({ pressed }) => [
        styles.button,
        isLight ? styles.buttonLight : styles.buttonDark,
        pressed && isInteractive && (isLight ? styles.buttonLightPressed : styles.buttonPressed),
        (!isInteractive || disabled) && styles.buttonDisabled,
      ]}
    >
      <View style={styles.contentRow}>
        {isLoading ? (
          <ActivityIndicator size="small" color={isLight ? '#101712' : '#FFFFFF'} style={styles.spinner} />
        ) : (
          <View style={styles.logoWrapper}>
            <GoogleLogo size={20} />
          </View>
        )}
        <Text style={[styles.buttonText, isLight ? styles.buttonLightText : styles.buttonDarkText]}>
          {isLoading ? 'Connecting to Google...' : 'Continue with Google'}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
  },
  buttonLightPressed: {
    backgroundColor: '#EDEDED',
    transform: [{ scale: 0.985 }],
  },
  buttonDark: {
    backgroundColor: '#131A15',
    borderWidth: 1.2,
    borderColor: '#222E25',
  },
  buttonPressed: {
    backgroundColor: '#1B251E',
    borderColor: '#38503F',
    transform: [{ scale: 0.985 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: Spacing.md,
  },
  buttonText: {
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.2,
  },
  buttonLightText: {
    color: '#101712',
  },
  buttonDarkText: {
    color: '#FFFFFF',
  },
});

