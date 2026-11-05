'use no memo';
import React from 'react';
import { FlexWidget, SvgWidget } from 'react-native-android-widget';
import { generateWaterBottleSvg } from './waterBottleSvg';

export interface WaterBottleWidgetProps {
  waterLoggedMl?: number;
  waterTargetMl?: number;
}

/**
 * Native Android Home Screen (Phone Desktop) Water Bottle Widget.
 * Minimalist glassmorphic box with centered dynamic bottle.
 * Tapping anywhere on the widget adds 150ml and updates the bottle expression!
 */
export function WaterBottleWidget({
  waterLoggedMl = 0,
  waterTargetMl = 3000,
}: WaterBottleWidgetProps) {
  const percentage = Math.round((waterLoggedMl / waterTargetMl) * 100);
  const isGoalReached = waterLoggedMl >= waterTargetMl;

  // Generate the dynamic vector SVG containing the bottle and dynamic facial expression
  const bottleSvg = generateWaterBottleSvg(percentage, 85, 135);

  return (
    <FlexWidget
      clickAction="ADD_WATER_150ML"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#121915',
        borderRadius: 24,
        borderColor: isGoalReached ? '#386644' : '#243429',
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SvgWidget svg={bottleSvg} style={{ width: 85, height: 135 }} />
    </FlexWidget>
  );
}
