import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import {
  TabType,
  ModalType,
  UserProfile,
  DailyActivityItem,
  ProgressMetric,
  ChatMessage,
  CheckInMood,
  ActivitySession,
  UserSurveyAssessment,
} from '../types';
import {
  initialUserProfile,
  mockDailyActivities,
  mockFeaturedWorkout,
} from '../mock-data/healthData';
import { getActivitiesForGoal } from '../mock-data/goalActivities';
import { initialCoachMessages } from '../mock-data/coachChat';
import { askDishaAI } from '../services/aiChatService';
import { voiceClient } from '../services/voiceClient';
import { MealAnalysisResult } from '../types/meal';
import { MealScannerService } from '../services/mealScannerService';
import { expoSecureStoreAdapter } from '../services/auth/secureStorageAdapter';
import { useAuth } from './AuthContext';
import { ScheduledAICall, LiveKitTokenData, AICallService } from '../services/aiCallService';
import { NotificationService } from '../services/notificationService';
import { pedometerService, PedometerState } from '../services/pedometerService';
import { streakService } from '../services/streakService';
import { sleepService, SleepSession } from '../services/sleepService';

export function computeProgressMetrics(
  currentSteps: number,
  currentActivities: DailyActivityItem[]
): ProgressMetric[] {
  const stepsCount = Math.max(0, currentSteps);
  // ~0.04 kcal per step
  const stepCalories = Math.round(stepsCount * 0.04);
  const workoutCalories = currentActivities
    .filter((a) => a.completed)
    .reduce((acc, a) => acc + (a.calories || 0), 0);
  const totalActiveCalories = stepCalories + workoutCalories;

  // ~100 steps per active minute of walking
  const stepMinutes = Math.round(stepsCount / 100);
  const workoutMinutes = currentActivities
    .filter((a) => a.completed)
    .reduce((acc, a) => {
      if (!a.duration) return acc;
      const m = parseInt(a.duration, 10);
      return acc + (isNaN(m) ? 0 : m);
    }, 0);
  const totalActiveMinutes = stepMinutes + workoutMinutes;

  return [
    {
      id: 'steps',
      title: 'Daily Steps',
      value: stepsCount.toLocaleString(),
      target: '8,000',
      percentage: Math.min(1, stepsCount / 8000),
      unit: 'steps',
      trend: stepsCount > 0 ? 'up' : 'steady',
      trendLabel: stepsCount === 0 ? '0% of 8,000' : `${Math.round((stepsCount / 8000) * 100)}% of 8,000`,
      color: '#FF715F',
    },
    {
      id: 'calories',
      title: 'Active Energy',
      value: totalActiveCalories.toString(),
      target: '450',
      percentage: Math.min(1, totalActiveCalories / 450),
      unit: 'kcal',
      trend: totalActiveCalories > 0 ? 'up' : 'steady',
      trendLabel: totalActiveCalories === 0 ? '0 kcal burned' : `${totalActiveCalories} kcal active`,
      color: '#EAD66F',
    },
    {
      id: 'activity',
      title: 'Movement Time',
      value:
        totalActiveMinutes === 0
          ? '0m'
          : totalActiveMinutes >= 60
          ? `${Math.floor(totalActiveMinutes / 60)}h ${totalActiveMinutes % 60}m`
          : `${totalActiveMinutes}m`,
      target: '1h 30m',
      percentage: Math.min(1, totalActiveMinutes / 90),
      unit: 'activity',
      trend: totalActiveMinutes > 0 ? 'up' : 'steady',
      trendLabel: totalActiveMinutes === 0 ? 'Ready for today' : `${totalActiveMinutes} mins active`,
      color: '#4E9A6F',
    },
  ];
}

export interface DailyNutritionState {
  caloriesTotal: number;
  caloriesTarget: number;
  proteinTotal: number;
  proteinTarget: number;
  carbsTotal: number;
  carbsTarget: number;
  fatTotal: number;
  fatTarget: number;
  fiberTotal: number;
  fiberTarget: number;
  mealsCount: number;
}

interface AppContextType {
  // Navigation
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  activeModal: ModalType;
  setActiveModal: (modal: ModalType) => void;

  // Profile & Goal
  userProfile: UserProfile;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  setUserMood: (mood: CheckInMood) => void;

  // Plan & Activities
  activities: DailyActivityItem[];
  toggleActivityCompletion: (id: string) => void;
  featuredWorkout: ActivitySession;

  // Metrics
  metrics: ProgressMetric[];

