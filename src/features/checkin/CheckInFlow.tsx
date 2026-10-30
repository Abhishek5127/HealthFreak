import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ArrowRight } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useApp } from '../../state/AppContext';
import { CheckInMood } from '../../types';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { CheckInCharacterView } from '../../components/illustrations/CheckInCharacters';
import { PrimaryButton } from '../../components/common/PrimaryButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MoodOption {
  id: CheckInMood;
  label: string;
  bgColor: string;
  cardBg: string;
  accentColor: string;
  description: string;
  recommendedActivity: string;
}

const MOODS: MoodOption[] = [
  {
    id: 'lowEnergy',
    label: 'Low energy',
    bgColor: '#444B46',
    cardBg: '#353C37',
    accentColor: '#A3B4A6',
    description: 'Gentle recovery mode. Prioritizing restorative stretching and nervous-system calming.',
    recommendedActivity: 'Restorative Yin Yoga & Breathwork',
  },
  {
    id: 'tense',
    label: 'Tense',
    bgColor: '#4A3E56',
    cardBg: '#392E44',
    accentColor: '#D48BAA',
    description: 'Releasing built-up physical tension and decompressing the spine and neck.',
    recommendedActivity: 'Deep Fascial Release & Calming Pranayama',
  },
  {
    id: 'calm',
    label: 'Calm',
    bgColor: '#355544',
    cardBg: '#284435',
    accentColor: '#E891BA',
    description: 'You feel relaxed and grounded. Looking for mindful, steady movement.',
    recommendedActivity: 'Gentle Vinyasa & Core Alignment',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    bgColor: '#3768A5',
    cardBg: '#275084',
    accentColor: '#68BF7B',
    description: 'You focused. A good moment for controlled, full-body training.',
    recommendedActivity: 'Hatha Flow & Posture Strengthening',
  },
  {
    id: 'energized',
    label: 'Energized',
    bgColor: '#82458E',
    cardBg: '#663270',
    accentColor: '#F5C542',
    description: 'You feel active. Time for dynamic workouts and higher intensity.',
    recommendedActivity: 'Strength & Sweat Yoga',
  },
];

export const CheckInFlow: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { userProfile, setUserMood, setActiveModal } = useApp();

  const initialIndex = MOODS.findIndex((m) => m.id === userProfile.currentMood);
  const [selectedMood, setSelectedMood] = useState<CheckInMood>(
    initialIndex >= 0 ? userProfile.currentMood : 'energized'
  );

  const activeMoodConfig = MOODS.find((m) => m.id === selectedMood) || MOODS[4];

  // Character transition shared value
  const characterScale = useSharedValue(1);

  const handleSelectMood = (mood: CheckInMood) => {
    characterScale.value = withSequenceAnimation();
    setSelectedMood(mood);
  };

  const withSequenceAnimation = () => {
    return withSpring(1.08, { damping: 10 }, () => {
      characterScale.value = withSpring(1, { damping: 14 });
    });
  };

  const handleConfirm = () => {
    setUserMood(selectedMood);
    // Transition smoothly into matched workout session screen!
    setActiveModal('activity_session');
  };

  const animatedCharacterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: characterScale.value }],
  }));

  const firstName = userProfile.name ? userProfile.name.split(' ')[0] : 'George';

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* Top Header bar */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable
          style={styles.backButtonCircle}
          onPress={() => setActiveModal(null)}
          hitSlop={10}
        >
          <ChevronLeft size={22} color={Colors.textPrimary} />
        </Pressable>

        <Text style={styles.headerTitle}>Todays' energy level</Text>

        <View style={styles.headerRightSpacer} />
      </View>

      {/* Main Dynamic Canvas Card */}
      <View
        style={[
          styles.cardCanvas,
          { backgroundColor: activeMoodConfig.bgColor },
        ]}
      >
        {/* Editorial Question */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>
            {firstName}, how do you{' '}
            <Text style={styles.questionItalic}>feel right</Text>
            {'\n'}now?
          </Text>
        </View>

        {/* Big Central Character with idle motion */}
        <Animated.View style={[styles.characterCenter, animatedCharacterStyle]}>
          <CheckInCharacterView mood={selectedMood} size={190} animate={true} />
        </Animated.View>

        {/* Horizontal Mood Selector Row */}
        <View style={styles.selectorWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectorScroll}
          >
            {MOODS.map((mood) => {
              const isSelected = selectedMood === mood.id;

              return (
                <Pressable
                  key={mood.id}
                  onPress={() => handleSelectMood(mood.id)}
                  style={[
                    styles.moodOptionItem,
                    isSelected && styles.moodOptionItemSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.moodOptionText,
                      isSelected && styles.moodOptionTextSelected,
                    ]}
                  >
                    {mood.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.selectedUnderlinePill} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Quick Round Floating Next Button */}
          <Pressable
            style={styles.roundCoralFAB}
            onPress={handleConfirm}
          >
            <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.6} />
          </Pressable>
        </View>

        {/* Contextual Description Box */}
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>
            {activeMoodConfig.description}
          </Text>
        </View>
      </View>

      {/* Bottom Action Section */}
      <View style={[styles.bottomActionContainer, { paddingBottom: Math.max(insets.bottom, 18) }]}>
        <PrimaryButton
          title="Let's find workout"
          variant="coral"
          size="lg"
          onPress={handleConfirm}
          style={styles.fullWidthBtn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E2320',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A302B',
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.serif,
  },
  headerRightSpacer: {
    width: 40,
  },
  cardCanvas: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: Spacing.borderRadius.xl,
    padding: 24,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  questionContainer: {
    marginTop: 4,
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizes['2xl'],
    lineHeight: 34,
    fontFamily: Typography.fontFamilies.serif,
    letterSpacing: Typography.letterSpacing.tight,
  },
  questionItalic: {
    fontFamily: Typography.fontFamilies.serifItalic,
  },
  characterCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },
  selectorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  selectorScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
    gap: 16,
  },
  moodOptionItem: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  moodOptionItemSelected: {},
  moodOptionText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.serif,
  },
  moodOptionTextSelected: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamilies.serifItalic,
    fontSize: Typography.fontSizes.md,
  },
  selectedUnderlinePill: {
    width: 24,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    marginTop: 4,
  },
  roundCoralFAB: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.coralCTA,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.coralCTA,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
    marginLeft: 6,
  },
  captionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    borderRadius: Spacing.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
  },
  captionText: {
    color: '#F4F2EC',
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansRegular,
    lineHeight: 19,
    textAlign: 'center',
  },
  bottomActionContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: Colors.background,
  },
  fullWidthBtn: {
    width: '100%',
  },
});

