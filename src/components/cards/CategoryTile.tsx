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
  isSelected?: boolean;
  onPress: () => void;
}

export const CategoryTile: React.FC<CategoryTileProps> = ({
  label,
  icon,
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
    backgroundColor: '#1C201D',
    borderWidth: 1,
    borderColor: '#262D28',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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