  // Meal Scanner & Nutrition Diary
  todaysNutrition: DailyNutritionState;
  recentMeals: MealAnalysisResult[];
  activeScannedMeal: MealAnalysisResult | null;
  setActiveScannedMeal: (meal: MealAnalysisResult | null) => void;
  openMealScanner: () => void;
  openMealResult: (meal: MealAnalysisResult) => void;
  saveMealToDiary: (meal: MealAnalysisResult) => Promise<void>;
  deleteMealFromDiary: (mealId: string) => Promise<void>;
  updateMealPortion: (mealId: string, foodId: string, newWeightGrams: number) => void;

  // Coach Chat
  chatMessages: ChatMessage[];
  isCoachTyping: boolean;
  sendChatMessage: (text: string) => void;

  // Audio / Voice Interaction
  isVoiceActive: boolean;
  setIsVoiceActive: (active: boolean) => void;

  // Utilities
  triggerHaptic: (type?: 'selection' | 'success' | 'impact') => void;
  resetAll: () => void;

  // Survey & Personalized Targets
  applySurveyAssessment: (assessment: UserSurveyAssessment) => Promise<void>;
  waterLoggedMl: number;
  logWater: (amountMl?: number) => void;

  // Scheduled & Incoming LiveKit AI Calls
  activeIncomingCall: ScheduledAICall | null;
  activeLiveKitCall: { call: ScheduledAICall; livekit?: LiveKitTokenData; greeting?: string } | null;
  openScheduleCallModal: () => void;
  triggerIncomingCallScreen: (call: ScheduledAICall) => void;
  acceptIncomingCall: (call: ScheduledAICall) => Promise<void>;
  declineIncomingCall: (callId: string) => Promise<void>;
  endActiveLiveKitCall: () => void;

  // Live Pedometer & Physical Activity
  pedometerState: PedometerState;
  addSimulatedSteps: (count: number) => Promise<void>;
  resetPedometerSteps: () => Promise<void>;
  requestPedometerPermission: () => Promise<boolean>;

  // Sleep & Circadian Phase Tracker
  sleepSession: SleepSession;
  startSleep: () => Promise<void>;
  wakeUp: () => Promise<void>;

  // Insights Weekly Steps
  weeklySteps: number[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile: authProfile, updateProfileState } = useAuth();
  const [activeTab, setActiveTabState] = useState<TabType>('home');
  const [activeModal, setActiveModalState] = useState<ModalType>(null);
  const [userProfileState, setUserProfileState] = useState<UserProfile>(initialUserProfile);
  const [waterLoggedMl, setWaterLoggedMl] = useState<number>(0);

  // Synchronize authenticated profile from Supabase Google OAuth without cascading re-renders
  const userProfile: UserProfile = useMemo(() => ({
    ...userProfileState,
    ...(authProfile
      ? {
          id: authProfile.id || userProfileState.id,
          name: authProfile.name || userProfileState.name,
          email: authProfile.email || userProfileState.email,
          avatarUrl: authProfile.avatarUrl || userProfileState.avatarUrl,
          onboardingCompleted:
            typeof authProfile.onboardingCompleted === 'boolean'
              ? authProfile.onboardingCompleted
              : userProfileState.onboardingCompleted,
          authProvider: authProfile.authProvider || 'google',
        }
      : {}),
  }), [userProfileState, authProfile]);
  const [activities, setActivities] = useState<DailyActivityItem[]>(mockDailyActivities);
  const [pedometerState, setPedometerState] = useState<PedometerState>(() => pedometerService.getState());
  const [sleepSession, setSleepSession] = useState<SleepSession>(() => sleepService.getState());
  const [weeklySteps, setWeeklySteps] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [metrics, setMetrics] = useState<ProgressMetric[]>(() =>
    computeProgressMetrics(pedometerService.getState().steps, mockDailyActivities)
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialCoachMessages);
  const [isCoachTyping, setIsCoachTyping] = useState<boolean>(false);
  const [isVoiceActive, setIsVoiceActiveState] = useState<boolean>(false);
  const [activeIncomingCall, setActiveIncomingCall] = useState<ScheduledAICall | null>(null);
  const [activeLiveKitCall, setActiveLiveKitCall] = useState<{ call: ScheduledAICall; livekit?: LiveKitTokenData; greeting?: string } | null>(null);

