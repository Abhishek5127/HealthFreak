import React, { createContext, useContext, useState, useEffect } from 'react';
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
import { initialCoachMessages, coachResponses } from '../mock-data/coachChat';

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
  const [activeTab, setActiveTabState] = useState<TabType>('home');
  const [activeModal, setActiveModalState] = useState<ModalType>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(initialUserProfile);
  const [activities, setActivities] = useState<DailyActivityItem[]>(mockDailyActivities);
  const [metrics, setMetrics] = useState<ProgressMetric[]>(mockProgressMetrics);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialCoachMessages);
  const [isCoachTyping, setIsCoachTyping] = useState<boolean>(false);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);

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
    setActiveTabState(tab);
  };

  const setActiveModal = (modal: ModalType) => {
    if (modal) {
      triggerHaptic('impact');
    }
    setActiveModalState(modal);
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...updates }));
  };

  const setUserMood = (mood: CheckInMood) => {
    triggerHaptic('success');
    setUserProfile((prev) => ({
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

  const sendChatMessage = (text: string) => {
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

    // Simulate smart contextual response
    setTimeout(() => {
      const lower = trimmed.toLowerCase();
      let matchedResponse = coachResponses[lower];

      if (!matchedResponse) {
        // Fallback contextual search
        const keys = Object.keys(coachResponses);
        const foundKey = keys.find((k) => lower.includes(k) || k.includes(lower));
        if (foundKey) {
          matchedResponse = coachResponses[foundKey];
        } else if (lower.includes('food') || lower.includes('eat') || lower.includes('diet') || lower.includes('meal')) {
          matchedResponse = coachResponses['suggest a balanced dinner'];
        } else if (lower.includes('lab') || lower.includes('report') || lower.includes('blood') || lower.includes('test')) {
          matchedResponse = coachResponses['explain my recent lab report'];
        } else if (lower.includes('plan') || lower.includes('routine') || lower.includes('today')) {
          matchedResponse = coachResponses['help me plan my day'];
        } else {
          matchedResponse = {
            text: `Thank you for sharing that, ${userProfile.name.split(' ')[0]}. Consistency in small daily micro-habits creates profound metabolic resilience. Let’s focus on staying hydrated, taking mindful breaths, and sticking to your scheduled evening movement!`,
            suggestions: ['Help me plan my day', 'Explain my recent lab report', 'Suggest a balanced dinner'],
          };
        }
      }

      const coachMsg: ChatMessage = {
        id: `msg_coach_${Date.now()}`,
        sender: 'coach',
        text: matchedResponse.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: matchedResponse.suggestions,
        actionLink: matchedResponse.actionLink,
      };

      setChatMessages((prev) => [...prev, coachMsg]);
      setIsCoachTyping(false);
      triggerHaptic('selection');
    }, 1100);
  };

  const resetAll = () => {
    setUserProfile(initialUserProfile);
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

