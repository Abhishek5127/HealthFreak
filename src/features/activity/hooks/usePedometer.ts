import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import {
  StepSummary,
  PedometerPermissionState,
  ActivityInsight,
} from '../types/pedometer.types';
import { pedometerService } from '../services/pedometerService';
import { StepPersistenceService } from '../services/stepPersistenceService';
import { ActivitySyncService } from '../services/activitySyncService';
import { generateActivityInsights } from '../utils/activityCalculations';
import { useAuth } from '../../../state/AuthContext';

export interface UsePedometerResult {
  todaySteps: number;
  stepGoal: number;
  distanceMeters: number;
  caloriesBurned: number;
  activeMinutes: number;
  permissionStatus: PedometerPermissionState;
  isAvailable: boolean;
  isTracking: boolean;
  history: StepSummary[];
  insights: ActivityInsight[];
  lastSyncedAt: string | null;
  requestPermissions: () => Promise<PedometerPermissionState>;
  startTracking: () => Promise<boolean>;
  stopTracking: () => Promise<void>;
  updateStepGoal: (newGoal: number) => Promise<void>;
  refreshHistory: () => Promise<void>;
  syncNow: () => Promise<void>;
}

export function usePedometer(): UsePedometerResult {
  const { user, profile } = useAuth();
  const userId = user?.id || profile?.id || null;

  const [todaySteps, setTodaySteps] = useState<number>(0);
  const [stepGoal, setStepGoal] = useState<number>(10000);
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [caloriesBurned, setCaloriesBurned] = useState<number>(0);
  const [activeMinutes, setActiveMinutes] = useState<number>(0);
  const [permissionStatus, setPermissionStatus] = useState<PedometerPermissionState>('unknown');
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [history, setHistory] = useState<StepSummary[]>([]);
  const [insights, setInsights] = useState<ActivityInsight[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const isMounted = useRef<boolean>(true);

  // Configure user biometrics when profile changes
  useEffect(() => {
    if (profile?.surveyAssessment) {
      pedometerService.setUserBiometrics(
        profile.surveyAssessment.heightCm,
        profile.surveyAssessment.currentWeightKg,
        profile.surveyAssessment.gender
      );
    }
  }, [profile]);

  useEffect(() => {
    isMounted.current = true;

    async function loadInitialData() {
      if (Platform.OS === 'web') {
        if (!isMounted.current) return;
        setIsAvailable(false);
        setPermissionStatus('unavailable');
        const goal = await StepPersistenceService.getStepGoal();
        if (!isMounted.current) return;
        setStepGoal(goal);
        return;
      }

      const available = await pedometerService.checkAvailability();
      if (!isMounted.current) return;
      setIsAvailable(available);

      const perm = await pedometerService.getPermissionStatus();
      if (!isMounted.current) return;
      setPermissionStatus(perm);

      const goal = await StepPersistenceService.getStepGoal();
      if (!isMounted.current) return;
      setStepGoal(goal);

      const currentToday = await pedometerService.getCurrentTodaySummary();
      if (!isMounted.current) return;
      setTodaySteps(currentToday.steps);
      setDistanceMeters(currentToday.distanceMeters);
      setCaloriesBurned(currentToday.caloriesBurned);
      setActiveMinutes(currentToday.activeMinutes);

      const historyRecords = await pedometerService.getHistory(7);
      if (!isMounted.current) return;
      setHistory(historyRecords);

      const calculatedInsights = generateActivityInsights(historyRecords, currentToday);
      if (!isMounted.current) return;
      setInsights(calculatedInsights);

      // Auto-start tracking if permission was previously granted
      if (perm === 'granted' && available) {
        await pedometerService.startTracking();
        if (isMounted.current) {
          setIsTracking(true);
        }
      }
    }

    loadInitialData();

    // Subscribe to live step updates from hardware
    const unsubscribe = pedometerService.subscribe((summary) => {
      if (!isMounted.current) return;
      setTodaySteps(summary.steps);
      setStepGoal(summary.stepGoal);
      setDistanceMeters(summary.distanceMeters);
      setCaloriesBurned(summary.caloriesBurned);
      setActiveMinutes(summary.activeMinutes);

      // Recompute insights
      setHistory((prev) => {
        const updated = [...prev];
        const todayIdx = updated.findIndex((h) => h.date === summary.date);
        if (todayIdx >= 0) {
          updated[todayIdx] = summary;
        } else {
          updated.push(summary);
        }
        setInsights(generateActivityInsights(updated, summary));
        return updated;
      });
    });

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, []);

  const requestPermissions = useCallback(async (): Promise<PedometerPermissionState> => {
    const res = await pedometerService.requestPermissions();
    setPermissionStatus(res);
    if (res === 'granted') {
      await pedometerService.startTracking();
      setIsTracking(true);
      const current = await pedometerService.getCurrentTodaySummary();
      setTodaySteps(current.steps);
      setDistanceMeters(current.distanceMeters);
      setCaloriesBurned(current.caloriesBurned);
      setActiveMinutes(current.activeMinutes);
    }
    return res;
  }, []);

  const startTracking = useCallback(async (): Promise<boolean> => {
    const success = await pedometerService.startTracking();
    if (success) {
      setIsTracking(true);
      setPermissionStatus('granted');
    }
    return success;
  }, []);

  const stopTracking = useCallback(async (): Promise<void> => {
    await pedometerService.stopTracking();
    setIsTracking(false);
  }, []);

  const updateStepGoal = useCallback(async (newGoal: number): Promise<void> => {
    if (newGoal <= 0) return;
    await StepPersistenceService.setStepGoal(newGoal);
    setStepGoal(newGoal);

    const currentToday = await pedometerService.getCurrentTodaySummary();
    currentToday.stepGoal = newGoal;
    await StepPersistenceService.saveDailySummary(currentToday);

    setHistory((prev) =>
      prev.map((item) => (item.date === currentToday.date ? { ...item, stepGoal: newGoal } : item))
    );
  }, []);

  const refreshHistory = useCallback(async (): Promise<void> => {
    const records = await pedometerService.getHistory(7);
    setHistory(records);
    const currentToday = await pedometerService.getCurrentTodaySummary();
    setInsights(generateActivityInsights(records, currentToday));
  }, []);

  const syncNow = useCallback(async (): Promise<void> => {
    const res = await ActivitySyncService.syncActivities(userId);
    if (res.success) {
      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  }, [userId]);

  return {
    todaySteps,
    stepGoal,
    distanceMeters,
    caloriesBurned,
    activeMinutes,
    permissionStatus,
    isAvailable,
    isTracking,
    history,
    insights,
    lastSyncedAt,
    requestPermissions,
    startTracking,
    stopTracking,
    updateStepGoal,
    refreshHistory,
    syncNow,
  };
}
