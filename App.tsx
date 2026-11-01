import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from '@expo-google-fonts/dm-serif-display';
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
import { LoginScreen } from './src/features/auth/LoginScreen';
import { DashboardScreen } from './src/features/dashboard/DashboardScreen';
import { PlanScreen } from './src/features/plan/PlanScreen';
import { CoachChatScreen } from './src/features/coach/CoachChatScreen';
import { ProgressScreen } from './src/features/progress/ProgressScreen';
import { ProfileScreen } from './src/features/profile/ProfileScreen';

import { CheckInFlow } from './src/features/checkin/CheckInFlow';
import { ActivityDetailScreen } from './src/features/activity/ActivityDetailScreen';
import { LabReportsScreen } from './src/features/labreports/LabReportsScreen';
import { OnboardingFlow } from './src/features/onboarding/OnboardingFlow';
import { CameraScannerScreen } from './src/features/scanner/CameraScannerScreen';
import { NutritionResultScreen } from './src/features/scanner/NutritionResultScreen';

const MainAppContent: React.FC = () => {
  const { activeTab, setActiveTab, activeModal } = useApp();

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
    </View>
  );
};

const NavigationRoot: React.FC = () => {
  const { authState, session, profile } = useAuth();
  const { setActiveModal } = useApp();
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [hasPromptedOnboarding, setHasPromptedOnboarding] = useState<boolean>(false);

  // Trigger Onboarding modal if user is new
  React.useEffect(() => {
    if (!session) {
      setHasPromptedOnboarding(false);
    } else if (profile && !profile.onboardingCompleted && !hasPromptedOnboarding) {
      setHasPromptedOnboarding(true);
      setActiveModal('onboarding');
    }
  }, [session, profile, hasPromptedOnboarding, setActiveModal]);

  // Show splash screen while initializing or during splash duration
  if (showSplash || authState === 'initializing') {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Route Protection: Unauthenticated -> LoginScreen
  if (authState === 'logged_out' || (!session && (authState === 'authenticating' || authState === 'error'))) {
    return <LoginScreen />;
  }

  return <MainAppContent />;
};

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

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
