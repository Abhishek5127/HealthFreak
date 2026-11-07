import React from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { WaterBottleWidget } from './WaterBottleWidget';

export const ASYNC_STORAGE_WATER_LOGGED_KEY = 'HEALTHFREAK_WATER_LOGGED';
export const ASYNC_STORAGE_WATER_TARGET_KEY = 'HEALTHFREAK_WATER_TARGET_ML';
export const ASYNC_STORAGE_WATER_LOGGED_DATE_KEY = 'HEALTHFREAK_WATER_LOGGED_DATE';

export interface WaterWidgetState {
  waterLoggedMl: number;
  waterTargetMl: number;
  percentage: number;
  isGoalReached: boolean;
  date: string;
}

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retrieves the current water hydration state from local storage for the widget.
 * Automatically checks for midnight rollover: if the day has changed, resets water to 0ml!
 */
export async function getWaterWidgetState(): Promise<WaterWidgetState> {
  const todayStr = getLocalDateString();
  try {
    const [loggedRaw, targetRaw, dateRaw] = await Promise.all([
      AsyncStorage.getItem(ASYNC_STORAGE_WATER_LOGGED_KEY),
      AsyncStorage.getItem(ASYNC_STORAGE_WATER_TARGET_KEY),
      AsyncStorage.getItem(ASYNC_STORAGE_WATER_LOGGED_DATE_KEY),
    ]);

    const waterTargetMl = targetRaw ? Math.max(500, parseInt(targetRaw, 10) || 3200) : 3200;

    // Midnight Rollover Check: Reset daily water bottle to 0ml each new calendar day
    if (dateRaw && dateRaw !== todayStr) {
      const prevAmount = loggedRaw ? parseInt(loggedRaw, 10) || 0 : 0;
      if (prevAmount > 0) {
        await AsyncStorage.setItem(`HEALTHFREAK_WATER_HISTORY_${dateRaw}`, prevAmount.toString()).catch(() => {});
      }
      await AsyncStorage.setItem(ASYNC_STORAGE_WATER_LOGGED_KEY, '0');
      await AsyncStorage.setItem(ASYNC_STORAGE_WATER_LOGGED_DATE_KEY, todayStr);

      return {
        waterLoggedMl: 0,
        waterTargetMl,
        percentage: 0,
        isGoalReached: false,
        date: todayStr,
      };
    }

    if (!dateRaw) {
      await AsyncStorage.setItem(ASYNC_STORAGE_WATER_LOGGED_DATE_KEY, todayStr);
    }

    const waterLoggedMl = loggedRaw ? Math.max(0, parseInt(loggedRaw, 10) || 0) : 0;
    const percentage = Math.round((waterLoggedMl / waterTargetMl) * 100);
    const isGoalReached = waterLoggedMl >= waterTargetMl;

    return {
      waterLoggedMl,
      waterTargetMl,
      percentage,
      isGoalReached,
      date: todayStr,
    };
  } catch (error) {
    console.warn('[WaterWidgetStorage] Error reading widget state:', error);
    return {
      waterLoggedMl: 0,
      waterTargetMl: 3200,
      percentage: 0,
      isGoalReached: false,
      date: todayStr,
    };
  }
}

/**
 * Increments water consumption by the specified amount (defaults to 150ml)
 * and returns the updated state.
 */
export async function addWaterFromWidget(amountMl: number = 150): Promise<WaterWidgetState> {
  const current = await getWaterWidgetState();
  const todayStr = getLocalDateString();
  const nextLogged = current.waterLoggedMl + amountMl;

  try {
    await AsyncStorage.setItem(ASYNC_STORAGE_WATER_LOGGED_KEY, nextLogged.toString());
    await AsyncStorage.setItem(ASYNC_STORAGE_WATER_LOGGED_DATE_KEY, todayStr);
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
    date: todayStr,
  };
}

/**
 * Saves given values to storage and broadcasts an immediate update
 * to all instances of the WaterBottleWidget on the Android home screen.
 */
export async function syncWidgetStateToHomeScreen(
  waterLoggedMl: number,
  waterTargetMl: number,
  lastAddedAmount?: number
): Promise<void> {
  try {
    const todayStr = getLocalDateString();
    await Promise.all([
      AsyncStorage.setItem(ASYNC_STORAGE_WATER_LOGGED_KEY, waterLoggedMl.toString()),
      AsyncStorage.setItem(ASYNC_STORAGE_WATER_TARGET_KEY, waterTargetMl.toString()),
      AsyncStorage.setItem(ASYNC_STORAGE_WATER_LOGGED_DATE_KEY, todayStr),
    ]);

    // Request the native Android launcher to redraw the widget
    if (Platform.OS === 'android') {
      requestWidgetUpdate({
        widgetName: 'WaterBottleWidget',
        renderWidget: () => (
          <WaterBottleWidget
            waterLoggedMl={waterLoggedMl}
            waterTargetMl={waterTargetMl}
            lastAddedAmount={lastAddedAmount}
          />
        ),
        widgetNotFound: () => {
          // Widget is not currently pinned on home screen; safe no-op
        },
      });
    }
  } catch (error: any) {
    // Native modules might be unavailable on web or Expo Go
    console.warn('[WaterWidgetStorage] syncWidgetStateToHomeScreen note:', error?.message || error);
  }
}
