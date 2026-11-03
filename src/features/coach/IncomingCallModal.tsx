import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, PhoneOff, Sparkles, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { DishaLogoEmblem } from '../../components/illustrations/DishaLogo';
import { ScheduledAICall, AICallService } from '../../services/aiCallService';

interface IncomingCallModalProps {
  call: ScheduledAICall;
  onAccept: (call: ScheduledAICall) => void;
  onDecline: (callId: string) => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  call,
  onAccept,
  onDecline,
}) => {
  const insets = useSafeAreaInsets();

  const pulseScale = useSharedValue(1);
  const ringOpacity1 = useSharedValue(0.6);
  const ringOpacity2 = useSharedValue(0.4);

  // Incoming call pulsing vibration and visual animations
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    ringOpacity1.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1100, easing: Easing.ease }),
        withTiming(0.2, { duration: 1100, easing: Easing.ease })
      ),
      -1,
      true
    );

    ringOpacity2.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1400, easing: Easing.ease }),
        withTiming(0.1, { duration: 1400, easing: Easing.ease })
      ),
      -1,
      true
    );

    // Haptic ringing interval
    const hapticInterval = setInterval(() => {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }, 1800);

    return () => {
      clearInterval(hapticInterval);
    };
  }, [pulseScale, ringOpacity1, ringOpacity2]);

  const animatedPulse = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const animatedRing1 = useAnimatedStyle(() => ({
    opacity: ringOpacity1.value,
    transform: [{ scale: pulseScale.value * 1.3 }],
  }));

  const animatedRing2 = useAnimatedStyle(() => ({
    opacity: ringOpacity2.value,
    transform: [{ scale: pulseScale.value * 1.6 }],
  }));

  const handleAcceptPress = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
    onAccept(call);
  };

  const handleDeclinePress = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await AICallService.declineCall(call.id);
    onDecline(call.id);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.secureBadge}>
          <ShieldCheck size={14} color="#4AB87A" />
          <Text style={styles.secureText}>HealthFreak In-App Voice Call</Text>
        </View>
        <Text style={styles.incomingTitle}>Incoming Call...</Text>
        <Text style={styles.callerName}>HealthFreak AI Coach</Text>
        <Text style={styles.callerSubtitle}>
          {call.topic || 'Scheduled Daily Wellness & Nutrition Follow-up'}
        </Text>
      </View>

      {/* Center Pulsing Avatar */}
      <View style={styles.avatarContainer}>
        <Animated.View style={[styles.ring, styles.ringOuter, animatedRing2]} />
        <Animated.View style={[styles.ring, styles.ringInner, animatedRing1]} />
        <Animated.View style={[styles.avatarCircle, animatedPulse]}>
          <DishaLogoEmblem size={68} />
        </Animated.View>

        <View style={styles.aiTag}>
          <Sparkles size={14} color="#0E1610" />
          <Text style={styles.aiTagText}>OpenAI Realtime</Text>
        </View>
      </View>

      {/* Bottom Actions: Decline & Accept */}
      <View style={styles.actionsContainer}>
        <Text style={styles.instructionsText}>Tap to answer without cellular mobile number</Text>

        <View style={styles.buttonRow}>
          {/* Decline Button */}
          <View style={styles.actionCol}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.declineBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={handleDeclinePress}
            >
              <PhoneOff size={30} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.actionLabel}>Decline</Text>
          </View>

          {/* Accept Button */}
          <View style={styles.actionCol}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.acceptBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={handleAcceptPress}
            >
              <Phone size={30} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.actionLabel}>Accept</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E0B',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  topHeader: {
    alignItems: 'center',
    marginTop: 24,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 184, 122, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.25)',
  },
  secureText: {
    color: '#4AB87A',
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  incomingTitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: Typography.fontFamilies.sansMedium,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  callerName: {
    color: '#FFFFFF',
    fontSize: 30,
    fontFamily: Typography.fontFamilies.sansBold,
    marginBottom: 8,
    textAlign: 'center',
  },
  callerSubtitle: {
    color: '#9EAEA0',
    fontSize: 14,
    fontFamily: Typography.fontFamilies.sansRegular,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 260,
    width: 260,
  },
  ring: {
    position: 'absolute',
    borderRadius: 200,
    borderWidth: 1.5,
  },
  ringOuter: {
    width: 240,
    height: 240,
    borderColor: 'rgba(74, 184, 122, 0.2)',
  },
  ringInner: {
    width: 190,
    height: 190,
    borderColor: 'rgba(74, 184, 122, 0.35)',
  },
  avatarCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#162319',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4AB87A',
    shadowColor: '#4AB87A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  aiTag: {
    position: 'absolute',
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4AB87A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiTagText: {
    color: '#0E1610',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  instructionsText: {
    color: '#6E8071',
    fontSize: 13,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginBottom: 32,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 36,
  },
  actionCol: {
    alignItems: 'center',
  },
  actionBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  declineBtn: {
    backgroundColor: '#E04A4A',
  },
  acceptBtn: {
    backgroundColor: '#2BB85B',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
});
