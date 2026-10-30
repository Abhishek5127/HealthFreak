import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

interface SectionHeaderProps {
  title: string;
  actionText?: string;
  onActionPress?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionText,
  onActionPress,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {actionText && (
        <Pressable
          onPress={onActionPress}
          hitSlop={12}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText}>{actionText}</Text>
          <ChevronRight size={14} color={Colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 14,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.lg,
    fontFamily: Typography.fontFamilies.serif,
    letterSpacing: Typography.letterSpacing.tight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
});