  // Meal Scanner & Nutrition Diary State (starts at 0 for clean baseline)
  const [todaysNutrition, setTodaysNutrition] = useState<DailyNutritionState>({
    caloriesTotal: 0,
    caloriesTarget: 2100,
    proteinTotal: 0,
    proteinTarget: 130,
    carbsTotal: 0,
    carbsTarget: 220,
    fatTotal: 0,
    fatTarget: 65,
    fiberTotal: 0,
    fiberTarget: 35,
    mealsCount: 0,
  });

  const [recentMeals, setRecentMeals] = useState<MealAnalysisResult[]>([]);

  const [activeScannedMeal, setActiveScannedMeal] = useState<MealAnalysisResult | null>(null);

  const openMealScanner = () => {
    triggerHaptic('impact');
    if (isVoiceActive) {
      voiceClient.endSession();
      setIsVoiceActiveState(false);
    }
    setActiveModalState('meal_scanner');
  };

  const openMealResult = (meal: MealAnalysisResult) => {
    triggerHaptic('selection');
    setActiveScannedMeal(meal);
    setActiveModalState('meal_result');
  };

  // Dynamic Nutrition Recalculation Engine
  const recalculateDailyNutrition = (meals: MealAnalysisResult[]) => {
    const sumCalories = meals.reduce((acc, m) => acc + (m.totalNutrition?.calories || 0), 0);
    const sumProtein = meals.reduce((acc, m) => acc + (m.totalNutrition?.proteinGrams || 0), 0);
    const sumCarbs = meals.reduce((acc, m) => acc + (m.totalNutrition?.carbsGrams || 0), 0);
    const sumFat = meals.reduce((acc, m) => acc + (m.totalNutrition?.fatGrams || 0), 0);
    const sumFiber = meals.reduce((acc, m) => acc + (m.totalNutrition?.fiberGrams || 0), 0);

    return {
      caloriesTotal: Math.round(sumCalories),
      proteinTotal: Math.round(sumProtein),
      carbsTotal: Math.round(sumCarbs),
      fatTotal: Math.round(sumFat),
      fiberTotal: Math.round(sumFiber),
      mealsCount: meals.length,
    };
  };

  const saveMealToDiary = async (meal: MealAnalysisResult) => {
    triggerHaptic('success');
    const updatedMeal: MealAnalysisResult = { ...meal, status: 'saved' };

    setRecentMeals((prev) => {
      const filtered = prev.filter((m) => m.id !== updatedMeal.id);
      const nextMeals = [updatedMeal, ...filtered];
      const totals = recalculateDailyNutrition(nextMeals);

      setTodaysNutrition((n) => ({
        ...n,
        ...totals,
      }));

      expoSecureStoreAdapter.setItem('HEALTHFREAK_TODAYS_MEALS', JSON.stringify(nextMeals)).catch(() => {});
      return nextMeals;
    });

    // Save to backend asynchronously
    await MealScannerService.saveMeal(updatedMeal);
  };

  const deleteMealFromDiary = async (mealId: string) => {
    triggerHaptic('impact');
    setRecentMeals((prev) => {
      const nextMeals = prev.filter((m) => m.id !== mealId);
      const totals = recalculateDailyNutrition(nextMeals);

      setTodaysNutrition((n) => ({
        ...n,
        ...totals,
      }));

      expoSecureStoreAdapter.setItem('HEALTHFREAK_TODAYS_MEALS', JSON.stringify(nextMeals)).catch(() => {});
      return nextMeals;
    });

    await MealScannerService.deleteMeal(mealId);
  };

  const updateMealPortion = (mealId: string, foodId: string, newWeightGrams: number) => {
    triggerHaptic('selection');
    if (!activeScannedMeal || activeScannedMeal.id !== mealId) return;

    const updatedFoods = activeScannedMeal.foods.map((item) =>
      item.id === foodId ? { ...item, estimatedWeightGrams: newWeightGrams } : item
    );

    const recalculation = MealScannerService.recalculateClientNutrition(updatedFoods);

    setActiveScannedMeal({
      ...activeScannedMeal,
      foods: recalculation.foods,
      totalNutrition: recalculation.totalNutrition,
      micronutrients: recalculation.micronutrients,
    });
  };

  const triggerHaptic = (type: 'selection' | 'success' | 'impact' = 'selection') => {
    try {
      if (type === 'selection') {
        Haptics.selectionAsync();
      } else if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === 'impact') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {
      // Gracefully handle web or unsupported environments
    }
  };

  const setActiveTab = (tab: TabType) => {
    triggerHaptic('selection');
    if (isVoiceActive) {
      voiceClient.endSession();
      setIsVoiceActiveState(false);
    }
    setActiveTabState(tab);
  };

