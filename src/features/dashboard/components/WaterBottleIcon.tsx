import React from 'react';
import Svg, { Path, Rect, G, ClipPath } from 'react-native-svg';

interface WaterBottleIconProps {
  size?: number;
  color?: string;
  fillPercentage?: number;
  isCompleted?: boolean;
}

export const WaterBottleIcon: React.FC<WaterBottleIconProps> = ({
  size = 22,
  color = '#4FA3E2',
  fillPercentage = 0,
  isCompleted = false,
}) => {
  const clampedPercent = Math.min(Math.max(fillPercentage, 0), 100);
  // Total inner height from y=6 to y=21 is 15
  const fillHeight = (clampedPercent / 100) * 15;
  const fillY = 21 - fillHeight;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <ClipPath id="bottleIconClip">
        <Path
          d="
            M 9,5
            L 15,5
            C 16,5 17,6 17.5,7
            L 18.5,10
            C 19,11.5 19,13 19,14
            L 19,20
            C 19,21.5 17.8,22 16.5,22
            L 7.5,22
            C 6.2,22 5,21.5 5,20
            L 5,14
            C 5,13 5,11.5 5.5,10
            L 6.5,7
            C 7,6 8,5 9,5
            Z
          "
        />
      </ClipPath>

      {/* Cap */}
      <Rect
        x="9"
        y="1"
        width="6"
        height="3"
        rx="1"
        fill={color}
      />
      <Rect
        x="10"
        y="3.5"
        width="4"
        height="1.5"
        fill={color}
        opacity="0.8"
      />

      {/* Bottle Outline */}
      <Path
        d="
          M 9,5
          L 15,5
          C 16,5 17,6 17.5,7
          L 18.5,10
          C 19,11.5 19,13 19,14
          L 19,20
          C 19,21.5 17.8,22 16.5,22
          L 7.5,22
          C 6.2,22 5,21.5 5,20
          L 5,14
          C 5,13 5,11.5 5.5,10
          L 6.5,7
          C 7,6 8,5 9,5
          Z
        "
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="rgba(79, 163, 226, 0.08)"
      />

      {/* Liquid Fill Level */}
      <G clipPath="url(#bottleIconClip)">
        <Rect
          x="4"
          y={fillY}
          width="16"
          height={fillHeight + 4}
          fill={color}
          opacity={isCompleted ? 0.95 : 0.75}
        />

        {/* Happy smile on bottle when goal met */}
        {isCompleted && (
          <G>
            {/* Left Eye */}
            <Path d="M 8.5,13 Q 9.5,11.8 10.5,13" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
            {/* Right Eye */}
            <Path d="M 13.5,13 Q 14.5,11.8 15.5,13" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
            {/* Smile Mouth */}
            <Path d="M 10,15.5 Q 12,17.5 14,15.5" stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" fill="none" />
          </G>
        )}
      </G>
    </Svg>
  );
};

