import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
} from 'react-native';
import {
  ChevronRight,
  FileText,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { WellnessGoal, LanguagePreference } from '../../types';

export const ProfileScreen: React.FC = () => {
  const {
    userProfile,
    updateUserProfile,
    setActiveModal,
    resetAll,
    triggerHaptic,
  } = useApp();

  const goals: { id: WellnessGoal; label: string }[] = [
    { id: 'metabolic_fitness', label: 'Metabolic Fitness & Energy' },
    { id: 'weight_management', label: 'Sustainable Weight Management' },
    { id: 'pcos_pcod', label: 'PCOS / PCOD Hormonal Balance' },
    { id: 'thyroid_health', label: 'Thyroid Optimization' },
    { id: 'hair_health', label: 'Hair & Cellular Nutrition' },
  ];

  const languages: LanguagePreference[] = ['English', 'Hindi', 'Hinglish'];

  const handleGoalSelect = (goal: WellnessGoal, label: string) => {
    triggerHaptic('selection');
    updateUserProfile({ selectedGoal: goal, goalLabel: label });
  };

  const handleLanguageSelect = (lang: LanguagePreference) => {
    triggerHaptic('selection');
    updateUserProfile({ language: lang });
  };

  return (
    <ScreenContainer scrollable={true}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Image
          source={require('../../../assets/images/user_avatar.jpg')}
          style={styles.avatarImage}
        />
        <Text style={styles.profileName}>{userProfile.name}</Text>
        <Text style={styles.profileSubtext}>
          Disha Wellness Member • 21-Day Active Streak
        </Text>
      </View>

      {/* Primary Goal Selector */}
      <SectionHeader title="Your Primary Health Goal" />
      <View style={styles.goalsContainer}>
        {goals.map((g) => {
          const isSelected = userProfile.selectedGoal === g.id;
          return (
            <Pressable
              key={g.id}
              style={[
                styles.goalItem,
                isSelected && styles.goalItemSelected,
              ]}
              onPress={() => handleGoalSelect(g.id, g.label)}
            >
              <View style={styles.goalRow}>
                <View
                  style={[
                    styles.goalRadioCircle,
                    isSelected && styles.goalRadioCircleSelected,
                  ]}
                >
                  {isSelected && <View style={styles.goalRadioInner} />}
                </View>
                <Text
                  style={[
                    styles.goalText,
                    isSelected && styles.goalTextSelected,
                  ]}
                >
                  {g.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Language Preference */}
      <SectionHeader title="Language Preference" />
      <View style={styles.languageRow}>
        {languages.map((lang) => {
          const isSelected = userProfile.language === lang;
          return (
            <Pressable
              key={lang}
              style={[
                styles.langChip,
                isSelected && styles.langChipSelected,
              ]}
              onPress={() => handleLanguageSelect(lang)}
            >
              <Text
                style={[
                  styles.langChipText,
                  isSelected && styles.langChipTextSelected,
                ]}
              >
                {lang}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Quick Links & Diagnostic Access */}
      <SectionHeader title="Health Data & Diagnostic Reports" />
      <Pressable
        style={styles.menuRow}
        onPress={() => setActiveModal('lab_report')}
      >
        <View style={styles.menuIconCircle}>
          <FileText size={18} color={Colors.coralCTA} />
        </View>
        <View style={styles.menuTextCol}>
          <Text style={styles.menuTitle}>Diagnostic Blood Reports</Text>
          <Text style={styles.menuSub}>Upload, analyze and track biomarkers</Text>
        </View>
        <ChevronRight size={18} color={Colors.textSecondary} />
      </Pressable>

      <Pressable
        style={styles.menuRow}
        onPress={() => setActiveModal('checkin')}
      >
        <View style={styles.menuIconCircle}>
          <Sparkles size={18} color={Colors.softYellow} />
        </View>
        <View style={styles.menuTextCol}>
          <Text style={styles.menuTitle}>Energy & Mood Check-In</Text>
          <Text style={styles.menuSub}>{"Update today's mental and physical status"}</Text>
        </View>
        <ChevronRight size={18} color={Colors.textSecondary} />
      </Pressable>

      {/* Privacy & Reset Section */}
      <View style={styles.privacyBox}>
        <View style={styles.privacyHeader}>
          <ShieldCheck size={16} color={Colors.success} />
          <Text style={styles.privacyTitle}>Clinical Privacy Commitment</Text>
        </View>
        <Text style={styles.privacyText}>
          Your health assessments and biomarker records are strictly confidential and encrypted under Disha Health guidelines.
        </Text>
      </View>

      <Pressable style={styles.resetButton} onPress={resetAll}>
        <RotateCcw size={16} color={Colors.textMuted} />
        <Text style={styles.resetText}>Reset Prototype State</Text>
      </Pressable>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#202621',
    marginBottom: 16,
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: Colors.forestGreenLight,
    marginBottom: 12,
  },
  profileName: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xl,
    fontFamily: Typography.fontFamilies.serif,
  },
  profileSubtext: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 4,
  },
  goalsContainer: {
    gap: 8,
    marginBottom: 20,
  },
  goalItem: {
    backgroundColor: '#1C201D',
    borderRadius: Spacing.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262D28',
  },
  goalItemSelected: {
    backgroundColor: '#233026',
    borderColor: Colors.forestGreenLight,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#3E4940',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalRadioCircleSelected: {
    borderColor: Colors.forestGreenLight,
  },
  goalRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.forestGreenLight,
  },
  goalText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  goalTextSelected: {
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  langChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Spacing.borderRadius.md,
    backgroundColor: '#1C201D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#262D28',
  },
  langChipSelected: {
    backgroundColor: '#355544',
    borderColor: '#4E7A63',
  },
  langChipText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  langChipTextSelected: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamilies.sansBold,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C201D',
    borderRadius: Spacing.borderRadius.lg,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#262D28',
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#262E28',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextCol: {
    flex: 1,
  },
  menuTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm + 1,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  menuSub: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 2,
  },
  privacyBox: {
    backgroundColor: '#181E19',
    borderRadius: Spacing.borderRadius.md,
    padding: 14,
    marginVertical: 18,
    borderWidth: 1,
    borderColor: '#242F26',
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  privacyTitle: {
    color: Colors.lightSage,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  privacyText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansRegular,
    lineHeight: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginBottom: 20,
  },
  resetText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
});

