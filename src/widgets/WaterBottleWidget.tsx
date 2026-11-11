'use no memo';
import React from 'react';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { generateWaterBottleSvg } from './waterBottleSvg';

export interface WaterBottleWidgetProps {
  waterLoggedMl?: number;
  waterTargetMl?: number;
  lastAddedAmount?: number;
  widgetWidth?: number;
  widgetHeight?: number;
}

/**
 * Native Android Home Screen (Phone Desktop) Water Bottle Widget.
 * Frosted glass card with glowing cyber-cyan rim, dynamically scaled smiling bottle,
 * and bold percentage indicator matching the approved glassmorphic design.
 *
 * Tapping anywhere on the widget adds 150ml and immediately updates the hydration level.
 */
export function WaterBottleWidget({
  waterLoggedMl = 0,
  waterTargetMl = 3000,
  widgetWidth,
  widgetHeight,
}: WaterBottleWidgetProps) {
  const percentage = Math.round((waterLoggedMl / (waterTargetMl || 3000)) * 100);
  const isGoalMet = percentage >= 100;

  // Responsive bottle sizing based on home screen launcher cell dimensions
  const w = widgetWidth && widgetWidth > 0 ? widgetWidth : 160;
  const h = widgetHeight && widgetHeight > 0 ? widgetHeight : 200;

  // Percentage text takes ~30dp, card padding takes ~20dp
  const maxAvailableH = Math.max(75, h - 50);
  const maxAvailableW = Math.max(50, w - 24);

  // Bottle viewBox aspect ratio is 120 / 200 = 0.6
  let bottleHeight = Math.min(maxAvailableH, maxAvailableW / 0.6);
  bottleHeight = Math.min(Math.max(bottleHeight, 85), 155);
  const bottleWidth = Math.round(bottleHeight * 0.6);

  const percentFontSize = bottleHeight > 130 ? 20 : bottleHeight > 105 ? 18 : 15;

  const bottleSvg = generateWaterBottleSvg(percentage, bottleWidth, bottleHeight);

  return (
    <FlexWidget
      clickAction="ADD_WATER_150ML"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundGradient: {
          from: isGoalMet ? '#143628' : '#142C38',
          to: isGoalMet ? '#081710' : '#081418',
          orientation: 'TL_BR',
        },
        borderColor: isGoalMet ? '#4AB87A' : '#4FA3E2',
        borderWidth: 1.8,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
      }}
    >
      <SvgWidget svg={bottleSvg} style={{ width: bottleWidth, height: bottleHeight }} />
      <TextWidget
        text={`${percentage}%`}
        style={{
          color: isGoalMet ? '#72ECA2' : '#7AD3FA',
          fontSize: percentFontSize,
          fontWeight: 'bold',
          textAlign: 'center',
          marginTop: 6,
          textShadowColor: isGoalMet ? 'rgba(74, 184, 122, 0.7)' : 'rgba(122, 211, 250, 0.7)',
          textShadowRadius: 6,
        }}
      />
    </FlexWidget>
  );
}