  const setActiveModal = (modal: ModalType) => {
    if (modal) {
      triggerHaptic('impact');
      if (isVoiceActive) {
        voiceClient.endSession();
        setIsVoiceActiveState(false);
      }
    }
    setActiveModalState(modal);
  };

  const setIsVoiceActive = (active: boolean) => {
    if (!active && isVoiceActive) {
      voiceClient.endSession();
    }
    setIsVoiceActiveState(active);
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUserProfileState((prev) => ({ ...prev, ...updates }));
    if (updateProfileState) {
      updateProfileState(updates);
    }
  };

  const logWater = (amountMl: number = 250) => {
    triggerHaptic('success');
    setWaterLoggedMl((prev) => Math.min(6000, prev + amountMl));
  };

  const applySurveyAssessment = async (assessment: UserSurveyAssessment) => {
    triggerHaptic('success');
    const plan = assessment.calculatedPlan;

    setUserProfileState((prev) => ({
      ...prev,
      selectedGoal: assessment.goal,
      goalLabel: plan.headline,
      onboardingCompleted: true,
      surveyAssessment: assessment,
    }));

    if (updateProfileState) {
      updateProfileState({
        selectedGoal: assessment.goal,
        goalLabel: plan.headline,
        onboardingCompleted: true,
        surveyAssessment: assessment,
      });
    }

    // Reset logged meals & consumed nutrition to 0 for the newly configured goal
    setRecentMeals([]);
    setWaterLoggedMl(0);

    setTodaysNutrition({
      caloriesTotal: 0,
      caloriesTarget: plan.dailyCalories,
      proteinTotal: 0,
      proteinTarget: plan.proteinGrams,
      carbsTotal: 0,
      carbsTarget: plan.carbsGrams,
      fatTotal: 0,
      fatTarget: plan.fatGrams,
      fiberTotal: 0,
      fiberTarget: plan.fiberGrams,
      mealsCount: 0,
    });

    // Clear stored meals in local secure store so diary starts fresh
    try {
      await expoSecureStoreAdapter.removeItem('HEALTHFREAK_TODAYS_MEALS');
      await expoSecureStoreAdapter.setItem('HEALTHFREAK_WATER_LOGGED', '0');
    } catch {}

    // Update daily activities according to the new goal
    const goalActivities = getActivitiesForGoal(assessment.goal);
    setActivities(goalActivities);
    setMetrics(computeProgressMetrics(pedometerState.steps, goalActivities));

    // Persist assessment to secure storage
    try {
      await expoSecureStoreAdapter.setItem(
        'HEALTHFREAK_SURVEY_ASSESSMENT',
        JSON.stringify(assessment)
      );
    } catch (err: any) {
      console.warn('[AppContext] Failed saving survey assessment locally:', err?.message);
    }
  };

  // Restore saved survey assessment on startup
  useEffect(() => {
    async function loadSavedAssessment() {
      try {
        const raw = await expoSecureStoreAdapter.getItem('HEALTHFREAK_SURVEY_ASSESSMENT');
        if (raw) {
          const parsed: UserSurveyAssessment = JSON.parse(raw);
          if (parsed && parsed.calculatedPlan) {
            setUserProfileState((prev) => ({
              ...prev,
              selectedGoal: parsed.goal,
              goalLabel: parsed.calculatedPlan.headline,
              onboardingCompleted: true,
              surveyAssessment: parsed,
            }));

            // Restore saved meals if any exist
            let restoredMeals: MealAnalysisResult[] = [];
            try {
              const savedMealsRaw = await expoSecureStoreAdapter.getItem('HEALTHFREAK_TODAYS_MEALS');
              if (savedMealsRaw) {
                restoredMeals = JSON.parse(savedMealsRaw);
              }
            } catch {}

            setRecentMeals(restoredMeals);
            const totals = recalculateDailyNutrition(restoredMeals);

            setTodaysNutrition({
              ...totals,
              caloriesTarget: parsed.calculatedPlan.dailyCalories,
              proteinTarget: parsed.calculatedPlan.proteinGrams,
              carbsTarget: parsed.calculatedPlan.carbsGrams,
              fatTarget: parsed.calculatedPlan.fatGrams,
              fiberTarget: parsed.calculatedPlan.fiberGrams,
            });

            const savedGoalActivities = getActivitiesForGoal(parsed.goal);
            setActivities(savedGoalActivities);
            setMetrics(computeProgressMetrics(pedometerService.getState().steps, savedGoalActivities));
          }
        }
      } catch (err: any) {
        console.warn('[AppContext] Could not restore saved survey:', err?.message);
      }
    }
    loadSavedAssessment();
  }, []);

