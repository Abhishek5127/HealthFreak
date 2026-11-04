import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Rect,
  Defs,
  LinearGradient,
  Stop,
  ClipPath,
  Circle,
  G,
} from 'react-native-svg';

interface WaterBottleGraphicProps {
  fillPercentage: number; // 0 to 100+
  currentMl: number;
  targetMl: number;
  width?: number;
  height?: number;
}

export const WaterBottleGraphic: React.FC<WaterBottleGraphicProps> = ({
  fillPercentage,
  currentMl,
  targetMl,
  width = 120,
  height = 200,
}) => {
  const isGoalReached = fillPercentage >= 100;
  const clampedPercent = Math.min(Math.max(fillPercentage, 0), 100);

  // Bottle geometry dimensions relative to viewBox (120 x 200)
  const bottleTopY = 38;
  const bottleBottomY = 188;
  const bottleHeight = bottleBottomY - bottleTopY; // 150
  const liquidHeight = (clampedPercent / 100) * bottleHeight;
  const liquidTopY = bottleBottomY - liquidHeight;

  // Bottle inner shape path for clipping water
  const bottleInnerPath = `
    M 44,38
    L 76,38
    C 80,38 84,42 85,47
    L 94,65
    C 98,72 98,78 98,85
    L 98,176
    C 98,184 91,188 83,188
    L 37,188
    C 29,188 22,184 22,176
    L 22,85
    C 22,78 22,72 26,65
    L 35,47
    C 36,42 40,38 44,38
    Z
  `;

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox="0 0 120 200">
        <Defs>
          {/* Water Liquid Gradient */}
          <LinearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#7AD3FA" stopOpacity="0.95" />
            <Stop offset="30%" stopColor="#4FA3E2" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#256EB3" stopOpacity="1" />
          </LinearGradient>

          {/* Water Highlight Gradient */}
          <LinearGradient id="waterHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
            <Stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
          </LinearGradient>

          {/* Glass Outer Highlight */}
          <LinearGradient id="glassShine" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
            <Stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#303C34" stopOpacity="0.2" />
          </LinearGradient>

          {/* Cap Gradient */}
          <LinearGradient id="capGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#3D4B40" />
            <Stop offset="50%" stopColor="#546558" />
            <Stop offset="100%" stopColor="#2B362E" />
          </LinearGradient>

          {/* Liquid Clip Path */}
          <ClipPath id="bottleInsideClip">
            <Path d={bottleInnerPath} />
          </ClipPath>
        </Defs>

        {/* 1. Bottle Glass Background (Empty Volume) */}
        <Path
          d={bottleInnerPath}
          fill="#131B16"
          stroke="#2A352D"
          strokeWidth="3"
        />

        {/* 2. Liquid Fill (Clipped inside bottle) */}
        <G clipPath="url(#bottleInsideClip)">
          {/* Water Base Rect */}
          <Rect
            x="10"
            y={liquidTopY}
            width="100"
            height={liquidHeight + 20}
            fill="url(#waterGradient)"
          />

          {/* Dynamic Liquid Top Meniscus / Wave */}
          {clampedPercent > 0 && clampedPercent < 100 && (
            <Path
              d={`
                M 15,${liquidTopY + 2}
                Q 35,${liquidTopY - 4} 60,${liquidTopY}
                Q 85,${liquidTopY + 4} 105,${liquidTopY - 1}
                L 105,${liquidTopY + 12}
                L 15,${liquidTopY + 12}
                Z
              `}
              fill="#98E1FD"
              opacity="0.8"
            />
          )}

          {/* Liquid Depth & Volume Highlight */}
          <Rect
            x="10"
            y={liquidTopY}
            width="100"
            height={liquidHeight + 20}
            fill="url(#waterHighlight)"
          />

          {/* Rising bubbles when liquid is present */}
          {clampedPercent > 15 && (
            <G opacity="0.6">
              <Circle cx="40" cy={liquidTopY + 30} r="2.5" fill="#FFFFFF" />
              <Circle cx="76" cy={liquidTopY + 45} r="3" fill="#FFFFFF" />
              <Circle cx="55" cy={liquidTopY + 70} r="2" fill="#FFFFFF" />
              <Circle cx="82" cy={liquidTopY + 95} r="2.5" fill="#FFFFFF" />
              <Circle cx="35" cy={liquidTopY + 110} r="3.5" fill="#FFFFFF" />
            </G>
          )}

          {/* 3. HAPPY SMILE FACE (Appears when minimum water intake is hit: >= 100%) */}
          {isGoalReached && (
            <G transform="translate(0, 10)">
              {/* Left Eye: Joyful curved arc ^ */}
              <Path
                d="M 43,105 Q 49,97 55,105"
                stroke="#1B3852"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />
              {/* Right Eye: Joyful curved arc ^ */}
              <Path
                d="M 65,105 Q 71,97 77,105"
                stroke="#1B3852"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />

              {/* Rosy Cheeks (Blush) */}
              <Circle cx="39" cy="113" r="4.5" fill="#FF8BA7" opacity="0.8" />
              <Circle cx="81" cy="113" r="4.5" fill="#FF8BA7" opacity="0.8" />

              {/* Cheerful Open Smiling Mouth with Tongue */}
              <Path
                d="M 49,114 Q 60,132 71,114 Z"
                fill="#1B3852"
              />
              <Path
                d="M 54,122 Q 60,131 66,122 Z"
                fill="#FF6B8B"
              />
            </G>
          )}
        </G>

        {/* 4. Glass Surface Gloss / Vertical Reflection */}
        <Path
          d="
            M 28,75
            L 28,175
            C 28,178 30,180 33,180
            L 33,75
            Z
          "
          fill="url(#glassShine)"
        />

        {/* 5. Volume Measurement Graduation Ticks */}
        <G opacity="0.45">
          {/* 75% Mark */}
          <Path d="M 86,75 L 94,75" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          {/* 50% Mark */}
          <Path d="M 83,112 L 94,112" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          {/* 25% Mark */}
          <Path d="M 86,150 L 94,150" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        </G>

        {/* 6. Bottle Cap & Spout Neck */}
        {/* Neck Band */}
        <Rect
          x="44"
          y="28"
          width="32"
          height="10"
          rx="2"
          fill="#3A463D"
          stroke="#4F5E53"
          strokeWidth="1"
        />

        {/* Screw Cap */}
        <Rect
          x="41"
          y="10"
          width="38"
          height="18"
          rx="5"
          fill="url(#capGradient)"
          stroke="#556658"
          strokeWidth="1.5"
        />

        {/* Cap Ridges */}
        <Path d="M 48,13 L 48,25" stroke="#687A6C" strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M 54,13 L 54,25" stroke="#687A6C" strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M 60,13 L 60,25" stroke="#687A6C" strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M 66,13 L 66,25" stroke="#687A6C" strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M 72,13 L 72,25" stroke="#687A6C" strokeWidth="1.5" strokeLinecap="round" />

        {/* Carry Loop Strap */}
        <Path
          d="M 77,16 C 85,16 88,22 88,27 C 88,32 82,35 77,35"
          stroke="#556658"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* 7. Sparkling Stars (Celebration effect when goal met) */}
        {isGoalReached && (
          <G>
            {/* Star 1 - Top Left */}
            <Path
              d="M 22,25 L 24,18 L 26,25 L 33,27 L 26,29 L 24,36 L 22,29 L 15,27 Z"
              fill="#FFD166"
            />
            {/* Star 2 - Top Right */}
            <Path
              d="M 98,30 L 99,25 L 101,30 L 106,31 L 101,33 L 99,38 L 98,33 L 93,31 Z"
              fill="#7AD3FA"
            />
            {/* Star 3 - Bottom Left */}
            <Path
              d="M 12,145 L 14,141 L 15,145 L 19,146 L 15,147 L 14,151 L 12,147 L 8,146 Z"
              fill="#FFD166"
            />
          </G>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
