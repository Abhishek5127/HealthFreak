'use no memo';
import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';
import { generateWaterBottleSvg } from './waterBottleSvg';

export interface WaterBottleWidgetProps {
  waterLoggedMl?: number;
  waterTargetMl?: number;
}

export function WaterBottleWidget({
  waterLoggedMl = 0,
  waterTargetMl = 3200,
}: WaterBottleWidgetProps) {
  const percentage = Math.round((waterLoggedMl / waterTargetMl) * 100);
  const isGoalReached = waterLoggedMl >= waterTargetMl;
  const remainingMl = Math.max(0, waterTargetMl - waterLoggedMl);

  const loggedLiters = (waterLoggedMl / 1000).toFixed(1);
  const targetLiters = (waterTargetMl / 1000).toFixed(1);

  // Generate the dynamic vector SVG string containing the fill level and joyful smile
  const bottleSvg = generateWaterBottleSvg(percentage, 75, 125);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#121915',
        borderRadius: 22,
        borderColor: isGoalReached ? '#386644' : '#2A3C30',
        borderWidth: 2,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* 1. Left Section: Interactive Water Bottle Graphic (Tap opens the app) */}
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          width: 75,
          height: 'match_parent',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
        }}
      >
        <SvgWidget svg={bottleSvg} style={{ width: 75, height: 125 }} />
      </FlexWidget>

      {/* 2. Right Section: Hydration Metrics & One-Tap +100ml Action */}
      <FlexWidget
        style={{
          flex: 1,
          height: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Top Header Row */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <TextWidget
            text="WATER INTAKE"
            style={{
              color: '#8BA192',
              fontSize: 10,
              fontWeight: 'bold',
            }}
          />

          {/* Progress / Goal Badge */}
          <FlexWidget
            style={{
              backgroundColor: isGoalReached ? '#1B3D26' : '#1C313E',
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: isGoalReached ? '#347248' : '#2B4A5C',
            }}
          >
            <TextWidget
              text={isGoalReached ? '100% 😊' : `${percentage}%`}
              style={{
                color: isGoalReached ? '#7AE69E' : '#7AD3FA',
                fontSize: 11,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Volume Metric Display */}
        <FlexWidget style={{ flexDirection: 'column', marginVertical: 2 }}>
          <TextWidget
            text={`${loggedLiters}L / ${targetLiters}L`}
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 'bold',
            }}
          />
          <TextWidget
            text={
              isGoalReached
                ? 'Goal Reached! 💧'
                : `${remainingMl} ml left today`
            }
            style={{
              color: isGoalReached ? '#7AE69E' : '#7EA089',
              fontSize: 10,
            }}
          />
        </FlexWidget>

        {/* 3. Interactive Quick-Add Button (+100ml) */}
        <FlexWidget
          clickAction="ADD_WATER_100ML"
          style={{
            backgroundColor: '#2677B4',
            borderRadius: 12,
            paddingVertical: 7,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text="+100 ml 💧"
            style={{
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
