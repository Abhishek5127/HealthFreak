import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Svg, {
  Path,
  Circle,
  G,
  Ellipse,
  Polygon,
  Rect,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { CheckInMood } from '../../types';

interface CharacterProps {
  size?: number;
  animate?: boolean;
}

// 1. Energized / Home Hero: The Yellow Sun/Star Character
export const EnergizedSunCharacter: React.FC<CharacterProps> = ({
  size = 140,
  animate = true,
}) => {
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const legSwing = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;

    translateY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    rotation.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(-4, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    legSwing.value = withRepeat(
      withSequence(
        withTiming(6, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(-6, { duration: 400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [animate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotateZ: `${rotation.value}deg` },
    ],
  }));

  // Scaled coordinates for a 160x160 viewBox
  return (
    <Animated.View style={[styles.container, { width: size, height: size }, animatedStyle]}>
      <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
        {/* Left Arm: Waving / Peace Sign */}
        <Path
          d="M 45 80 C 25 75 18 55 24 45 C 26 40 32 42 30 48 C 28 54 36 65 52 72"
          stroke="#191C1A"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Peace sign fingers */}
        <Path
          d="M 24 45 L 20 32 M 24 45 L 30 34"
          stroke="#191C1A"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Right Arm: dynamic trailing arm */}
        <Path
          d="M 115 88 C 135 90 148 105 140 120 C 136 126 128 122 132 115 C 135 110 130 98 112 85"
          stroke="#191C1A"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Left Leg: Running step */}
        <Path
          d="M 68 115 C 60 130 45 140 38 135 C 34 132 38 124 45 126"
          stroke="#191C1A"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Left Foot */}
        <Ellipse cx="38" cy="135" rx="8" ry="4.5" fill="#191C1A" transform="rotate(-15 38 135)" />

        {/* Right Leg: Trailing bent leg */}
        <Path
          d="M 92 118 C 105 130 125 125 134 116"
          stroke="#191C1A"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Right Foot */}
        <Ellipse cx="134" cy="116" rx="8" ry="4.5" fill="#191C1A" transform="rotate(25 134 116)" />

        {/* Main Star Body: 10-point spiky star */}
        <Polygon
          points="
            80,30  94,48 116,42 120,64 140,75 
            130,95 138,118 116,118 106,138 85,128 
            70,140 58,122 36,124 42,102 24,90 
            38,72 32,50 54,52 64,32
          "
          fill="#F5C542"
          stroke="#E5B22E"
          strokeWidth="1.5"
        />

        {/* Happy Face */}
        {/* Eyes */}
        <Circle cx="68" cy="78" r="4" fill="#191C1A" />
        <Circle cx="96" cy="78" r="4" fill="#191C1A" />

        {/* Curved Smile */}
        <Path
          d="M 66 90 Q 82 108 98 90"
          stroke="#191C1A"
          strokeWidth="3.8"
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
};

// 2. Calm: Pink Hexagon Character with Folded Arms
export const CalmHexagonCharacter: React.FC<CharacterProps> = ({
  size = 140,
  animate = true,
}) => {
  const breatheY = useSharedValue(0);
  const breatheScale = useSharedValue(1);

  useEffect(() => {
    if (!animate) return;
    breatheY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    breatheScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [animate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: breatheY.value },
      { scale: breatheScale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, animatedStyle]}>
      <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
        {/* Legs: straight calm standing */}
        <Path d="M 72 120 L 70 148 L 62 148" stroke="#191C1A" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M 88 120 L 90 148 L 98 148" stroke="#191C1A" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Arms folded in front: rounded oval loop */}
        <Path
          d="M 52 100 C 44 112 55 125 80 125 C 105 125 116 112 108 100 C 102 92 58 92 52 100 Z"
          fill="#355544"
          stroke="#191C1A"
          strokeWidth="2.5"
        />
        {/* Folded arm crease lines */}
        <Path d="M 58 105 C 70 115 88 115 102 105" stroke="#191C1A" strokeWidth="2.2" strokeLinecap="round" />
        <Path d="M 64 102 C 68 112 76 116 82 116" stroke="#191C1A" strokeWidth="1.8" strokeLinecap="round" />
        <Path d="M 96 102 C 92 112 84 116 78 116" stroke="#191C1A" strokeWidth="1.8" strokeLinecap="round" />

        {/* Hexagon Head in Warm Pink */}
        <Polygon
          points="80,24 118,44 118,88 80,108 42,88 42,44"
          fill="#E891BA"
          stroke="#D878A6"
          strokeWidth="1.5"
        />

        {/* Peaceful Sleeping Eyes */}
        <Path d="M 62 60 Q 68 55 74 60" stroke="#191C1A" strokeWidth="3" strokeLinecap="round" />
        <Path d="M 86 60 Q 92 55 98 60" stroke="#191C1A" strokeWidth="3" strokeLinecap="round" />

        {/* Tiny vertical nose */}
        <Path d="M 80 62 L 80 69" stroke="#191C1A" strokeWidth="2.5" strokeLinecap="round" />

        {/* Sweet relaxed mouth */}
        <Ellipse cx="80" cy="76" rx="3.5" ry="2.5" fill="#191C1A" />
      </Svg>
    </Animated.View>
  );
};