  const setUserMood = (mood: CheckInMood) => {
    triggerHaptic('success');
    setUserProfileState((prev) => ({
      ...prev,
      currentMood: mood,
      lastCheckInTime: 'Just now',
    }));
  };

  const toggleActivityCompletion = (id: string) => {
    triggerHaptic('success');
    setActivities((prev) => {
      const updated = prev.map((act) =>
        act.id === id ? { ...act, completed: !act.completed } : act
      );

      setMetrics(computeProgressMetrics(pedometerState.steps, updated));

      // Daily streak evaluation: all daily routine tasks completed
      const allCompleted = updated.length > 0 && updated.every((a) => a.completed);
      streakService.evaluateTaskCompletion(allCompleted).then((newStreak) => {
        updateUserProfile({ streakDays: newStreak });
      });

      return updated;
    });
  };

  const sendChatMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    triggerHaptic('selection');
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsCoachTyping(true);

    try {
      const aiResponse = await askDishaAI(
        trimmed,
        userProfile.name.split(' ')[0] || 'friend',
        userProfile.healthConditions || []
      );

      const coachMsg: ChatMessage = {
        id: `msg_coach_${Date.now()}`,
        sender: 'coach',
        text: aiResponse.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: aiResponse.suggestions || [
          'Help me plan my day',
          'Explain my recent lab report',
          'Suggest a balanced dinner',
        ],
      };

      setChatMessages((prev) => [...prev, coachMsg]);
      setIsCoachTyping(false);
      triggerHaptic('selection');
    } catch (err) {
      console.error('[sendChatMessage error]', err);
      const coachMsg: ChatMessage = {
        id: `msg_coach_${Date.now()}`,
        sender: 'coach',
        text: `Namaste ${userProfile.name.split(' ')[0]}! Main sun rahi hoon. Aaj aap kaisa feel kar rahe hain? Any health questions or meal goals I can help guide?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ['Help me plan my day', 'Explain my recent lab report', 'Suggest a balanced dinner'],
      };
      setChatMessages((prev) => [...prev, coachMsg]);
      setIsCoachTyping(false);
      triggerHaptic('selection');
    }
  };

  const resetAll = () => {
    if (isVoiceActive) {
      voiceClient.endSession();
      setIsVoiceActiveState(false);
    }
    pedometerService.resetTodaySteps().catch(() => {});
    setUserProfileState(initialUserProfile);
    setActivities(mockDailyActivities);
    setMetrics(computeProgressMetrics(0, mockDailyActivities));
    setChatMessages(initialCoachMessages);
    setActiveTabState('home');
    setActiveModalState(null);
  };

  const addSimulatedSteps = async (count: number) => {
    triggerHaptic('selection');
    const newState = await pedometerService.addSimulatedSteps(count);
    setPedometerState(newState);
    setActivities((currentActivities) => {
      setMetrics(computeProgressMetrics(newState.steps, currentActivities));
      return currentActivities;
    });
  };

  const resetPedometerSteps = async () => {
    triggerHaptic('impact');
    const newState = await pedometerService.resetTodaySteps();
    setPedometerState(newState);
    setActivities((currentActivities) => {
      setMetrics(computeProgressMetrics(newState.steps, currentActivities));
      return currentActivities;
    });
  };

  const requestPedometerPermission = async () => {
    triggerHaptic('impact');
    const granted = await pedometerService.requestPermission();
    setPedometerState(pedometerService.getState());
    return granted;
  };

  const startSleep = async () => {
    triggerHaptic('impact');
    const sess = await sleepService.startSleep();
    setSleepSession(sess);

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const bedtimeMsg: ChatMessage = {
      id: `msg_sleep_${Date.now()}`,
      sender: 'coach',
      text: `Shubh Ratri ${userProfile.name.split(' ')[0]}! 🌙 Bedtime logged at ${nowStr}. Keep your phone on silent and rest deeply. Kal subah milte hain!`,
      timestamp: nowStr,
      suggestions: ['Sleep meditation', 'Set wake-up goal'],
    };
    setChatMessages((prev) => [...prev, bedtimeMsg]);
  };

  const wakeUp = async () => {
    triggerHaptic('success');
    const { session: sess, summaryText } = await sleepService.wakeUp();
    setSleepSession(sess);

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const wakeupMsg: ChatMessage = {
      id: `msg_wake_${Date.now()}`,
      sender: 'coach',
      text: `Suprabhat ${userProfile.name.split(' ')[0]}! ☀️ You completed ${summaryText}. Sleep recovery recorded! Hydrate with water to kickstart your metabolic energy today.`,
      timestamp: nowStr,
      suggestions: ['Log 350ml water', 'View morning routine', 'Plan breakfast'],
    };
    setChatMessages((prev) => [...prev, wakeupMsg]);
  };

  // Scheduled AI Calls Handlers
  const openScheduleCallModal = () => {
    setActiveModalState('schedule_call');
  };

  const triggerIncomingCallScreen = (call: ScheduledAICall) => {
    setActiveIncomingCall(call);
    setActiveModalState('incoming_call');
  };

  const acceptIncomingCall = async (call: ScheduledAICall) => {
    voiceClient.unlockAudio();
    const res = await AICallService.acceptCall(call.id);
    setActiveIncomingCall(null);
    setActiveLiveKitCall({ call, livekit: res.livekit, greeting: res.greeting });
    setActiveModalState('livekit_call');
  };

  const declineIncomingCall = async (callId: string) => {
    await AICallService.declineCall(callId);
    setActiveIncomingCall(null);
    setActiveModalState(null);
  };

  const endActiveLiveKitCall = () => {
    voiceClient.endSession();
    setActiveLiveKitCall(null);
    setActiveModalState(null);
  };

  // Initialize push notification listener & periodic incoming call check
  useEffect(() => {
    const effectiveUserId = userProfile.id || 'usr_synthetic_alex';
    NotificationService.init(effectiveUserId);

    const unsubscribe = NotificationService.listenForIncomingCalls(async ({ callId, roomName }) => {
      const incoming: ScheduledAICall = {
        id: callId,
        roomName,
        userId: effectiveUserId,
        type: 'in_app',
        status: 'ringing',
        scheduledTime: new Date().toISOString(),
      };
      triggerIncomingCallScreen(incoming);
    });

    const intervalId = setInterval(async () => {
      if (!activeIncomingCall && !activeLiveKitCall) {
        const res = await AICallService.checkActiveIncomingCall(effectiveUserId);
        if (res.hasIncomingCall && res.call) {
          triggerIncomingCallScreen(res.call);
        }
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [userProfile.id, activeIncomingCall, activeLiveKitCall]);

  // Live Pedometer, Sleep & Streak Subscriptions
  useEffect(() => {
    // 1. Initialize streak from storage & auto-reset if day missed
    streakService.initialize().then((initialStreak) => {
      updateUserProfile({ streakDays: initialStreak });
    });

    // 2. Initialize sleep tracker
    sleepService.initialize();
    const unsubSleep = sleepService.subscribe((sess) => {
      setSleepSession(sess);
    });

    // 3. Initialize pedometer & load weekly steps history
    pedometerService.initialize().catch((err) => {
      console.warn('[AppContext] Pedometer initialization failed:', err);
    });

    const unsubPedometer = pedometerService.subscribe((pState) => {
      setPedometerState(pState);
      setActivities((currentActivities) => {
        setMetrics(computeProgressMetrics(pState.steps, currentActivities));
        return currentActivities;
      });
      pedometerService.getWeeklyStepsData().then((wData) => {
        setWeeklySteps(wData);
      });
    });

    return () => {
      unsubSleep();
      unsubPedometer();
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        activeModal,
        setActiveModal,
        userProfile,
        updateUserProfile,
        setUserMood,
        activities,
        toggleActivityCompletion,
        featuredWorkout: mockFeaturedWorkout,
        metrics,
        todaysNutrition,
        recentMeals,
        activeScannedMeal,
        setActiveScannedMeal,
        openMealScanner,
        openMealResult,
        saveMealToDiary,
        deleteMealFromDiary,
        updateMealPortion,
        chatMessages,
        isCoachTyping,
        sendChatMessage,
        isVoiceActive,
        setIsVoiceActive,
        triggerHaptic,
        resetAll,
        applySurveyAssessment,
        waterLoggedMl,
        logWater,
        activeIncomingCall,
        activeLiveKitCall,
        openScheduleCallModal,
        triggerIncomingCallScreen,
        acceptIncomingCall,
        declineIncomingCall,
        endActiveLiveKitCall,
        pedometerState,
        addSimulatedSteps,
        resetPedometerSteps,
        requestPedometerPermission,
        sleepSession,
        startSleep,
        wakeUp,
        weeklySteps,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

