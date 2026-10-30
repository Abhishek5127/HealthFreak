import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Flame,
  Activity,
  Heart,
  Globe,
  ArrowRight,
} from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { WellnessGoal, LanguagePreference } from '../../types';
import { PrimaryButton } from '../../components/common/PrimaryButton';

export const OnboardingFlow: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { updateUserProfile, setActiveModal, triggerHaptic } = useApp();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedGoal, setSelectedGoal] = useState<WellnessGoal>('metabolic_fitness');
  const [goalTitle, setGoalTitle] = useState<string>('Metabolic Health & Vitality');
  const [selectedPace, setSelectedPace] = useState<string>('30-45 min active strength & sweat');
  const [selectedLang, setSelectedLang] = useState<LanguagePreference>('English');

  const goals: { id: WellnessGoal; title: string; subtitle: string; icon: React.ReactNode }[] = [
    {
      id: 'metabolic_fitness',
      title: 'Metabolic Health & Energy',
      subtitle: 'Steady glucose levels, reduce insulin resistance, and beat afternoon fatigue.',
      icon: <Flame size={20} color={Colors.coralCTA} />,
    },
    {
      id: 'weight_management',
      title: 'Sustainable Weight Management',
      subtitle: 'Nutrient-rich Indian meal timing, metabolic rate boost, and habit building.',
      icon: <Activity size={20} color={Colors.forestGreenLight} />,
    },
    {
      id: 'pcos_pcod',
      title: 'Hormonal & PCOS Harmony',
      subtitle: 'Cycle synchronization, cortisol reduction, and targeted micronutrients.',
      icon: <Heart size={20} color="#D48BAA" />,
    },
    {
      id: 'thyroid_health',
      title: 'Thyroid Optimization',
      subtitle: 'TSH regulation, mitochondrial support, and anti-inflammatory nutrition.',
      icon: <Sparkles size={20} color={Colors.softYellow} />,
    },
  ];

  const paces = [
    { title: '15–20 min Daily Mindful Flow', desc: 'Gentle mobility, pranayama, and light post-meal walks.' },
    { title: '30–45 min Active Strength & Sweat', desc: 'Dynamic Vinyasa, metabolic tone, and resistance yoga.' },
    { title: '45+ min Comprehensive Athletic', desc: 'High intensity cardiovascular and functional strength training.' },
  ];

  const languages: LanguagePreference[] = ['English', 'Hindi', 'Hinglish'];

  const handleNext = () => {
    triggerHaptic('selection');
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      triggerHaptic('success');
      updateUserProfile({
        selectedGoal,
        goalLabel: goalTitle,
        language: selectedLang,
        onboardingCompleted: true,
      });
      setActiveModal(null);
    }
  };

  const handleBack = () => {
    triggerHaptic('selection');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      setActiveModal(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* Top Header & Progress Indicator */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 14) }]}>
        <Pressable style={styles.backButton} onPress={handleBack} hitSlop={10}>
          <ChevronLeft size={22} color={Colors.textPrimary} />
        </Pressable>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              { width: `${(currentStep / 4) * 100}%` },
            ]}
          />
        </View>

        <Text style={styles.stepText}>0{currentStep}/04</Text>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[
          styles.containerPadding,
          { paddingBottom: Math.max(insets.bottom, 24) + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: GOAL SELECTION */}
        {currentStep === 1 && (
          <View>
            <Text style={styles.stepQuestion}>
              What brings you to <Text style={styles.serifAccent}>Disha</Text> today?
            </Text>
            <Text style={styles.stepSubtitle}>
              We craft your daily nutrition, movement, and habit micro-steps around this focus.
            </Text>

            <View style={styles.cardsList}>
              {goals.map((g) => {
                const isSelected = selectedGoal === g.id;
                return (
                  <Pressable
                    key={g.id}
                    style={[
                      styles.selectableCard,
                      isSelected && styles.selectableCardActive,
                    ]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setSelectedGoal(g.id);
                      setGoalTitle(g.title);
                    }}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardIconCircle}>{g.icon}</View>
                      <Text style={styles.cardTitle}>{g.title}</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>{g.subtitle}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 2: MOVEMENT PACING */}
        {currentStep === 2 && (
          <View>
            <Text style={styles.stepQuestion}>
              What movement pace feels <Text style={styles.serifAccent}>sustainable</Text>?
            </Text>
            <Text style={styles.stepSubtitle}>
              Consistency always outperforms extreme intensity. You can adjust this anytime.
            </Text>

            <View style={styles.cardsList}>
              {paces.map((p, idx) => {
                const isSelected = selectedPace === p.title;
                return (
                  <Pressable
                    key={idx}
                    style={[
                      styles.selectableCard,
                      isSelected && styles.selectableCardActive,
                    ]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setSelectedPace(p.title);
                    }}
                  >
                    <Text style={styles.cardTitle}>{p.title}</Text>
                    <Text style={styles.cardSubtitle}>{p.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 3: LANGUAGE PREFERENCE */}
        {currentStep === 3 && (
          <View>
            <Text style={styles.stepQuestion}>
              How would you like your <Text style={styles.serifAccent}>Coach</Text> to speak?
            </Text>
            <Text style={styles.stepSubtitle}>
              Choose the language that feels most natural for your daily check-ins and meal recipes.
            </Text>

            <View style={styles.cardsList}>
              {languages.map((lang) => {
                const isSelected = selectedLang === lang;
                return (
                  <Pressable
                    key={lang}
                    style={[
                      styles.selectableCard,
                      isSelected && styles.selectableCardActive,
                    ]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setSelectedLang(lang);
                    }}
                  >
                    <View style={styles.cardHeaderRow}>
                      <Globe size={20} color={isSelected ? Colors.coralCTA : Colors.textMuted} />
                      <Text style={styles.cardTitle}>{lang}</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>
                      {lang === 'English'
                        ? 'Clear, concise English guidance with Indian wellness terms.'
                        : lang === 'Hindi'
                        ? 'हिंदी में स्वास्थ्य मार्गदर्शन और भोजन सुझाव।'
                        : 'Conversational blend of English & everyday Hindi (Hinglish).'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 4: CONFIRMATION & ROADMAP */}
        {currentStep === 4 && (
          <View style={styles.confirmationContainer}>
            <View style={styles.checkEmblem}>
              <CheckCircle2 size={56} color={Colors.forestGreenLight} />
            </View>

            <Text style={styles.confirmationTitle}>
              Your Disha Protocol is Ready
            </Text>
            <Text style={styles.confirmationSubtitle}>
              We’ve personalized your day with a morning Surya Namaskar warmup, an insulin-steady Moong bowl, and your high-energy yoga match!
            </Text>

            <View style={styles.protocolSummaryCard}>
              <View style={styles.protocolItem}>
                <Text style={styles.protocolLabel}>Primary Focus:</Text>
                <Text style={styles.protocolValue}>{goalTitle}</Text>
              </View>
              <View style={styles.protocolItem}>
                <Text style={styles.protocolLabel}>Coach Language:</Text>
                <Text style={styles.protocolValue}>{selectedLang}</Text>
              </View>
              <View style={styles.protocolItem}>
                <Text style={styles.protocolLabel}>Daily Streak:</Text>
                <Text style={styles.protocolValue}>Day 1 Starts Now!</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Continue Button */}
      <View
        style={[
          styles.bottomButtonContainer,
          { paddingBottom: Math.max(insets.bottom, 18) },
        ]}
      >
        <PrimaryButton
          title={currentStep === 4 ? 'Enter My Dashboard' : 'Continue'}
          variant="coral"
          size="lg"
          onPress={handleNext}
          icon={currentStep < 4 ? <ArrowRight size={18} color="#FFFFFF" /> : undefined}
          iconPosition="right"
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E2320',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#262D27',
    borderRadius: 2,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.coralCTA,
    borderRadius: 2,
  },
  stepText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  scrollContent: {
    flex: 1,
  },
  containerPadding: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  stepQuestion: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes['2xl'],
    lineHeight: 34,
    fontFamily: Typography.fontFamilies.serif,
    marginBottom: 6,
  },
  serifAccent: {
    fontFamily: Typography.fontFamilies.serifItalic,
    color: Colors.lightSage,
  },
  stepSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansRegular,
    lineHeight: 20,
    marginBottom: 24,
  },
  cardsList: {
    gap: 12,
  },
  selectableCard: {
    backgroundColor: '#1C201D',
    borderRadius: Spacing.borderRadius.lg,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#262D28',
  },
  selectableCardActive: {
    backgroundColor: '#243128',
    borderColor: Colors.forestGreenLight,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  cardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#262D27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  cardSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs + 0.5,
    fontFamily: Typography.fontFamilies.sansRegular,
    lineHeight: 18,
  },
  confirmationContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  checkEmblem: {
    marginBottom: 16,
  },
  confirmationTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes['2xl'],
    fontFamily: Typography.fontFamilies.serif,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmationSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansRegular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  protocolSummaryCard: {
    width: '100%',
    backgroundColor: '#1C201D',
    borderRadius: Spacing.borderRadius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: '#262D28',
    gap: 12,
  },
  protocolItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  protocolLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  protocolValue: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: '#1A201B',
  },
  fullWidthBtn: {
    width: '100%',
  },
});

