import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import {
  ChevronRight,
  FileText,
  ShieldCheck,
  Sparkles,
  LogOut,
  Camera,
  Check,
  X,
} from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { useAuth } from '../../state/AuthContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { LanguagePreference } from '../../types';
import { CARTOON_AVATARS } from '../../constants/avatars';
import { AppAvatar } from '../../components/common/AppAvatar';
import { CartoonAvatarView } from '../../components/illustrations/CartoonAvatar';
import { GlassButton } from '../../components/common/GlassButton';
import { PROMPT_VERSION } from '../../constants/version';

export const ProfileScreen: React.FC = () => {
  const {
    userProfile,
    updateUserProfile,
    setActiveModal,
    triggerHaptic,
  } = useApp();
  const { signOut, profile: authProfile, user } = useAuth();
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState<boolean>(false);

  const displayName = authProfile?.name || userProfile.name;
  const displayEmail = authProfile?.email || user?.email || 'alex.sharma@healthfreak.com';

  const currentAvatarId = userProfile.avatarUrl || authProfile?.avatarUrl || 'avatar_1';

  const handleSignOut = async () => {
    triggerHaptic('impact');
    await signOut();
  };

  const languages: LanguagePreference[] = ['English', 'Hindi', 'Hinglish'];

  const handleLanguageSelect = (lang: LanguagePreference) => {
    triggerHaptic('selection');
    updateUserProfile({ language: lang });
  };

  const handleSelectAvatar = (avatarId: string) => {
    triggerHaptic('impact');
    updateUserProfile({ avatarUrl: avatarId });
    setIsAvatarPickerOpen(false);
  };

  return (
    <ScreenContainer scrollable={true}>
      {/* Profile Header with Interactive Cartoon Avatar */}
      <View style={styles.profileHeader}>
        <Pressable
          style={styles.avatarTouchable}
          onPress={() => {
            triggerHaptic('selection');
            setIsAvatarPickerOpen(true);
          }}
          hitSlop={8}
        >
          <AppAvatar
            avatarId={currentAvatarId}
            size={84}
            borderWidth={2.5}
            borderColor="#52C480"
          />
          <View style={styles.avatarEditBadge}>
            <Camera size={13} color="#FFFFFF" />
          </View>
        </Pressable>

        <Text style={styles.profileName}>{displayName}</Text>
        <Text style={styles.profileEmailText}>{displayEmail}</Text>
        <View style={styles.badgeRow}>
          <Text style={styles.profileSubtext}>
            {userProfile.streakDays || 0}-Day Active Streak
          </Text>
        </View>
      </View>

      {/* Avatar Section: Tap to open slide-up avatar picker */}
      <SectionHeader title="Profile Avatar" />
      <Pressable
        style={styles.avatarSectionCard}
        onPress={() => {
          triggerHaptic('selection');
          setIsAvatarPickerOpen(true);
        }}
      >
        <View style={styles.avatarMiniPreviewFrame}>
          <AppAvatar
            avatarId={currentAvatarId}
            size={48}
            borderWidth={1.5}
            borderColor="#52C480"
          />
        </View>
        <View style={styles.avatarSectionInfo}>
          <Text style={styles.avatarSectionTitle}>Choose Your Avatar</Text>
        </View>
        <View style={styles.changeAvatarPill}>
          <Text style={styles.changeAvatarText}>Change</Text>
          <ChevronRight size={14} color="#52C480" />
        </View>
      </Pressable>

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

      {/* Logout Action */}
      <GlassButton
        onPress={handleSignOut}
        title="Sign Out"
        titleColor="#FF6B6B"
        icon={<LogOut size={16} color="#FF6B6B" />}
        size="md"
        height={48}
        borderRadius={14}
        style={{ marginTop: 10, marginBottom: 10 }}
      />

      {/* Privacy Section */}
      <View style={styles.privacyBox}>
        <View style={styles.privacyHeader}>
          <ShieldCheck size={16} color={Colors.success} />
          <Text style={styles.privacyTitle}>Clinical Privacy Commitment</Text>
        </View>
        <Text style={styles.privacyText}>
          Your health assessments and biomarker records are strictly confidential and encrypted under HealthFreak clinical guidelines.
        </Text>
        <Text style={[styles.privacyText, { marginTop: 6, color: '#A3B899' }]}>
          We keep your last 3 call transcripts so Coach Mack can follow up. Older ones are deleted; only your health notes and plans remain.
        </Text>
      </View>

      {/* App & Prompt Version Footer */}
      <Text style={styles.versionFooter}>
        HealthFreak v1.0.0 • Prompt: {PROMPT_VERSION}
      </Text>

      {/* Bottom Sheet Modal: 15 Fictional Cartoon Mascots */}
      <Modal
        visible={isAvatarPickerOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAvatarPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsAvatarPickerOpen(false)}
          />
          <View style={styles.bottomSheetContainer}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <Text style={styles.sheetTitle}>Choose Cartoon Avatar</Text>
                <Text style={styles.sheetSub}>
                  Select your favorite fictional wellness character
                </Text>
              </View>
              <Pressable
                style={styles.closeBtn}
                onPress={() => setIsAvatarPickerOpen(false)}
                hitSlop={10}
              >
                <X size={18} color="#8E9F91" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.avatarGridContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.avatarGrid}>
                {CARTOON_AVATARS.map((avatar) => {
                  const isSelected = currentAvatarId === avatar.id;
                  return (
                    <Pressable
                      key={avatar.id}
                      style={[
                        styles.avatarCard,
                        isSelected && styles.avatarCardSelected,
                      ]}
                      onPress={() => handleSelectAvatar(avatar.id)}
                    >
                      <View style={styles.avatarFrame}>
                        <CartoonAvatarView
                          id={avatar.id}
                          size={58}
                          bgColor="#355544"
                        />
                        {isSelected && (
                          <View style={styles.selectedCheckBadge}>
                            <Check size={11} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.avatarCardName,
                          isSelected && styles.avatarCardNameSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {avatar.name}
                      </Text>
                      <View style={styles.avatarTagPill}>
                        <Text style={styles.avatarTagText}>{avatar.tag}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  avatarTouchable: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#52C480',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#090D0A',
  },
  profileName: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xl,
    fontFamily: Typography.fontFamilies.serif,
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
  profileSubtext: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },

  // Avatar Section Card
  avatarSectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2320',
    borderRadius: Spacing.borderRadius.lg,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1.2,
    borderColor: '#243427',
  },
  avatarMiniPreviewFrame: {
    marginRight: 14,
  },
  avatarSectionInfo: {
    flex: 1,
  },
  avatarSectionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm + 1,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  changeAvatarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(82, 196, 128, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(82, 196, 128, 0.3)',
  },
  changeAvatarText: {
    color: '#52C480',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
    marginRight: 2,
  },

  // Language Selector
  languageRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  langChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Spacing.borderRadius.md,
    backgroundColor: '#1E2320',
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

  // Menu Links
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2320',
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

  // Logout Button
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
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#FF8585',
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansBold,
  },

  // Privacy & Reset
  privacyBox: {
    backgroundColor: '#1E2320',
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
  versionFooter: {
    color: '#68806F',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansRegular,
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 40,
  },

  // Modal / Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  bottomSheetContainer: {
    backgroundColor: '#111713',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1.2,
    borderColor: '#243427',
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#354538',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetHeaderLeft: {
    flex: 1,
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  sheetSub: {
    color: '#8E9F91',
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1B241E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#28362B',
  },
  avatarGridContainer: {
    paddingBottom: 20,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  avatarCard: {
    width: '31%',
    alignItems: 'center',
    backgroundColor: '#1E2320',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1.2,
    borderColor: '#243327',
    marginBottom: 2,
  },
  avatarCardSelected: {
    borderColor: '#52C480',
    backgroundColor: '#1E2320',
    shadowColor: '#52C480',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarFrame: {
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#52C480',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#111713',
  },
  avatarCardName: {
    color: '#E0EDE2',
    fontSize: 10.5,
    fontFamily: Typography.fontFamilies.sansBold,
    textAlign: 'center',
    marginBottom: 4,
  },
  avatarCardNameSelected: {
    color: '#52C480',
  },
  avatarTagPill: {
    backgroundColor: '#1C271F',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27382B',
  },
  avatarTagText: {
    color: '#8E9F91',
    fontSize: 8.5,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
});
