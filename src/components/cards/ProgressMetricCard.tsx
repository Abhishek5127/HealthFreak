import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { ProgressRing } from '../illustrations/ProgressRing';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ProgressMetricCardProps {
  title: string;
  value: string;
  unit: string;
  percentage: number;
  color?: string;
  icon: React.ReactNode;
  onPress?: () => void;
}

export const ProgressMetricCard: React.FC<ProgressMetricCardProps> = ({
  value,
  unit,
  percentage,
  color = '#FF715F',
  icon,
  onPress,
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 14 });
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
      style={[styles.card, animatedStyle]}
    >
      <View style={styles.ringWrapper}>
        <ProgressRing
          size={46}
          strokeWidth={3.5}
          percentage={percentage}
          color={color}
          bgColor="#28302A"
        >
          {icon}
        </ProgressRing>
      </View>

      <View style={styles.metricRow}>
        <Text style={styles.valueText}>{value}</Text>
        <Text style={styles.unitText}> {unit}</Text>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 104,
    backgroundColor: '#1C201D',
    borderRadius: Spacing.borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#262D28',
    marginHorizontal: 4,
  },
  ringWrapper: {
    marginBottom: 10,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  valueText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm + 1,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  unitText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
});

