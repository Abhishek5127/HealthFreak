import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ShieldCheck,
  Sparkles,
  Camera,
  Activity,
  AlertCircle,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../state/AuthContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { HealthFreakLogo, HealthFreakWordmark } from '../../components/common/HealthFreakLogo';
import { LoadingOverlay } from '../../components/common/LoadingScreen';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { authState, error, signInWithGoogle, signInAsDemoUser, clearError } = useAuth();

  const isAuthenticating = authState === 'authenticating';

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Emblem & Header */}
        <View style={styles.header}>
          <View style={styles.emblemContainer}>
            <HealthFreakLogo size={88} animated withGlow />
          </View>
          <HealthFreakWordmark size="lg" tagline="INTELLIGENT LONGEVITY & CLINICAL WELLNESS" />
        </View>

        {/* Hero Value Proposition */}
        <View style={styles.heroBox}>
          <Text style={styles.heroTitle}>Your Personal AI Health Sanctuary</Text>
          <Text style={styles.heroSubtitle}>
            Continuous health memory that learns how you eat, move, and recover across daily voice check-ins, meal scans, and adaptive routines.
          </Text>

          {/* Feature Highlights */}
          <View style={styles.featureList}>
            <View style={styles.featurePill}>
              <Camera size={16} color={Colors.coralCTA} />
              <Text style={styles.featurePillText}>Cal AI-Grade Indian Meal Scanner</Text>
            </View>
            <View style={styles.featurePill}>
              <Sparkles size={16} color={Colors.softYellow} />
              <Text style={styles.featurePillText}>Real-Time Gemini Live Voice Coach</Text>
            </View>
            <View style={styles.featurePill}>
              <Activity size={16} color={Colors.forestGreenLight} />
              <Text style={styles.featurePillText}>30-Day Adaptive Plan & Memory Engine</Text>
            </View>
          </View>
        </View>

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color="#FF6B6B" style={styles.errorIcon} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={clearError} hitSlop={12} style={styles.errorClose}>
              <X size={16} color="#FF6B6B" />
            </Pressable>
          </View>
        )}

        {/* Authentication Action Area */}
        <View style={styles.actionContainer}>
          {/* Primary One-Tap Demo Account Login */}
          <Pressable
            style={({ pressed }) => [styles.demoCardButton, pressed && styles.demoCardButtonPressed]}
            onPress={signInAsDemoUser}
          >
            <View style={styles.demoIconCircle}>
              <Sparkles size={20} color="#FFFFFF" />
            </View>
            <View style={styles.demoTextCol}>
              <View style={styles.demoBadgeRow}>
                <Text style={styles.demoButtonTitle}>Login with Demo Account</Text>
                <View style={styles.instantBadge}>
                  <Text style={styles.instantBadgeText}>INSTANT</Text>
                </View>
              </View>
              <Text style={styles.demoButtonSub}>
                1-tap bypass • No Google sign-in needed • Stats stored locally
              </Text>
            </View>
          </Pressable>

          <View style={styles.orDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.orText}>OR LOGIN WITH GOOGLE</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google OAuth Sign-In */}
          <GoogleSignInButton
            onPress={signInWithGoogle}
            isLoading={isAuthenticating}
            disabled={isAuthenticating}
          />

          <Text style={styles.oauthNotice}>
            Demo account works offline with zero setup. All steps, hydration, sleep, and workouts persist locally on this phone.
          </Text>
        </View>

        {/* Clinical Privacy Guarantee */}
        <View style={styles.footer}>
          <View style={styles.privacyRow}>
            <ShieldCheck size={16} color={Colors.success} />
            <Text style={styles.privacyHeading}>Strict Privacy Guarantee</Text>
          </View>
          <Text style={styles.privacyText}>
            We only request your basic profile (openid, email, name). Your meal scans enforce zero-image retention, and clinical memory is strictly private to your authenticated identity.
          </Text>
        </View>
      </ScrollView>

      {/* HealthFreak Animated Logo Loading Overlay during Auth */}
      <LoadingOverlay
        visible={isAuthenticating}
        message="Connecting to HealthFreak..."
        submessage="Syncing your personalized AI health sanctuary"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  emblemContainer: {
    marginBottom: Spacing.md,
    shadowColor: Colors.forestGreenLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: 10,
    letterSpacing: 2.2,
    fontFamily: Typography.fontFamilies.sansBold,
    marginTop: Spacing.xs,
  },
  heroBox: {
    backgroundColor: '#19201B',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#253127',
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  heroTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xl,
    fontFamily: Typography.fontFamilies.serif,
    marginBottom: Spacing.sm,
    lineHeight: 28,
  },
  heroSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansRegular,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  featureList: {
    gap: Spacing.sm,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131914',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#202A22',
  },
  featurePillText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginLeft: Spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.35)',
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorIcon: {
    marginRight: Spacing.sm,
  },
  errorText: {
    flex: 1,
    color: '#FFBABA',
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
    lineHeight: 18,
  },
  errorClose: {
    marginLeft: Spacing.sm,
    padding: 4,
  },
  actionContainer: {
    marginBottom: Spacing.xl,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#263128',
  },
  orText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
    marginHorizontal: Spacing.md,
    letterSpacing: 1,
  },
  demoCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2B21',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#3D5A43',
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: Colors.forestGreenLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  demoCardButtonPressed: {
    backgroundColor: '#26372A',
    borderColor: Colors.forestGreenLight,
    transform: [{ scale: 0.99 }],
  },
  demoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.forestGreenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  demoTextCol: {
    flex: 1,
  },
  demoBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  demoButtonTitle: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  instantBadge: {
    backgroundColor: 'rgba(78, 154, 111, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(78, 154, 111, 0.4)',
  },
  instantBadgeText: {
    color: Colors.forestGreenLight,
    fontSize: 9,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.5,
  },
  demoButtonSub: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs - 1,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 3,
    lineHeight: 16,
  },
  oauthNotice: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansRegular,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 16,
  },
  footer: {
    backgroundColor: '#141A15',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1F2820',
    padding: Spacing.md,
    marginTop: 'auto',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  privacyHeading: {
    color: Colors.success,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansBold,
    marginLeft: Spacing.xs,
  },
  privacyText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansRegular,
    lineHeight: 16,
  },
});
