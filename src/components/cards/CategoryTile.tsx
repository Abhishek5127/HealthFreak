import React from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CategoryTileProps {
  label: string;
  icon: React.ReactNode;
  badge?: string;
  progress?: number;
  isSelected?: boolean;
  onPress: () => void;
}

export const CategoryTile: React.FC<CategoryTileProps> = ({
  label,
  icon,
  badge,
  progress,
  isSelected = false,
  onPress,
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.94, { damping: 14 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.tile,
        isSelected && styles.tileSelected,
        animatedStyle,
      ]}
    >
      {badge && (
        <View style={[styles.badgeChip, progress !== undefined && progress >= 1 && styles.badgeChipCompleted]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}

      <View style={styles.iconContainer}>{icon}</View>
      <Text
        style={[
          styles.label,
          isSelected && styles.labelSelected,
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  tile: {
    width: 76,
    height: 78,
    borderRadius: Spacing.borderRadius.md,
    backgroundColor: '#1E2320',
    borderWidth: 1,
    borderColor: '#262D28',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    position: 'relative',
  },
  badgeChip: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#203445',
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#376891',
  },
  badgeChipCompleted: {
    backgroundColor: '#1E452B',
    borderColor: '#4AB87A',
  },
  badgeText: {
    color: '#7AD3FA',
    fontSize: 9,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  tileSelected: {
    backgroundColor: '#28342C',
    borderColor: Colors.forestGreenLight,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  labelSelected: {
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
});

