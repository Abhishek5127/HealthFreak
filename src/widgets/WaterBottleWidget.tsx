'use no memo';
import React from 'react';
import { FlexWidget, SvgWidget } from 'react-native-android-widget';
import { generateWaterBottleSvg } from './waterBottleSvg';

export interface WaterBottleWidgetProps {
  waterLoggedMl?: number;
  waterTargetMl?: number;
  lastAddedAmount?: number;
}

/**
 * Native Android Home Screen (Phone Desktop) Water Bottle Widget.
 * Super glassy borderless box with centered dynamic bottle.
 * Tapping anywhere on the widget adds 150ml and provides immediate visual amount feedback!
 */
export function WaterBottleWidget({
  waterLoggedMl = 0,
  waterTargetMl = 3000,
  lastAddedAmount,
}: WaterBottleWidgetProps) {
  const percentage = Math.round((waterLoggedMl / waterTargetMl) * 100);

  // Generate the dynamic vector SVG containing the bottle, facial expression, and optional amount badge
  const badgeText = lastAddedAmount ? `+${lastAddedAmount}ml` : undefined;
  const bottleSvg = generateWaterBottleSvg(percentage, 56, 90, badgeText);

  return (
    <FlexWidget
      clickAction="ADD_WATER_150ML"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#122533',
        borderColor: '#3D7CA8',
        borderWidth: 1.5,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SvgWidget svg={bottleSvg} style={{ width: 56, height: 90 }} />
    </FlexWidget>
  );
}
