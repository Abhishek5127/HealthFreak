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
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

interface GoogleSignInButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onPress,
  isLoading = false,
  disabled = false,
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

  return (
    <Pressable
      onPress={handlePress}
      disabled={!isInteractive}
      style={({ pressed }) => [
        styles.button,
        pressed && isInteractive && styles.buttonPressed,
        (!isInteractive || disabled) && styles.buttonDisabled,
      ]}
    >
      <View style={styles.contentRow}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" style={styles.spinner} />
        ) : (
          <View style={styles.logoWrapper}>
            <GoogleLogo size={20} />
          </View>
        )}
        <Text style={styles.buttonText}>
          {isLoading ? 'Connecting to Google...' : 'Continue with Google'}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 54,
    backgroundColor: '#1E2520',
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: '#2F3C31',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonPressed: {
    backgroundColor: '#263129',
    borderColor: Colors.forestGreenLight,
    transform: [{ scale: 0.985 }],
  },
  buttonDisabled: {
    opacity: 0.65,
    borderColor: '#242D26',
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
    color: '#FFFFFF',
    fontSize: Typography.fontSizes.md,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.3,
  },
});

