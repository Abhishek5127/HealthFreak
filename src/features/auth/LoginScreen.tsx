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
import { DishaLogoEmblem, DishaWordmark } from '../../components/illustrations/DishaLogo';
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
            <DishaLogoEmblem size={68} />
          </View>
          <DishaWordmark size="lg" />
          <Text style={styles.tagline}>
            INTELLIGENT LONGEVITY & CLINICAL WELLNESS
          </Text>
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
          <GoogleSignInButton
            onPress={signInWithGoogle}
            isLoading={isAuthenticating}
            disabled={isAuthenticating}
          />

          <View style={styles.orDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.demoButton, pressed && styles.demoButtonPressed]}
            onPress={signInAsDemoUser}
          >
            <Sparkles size={16} color={Colors.forestGreenLight} style={{ marginRight: 8 }} />
            <Text style={styles.demoButtonText}>Explore Demo Profile (Alex Sharma)</Text>
          </Pressable>

          <Text style={styles.oauthNotice}>
            One-tap authentication secured by Supabase Auth with Google OAuth 2.0 PKCE.
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
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    backgroundColor: '#161E18',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2D3D30',
  },
  demoButtonPressed: {
    backgroundColor: '#202C23',
    borderColor: Colors.forestGreenLight,
  },
  demoButtonText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs + 1,
    fontFamily: Typography.fontFamilies.sansSemiBold,
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
