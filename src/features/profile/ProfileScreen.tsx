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
  LogOut,
  Shield,
  CheckCircle,
} from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { useAuth } from '../../state/AuthContext';
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
  const { signOut, profile: authProfile, user } = useAuth();

  const displayName = authProfile?.name || userProfile.name;
  const displayEmail = authProfile?.email || user?.email || 'alex.sharma@healthfreak.com';
  const avatarSource = authProfile?.avatarUrl
    ? { uri: authProfile.avatarUrl }
    : require('../../../assets/images/user_avatar.jpg');

  const handleSignOut = async () => {
    triggerHaptic('impact');
    await signOut();
  };

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
          source={avatarSource}
          style={styles.avatarImage}
        />
        <Text style={styles.profileName}>{displayName}</Text>
        <Text style={styles.profileEmailText}>{displayEmail}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activePillText}>Google Verified</Text>
          </View>
          <Text style={styles.profileSubtext}>
            • 21-Day Active Streak
          </Text>
        </View>
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

      {/* Account & Authentication Security */}
      <SectionHeader title="Account & Identity Security" />
      <View style={styles.authInfoCard}>
        <View style={styles.authRow}>
          <Text style={styles.authLabel}>Auth Provider</Text>
          <View style={styles.authValueRow}>
            <Shield size={14} color={Colors.forestGreenLight} style={{ marginRight: 6 }} />
            <Text style={styles.authValue}>Google OAuth 2.0</Text>
          </View>
        </View>

        <View style={styles.authDivider} />

        <View style={styles.authRow}>
          <Text style={styles.authLabel}>Identity Authority</Text>
          <Text style={styles.authValue}>Supabase Cloud Auth</Text>
        </View>

        <View style={styles.authDivider} />

        <View style={styles.authRow}>
          <Text style={styles.authLabel}>Account Status</Text>
          <View style={styles.authValueRow}>
            <CheckCircle size={14} color={Colors.success} style={{ marginRight: 6 }} />
            <Text style={[styles.authValue, { color: Colors.success }]}>Verified & Active</Text>
          </View>
        </View>
      </View>

      {/* Logout Action */}
      <Pressable style={styles.logoutButton} onPress={handleSignOut}>
        <LogOut size={16} color="#FF6B6B" style={{ marginRight: 8 }} />
        <Text style={styles.logoutButtonText}>Sign Out from Google</Text>
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
  profileEmailText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 2,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 184, 122, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.3)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: 5,
  },
  activePillText: {
    color: Colors.success,
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  authInfoCard: {
    backgroundColor: '#1C201D',
    borderRadius: Spacing.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262D28',
    marginBottom: 14,
  },
  authRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  authValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  authValue: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  authDivider: {
    height: 1,
    backgroundColor: '#262D28',
    marginVertical: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.25)',
    borderRadius: Spacing.borderRadius.lg,
    paddingVertical: 14,
    marginBottom: 10,
  },
  logoutButtonText: {
    color: '#FF8585',
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansBold,
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

