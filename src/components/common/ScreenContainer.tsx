import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../../theme/colors';
import { Spacing } from '../../theme/spacing';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  withBottomInset?: boolean;
  withTopInset?: boolean;
  backgroundColor?: string;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  withBottomInset = true,
  withTopInset = true,
  backgroundColor = Colors.background,
}) => {
  const insets = useSafeAreaInsets();

  const containerPadding = {
    paddingTop: withTopInset ? Math.max(insets.top, 14) : 0,
    paddingBottom: withBottomInset ? Math.max(insets.bottom, 16) + Spacing.layout.tabBarHeight : 0,
  };

  return (
    <View style={[styles.root, { backgroundColor }]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scrollable ? (
          <ScrollView
            style={[styles.flex, style]}
            contentContainerStyle={[
              styles.scrollContent,
              containerPadding,
              contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, containerPadding, style]}>
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.layout.screenPadding,
  },
});

