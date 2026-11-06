import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Footprints,
  Award,
  Sliders,
  RefreshCw,
  TrendingUp,
  Zap,
  Info,
  CheckCircle2,
} from 'lucide-react-native';
import { StepProgressRing } from './components/StepProgressRing';
import { StepHistoryChart } from './components/StepHistoryChart';
import { ActivitySummaryCard } from './components/ActivitySummaryCard';
import { StepGoalModal } from './components/StepGoalModal';
import { PedometerPermissionModal } from './components/PedometerPermissionModal';
import { FitnessJourneyScreen } from './FitnessJourneyScreen';
import { usePedometer } from './hooks/usePedometer';
import { useApp } from '../../state/AppContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

export const ActivityScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { setActiveModal, setActiveTab, triggerHaptic } = useApp();
  const [activeTabMode] = useState<'journey' | 'technical'>('journey');

  const {
    todaySteps,
    stepGoal,
    distanceMeters,
    caloriesBurned,
    activeMinutes,
    permissionStatus,
    isTracking,
    history,
    insights,
    lastSyncedAt,
    requestPermissions,
    startTracking,
    stopTracking,
    updateStepGoal,
    syncNow,
  } = usePedometer();

  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [showPermissionModal, setShowPermissionModal] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  if (activeTabMode === 'journey') {
    return (
      <FitnessJourneyScreen
        onClose={() => setActiveModal(null)}
        onNavigateToProgress={() => {
          setActiveModal(null);
          setActiveTab('progress');
        }}
      />
    );
  }

  const percentage = stepGoal > 0 ? todaySteps / stepGoal : 0;
  const isGoalReached = todaySteps >= stepGoal && stepGoal > 0;
  const remaining = Math.max(0, stepGoal - todaySteps);

  const handleSyncPress = async () => {
    triggerHaptic?.('selection');
    setIsSyncing(true);
    await syncNow();
    setIsSyncing(false);
  };

  const handleGoalSave = async (newGoal: number) => {
    triggerHaptic?.('success');
    await updateStepGoal(newGoal);
  };

  return (
    <View
      style={[
        styles.root,
        { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            triggerHaptic?.('selection');
            setActiveModal(null);
          }}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>

        <Text style={styles.screenTitle}>Activity & Steps</Text>

        <View style={styles.topRightActions}>
          <Pressable
            onPress={() => setShowGoalModal(true)}
            style={styles.iconActionBtn}
          >
            <Sliders size={18} color={Colors.textSecondary} />
          </Pressable>

          <Pressable
            onPress={handleSyncPress}
            style={styles.iconActionBtn}
            disabled={isSyncing}
          >
            <RefreshCw
              size={18}
              color={isSyncing ? Colors.coralCTA : Colors.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Web Notice Banner */}
        {Platform.OS === 'web' && (
          <View style={styles.webNoticeBanner}>
            <Info size={16} color="#8EA393" style={{ marginRight: 8 }} />
            <Text style={styles.webNoticeText}>
              Pedometer uses native smartphone motion hardware (Android Step Counter & iOS Core Motion). Testing on web uses synchronized cloud records.
            </Text>
          </View>
        )}

        {/* 1. Hero Ring Section */}
        <View style={styles.heroSection}>
          <StepProgressRing
            size={180}
            strokeWidth={14}
            progress={percentage}
            color={isGoalReached ? '#4AB87A' : Colors.coralCTA}
            bgColor="#232B25"
          >
            <View style={styles.ringCenterContent}>
              <Footprints
                size={28}
                color={isGoalReached ? '#4AB87A' : Colors.coralCTA}
                style={{ marginBottom: 4 }}
              />
              <Text style={styles.ringStepCount}>{todaySteps.toLocaleString()}</Text>
              <Text style={styles.ringStepLabel}>STEPS</Text>
            </View>
          </StepProgressRing>

          <View style={styles.heroSummaryBlock}>
            <Text style={styles.goalLineText}>
              Goal: {stepGoal.toLocaleString()} steps •{' '}
              <Text style={{ color: isGoalReached ? '#4AB87A' : Colors.coralCTA }}>
                {Math.round(percentage * 100)}%
              </Text>
            </Text>
            <Text style={styles.remainingSubtext}>
              {isGoalReached
                ? 'Outstanding work! Daily movement target exceeded.'
                : `${remaining.toLocaleString()} steps remaining to achieve today's goal`}
            </Text>
          </View>
        </View>

        {/* 2. Sub-Metrics Cards (Distance, Calories, Active Minutes) */}
        <ActivitySummaryCard
          distanceMeters={distanceMeters}
          caloriesBurned={caloriesBurned}
          activeMinutes={activeMinutes}
        />

        {/* 3. Weekly 7-Day History Chart */}
        <StepHistoryChart history={history} stepGoal={stepGoal} />

        {/* 4. Deterministic Activity Insights */}
        {insights.length > 0 && (
          <View style={styles.insightsContainer}>
            <Text style={styles.sectionHeaderTitle}>Activity Insights</Text>
            {insights.map((insight) => (
              <View key={insight.id} style={styles.insightItem}>
                <View style={styles.insightIconBadge}>
                  {insight.type === 'achievement' && <Award size={18} color="#4AB87A" />}
                  {insight.type === 'comparison' && <TrendingUp size={18} color={Colors.coralCTA} />}
                  {insight.type === 'streak' && <Zap size={18} color="#EAD66F" />}
                  {insight.type === 'recommendation' && <Footprints size={18} color="#6EB7FF" />}
                </View>
                <View style={styles.insightTextColumn}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightDesc}>{insight.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 5. Tracking Controls & Sensor Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeaderRow}>
            <View>
              <Text style={styles.statusTitle}>Sensor Connection</Text>
              <Text style={styles.statusSubtitle}>
                {Platform.OS === 'android'
                  ? 'Hardware: Sensor.TYPE_STEP_COUNTER'
                  : Platform.OS === 'ios'
                  ? 'Hardware: Apple Core Motion (CMPedometer)'
                  : 'Web Sensor Emulation'}
              </Text>
            </View>

            <View style={styles.statusPill}>
              <CheckCircle2
                size={14}
                color={permissionStatus === 'granted' ? '#4AB87A' : '#EAD66F'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.statusPillText,
                  { color: permissionStatus === 'granted' ? '#4AB87A' : '#EAD66F' },
                ]}
              >
                {permissionStatus === 'granted' ? 'Active' : permissionStatus}
              </Text>
            </View>
          </View>

          {/* User Tracking Controls */}
          {Platform.OS !== 'web' && (
            <View style={styles.controlButtonsRow}>
              {permissionStatus !== 'granted' ? (
                <Pressable
                  style={styles.controlPrimaryBtn}
                  onPress={() => setShowPermissionModal(true)}
                >
                  <Text style={styles.controlPrimaryBtnText}>Grant Sensor Permission</Text>
                </Pressable>
              ) : isTracking ? (
                <Pressable
                  style={styles.controlSecondaryBtn}
                  onPress={() => stopTracking()}
                >
                  <Text style={styles.controlSecondaryBtnText}>Pause Tracking</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.controlPrimaryBtn}
                  onPress={() => startTracking()}
                >
                  <Text style={styles.controlPrimaryBtnText}>Resume Tracking</Text>
                </Pressable>
              )}
            </View>
          )}

          {lastSyncedAt && (
            <Text style={styles.lastSyncText}>Last synced with cloud: {lastSyncedAt}</Text>
          )}
        </View>
      </ScrollView>

      {/* Step Goal Customizer Modal */}
      <StepGoalModal
        visible={showGoalModal}
        currentGoal={stepGoal}
        onClose={() => setShowGoalModal(false)}
        onSave={handleGoalSave}
      />

      {/* Permission Explanation Modal */}
      <PedometerPermissionModal
        visible={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onRequestPermission={requestPermissions}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E2320',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A302B',
  },
  screenTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.lg,
    fontFamily: Typography.fontFamilies.serif,
  },
  topRightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E2320',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A302B',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  webNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161F1A',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#23322A',
    marginBottom: 16,
  },
  webNoticeText: {
    flex: 1,
    color: '#8EA393',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansRegular,
    lineHeight: 16,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  ringCenterContent: {
    alignItems: 'center',
  },
  ringStepCount: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes['3xl'],
    fontFamily: Typography.fontFamilies.serif,
  },
  ringStepLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 1.5,
  },
  heroSummaryBlock: {
    alignItems: 'center',
    marginTop: 18,
  },
  goalLineText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm + 1,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  remainingSubtext: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 4,
    textAlign: 'center',
  },
  insightsContainer: {
    marginVertical: 12,
  },
  sectionHeaderTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.md,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    marginBottom: 10,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171B18',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#242A25',
    marginBottom: 8,
  },
  insightIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#202621',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightTextColumn: {
    flex: 1,
  },
  insightTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  insightDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansRegular,
    lineHeight: 16,
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: '#161A17',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#232924',
    marginTop: 12,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  statusSubtitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202622',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
    textTransform: 'capitalize',
  },
  controlButtonsRow: {
    marginTop: 14,
  },
  controlPrimaryBtn: {
    backgroundColor: Colors.coralCTA,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  controlSecondaryBtn: {
    backgroundColor: '#252D27',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#323C34',
  },
  controlSecondaryBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  lastSyncText: {
    color: '#5E6B61',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 10,
    textAlign: 'center',
  },
});
