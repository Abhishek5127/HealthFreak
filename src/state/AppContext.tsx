import React, { createContext, useContext, useState, useMemo } from 'react';
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
} from '../types';
import {
  initialUserProfile,
  mockDailyActivities,
  mockProgressMetrics,
  mockFeaturedWorkout,
} from '../mock-data/healthData';
import { initialCoachMessages } from '../mock-data/coachChat';
import { askDishaAI } from '../services/aiChatService';
import { voiceClient } from '../services/voiceClient';
import { MealAnalysisResult } from '../types/meal';
import { MealScannerService } from '../services/mealScannerService';
import { useAuth } from './AuthContext';

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile: authProfile } = useAuth();
  const [activeTab, setActiveTabState] = useState<TabType>('home');
  const [activeModal, setActiveModalState] = useState<ModalType>(null);
  const [userProfileState, setUserProfileState] = useState<UserProfile>(initialUserProfile);

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
  const [metrics, setMetrics] = useState<ProgressMetric[]>(mockProgressMetrics);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialCoachMessages);
  const [isCoachTyping, setIsCoachTyping] = useState<boolean>(false);
  const [isVoiceActive, setIsVoiceActiveState] = useState<boolean>(false);

  // Meal Scanner & Nutrition Diary State
  const [todaysNutrition, setTodaysNutrition] = useState<DailyNutritionState>({
    caloriesTotal: 453,
    caloriesTarget: 2100,
    proteinTotal: 21,
    proteinTarget: 130,
    carbsTotal: 64,
    carbsTarget: 220,
    fatTotal: 13,
    fatTarget: 65,
    fiberTotal: 10,
    fiberTarget: 35,
    mealsCount: 1,
  });

  const [recentMeals, setRecentMeals] = useState<MealAnalysisResult[]>([
    {
      id: 'seed_meal_breakfast',
      userId: 'usr_synthetic_alex',
      mealName: 'Sprouted Moong & Poha Breakfast',
      mealType: 'breakfast',
      timestamp: new Date().toISOString(),
      recognitionConfidence: 0.95,
      foods: [
        {
          id: 'f_seed_1',
          name: 'Poha',
          localizedName: 'Kanda Poha',
          estimatedWeightGrams: 140,
          servingDescription: '1 bowl (~140g)',
          confidence: 0.96,
          visibleIngredients: ['Flattened rice', 'Mustard seeds', 'Peanuts'],
          inferredIngredients: ['Turmeric', 'Green chillies'],
          cookingMethod: 'Tempered and steamed',
          nutrition: {
            calories: 250,
            protein: 4.8,
            carbs: 44.1,
            fat: 6.4,
            fiber: 3.6,
            sugar: 2.5,
            sodium: 308,
            potassium: 210,
          },
        },
        {
          id: 'f_seed_2',
          name: 'Sprouted Moong Salad',
          localizedName: 'Moong Sprouts',
          estimatedWeightGrams: 120,
          servingDescription: '1 medium bowl (~120g)',
          confidence: 0.95,
          visibleIngredients: ['Moong sprouts', 'Tomato', 'Coriander'],
          inferredIngredients: ['Lemon juice', 'Chaat masala'],
          cookingMethod: 'Raw sprouted',
          nutrition: {
            calories: 118,
            protein: 9.4,
            carbs: 19.4,
            fat: 1.0,
            fiber: 5.9,
            sugar: 2.5,
            sodium: 22,
            potassium: 384,
          },
        },
        {
          id: 'f_seed_3',
          name: 'Boiled Egg / Egg Omelette',
          localizedName: 'Boiled Egg',
          estimatedWeightGrams: 55,
          servingDescription: '1 egg (~55g)',
          confidence: 0.98,
          visibleIngredients: ['1 hard boiled egg'],
          inferredIngredients: ['Black pepper'],
          cookingMethod: 'Boiled',
          nutrition: {
            calories: 85,
            protein: 6.9,
            carbs: 0.6,
            fat: 5.8,
            fiber: 0.0,
            sugar: 0.6,
            sodium: 77,
            potassium: 76,
          },
        },
      ],
      totalNutrition: {
        calories: 453,
        proteinGrams: 21.1,
        carbsGrams: 64.1,
        fatGrams: 13.2,
        fiberGrams: 9.5,
        sugarGrams: 5.6,
        sodiumMg: 407,
        potassiumMg: 670,
        proteinPercent: 19,
        carbsPercent: 56,
        fatPercent: 25,
      },
      micronutrients: [
        { name: 'Iron', amount: 5.2, unit: 'mg', dailyValuePercent: 29, category: 'mineral' },
        { name: 'Calcium', amount: 96, unit: 'mg', dailyValuePercent: 10, category: 'mineral' },
        { name: 'Folate (B9)', amount: 155, unit: 'mcg', dailyValuePercent: 39, category: 'vitamin' },
        { name: 'Vitamin C', amount: 28, unit: 'mg', dailyValuePercent: 31, category: 'vitamin' },
      ],
      healthBenefits: [
        {
          title: 'High Bioavailable Protein',
          description: 'Moong sprouts + egg provide a clean amino acid profile to fuel morning metabolic tone.',
          category: 'muscle',
        },
        {
          title: 'Slow Glycemic Release',
          description: '9.5g fiber buffers morning blood sugar spikes and sustains energy.',
          category: 'digestion',
        },
      ],
      considerations: [
        {
          title: 'Solid Hydration Baseline',
          description: 'Follow this breakfast with 400ml water to optimize fiber digestion.',
          type: 'info',
        },
      ],
      coachInsight: 'Great start to your day Alex! 21g protein in your breakfast sets a strong metabolic foundation.',
      status: 'saved',
    },
  ]);

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

  const saveMealToDiary = async (meal: MealAnalysisResult) => {
    triggerHaptic('success');
    const updatedMeal: MealAnalysisResult = { ...meal, status: 'saved' };

    // Update local recent meals
    setRecentMeals((prev) => {
      const filtered = prev.filter((m) => m.id !== updatedMeal.id);
      return [updatedMeal, ...filtered];
    });

    // Update today's totals
    setTodaysNutrition((prev) => ({
      ...prev,
      caloriesTotal: prev.caloriesTotal + updatedMeal.totalNutrition.calories,
      proteinTotal: Math.round(prev.proteinTotal + updatedMeal.totalNutrition.proteinGrams),
      carbsTotal: Math.round(prev.carbsTotal + updatedMeal.totalNutrition.carbsGrams),
      fatTotal: Math.round(prev.fatTotal + updatedMeal.totalNutrition.fatGrams),
      fiberTotal: Math.round(prev.fiberTotal + updatedMeal.totalNutrition.fiberGrams),
      mealsCount: prev.mealsCount + 1,
    }));

    // Save to backend asynchronously
    await MealScannerService.saveMeal(updatedMeal);
  };

  const deleteMealFromDiary = async (mealId: string) => {
    triggerHaptic('impact');
    const mealToDelete = recentMeals.find((m) => m.id === mealId);
    if (!mealToDelete) return;

    setRecentMeals((prev) => prev.filter((m) => m.id !== mealId));

    setTodaysNutrition((prev) => ({
      ...prev,
      caloriesTotal: Math.max(0, prev.caloriesTotal - mealToDelete.totalNutrition.calories),
      proteinTotal: Math.max(0, Math.round(prev.proteinTotal - mealToDelete.totalNutrition.proteinGrams)),
      carbsTotal: Math.max(0, Math.round(prev.carbsTotal - mealToDelete.totalNutrition.carbsGrams)),
      fatTotal: Math.max(0, Math.round(prev.fatTotal - mealToDelete.totalNutrition.fatGrams)),
      fiberTotal: Math.max(0, Math.round(prev.fiberTotal - mealToDelete.totalNutrition.fiberGrams)),
      mealsCount: Math.max(0, prev.mealsCount - 1),
    }));

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
  };

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

      // Recalculate metrics
      const completedCount = updated.filter((a) => a.completed).length;
      const totalActivities = updated.length;
      const completedRatio = completedCount / totalActivities;

      setMetrics((prevMetrics) =>
        prevMetrics.map((m) => {
          if (m.id === 'calories') {
            const newKcal = Math.round(273 + (completedRatio > 0.5 ? 80 : 0));
            return {
              ...m,
              value: `${newKcal}`,
              percentage: Math.min(1, newKcal / 450),
            };
          }
          if (m.id === 'activity') {
            const newMinutes = Math.round(65 + completedCount * 12);
            return {
              ...m,
              value: `${Math.floor(newMinutes / 60)}h ${newMinutes % 60}m`,
              percentage: Math.min(1, newMinutes / 90),
            };
          }
          return m;
        })
      );

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
    setUserProfileState(initialUserProfile);
    setActivities(mockDailyActivities);
    setMetrics(mockProgressMetrics);
    setChatMessages(initialCoachMessages);
    setActiveTabState('home');
    setActiveModalState(null);
  };

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