// 3. Balanced: Green Clover 4-Leaf Character doing Yoga Tree Pose
export const BalancedTreeCharacter: React.FC<CharacterProps> = ({
  size = 140,
  animate = true,
}) => {
  const sway = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    sway.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(-3, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [animate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${sway.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, animatedStyle]}>
      <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
        {/* Standing Leg: Strong grounded */}
        <Path d="M 82 118 L 84 150 L 92 150" stroke="#191C1A" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Bent Leg in Tree Pose: forming 4-shape */}
        <Path
          d="M 82 118 L 60 130 L 82 134"
          stroke="#191C1A"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Long thin arms reaching up in prayer above head */}
        <Path
          d="M 52 82 C 40 50 55 28 78 20 M 108 82 C 120 50 105 28 82 20"
          stroke="#191C1A"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* Hands pressed together */}
        <Path
          d="M 78 20 C 76 12 84 12 82 20"
          stroke="#191C1A"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Clover / 4-petal head in Vibrant Green */}
        <G fill="#68BF7B" stroke="#52A865" strokeWidth="1.5">
          <Circle cx="64" cy="62" r="22" />
          <Circle cx="96" cy="62" r="22" />
          <Circle cx="64" cy="92" r="22" />
          <Circle cx="96" cy="92" r="22" />
          <Rect x="64" y="62" width="32" height="30" strokeWidth="0" />
        </G>

        {/* Zen Eyes */}
        <Path d="M 68 76 Q 74 72 78 76" stroke="#191C1A" strokeWidth="3" strokeLinecap="round" />
        <Path d="M 82 76 Q 86 72 92 76" stroke="#191C1A" strokeWidth="3" strokeLinecap="round" />

        {/* Nose & tiny centered smile */}
        <Path d="M 80 77 L 80 83" stroke="#191C1A" strokeWidth="2.5" strokeLinecap="round" />
        <Ellipse cx="80" cy="88" rx="3.5" ry="2.2" fill="#191C1A" />
      </Svg>
    </Animated.View>
  );
};

// 4. Low Energy / Resting Character: Soft Pill Character Resting
export const LowEnergyCharacter: React.FC<CharacterProps> = ({
  size = 140,
  animate = true,
}) => {
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    breathe.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [animate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: breathe.value }],
  }));

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, animatedStyle]}>
      <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
        {/* Soft rounded body lying down / slouching cozy */}
        <Ellipse
          cx="80"
          cy="92"
          rx="48"
          ry="32"
          fill="#A3B4A6"
          stroke="#8A9D8D"
          strokeWidth="1.5"
        />

        {/* Resting sleepy eyes */}
        <Path d="M 62 88 Q 70 94 76 88" stroke="#191C1A" strokeWidth="3" strokeLinecap="round" />
        <Path d="M 84 88 Q 90 94 98 88" stroke="#191C1A" strokeWidth="3" strokeLinecap="round" />

        {/* Little 'zzz' floaters */}
        <Path d="M 112 55 L 122 55 L 112 65 L 122 65" stroke="#F4F2EC" strokeWidth="2.2" strokeLinecap="round" opacity={0.8} />
        <Path d="M 126 40 L 134 40 L 126 48 L 134 48" stroke="#F4F2EC" strokeWidth="2.2" strokeLinecap="round" opacity={0.6} />

        {/* Cute resting legs */}
        <Ellipse cx="50" cy="116" rx="10" ry="6" fill="#191C1A" />
        <Ellipse cx="110" cy="116" rx="10" ry="6" fill="#191C1A" />
      </Svg>
    </Animated.View>
  );
};

// Character Switcher by Mood
export const CheckInCharacterView: React.FC<{
  mood: CheckInMood;
  size?: number;
  animate?: boolean;
}> = ({ mood, size = 150, animate = true }) => {
  switch (mood) {
    case 'calm':
      return <CalmHexagonCharacter size={size} animate={animate} />;
    case 'balanced':
      return <BalancedTreeCharacter size={size} animate={animate} />;
    case 'energized':
      return <EnergizedSunCharacter size={size} animate={animate} />;
    case 'lowEnergy':
      return <LowEnergyCharacter size={size} animate={animate} />;
    case 'tense':
      return <CalmHexagonCharacter size={size} animate={animate} />;
    default:
      return <EnergizedSunCharacter size={size} animate={animate} />;
  }
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

