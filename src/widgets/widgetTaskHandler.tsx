import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { WaterBottleWidget } from './WaterBottleWidget';
import { SleepTrackingWidget } from './SleepTrackingWidget';
import {
  getWaterWidgetState,
  addWaterFromWidget,
  getSleepWidgetState,
  startSleepFromWidget,
  wakeUpFromWidget,
} from './widgetStorage';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, clickAction, renderWidget, widgetInfo } = props;
  const widgetName = widgetInfo?.widgetName;

  // -------------------------------------------------------------
  // 1. SLEEP TRACKING WIDGET
  // -------------------------------------------------------------
  if (widgetName === 'SleepTrackingWidget') {
    switch (widgetAction) {
      case 'WIDGET_ADDED':
      case 'WIDGET_UPDATE':
      case 'WIDGET_RESIZED': {
        const sleepState = await getSleepWidgetState();
        renderWidget(
          <SleepTrackingWidget
            state={sleepState}
            widgetWidth={widgetInfo?.width}
            widgetHeight={widgetInfo?.height}
          />
        );
        break;
      }

      case 'WIDGET_CLICK': {
        if (clickAction === 'START_SLEEP') {
          const nextState = await startSleepFromWidget();
          renderWidget(
            <SleepTrackingWidget
              state={nextState}
              widgetWidth={widgetInfo?.width}
              widgetHeight={widgetInfo?.height}
            />
          );
        } else if (clickAction === 'WAKE_UP') {
          const nextState = await wakeUpFromWidget();
          renderWidget(
            <SleepTrackingWidget
              state={nextState}
              widgetWidth={widgetInfo?.width}
              widgetHeight={widgetInfo?.height}
            />
          );
        }
        break;
      }

      case 'WIDGET_DELETED':
      default:
        break;
    }
    return;
  }

  // -------------------------------------------------------------
  // 2. WATER BOTTLE WIDGET
  // -------------------------------------------------------------
  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const state = await getWaterWidgetState();
      renderWidget(
        <WaterBottleWidget
          waterLoggedMl={state.waterLoggedMl}
          waterTargetMl={state.waterTargetMl}
          widgetWidth={widgetInfo?.width}
          widgetHeight={widgetInfo?.height}
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
            widgetWidth={widgetInfo?.width}
            widgetHeight={widgetInfo?.height}
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
