import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Mic, MicOff, Sparkles, Volume2, Send, Utensils, RotateCcw } from 'lucide-react-native';
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
import { voiceClient, VoiceSessionState } from '../../services/voiceClient';
import { useApp } from '../../state/AppContext';

interface VoiceOverlayProps {
  onClose: () => void;
}

export const VoiceOverlay: React.FC<VoiceOverlayProps> = ({ onClose }) => {
  const insets = useSafeAreaInsets();
  const { activeScannedMeal } = useApp();
  const [sessionState, setSessionState] = useState<VoiceSessionState>(voiceClient.getState());
  const [typedInput, setTypedInput] = useState<string>('');

  const waveScale1 = useSharedValue(1);
  const waveScale2 = useSharedValue(1);

  // Subscribe to voice client
  useEffect(() => {
    voiceClient.unlockAudio();
    voiceClient.startSession('usr_synthetic_alex');
    const unsubscribe = voiceClient.subscribe((state) => {
      setSessionState(state);
    });

    return () => {
      unsubscribe();
      voiceClient.endSession();
    };
  }, []);

  // Drive animation based on real conversational states and mic volume
  useEffect(() => {
    if (sessionState.status === 'speaking') {
      waveScale1.value = withRepeat(
        withSequence(
          withTiming(1.45, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      waveScale2.value = withRepeat(
        withSequence(
          withTiming(1.8, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else if (sessionState.status === 'listening') {
      const extra = sessionState.audioLevel > 5 ? (sessionState.audioLevel / 100) * 0.5 : 0;
      waveScale1.value = withRepeat(
        withSequence(
          withTiming(1.2 + extra, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      waveScale2.value = withRepeat(
        withSequence(
          withTiming(1.35 + extra * 1.3, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1600, easing: Easing.inOut(Easing.ease) })
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

  const getStatusLabel = () => {
    switch (sessionState.status) {
      case 'connecting':
        return 'Connecting to Live AI Coach...';
      case 'speaking':
        return 'Disha is speaking (Speak or tap to interrupt)';
      case 'listening':
        return sessionState.audioLevel > 15
          ? '🎙️ Listening... (Voice detected)'
          : '🎙️ Live — Listening... (Speak naturally or tap sphere)';
      case 'interrupted':
        return 'Interrupted — Listening to you...';
      case 'disconnected':
        return 'Call ended';
      case 'error':
        return sessionState.errorMessage || 'Voice connection issue';
      default:
        return 'Live Hands-Free Ready';
    }
  };

  return (
    <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.badgeRow}>
          <View style={styles.handsFreeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.handsFreeText}>Live Hands-Free</Text>
          </View>
          <View style={styles.providerBadge}>
            <Sparkles size={12} color={Colors.softYellow} />
            <Text style={styles.providerText}>
              {sessionState.provider === 'gemini' ? 'Gemini 3.8 Live' : 'OpenAI Realtime'}
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.closeBtn}
          onPress={() => {
            voiceClient.endSession();
            onClose();
          }}
          hitSlop={12}
        >
          <X size={22} color={Colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.voiceTitle}>Disha Live Voice</Text>
        <Text style={styles.callTimer}>{formatDuration(sessionState.callDuration)}</Text>
      </View>

      {/* Active Meal Context Banner */}
      {activeScannedMeal && (
        <View style={styles.mealContextBanner}>
          <Utensils size={13} color={Colors.lightSage} style={{ marginRight: 6 }} />
          <Text style={styles.mealContextText} numberOfLines={1}>
            Discussing: {activeScannedMeal.mealName} ({activeScannedMeal.totalNutrition.calories} kcal)
          </Text>
        </View>
      )}

      {/* Permission alert banner if microphone is not yet granted */}
      {!sessionState.hasAudioPermission && (
        <Pressable
          style={styles.permBanner}
          onPress={async () => {
            const granted = await voiceClient.requestPermission();
            if (granted) {
              voiceClient.startListening();
            }
          }}
        >
          <Mic size={15} color={Colors.coralCTA} />
          <Text style={styles.permBannerText}>
            Mic permission needed: Tap here to allow audio
          </Text>
        </Pressable>
      )}

      {/* Animated Soundwave Center with Tap-to-Interrupt & Tap-to-Send */}
      <Pressable
        style={styles.sphereContainer}
        onPress={() => {
          voiceClient.unlockAudio();
          if (sessionState.status === 'speaking') {
            voiceClient.interrupt();
          } else if (sessionState.status === 'listening') {
            voiceClient.stopListening();
          } else {
            voiceClient.startListening();
          }
        }}
      >
        <Animated.View pointerEvents="none" style={[styles.waveCircle, styles.waveOuter, animatedWave2]} />
        <Animated.View pointerEvents="none" style={[styles.waveCircle, styles.waveMiddle, animatedWave1]} />
        <View style={styles.coreCircle}>
          <DishaLogoEmblem size={64} />
          {sessionState.status === 'speaking' && (
            <View style={styles.speakingIndicator}>
              <Volume2 size={16} color={Colors.coralCTA} />
            </View>
          )}
          {sessionState.status === 'listening' && (
            <View style={[styles.speakingIndicator, { backgroundColor: '#1E3B2B' }]}>
              <Mic size={16} color={Colors.lightSage} />
            </View>
          )}
        </View>
      </Pressable>

      <Text style={styles.tapInstruction}>
        {sessionState.status === 'speaking'
          ? 'Disha is speaking aloud (Tap sphere or speak to interrupt)'
          : sessionState.status === 'listening'
          ? sessionState.audioLevel > 12
            ? '🎙️ Voice detected... (Pause to send, or tap sphere)'
            : '🎙️ Live — Listening... (Speak naturally or tap below)'
          : sessionState.status === 'connecting'
          ? '⏳ Disha is generating reply...'
          : 'Ready — Speak naturally to Disha'}
      </Text>

      {/* Manual Turn Control Button */}
      <View style={styles.actionBtnRow}>
        {sessionState.status === 'listening' ? (
          <Pressable
            style={styles.manualActionBtn}
            onPress={() => {
              voiceClient.unlockAudio();
              voiceClient.stopListening();
            }}
          >
            <Mic size={15} color="#FFFFFF" />
            <Text style={styles.manualActionBtnText}>
              {sessionState.audioLevel > 12 ? 'Done Speaking (Tap to Send)' : 'Tap Sphere or Speak'}
            </Text>
          </Pressable>
        ) : sessionState.status === 'speaking' ? (
          <Pressable
            style={[styles.manualActionBtn, { backgroundColor: '#2D1F1C', borderColor: Colors.coralCTA }]}
            onPress={() => {
              voiceClient.unlockAudio();
              voiceClient.interrupt();
            }}
          >
            <MicOff size={15} color={Colors.coralCTA} />
            <Text style={[styles.manualActionBtnText, { color: Colors.coralCTA }]}>Interrupt & Speak</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Live Status and Interactive Transcript Box */}
      <View style={styles.transcriptBox}>
        <View style={styles.transcriptHeaderRow}>
          <Text style={styles.statusIndicatorText}>{getStatusLabel()}</Text>
          {sessionState.coachTranscript && sessionState.status !== 'connecting' ? (
            <Pressable
              style={styles.replayChip}
              onPress={() => voiceClient.replayLastReply()}
              hitSlop={8}
            >
              <RotateCcw size={13} color={Colors.coralCTA} />
              <Text style={styles.replayChipText}>Replay Voice</Text>
            </Pressable>
          ) : null}
        </View>
        {sessionState.userTranscript ? (
          <Text style={styles.userSpeechText}>You: {`"${sessionState.userTranscript}"`}</Text>
        ) : null}
        <Text style={styles.speechText}>
          {sessionState.status === 'connecting'
            ? '⏳ Disha is analyzing and speaking...'
            : sessionState.coachTranscript || 'Listening for your voice... Speak now.'}
        </Text>
      </View>

      {/* Interactive Quick Prompts for Testing */}
      <View style={styles.quickPromptsRow}>
        <Pressable
          style={styles.quickChip}
          onPress={() => voiceClient.simulateUserUtterance('How are you Disha?')}
        >
          <Text style={styles.quickChipText}>Greet Disha</Text>
        </Pressable>
        <Pressable
          style={styles.quickChip}
          onPress={() => voiceClient.simulateUserUtterance('My right knee is hurting today after jumping')}
        >
          <Text style={styles.quickChipText}>Report Knee Pain</Text>
        </Pressable>
        <Pressable
          style={styles.quickChip}
          onPress={() => voiceClient.simulateUserUtterance('I feel really exhausted and low energy')}
        >
          <Text style={styles.quickChipText}>Low Energy</Text>
        </Pressable>
        <Pressable
          style={styles.quickChip}
          onPress={() => voiceClient.simulateUserUtterance('Suggest a light high protein dinner')}
        >
          <Text style={styles.quickChipText}>Dinner Idea</Text>
        </Pressable>
      </View>

      {/* Typed Voice Input (Reliable fallback if device mic permissions are blocked) */}
      <View style={styles.typedInputRow}>
        <TextInput
          style={styles.voiceTextInput}
          placeholder="Or type here to hear Disha reply aloud..."
          placeholderTextColor={Colors.textMuted}
          value={typedInput}
          onChangeText={setTypedInput}
          returnKeyType="send"
          onSubmitEditing={() => {
            if (typedInput.trim()) {
              voiceClient.simulateUserUtterance(typedInput.trim());
              setTypedInput('');
            }
          }}
        />
        <Pressable
          style={[styles.voiceSendBtn, typedInput.trim().length > 0 && styles.voiceSendBtnActive]}
          onPress={() => {
            if (typedInput.trim()) {
              voiceClient.simulateUserUtterance(typedInput.trim());
              setTypedInput('');
            }
          }}
          disabled={!typedInput.trim()}
        >
          <Send size={16} color={typedInput.trim().length > 0 ? '#FFFFFF' : Colors.textMuted} />
        </Pressable>
      </View>

      {/* Voice Controls */}
      <View style={styles.controlsRow}>
        <Pressable
          style={[styles.muteBtn, sessionState.isMuted && styles.muteBtnActive]}
          onPress={() => voiceClient.toggleMute()}
        >
          {sessionState.isMuted ? (
            <MicOff size={22} color={Colors.coralCTA} />
          ) : (
            <Mic size={22} color={Colors.textPrimary} />
          )}
        </Pressable>

        <Pressable
          style={styles.endCallBtn}
          onPress={() => {
            voiceClient.endSession();
            onClose();
          }}
        >
          <Text style={styles.endCallText}>End Conversation</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(17, 19, 17, 0.97)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  handsFreeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 93, 75, 0.45)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(201, 217, 202, 0.4)',
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4EBA6F',
  },
  handsFreeText: {
    color: Colors.lightSage,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(234, 214, 111, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(234, 214, 111, 0.3)',
  },
  providerText: {
    color: Colors.softYellow,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(201, 217, 202, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  privacyText: {
    color: Colors.lightSage,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansRegular,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E2320',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  voiceTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes['2xl'],
    fontFamily: Typography.fontFamilies.serif,
  },
  callTimer: {
    color: Colors.lightSage,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 4,
  },
  mealContextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginTop: 8,
  },
  mealContextText: {
    color: Colors.lightSage,
    fontSize: 12,
    fontWeight: '600',
  },
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 113, 95, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 113, 95, 0.4)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginTop: 8,
  },
  permBannerText: {
    color: '#FF715F',
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  sphereContainer: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  waveCircle: {
    position: 'absolute',
    borderRadius: 125,
    borderWidth: 1.5,
  },
  waveOuter: {
    width: 240,
    height: 240,
    borderColor: 'rgba(56, 93, 75, 0.3)',
    backgroundColor: 'rgba(56, 93, 75, 0.06)',
  },
  waveMiddle: {
    width: 180,
    height: 180,
    borderColor: 'rgba(201, 217, 202, 0.35)',
    backgroundColor: 'rgba(201, 217, 202, 0.08)',
  },
  coreCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1C2620',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.forestGreenLight,
    shadowColor: Colors.forestGreen,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  },
  speakingIndicator: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#191C1A',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.coralCTA,
  },
  tapInstruction: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: -8,
    marginBottom: 4,
    textAlign: 'center',
  },
  actionBtnRow: {
    marginVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  manualActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2C22',
    borderWidth: 1,
    borderColor: Colors.lightSage,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 7,
  },
  manualActionBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  transcriptBox: {
    backgroundColor: '#181C19',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#262D28',
    width: '100%',
    minHeight: 88,
    justifyContent: 'center',
  },
  transcriptHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  statusIndicatorText: {
    color: Colors.coralCTA,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  replayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 113, 95, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 113, 95, 0.3)',
  },
  replayChipText: {
    color: Colors.coralCTA,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  userSpeechText: {
    color: Colors.softYellow,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginBottom: 4,
    textAlign: 'center',
  },
  speechText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansMedium,
    textAlign: 'center',
    lineHeight: 20,
  },
  quickPromptsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  quickChip: {
    backgroundColor: '#1F2521',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D3530',
  },
  quickChipText: {
    color: Colors.lightSage,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  typedInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2320',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2D3530',
    width: '100%',
    gap: 8,
  },
  voiceTextInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm,
    fontFamily: Typography.fontFamilies.sansRegular,
    paddingVertical: 8,
  },
  voiceSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2A312C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceSendBtnActive: {
    backgroundColor: Colors.coralCTA,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    width: '100%',
  },
  muteBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E2320',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A302B',
  },
  muteBtnActive: {
    borderColor: Colors.coralCTA,
    backgroundColor: 'rgba(255, 113, 95, 0.12)',
  },
  endCallBtn: {
    flex: 1,
    backgroundColor: Colors.coralCTA,
    borderRadius: 28,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizes.base,
    fontFamily: Typography.fontFamilies.sansBold,
  },
});
