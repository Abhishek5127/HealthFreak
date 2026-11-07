import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { WaterBottleWidget } from './WaterBottleWidget';
import { getWaterWidgetState, addWaterFromWidget } from './widgetStorage';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, clickAction, renderWidget } = props;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const state = await getWaterWidgetState();
      renderWidget(
        <WaterBottleWidget
          waterLoggedMl={state.waterLoggedMl}
          waterTargetMl={state.waterTargetMl}
        />
      );
      break;
    }

    case 'WIDGET_CLICK': {
      if (clickAction === 'ADD_WATER_150ML' || clickAction === 'ADD_WATER_100ML') {
        const amount = clickAction === 'ADD_WATER_100ML' ? 100 : 150;
        const nextState = await addWaterFromWidget(amount);
        renderWidget(
          <WaterBottleWidget
            waterLoggedMl={nextState.waterLoggedMl}
            waterTargetMl={nextState.waterTargetMl}
            lastAddedAmount={amount}
          />
        );
      }
      break;
    }

    case 'WIDGET_DELETED':
    default:
      break;
  }
}
