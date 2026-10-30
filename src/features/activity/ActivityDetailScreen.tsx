import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Calendar,
  BarChart2,
  Play,
  Pause,
  SkipForward,
  CheckCircle2,
  Award,
} from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { ProgressRing } from '../../components/illustrations/ProgressRing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ActivityDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    featuredWorkout,
    setActiveModal,
    toggleActivityCompletion,
    triggerHaptic,
  } = useApp();

  // Guided workout state
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(180);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const steps = featuredWorkout.steps;
  const currentStep = steps[currentStepIndex] || steps[0];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isSessionActive && !isPaused && !isCompleted && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            handleNextStep();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, isPaused, isCompleted, secondsRemaining]);

  const handleStartSession = () => {
    triggerHaptic('impact');
    setIsSessionActive(true);
    setSecondsRemaining(steps[0].durationSeconds);
  };

  const handleNextStep = () => {
    triggerHaptic('selection');
    if (currentStepIndex < steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      setSecondsRemaining(steps[nextIdx].durationSeconds);
    } else {
      // Workout completed!
      triggerHaptic('success');
      setIsCompleted(true);
      toggleActivityCompletion('act_3'); // Mark Strength & Sweat Yoga completed
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const stepProgress = currentStep.durationSeconds > 0
    ? (currentStep.durationSeconds - secondsRemaining) / currentStep.durationSeconds
    : 1;

  // Render Celebratory Completion Screen
  if (isCompleted) {
    return (
      <View style={[styles.root, { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.celebrationCard}>
          <View style={styles.awardBadge}>
            <Award size={54} color={Colors.streakCrown} />
          </View>
          <Text style={styles.celebrationTitle}>Session Accomplished!</Text>
          <Text style={styles.celebrationSubtitle}>
            You completed 45 minutes of metabolic strength yoga. 220 active calories burned and cellular energy replenished!
          </Text>

          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.statNumber}>45m</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={styles.statNumber}>220</Text>
              <Text style={styles.statLabel}>Active kcal</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={styles.statNumber}>128 bpm</Text>
              <Text style={styles.statLabel}>Avg HR</Text>
            </View>
          </View>

          <PrimaryButton
            title="Return to Dashboard"
            variant="coral"
            size="lg"
            onPress={() => setActiveModal(null)}
            style={styles.doneBtn}
          />
        </View>
      </View>
    );
  }

  // Render Active Guided Player Screen
  if (isSessionActive) {
    return (
      <View style={[styles.root, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 24) }]}>
        {/* Top bar with close */}
        <View style={styles.sessionHeaderRow}>
          <Pressable
            style={styles.closeCircleBtn}
            onPress={() => setIsSessionActive(false)}
          >
            <X size={20} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.sessionStepCounter}>
            Phase {currentStepIndex + 1} of {steps.length}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Big Circular Timer Ring */}
        <View style={styles.timerCenter}>
          <ProgressRing
            size={220}
            strokeWidth={9}
            percentage={stepProgress}
            color={Colors.coralCTA}
            bgColor="#232924"
          >
            <View style={styles.timerInner}>
              <Text style={styles.timerText}>{formatTimer(secondsRemaining)}</Text>
              <Text style={styles.timerSublabel}>Time remaining</Text>
            </View>
          </ProgressRing>
        </View>

        {/* Phase Details Card */}
        <View style={styles.stepDetailsCard}>
          <Text style={styles.stepTitle}>{currentStep.title}</Text>
          <Text style={styles.stepInstructions}>{currentStep.instructions}</Text>
          {currentStep.postureTip && (
            <View style={styles.postureTipContainer}>
              <Text style={styles.postureTipLabel}>Posture & Alignment:</Text>
              <Text style={styles.postureTipText}>{currentStep.postureTip}</Text>
            </View>
          )}
        </View>

        {/* Player Controls: Pause/Play, Skip */}
        <View style={styles.controlsRow}>
          <Pressable
            style={styles.controlCircle}
            onPress={() => setIsPaused(!isPaused)}
          >
            {isPaused ? (
              <Play size={24} color={Colors.textPrimary} />
            ) : (
              <Pause size={24} color={Colors.textPrimary} />
            )}
          </Pressable>

          <Pressable
            style={styles.controlCircle}
            onPress={handleNextStep}
          >
            <SkipForward size={24} color={Colors.textPrimary} />
          </Pressable>

          <PrimaryButton
            title={currentStepIndex === steps.length - 1 ? 'Finish' : 'Next Step'}
            variant="coral"
            size="md"
            onPress={handleNextStep}
            style={styles.nextStepBtn}
          />
        </View>
      </View>
    );
  }

  // Render Activity Preview Screen matching Video Frame 16
  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 14) }]}>
      {/* Top Header matching video: Workouts, Fits your mood today, Change my mood > */}
      <View style={styles.videoHeaderRow}>
        <View>
          <Text style={styles.screenMainTitle}>Workouts</Text>
          <Text style={styles.screenSubtitle}>Fits your mood today</Text>
        </View>

        <Pressable
          style={styles.changeMoodBtn}
          onPress={() => setActiveModal('checkin')}
        >
          <Text style={styles.changeMoodText}>Change my mood</Text>
          <Text style={styles.changeMoodArrow}>›</Text>
        </Pressable>
      </View>

      {/* Hero Trainer Card matching video */}
      <View style={styles.trainerCardContainer}>
        <Image
          source={require('../../../assets/images/trainer_inner.jpg')}
          style={styles.trainerHeroImage}
          resizeMode="cover"
        />

        {/* Floating Close Button top-right */}
        <Pressable
          style={styles.trainerCloseBtn}
          onPress={() => setActiveModal(null)}
          hitSlop={12}
        >
          <X size={18} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>

        {/* Coral 'Start training' Button anchored over bottom of image */}
        <View style={styles.startTrainingWrapper}>
          <PrimaryButton
            title="Start training"
            variant="coral"
            size="md"
            onPress={handleStartSession}
            style={styles.startTrainingBtn}
            textStyle={styles.startTrainingBtnText}
          />
        </View>
      </View>

      {/* Activity Title and Meta Section matching video */}
      <View style={styles.bottomMetaContainer}>
        <Text style={styles.activityTitle}>{featuredWorkout.title}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Calendar size={14} color={Colors.textMuted} />
            <Text style={styles.metaText}>{featuredWorkout.timeSlot}</Text>
          </View>

          <View style={styles.metaItem}>
            <BarChart2 size={14} color={Colors.textMuted} />
            <Text style={styles.metaText}>{featuredWorkout.intensity}</Text>
          </View>
        </View>

        {/* Pill Tags: Energizing, Power, Strength */}
        <View style={styles.tagsContainer}>
          {featuredWorkout.tags.map((tag, idx) => (
            <View key={idx} style={styles.tagPill}>
              <Text style={styles.tagPillText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  videoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  screenMainTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xl,
    fontFamily: Typography.fontFamilies.serif,
  },
  screenSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 2,
  },
  changeMoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  changeMoodText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  changeMoodArrow: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.md,
  },
  trainerCardContainer: {
    width: '100%',
    height: 380,
    borderRadius: Spacing.borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#2A4D3B',
    borderWidth: 1,
    borderColor: '#365D48',
  },
  trainerHeroImage: {
    width: '100%',
    height: '100%',
  },
  trainerCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  startTrainingWrapper: {
    position: 'absolute',
    bottom: 18,
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 10,
  },
  startTrainingBtn: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: Colors.coralCTA,
  },
  startTrainingBtnText: {
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  bottomMetaContainer: {
    marginTop: 18,
  },
  activityTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.lg + 2,
    fontFamily: Typography.fontFamilies.serif,
    letterSpacing: Typography.letterSpacing.tight,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tagPill: {
    backgroundColor: '#1E2320',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Spacing.borderRadius.round,
    borderWidth: 1,
    borderColor: '#2A302B',
  },
  tagPillText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },

  // Active Guided Session Styles
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  closeCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E2320',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionStepCounter: {
    color: Colors.coralCTA,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansBold,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
  },
  timerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  timerInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    color: Colors.textPrimary,
    fontSize: 44,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: -1,
  },
  timerSublabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 4,
  },
  stepDetailsCard: {
    backgroundColor: '#1C201D',
    borderRadius: Spacing.borderRadius.lg,
    padding: 20,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#262D28',
  },
  stepTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.lg,
    fontFamily: Typography.fontFamilies.serif,
    marginBottom: 6,
  },
  stepInstructions: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    lineHeight: 20,
    fontFamily: Typography.fontFamilies.sansRegular,
  },
  postureTipContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#28302A',
  },
  postureTipLabel: {
    color: Colors.lightSage,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansBold,
    marginBottom: 2,
  },
  postureTipText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
    lineHeight: 17,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 'auto',
  },
  controlCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1E2320',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A302B',
  },
  nextStepBtn: {
    flex: 1,
  },

  // Completion Screen Styles
  celebrationCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  awardBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(234, 214, 111, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  celebrationTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes['3xl'],
    fontFamily: Typography.fontFamilies.serif,
    textAlign: 'center',
    marginBottom: 10,
  },
  celebrationSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm + 1,
    fontFamily: Typography.fontFamilies.sansRegular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#1C201D',
    borderRadius: Spacing.borderRadius.lg,
    paddingVertical: 18,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#262D28',
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#2A302B',
  },
  statNumber: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.lg,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 2,
  },
  doneBtn: {
    width: '100%',
  },
});
