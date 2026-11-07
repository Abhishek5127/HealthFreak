import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Share2,
  Calendar as CalendarIcon,
  Flame,
  Dumbbell,
  Clock,
  Flag,
  Plus,
  X,
  Check,
  BarChart2,
} from 'lucide-react-native';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { usePedometer } from './hooks/usePedometer';
import { useApp } from '../../state/AppContext';
import { Typography } from '../../theme/typography';

interface FitnessGoal {
  id: string;
  title: string;
  frequency: string;
  targetDate: string;
  current: number;
  target: number;
  unit?: string;
}

const INITIAL_GOALS: FitnessGoal[] = [
  {
    id: 'g_1',
    title: 'Feel more balanced with yoga',
    frequency: '3x per week',
    targetDate: 'Jan 26',
    current: 2,
    target: 3,
  },
  {
    id: 'g_2',
    title: '5,000 steps per day',
    frequency: 'Every day',
    targetDate: 'Never',
    current: 2971,
    target: 5000,
  },
];

export const FitnessJourneyScreen: React.FC<{
  onClose?: () => void;
  onNavigateToProgress?: () => void;
}> = ({ onClose, onNavigateToProgress }) => {
  const insets = useSafeAreaInsets();
  const { triggerHaptic } = useApp();
  const { todaySteps, caloriesBurned, activeMinutes } = usePedometer();

  const [activeSegment, setActiveSegment] = useState<'activity' | 'progress'>('activity');
  const [goals, setGoals] = useState<FitnessGoal[]>(INITIAL_GOALS);
  const [showAddGoalModal, setShowAddGoalModal] = useState<boolean>(false);
  const [newGoalTitle, setNewGoalTitle] = useState<string>('');
  const [newGoalFrequency, setNewGoalFrequency] = useState<string>('Daily');
  const [newGoalTarget, setNewGoalTarget] = useState<string>('5000');

  // Display steps: live steps if available, or iconic 5,348 from screenshot
  const displaySteps = todaySteps > 0 ? todaySteps : 5348;
  const displayCalories = caloriesBurned > 0 ? caloriesBurned : 273;
  const displayWorkoutMins = activeMinutes > 0 ? activeMinutes : 65;
  const workoutHours = Math.floor(displayWorkoutMins / 60);
  const workoutRemainingMins = displayWorkoutMins % 60;
  const displayWorkoutString = `${workoutHours}h ${workoutRemainingMins}m`;

  const handleShare = async () => {
    triggerHaptic?.('selection');
    try {
      await Share.share({
        message: `My Fitness Journey on HealthFreak: Logged ${displaySteps.toLocaleString()} steps and ${displayCalories} kcal today! 🏃🔥`,
      });
    } catch {}
  };

  const handleAddGoal = () => {
    if (!newGoalTitle.trim()) return;
    triggerHaptic?.('success');

    const created: FitnessGoal = {
      id: `g_${Date.now()}`,
      title: newGoalTitle.trim(),
      frequency: newGoalFrequency,
      targetDate: 'Active',
      current: 0,
      target: parseInt(newGoalTarget, 10) || 1,
    };

    setGoals((prev) => [...prev, created]);
    setNewGoalTitle('');
    setShowAddGoalModal(false);
  };

  // 7-column step matrix (from screenshot)
  // Each column has 4 dots: levels 0 (bottom), 1, 2, 3 (top)
  const dotColumns = [
    { activeCount: 1, curveY: 15 }, // col 0
    { activeCount: 2, curveY: 45 }, // col 1
    { activeCount: 3, curveY: 75 }, // col 2 (peak)
    { activeCount: 2, curveY: 35 }, // col 3
    { activeCount: 1, curveY: 10 }, // col 4
    { activeCount: 1, curveY: 20 }, // col 5
    { activeCount: 1, curveY: 15 }, // col 6
  ];

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* 1. Top Navigation Bar */}
      <View style={styles.topBar}>
        {onClose ? (
          <Pressable onPress={onClose} hitSlop={12} style={styles.navIconBtn}>
            <ChevronLeft size={22} color="#FFFFFF" />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}

        <Text style={styles.screenTitle}>My fitness journey</Text>

        <Pressable onPress={handleShare} hitSlop={12} style={styles.navIconBtn}>
          <Share2 size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 60 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Segmented Pill Switcher: Activity vs Progress */}
        <View style={styles.segmentedContainer}>
          <Pressable
            onPress={() => {
              triggerHaptic?.('selection');
              setActiveSegment('activity');
            }}
            style={[
              styles.segmentBtn,
              activeSegment === 'activity' && styles.segmentBtnActive,
            ]}
          >
            <View style={styles.segmentIconRow}>
              {/* Running figure icon */}
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="5" r="2" stroke={activeSegment === 'activity' ? '#72D995' : '#8A998E'} strokeWidth="2" />
                <Path
                  d="M10 21l3-5-2-4 4-2 3 3M6 13l3-1 2 3M8 9l3-2"
                  stroke={activeSegment === 'activity' ? '#72D995' : '#8A998E'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text
                style={[
                  styles.segmentText,
                  activeSegment === 'activity' && styles.segmentTextActive,
                ]}
              >
                Activity
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              triggerHaptic?.('selection');
              setActiveSegment('progress');
              onNavigateToProgress?.();
            }}
            style={[
              styles.segmentBtn,
              activeSegment === 'progress' && styles.segmentBtnActive,
            ]}
          >
            <View style={styles.segmentIconRow}>
              <BarChart2
                size={18}
                color={activeSegment === 'progress' ? '#72D995' : '#8A998E'}
              />
              <Text
                style={[
                  styles.segmentText,
                  activeSegment === 'progress' && styles.segmentTextActive,
                ]}
              >
                Progress
              </Text>
            </View>
          </Pressable>
        </View>

        {/* 3. Date Selector Card */}
        <View style={styles.dateCard}>
          <CalendarIcon size={16} color="#8A998E" style={{ marginRight: 8 }} />
          <Text style={styles.dateCardText}>Tue, December 12, 2025</Text>
        </View>

        {/* 4. Steps Section with Dot Matrix & Smooth Spline Chart */}
        <View style={styles.stepsCard}>
          <View style={styles.stepsCardHeader}>
            <Text style={styles.stepsValueTitle}>
              Steps: <Text style={styles.stepsNumber}>{displaySteps.toLocaleString()}</Text>
            </Text>
            {/* Running person icon */}
            <View style={styles.runningIconBadge}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="5" r="2" stroke="#8A998E" strokeWidth="2" />
                <Path
                  d="M10 21l3-5-2-4 4-2 3 3M6 13l3-1 2 3M8 9l3-2"
                  stroke="#8A998E"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </View>

          {/* Dot Matrix Grid with Y-axis & Orange Spline Curve */}
          <View style={styles.matrixContainer}>
            {/* Y-axis labels */}
            <View style={styles.yAxisLabels}>
              <Text style={styles.yAxisText}>3k</Text>
              <Text style={styles.yAxisText}>2k</Text>
              <Text style={styles.yAxisText}>1k</Text>
              <Text style={styles.yAxisText}>0</Text>
            </View>

            {/* Dot Columns & Spline Curve */}
            <View style={styles.matrixGrid}>
              {/* SVG Spline Trendline positioned over the dots */}
              <Svg
                style={StyleSheet.absoluteFill}
                viewBox="0 0 240 100"
                preserveAspectRatio="none"
              >
                <Defs>
                  <LinearGradient id="orangeLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#FF6243" />
                    <Stop offset="100%" stopColor="#FF7A5C" />
                  </LinearGradient>
                </Defs>
                {/* Smooth bezier trendline traversing between columns */}
                <Path
                  d="M 15 85 Q 40 70, 55 45 T 90 20 T 130 55 T 165 80 T 200 78 T 225 82"
                  fill="none"
                  stroke="#FF6243"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              </Svg>

              {/* 7 Columns of 4 dots */}
              {dotColumns.map((col, colIdx) => {
                return (
                  <View key={colIdx} style={styles.dotCol}>
                    {[3, 2, 1, 0].map((dotLevel) => {
                      const isActive = dotLevel < col.activeCount;
                      return (
                        <View
                          key={dotLevel}
                          style={[
                            styles.dot,
                            isActive ? styles.dotActive : styles.dotInactive,
                          ]}
                        />
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* 5. Dual Stats Cards Row: Calories & Workout */}
        <View style={styles.dualStatsRow}>
          {/* Left Card: Calories with Circular Arc Gauge */}
          <View style={styles.statCardHalf}>
            <View style={styles.statCardTop}>
              <Text style={styles.statCardTitle}>Calories</Text>
              <Flame size={16} color="#8A998E" />
            </View>

            {/* Circular Gauge */}
            <View style={styles.circularGaugeContainer}>
              <Svg width={110} height={110} viewBox="0 0 100 100">
                {/* Background Ring */}
                <Circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#26312A"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Active Coral Progress Arc (~65% circle) */}
                <Circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#FF6243"
                  strokeWidth="8"
                  strokeDasharray="238"
                  strokeDashoffset="80"
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 50 50)"
                />
              </Svg>
              <View style={styles.circularGaugeCenter}>
                <Text style={styles.gaugeValue}>{displayCalories}</Text>
                <Text style={styles.gaugeUnit}>kcal</Text>
              </View>
            </View>
          </View>

          {/* Right Card: Workout with Mountain Wave Area Chart */}
          <View style={styles.statCardHalf}>
            <View style={styles.statCardTop}>
              <View>
                <Text style={styles.statCardTitle}>Workout:</Text>
                <Text style={styles.workoutTimeString}>{displayWorkoutString}</Text>
              </View>
              <Dumbbell size={16} color="#8A998E" />
            </View>

            {/* Waveform Mountain Chart */}
            <View style={styles.waveChartContainer}>
              <Svg width="100%" height={75} viewBox="0 0 140 75" preserveAspectRatio="none">
                <Defs>
                  <LinearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#FF6243" stopOpacity="0.55" />
                    <Stop offset="60%" stopColor="#FF6243" stopOpacity="0.2" />
                    <Stop offset="100%" stopColor="#FF6243" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                {/* Mountain Filled Area */}
                <Path
                  d="M 0 75 Q 25 70, 45 45 T 85 10 T 115 28 T 140 38 L 140 75 Z"
                  fill="url(#waveGrad)"
                />
                {/* Top Stroke Line */}
                <Path
                  d="M 0 75 Q 25 70, 45 45 T 85 10 T 115 28 T 140 38"
                  fill="none"
                  stroke="#FF6243"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </View>
        </View>

        {/* 6. "My goals" Section */}
        <View style={styles.goalsSectionHeader}>
          <Text style={styles.sectionHeading}>My goals</Text>
          <Pressable
            onPress={() => {
              triggerHaptic?.('selection');
              setShowAddGoalModal(true);
            }}
            style={styles.addGoalBtn}
            hitSlop={8}
          >
            <Plus size={15} color="#8A998E" style={{ marginRight: 4 }} />
            <Text style={styles.addGoalBtnText}>Add goals</Text>
          </Pressable>
        </View>

        {/* Goals Cards List */}
        <View style={styles.goalsList}>
          {goals.map((goal) => {
            const fractionText =
              goal.target >= 1000
                ? `${goal.current.toLocaleString()}`
                : `${goal.current}/${goal.target}`;
            const percentage = Math.min(1, goal.current / goal.target);
            const strokeDashoffset = 125 * (1 - percentage);

            return (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalLeftInfo}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <View style={styles.goalSubtitleRow}>
                    <View style={styles.goalSubItem}>
                      <Clock size={12} color="#7E8F82" style={{ marginRight: 4 }} />
                      <Text style={styles.goalSubText}>{goal.frequency}</Text>
                    </View>
                    <View style={styles.goalSubItem}>
                      <Flag size={12} color="#7E8F82" style={{ marginRight: 4 }} />
                      <Text style={styles.goalSubText}>{goal.targetDate}</Text>
                    </View>
                  </View>
                </View>

                {/* Right Circular Progress Ring */}
                <View style={styles.goalRingWrapper}>
                  <Svg width={54} height={54} viewBox="0 0 50 50">
                    <Circle
                      cx="25"
                      cy="25"
                      r="20"
                      stroke="#26312A"
                      strokeWidth="4"
                      fill="none"
                    />
                    <Circle
                      cx="25"
                      cy="25"
                      r="20"
                      stroke="#FF6243"
                      strokeWidth="4"
                      strokeDasharray="125"
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="none"
                      transform="rotate(-90 25 25)"
                    />
                  </Svg>
                  <View style={styles.goalRingCenter}>
                    <Text style={styles.goalRingText}>{fractionText}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Add Custom Goal Modal */}
      <Modal
        visible={showAddGoalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddGoalModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Goal</Text>
              <Pressable
                onPress={() => setShowAddGoalModal(false)}
                hitSlop={8}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Goal Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 10,000 steps per day"
              placeholderTextColor="#6D7F72"
              value={newGoalTitle}
              onChangeText={setNewGoalTitle}
            />

            <Text style={styles.inputLabel}>Frequency</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 3x per week or Every day"
              placeholderTextColor="#6D7F72"
              value={newGoalFrequency}
              onChangeText={setNewGoalFrequency}
            />

            <Text style={styles.inputLabel}>Target Value</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 5000"
              placeholderTextColor="#6D7F72"
              value={newGoalTarget}
              onChangeText={setNewGoalTarget}
              keyboardType="numeric"
            />

            <Pressable style={styles.saveGoalBtn} onPress={handleAddGoal}>
              <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.saveGoalBtnText}>Save Goal</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0C100D',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  navIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamilies.serif,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E2320',
    borderRadius: 22,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#222B25',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  segmentBtnActive: {
    backgroundColor: '#37503F',
  },
  segmentIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  segmentText: {
    fontSize: 13,
    color: '#8A998E',
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2320',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#232C25',
  },
  dateCardText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  stepsCard: {
    backgroundColor: '#1E2320',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#232C25',
    marginBottom: 16,
  },
  stepsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stepsValueTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamilies.sansMedium,
    color: '#FFFFFF',
  },
  stepsNumber: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontWeight: '700',
  },
  runningIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#202923',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matrixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 120,
    paddingRight: 10,
  },
  yAxisLabels: {
    height: '100%',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginRight: 12,
  },
  yAxisText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansRegular,
    color: '#6F7F73',
  },
  matrixGrid: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: '100%',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 8,
  },
  dotCol: {
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    zIndex: 2,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotInactive: {
    backgroundColor: '#27332B',
  },
  dotActive: {
    backgroundColor: '#FF6243',
    shadowColor: '#FF6243',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 3,
  },
  dualStatsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  statCardHalf: {
    flex: 1,
    backgroundColor: '#1E2320',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232C25',
    minHeight: 160,
    justifyContent: 'space-between',
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  statCardTitle: {
    fontSize: 13,
    color: '#8A998E',
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  workoutTimeString: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: Typography.fontFamilies.sansBold,
    marginTop: 2,
  },
  circularGaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 110,
    position: 'relative',
  },
  circularGaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeValue: {
    fontSize: 17,
    fontFamily: Typography.fontFamilies.sansBold,
    color: '#FFFFFF',
  },
  gaugeUnit: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansRegular,
    color: '#8A998E',
  },
  waveChartContainer: {
    height: 75,
    width: '100%',
    overflow: 'hidden',
    marginTop: 8,
  },
  goalsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 17,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  addGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addGoalBtnText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansMedium,
    color: '#8A998E',
  },
  goalsList: {
    gap: 12,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E2320',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232C25',
  },
  goalLeftInfo: {
    flex: 1,
    marginRight: 12,
  },
  goalTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: Typography.fontFamilies.sansSemiBold,
    marginBottom: 6,
  },
  goalSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  goalSubItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalSubText: {
    fontSize: 11,
    color: '#8A998E',
    fontFamily: Typography.fontFamilies.sansRegular,
  },
  goalRingWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    height: 54,
  },
  goalRingCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalRingText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1E2320',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#29352C',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: Typography.fontFamilies.sansBold,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#232D26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 12,
    color: '#8A998E',
    fontFamily: Typography.fontFamilies.sansMedium,
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#0E1310',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#243027',
  },
  saveGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6243',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 20,
  },
  saveGoalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.fontFamilies.sansBold,
  },
});
