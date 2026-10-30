import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  percentage: number; // 0 to 1
  color?: string;
  bgColor?: string;
  children?: React.ReactNode;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  size = 54,
  strokeWidth = 3.5,
  percentage,
  color = '#FF715F',
  bgColor = '#262D27',
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(1, Math.max(0, percentage)), {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background track circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated Progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          fill="none"
          originX={size / 2}
          originY={size / 2}
          rotation="-90"
        />
      </Svg>
      {children && <View style={styles.content}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

