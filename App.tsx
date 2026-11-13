import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from '@expo-google-fonts/dm-serif-display';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';

import { AppProvider, useApp } from './src/state/AppContext';
import { AuthProvider, useAuth } from './src/state/AuthContext';
import { Colors } from './src/theme/colors';
import { BottomTabBar } from './src/components/navigation/BottomTabBar';

import { SplashScreen } from './src/features/splash/SplashScreen';
import { PROMPT_VERSION } from './src/constants/version';
import { LoginScreen } from './src/features/auth/LoginScreen';
import { DashboardScreen } from './src/features/dashboard/DashboardScreen';
import { PlanScreen } from './src/features/plan/PlanScreen';
import { CoachChatScreen } from './src/features/coach/CoachChatScreen';
import { ProgressScreen } from './src/features/progress/ProgressScreen';
import { ProfileScreen } from './src/features/profile/ProfileScreen';

import { CheckInFlow } from './src/features/checkin/CheckInFlow';
import { ActivityDetailScreen } from './src/features/activity/ActivityDetailScreen';
import { ActivityScreen } from './src/features/activity/ActivityScreen';
import { FitnessJourneyScreen } from './src/features/activity/FitnessJourneyScreen';
import { CalendarScheduleScreen } from './src/features/calendar/CalendarScheduleScreen';
import { LabReportsScreen } from './src/features/labreports/LabReportsScreen';
import { OnboardingFlow } from './src/features/onboarding/OnboardingFlow';
import { CameraScannerScreen } from './src/features/scanner/CameraScannerScreen';
import { NutritionResultScreen } from './src/features/scanner/NutritionResultScreen';
import { ScheduleCallModal } from './src/features/coach/ScheduleCallModal';
import { IncomingCallModal } from './src/features/coach/IncomingCallModal';
import { LiveKitVoiceCallScreen } from './src/features/coach/LiveKitVoiceCallScreen';
import { VoiceOverlay } from './src/features/coach/VoiceOverlay';
import { LoadingOverlay } from './src/components/common/LoadingScreen';

const MainAppContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    activeModal,
    setActiveModal,
    activeIncomingCall,
    activeLiveKitCall,
    triggerIncomingCallScreen,
    acceptIncomingCall,
    declineIncomingCall,
    endActiveLiveKitCall,
    globalLoading,
  } = useApp();

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return <DashboardScreen />;
      case 'plan':
        return <PlanScreen />;
      case 'coach':
        return <CoachChatScreen />;
      case 'progress':
        return <ProgressScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <View style={styles.appContainer}>
      <StatusBar style="light" />

      {/* Primary Tab Screen */}
      <View style={styles.screenWrapper}>{renderActiveScreen()}</View>

      {/* Persistent Bottom Tab Bar */}
      {!activeModal && (
        <BottomTabBar
          activeTab={activeTab}
          onTabPress={(tab) => setActiveTab(tab)}
        />
      )}

      {/* Full-Screen Interactive Modals (Universal Overlay) */}
      {activeModal === 'checkin' && (
        <View style={styles.modalOverlay}>
          <CheckInFlow />
        </View>
      )}

      {activeModal === 'activity_session' && (
        <View style={styles.modalOverlay}>
          <ActivityDetailScreen />
        </View>
      )}

      {activeModal === 'lab_report' && (
        <View style={styles.modalOverlay}>
          <LabReportsScreen />
        </View>
      )}

      {activeModal === 'onboarding' && (
        <View style={styles.modalOverlay}>
          <OnboardingFlow />
        </View>
      )}

      {activeModal === 'meal_scanner' && (
        <View style={styles.modalOverlay}>
          <CameraScannerScreen />
        </View>
      )}

      {activeModal === 'meal_result' && (
        <View style={styles.modalOverlay}>
          <NutritionResultScreen />
        </View>
      )}

      {activeModal === 'schedule_call' && (
        <View style={styles.modalOverlay}>
          <ScheduleCallModal
            onClose={() => setActiveModal(null)}
            onCallTriggered={(call) => triggerIncomingCallScreen(call)}
          />
        </View>
      )}

      {activeModal === 'incoming_call' && (
        <View style={styles.modalOverlay}>
          <IncomingCallModal
            call={
              activeIncomingCall || {
                id: 'call_incoming_default',
                roomName: 'room_incoming_default',
                userId: 'usr_synthetic_alex',
                type: 'in_app',
                status: 'ringing',
                scheduledTime: new Date().toISOString(),
              }
            }
            onAccept={(call) => acceptIncomingCall(call)}
            onDecline={(callId) => declineIncomingCall(callId)}
          />
        </View>
      )}

      {activeModal === 'livekit_call' && (
        <View style={styles.modalOverlay}>
          <LiveKitVoiceCallScreen
            call={
              activeLiveKitCall?.call || {
                id: 'call_livekit_default',
                roomName: 'room_livekit_default',
                userId: 'usr_synthetic_alex',
                type: 'in_app',
                status: 'connected',
                scheduledTime: new Date().toISOString(),
              }
            }
            livekitData={activeLiveKitCall?.livekit}
            greeting={activeLiveKitCall?.greeting}
            onCallEnded={endActiveLiveKitCall}
          />
        </View>
      )}

      {activeModal === 'activity_detail' && (
        <View style={styles.modalOverlay}>
          <ActivityScreen />
        </View>
      )}

      {activeModal === 'fitness_journey' && (
        <View style={styles.modalOverlay}>
          <FitnessJourneyScreen
            onClose={() => setActiveModal(null)}
            onNavigateToProgress={() => {
              setActiveModal(null);
              setActiveTab('progress');
            }}
          />
        </View>
      )}

      {activeModal === 'calendar_schedule' && (
        <View style={styles.modalOverlay}>
          <CalendarScheduleScreen onClose={() => setActiveModal(null)} />
        </View>
      )}

      {activeModal === 'voice_overlay' && (
        <View style={styles.modalOverlay}>
          <VoiceOverlay onClose={() => setActiveModal(null)} />
        </View>
      )}

      {/* Global HealthFreak Fetching / Loading Screen */}
      <LoadingOverlay
        visible={globalLoading.visible}
        message={globalLoading.message}
        submessage={globalLoading.submessage}
      />
    </View>
  );
};

const AnimatedAppEntrance: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);
  const translateY = useSharedValue(14);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    scale.value = withSpring(1, { damping: 16, stiffness: 100 });
    translateY.value = withSpring(0, { damping: 16, stiffness: 100 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

const NavigationRoot: React.FC = () => {
  const { authState, session } = useAuth();
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Show splash screen while initializing or during splash duration
  if (showSplash || authState === 'initializing') {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Route Protection: Unauthenticated -> LoginScreen
  if (authState === 'logged_out' || (!session && (authState === 'authenticating' || authState === 'error'))) {
    return <LoginScreen />;
  }

  return (
    <AnimatedAppEntrance>
      <MainAppContent />
    </AnimatedAppEntrance>
  );
};

export default function App() {
  useEffect(() => {
    if (__DEV__) {
      console.log('[HealthFreak App] Startup - PROMPT_VERSION:', PROMPT_VERSION);
    }
  }, []);

  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  if (!fontsLoaded) {
    return <SplashScreen onFinish={() => {}} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppProvider>
            <NavigationRoot />
          </AppProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  appContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenWrapper: {
    flex: 1,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    backgroundColor: Colors.background,
  },
});
