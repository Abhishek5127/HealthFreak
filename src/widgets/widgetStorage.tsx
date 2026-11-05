import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { WaterBottleWidget } from './WaterBottleWidget';

export const ASYNC_STORAGE_WATER_LOGGED_KEY = 'HEALTHFREAK_WATER_LOGGED';
export const ASYNC_STORAGE_WATER_TARGET_KEY = 'HEALTHFREAK_WATER_TARGET_ML';

export interface WaterWidgetState {
  waterLoggedMl: number;
  waterTargetMl: number;
  percentage: number;
  isGoalReached: boolean;
}

/**
 * Retrieves the current water hydration state from local storage for the widget.
 */
export async function getWaterWidgetState(): Promise<WaterWidgetState> {
  try {
    const [loggedRaw, targetRaw] = await Promise.all([
      AsyncStorage.getItem(ASYNC_STORAGE_WATER_LOGGED_KEY),
      AsyncStorage.getItem(ASYNC_STORAGE_WATER_TARGET_KEY),
    ]);

    const waterLoggedMl = loggedRaw ? Math.max(0, parseInt(loggedRaw, 10) || 0) : 0;
    const waterTargetMl = targetRaw ? Math.max(500, parseInt(targetRaw, 10) || 3200) : 3200;
    const percentage = Math.round((waterLoggedMl / waterTargetMl) * 100);
    const isGoalReached = waterLoggedMl >= waterTargetMl;

    return {
      waterLoggedMl,
      waterTargetMl,
      percentage,
      isGoalReached,
    };
  } catch (error) {
    console.warn('[WaterWidgetStorage] Error reading widget state:', error);
    return {
      waterLoggedMl: 0,
      waterTargetMl: 3200,
      percentage: 0,
      isGoalReached: false,
    };
  }
}

/**
 * Increments water consumption by the specified amount (defaults to 150ml)
 * and returns the updated state.
 */
export async function addWaterFromWidget(amountMl: number = 150): Promise<WaterWidgetState> {
  const current = await getWaterWidgetState();
  const nextLogged = current.waterLoggedMl + amountMl;

  try {
    await AsyncStorage.setItem(ASYNC_STORAGE_WATER_LOGGED_KEY, nextLogged.toString());
  } catch (error) {
    console.warn('[WaterWidgetStorage] Error persisting incremented water:', error);
  }

  const percentage = Math.round((nextLogged / current.waterTargetMl) * 100);
  const isGoalReached = nextLogged >= current.waterTargetMl;

  return {
    waterLoggedMl: nextLogged,
    waterTargetMl: current.waterTargetMl,
    percentage,
    isGoalReached,
  };
}

/**
 * Saves given values to storage and broadcasts an immediate update
 * to all instances of the WaterBottleWidget on the Android home screen.
 */
export async function syncWidgetStateToHomeScreen(
  waterLoggedMl: number,
  waterTargetMl: number
): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(ASYNC_STORAGE_WATER_LOGGED_KEY, waterLoggedMl.toString()),
      AsyncStorage.setItem(ASYNC_STORAGE_WATER_TARGET_KEY, waterTargetMl.toString()),
    ]);

    // Request the native Android launcher to redraw the widget
    requestWidgetUpdate({
      widgetName: 'WaterBottleWidget',
      renderWidget: () => (
        <WaterBottleWidget
          waterLoggedMl={waterLoggedMl}
          waterTargetMl={waterTargetMl}
        />
      ),
      widgetNotFound: () => {
        // Widget is not currently pinned on home screen; safe no-op
      },
    });
  } catch (error: any) {
    // Native modules might be unavailable on web or Expo Go
    console.warn('[WaterWidgetStorage] syncWidgetStateToHomeScreen note:', error?.message || error);
  }
}
