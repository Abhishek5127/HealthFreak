import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Lock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Typography } from '../../theme/typography';
import { voiceClient, VoiceSessionState } from '../../services/voiceClient';
import { ScheduledAICall, AICallService, LiveKitTokenData } from '../../services/aiCallService';
import { useApp } from '../../state/AppContext';

const CALLING_LOGO = require('../../../assets/callLogo/callingLogo.png');

interface LiveKitVoiceCallScreenProps {
  call: ScheduledAICall;
  livekitData?: LiveKitTokenData;
  greeting?: string;
  onCallEnded: () => void;
}

export const LiveKitVoiceCallScreen: React.FC<LiveKitVoiceCallScreenProps> = ({
  call,
  greeting,
  onCallEnded,
}) => {
  const insets = useSafeAreaInsets();
  const { userProfile } = useApp();
  const [sessionState, setSessionState] = useState<VoiceSessionState>(voiceClient.getState());
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);

  const waveScale1 = useSharedValue(1);
  const waveScale2 = useSharedValue(1);
  const isMountedRef = useRef<boolean>(true);

  // Initialize and drive session using voiceClient (calibrated audio pipeline)
  useEffect(() => {
    isMountedRef.current = true;
    voiceClient.unlockAudio();

    const initialGreeting =
      greeting ||
      'Hello! I am Coach Alex, your AI health coach from HealthFreak. How is your energy and body feeling today?';

    const userName = userProfile?.name?.trim() ? userProfile.name.split(' ')[0] : 'friend';
    const effectiveUserId = call.userId || userProfile?.id || 'usr_guest';

    voiceClient.startSession(effectiveUserId, initialGreeting, userName);

    const unsubscribe = voiceClient.subscribe((state) => {
      if (isMountedRef.current) {
        setSessionState(state);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      voiceClient.endSession();
    };
  }, [call, greeting]);

  // Audio wave animation reactive to speaking state and amplitude
  useEffect(() => {
    if (sessionState.status === 'speaking') {
      waveScale1.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      waveScale2.value = withRepeat(
        withSequence(
          withTiming(1.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else if (sessionState.status === 'listening') {
      const extra = sessionState.audioLevel > 5 ? (sessionState.audioLevel / 100) * 0.5 : 0;
      waveScale1.value = withRepeat(
        withSequence(
          withTiming(1.2 + extra, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      waveScale2.value = withRepeat(
        withSequence(
          withTiming(1.35 + extra * 1.3, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      waveScale1.value = withTiming(1.0, { duration: 400 });
      waveScale2.value = withTiming(1.0, { duration: 400 });
    }
  }, [sessionState.status, sessionState.audioLevel, waveScale1, waveScale2]);

  const animatedWave1 = useAnimatedStyle(() => ({
    transform: [{ scale: waveScale1.value }],
  }));

  const animatedWave2 = useAnimatedStyle(() => ({
    transform: [{ scale: waveScale2.value }],
  }));

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
    voiceClient.endSession();
    AICallService.endCall(call.id).catch(() => {});
    onCallEnded();
  };

  const handleToggleMute = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    voiceClient.toggleMute();
  };

  const handleToggleSpeaker = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsSpeakerMuted((prev) => {
      const next = !prev;
      if (next) {
        Speech.stop();
      }
      return next;
    });
  };

  const handleTapToTalkOrInterrupt = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    voiceClient.unlockAudio();
    if (sessionState.status === 'speaking') {
      voiceClient.interrupt();
    } else if (sessionState.status === 'listening') {
      voiceClient.stopListening();
    } else {
      voiceClient.startListening();
    }
  };

  const isSpeaking = sessionState.status === 'speaking';
  const isListening = sessionState.status === 'listening';
  const isThinking = sessionState.status === 'connecting';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      {/* Top Header - WhatsApp Call Header */}
      <View style={styles.topSection}>
        <View style={styles.secureBadge}>
          <Lock size={12} color="#7C8E7F" />
          <Text style={styles.secureText}>End-to-end encrypted audio call</Text>
        </View>

        <Text style={styles.coachName}>HealthFreak AI Coach</Text>

        <Text style={styles.callStatusText}>
          {isThinking
            ? 'Connecting...'
            : isSpeaking
            ? `Speaking • ${formatDuration(sessionState.callDuration)}`
            : isListening
            ? sessionState.audioLevel > 15
              ? `Listening... • ${formatDuration(sessionState.callDuration)}`
              : formatDuration(sessionState.callDuration)
            : formatDuration(sessionState.callDuration)}
        </Text>
      </View>

      {/* Center Section: Large WhatsApp-style Avatar with Audio Ripple Waves */}
      <View style={styles.centerSection}>
        <Animated.View style={[styles.waveCircle, styles.waveOuter, animatedWave2]} />
        <Animated.View style={[styles.waveCircle, styles.waveInner, animatedWave1]} />

        <Pressable
          style={styles.avatarCircle}
          onPress={handleTapToTalkOrInterrupt}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Coach Alex avatar. Tap to interrupt or talk."
        >
          <Image
            source={CALLING_LOGO}
            style={styles.callingLogoImage}
            contentFit="contain"
          />
        </Pressable>

        {/* Clean, Subtle Status Indicator underneath Avatar */}
        <View style={styles.statusIndicator}>
          <View
            style={[
              styles.statusDot,
              isSpeaking
                ? styles.statusDotSpeaking
                : isListening
                ? styles.statusDotListening
                : styles.statusDotIdle,
            ]}
          />
          <Text style={styles.statusIndicatorText}>
            {isSpeaking
              ? 'Coach speaking...'
              : isListening
              ? sessionState.audioLevel > 15
                ? 'Listening to you...'
                : 'Listening...'
              : isThinking
              ? 'Connecting AI Coach...'
              : 'Connected'}
          </Text>
        </View>
      </View>

      {/* Bottom Controls: WhatsApp-style Call Action Bar */}
      <View style={styles.bottomSection}>
        <View style={styles.controlsRow}>
          {/* Mute Microphone Toggle */}
          <Pressable
            style={[styles.controlBtn, sessionState.isMuted && styles.controlBtnActiveMute]}
            onPress={handleToggleMute}
          >
            {sessionState.isMuted ? (
              <MicOff size={26} color="#E04A4A" />
            ) : (
              <Mic size={26} color="#FFFFFF" />
            )}
            <Text style={[styles.controlBtnLabel, sessionState.isMuted && styles.controlBtnLabelMuted]}>
              {sessionState.isMuted ? 'Unmute' : 'Mute'}
            </Text>
          </Pressable>

          {/* End Call Button */}
          <Pressable style={styles.endCallBtn} onPress={handleEndCall}>
            <PhoneOff size={32} color="#FFFFFF" />
          </Pressable>

          {/* Speaker Toggle */}
          <Pressable
            style={[styles.controlBtn, isSpeakerMuted && styles.controlBtnActiveSpeaker]}
            onPress={handleToggleSpeaker}
          >
            {!isSpeakerMuted ? (
              <Volume2 size={26} color="#FFFFFF" />
            ) : (
              <VolumeX size={26} color="#9EAEA0" />
            )}
            <Text style={styles.controlBtnLabel}>
              {!isSpeakerMuted ? 'Speaker' : 'Muted'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A120D',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  topSection: {
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    opacity: 0.85,
  },
  secureText: {
    color: '#7C8E7F',
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  coachName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontFamily: Typography.fontFamilies.sansBold,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  callStatusText: {
    color: '#9EAEA0',
    fontSize: 15,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  waveCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  waveOuter: {
    width: 320,
    height: 320,
    backgroundColor: 'rgba(74, 184, 122, 0.06)',
  },
  waveInner: {
    width: 260,
    height: 260,
    backgroundColor: 'rgba(74, 184, 122, 0.12)',
  },
  avatarCircle: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#152219',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(74, 184, 122, 0.45)',
    shadowColor: '#4AB87A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  callingLogoImage: {
    width: 176,
    height: 176,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    backgroundColor: 'rgba(23, 36, 27, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.22)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotSpeaking: {
    backgroundColor: '#FFD166',
  },
  statusDotListening: {
    backgroundColor: '#4AB87A',
  },
  statusDotIdle: {
    backgroundColor: '#7C8E7F',
  },
  statusIndicatorText: {
    color: '#E0EDE2',
    fontSize: 13,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  bottomSection: {
    width: '100%',
    paddingBottom: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#141E17',
    borderRadius: 44,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#1F2E23',
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#1E2B21',
  },
  controlBtnActiveMute: {
    backgroundColor: 'rgba(224, 74, 74, 0.18)',
    borderWidth: 1,
    borderColor: '#E04A4A',
  },
  controlBtnActiveSpeaker: {
    backgroundColor: '#26372B',
  },
  controlBtnLabel: {
    color: '#A0B1A3',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 3,
  },
  controlBtnLabelMuted: {
    color: '#E04A4A',
  },
  endCallBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E04A4A',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#E04A4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
});
