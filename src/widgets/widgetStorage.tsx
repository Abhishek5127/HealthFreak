import React from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { WaterBottleWidget } from './WaterBottleWidget';
import { SleepTrackingWidget } from './SleepTrackingWidget';

export const ASYNC_STORAGE_WATER_LOGGED_KEY = 'HEALTHFREAK_WATER_LOGGED';
export const ASYNC_STORAGE_WATER_TARGET_KEY = 'HEALTHFREAK_WATER_TARGET_ML';
export const ASYNC_STORAGE_WATER_LOGGED_DATE_KEY = 'HEALTHFREAK_WATER_LOGGED_DATE';

// Sleep Widget Storage Keys
export const ASYNC_STORAGE_SLEEP_STATE_KEY = 'HEALTHFREAK_SLEEP_SESSION_V2';
export const ASYNC_STORAGE_SLEEP_HISTORY_KEY = 'HEALTHFREAK_SLEEP_HISTORY_V2';

export interface SleepWidgetData {
  isSleeping: boolean;
  bedtimeIso: string | null;
  wakeTimeIso: string | null;
  durationMinutes: number;
  recoveryScore: number;
  qualityLabel: string;
}

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
        renderWidget: (widgetInfo) => (
          <WaterBottleWidget
            waterLoggedMl={waterLoggedMl}
            waterTargetMl={waterTargetMl}
            widgetWidth={widgetInfo?.width}
            widgetHeight={widgetInfo?.height}
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

// ---------------------------------------------------------------------------
// SLEEP TRACKER WIDGET STORAGE & TWO-WAY SYNC
// ---------------------------------------------------------------------------

function calculateSleepRecovery(minutes: number): { score: number; label: string } {
  if (minutes >= 480) {
    const score = Math.min(100, Math.round(92 + Math.min(7, (minutes - 480) / 15)));
    return { score, label: 'Optimal Deep Recovery' };
  } else if (minutes >= 420) {
    const score = Math.round(84 + ((minutes - 420) / 60) * 8);
    return { score, label: 'Restored Balance' };
  } else if (minutes >= 360) {
    const score = Math.round(72 + ((minutes - 360) / 60) * 12);
    return { score, label: 'Moderate Rest' };
  } else if (minutes >= 300) {
    const score = Math.round(58 + ((minutes - 300) / 60) * 14);
    return { score, label: 'Light Sleep' };
  } else {
    const score = Math.max(30, Math.round((minutes / 300) * 58));
    return { score, label: 'Minimal Rest' };
  }
}

export async function getSleepWidgetState(): Promise<SleepWidgetData> {
  const defaultState: SleepWidgetData = {
    isSleeping: false,
    bedtimeIso: null,
    wakeTimeIso: null,
    durationMinutes: 0,
    recoveryScore: 0,
    qualityLabel: 'No sleep logged',
  };

  try {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_SLEEP_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) {
        return {
          isSleeping: !!parsed.isSleeping,
          bedtimeIso: parsed.bedtimeIso || null,
          wakeTimeIso: parsed.wakeTimeIso || null,
          durationMinutes: typeof parsed.durationMinutes === 'number' ? parsed.durationMinutes : 0,
          recoveryScore: typeof parsed.recoveryScore === 'number' ? parsed.recoveryScore : 0,
          qualityLabel: parsed.qualityLabel || 'No sleep logged',
        };
      }
    }
  } catch (e) {
    console.warn('[SleepWidgetStorage] getSleepWidgetState error:', e);
  }

  return defaultState;
}

export async function startSleepFromWidget(): Promise<SleepWidgetData> {
  const nowIso = new Date().toISOString();
  const newState: SleepWidgetData = {
    isSleeping: true,
    bedtimeIso: nowIso,
    wakeTimeIso: null,
    durationMinutes: 0,
    recoveryScore: 0,
    qualityLabel: 'Sleeping...',
  };

  try {
    await AsyncStorage.setItem(ASYNC_STORAGE_SLEEP_STATE_KEY, JSON.stringify(newState));
  } catch (e) {
    console.warn('[SleepWidgetStorage] startSleepFromWidget error:', e);
  }

  return newState;
}

export async function wakeUpFromWidget(): Promise<SleepWidgetData> {
  const current = await getSleepWidgetState();
  const now = new Date();
  const wakeTimeIso = now.toISOString();
  const bedtime = current.bedtimeIso
    ? new Date(current.bedtimeIso)
    : new Date(now.getTime() - 8 * 3600 * 1000);

  const diffMinutes = Math.max(1, Math.round((now.getTime() - bedtime.getTime()) / (1000 * 60)));
  const { score, label } = calculateSleepRecovery(diffMinutes);

  const newState: SleepWidgetData = {
    isSleeping: false,
    bedtimeIso: bedtime.toISOString(),
    wakeTimeIso,
    durationMinutes: diffMinutes,
    recoveryScore: score,
    qualityLabel: label,
  };

  try {
    await AsyncStorage.setItem(ASYNC_STORAGE_SLEEP_STATE_KEY, JSON.stringify(newState));

    // Also update history list in storage
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayStr = now.toISOString().split('T')[0];
    const deepMinutes = Math.round(diffMinutes * 0.25);
    const remMinutes = Math.round(diffMinutes * 0.22);
    const lightMinutes = Math.max(0, diffMinutes - deepMinutes - remMinutes);

    const rawHistory = await AsyncStorage.getItem(ASYNC_STORAGE_SLEEP_HISTORY_KEY);
    let historyList: any[] = [];
    if (rawHistory) {
      try {
        historyList = JSON.parse(rawHistory) || [];
      } catch {}
    }

    historyList = historyList.filter((h) => h.source !== 'historical' && h.date !== todayStr);
    historyList.push({
      id: `sleep_${Date.now()}`,
      date: todayStr,
      dayLabel: DAY_NAMES[now.getDay()],
      bedtimeIso: bedtime.toISOString(),
      wakeTimeIso,
      durationMinutes: diffMinutes,
      recoveryScore: score,
      qualityLabel: label,
      deepSleepMinutes: deepMinutes,
      remSleepMinutes: remMinutes,
      lightSleepMinutes: lightMinutes,
      source: 'manual',
    });

    historyList.sort((a, b) => a.date.localeCompare(b.date));
    await AsyncStorage.setItem(ASYNC_STORAGE_SLEEP_HISTORY_KEY, JSON.stringify(historyList.slice(-7)));
  } catch (e) {
    console.warn('[SleepWidgetStorage] wakeUpFromWidget error:', e);
  }

  return newState;
}

export async function syncSleepWidgetToHomeScreen(
  data?: Partial<SleepWidgetData>
): Promise<void> {
  try {
    const currentState = await getSleepWidgetState();
    const updatedState: SleepWidgetData = { ...currentState, ...data };

    await AsyncStorage.setItem(ASYNC_STORAGE_SLEEP_STATE_KEY, JSON.stringify(updatedState));

    if (Platform.OS === 'android') {
      requestWidgetUpdate({
        widgetName: 'SleepTrackingWidget',
        renderWidget: (widgetInfo) => (
          <SleepTrackingWidget
            state={updatedState}
            widgetWidth={widgetInfo?.width}
            widgetHeight={widgetInfo?.height}
          />
        ),
        widgetNotFound: () => {
          // Widget not pinned on home screen; safe no-op
        },
      });
    }
  } catch (error: any) {
    console.warn('[SleepWidgetStorage] syncSleepWidgetToHomeScreen note:', error?.message || error);
  }
}
