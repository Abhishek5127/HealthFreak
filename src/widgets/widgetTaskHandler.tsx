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
      if (clickAction === 'ADD_WATER_100ML') {
        const nextState = await addWaterFromWidget(100);
        renderWidget(
          <WaterBottleWidget
            waterLoggedMl={nextState.waterLoggedMl}
            waterTargetMl={nextState.waterTargetMl}
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

