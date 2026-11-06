import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Sparkles,
  Radio,
  Clock,
  Send,
  MessageSquare,
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
import { Typography } from '../../theme/typography';
import { HealthFreakLogo } from '../../components/common/HealthFreakLogo';
import { voiceClient, VoiceSessionState } from '../../services/voiceClient';
import { ScheduledAICall, AICallService, LiveKitTokenData } from '../../services/aiCallService';

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
  const [sessionState, setSessionState] = useState<VoiceSessionState>(voiceClient.getState());
  const [inputText, setInputText] = useState<string>('');
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

    voiceClient.startSession(call.userId || 'usr_synthetic_alex', initialGreeting);

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

  const handleSendMessage = (messageToSend?: string) => {
    const text = (messageToSend || inputText).trim();
    if (!text || sessionState.status === 'connecting') return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    voiceClient.unlockAudio();
    voiceClient.simulateUserUtterance(text);
    AICallService.sendUserMessage(call.id, text).catch(() => {});
    setInputText('');
  };

  const isSpeaking = sessionState.status === 'speaking';
  const isListening = sessionState.status === 'listening';
  const isThinking = sessionState.status === 'connecting';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      {/* Top Bar Info */}
      <View style={styles.topBar}>
        <View style={styles.liveBadge}>
          <Radio size={14} color="#4AB87A" />
          <Text style={styles.liveText}>
            {sessionState.status === 'connected' || isSpeaking || isListening
              ? 'LIVE AUDIO CALL'
              : sessionState.status.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.coachTitle}>HealthFreak AI Coach</Text>

        <View style={styles.timerRow}>
          <Clock size={14} color="#9EAEA0" />
          <Text style={styles.timerText}>{formatDuration(sessionState.callDuration)}</Text>
        </View>
      </View>

      {/* Center Waveform Visualizer */}
      <View style={styles.visualizerContainer}>
        <Animated.View style={[styles.waveCircle, styles.waveOuter, animatedWave2]} />
        <Animated.View style={[styles.waveCircle, styles.waveInner, animatedWave1]} />

        <Pressable
          style={styles.centerAvatar}
          onPress={handleTapToTalkOrInterrupt}
          hitSlop={12}
        >
          <HealthFreakLogo size={68} animated={true} />
        </Pressable>

        <View style={styles.aiSpeakingBadge}>
          <Sparkles size={14} color={isSpeaking ? '#FFD166' : '#4AB87A'} />
          <Text style={[styles.aiSpeakingText, isListening && styles.aiSpeakingTextRecording]}>
            {isSpeaking
              ? 'Coach Speaking... (Tap sphere to interrupt)'
              : isListening
              ? sessionState.audioLevel > 15
                ? '🎙️ Listening... (Voice detected)'
                : '🎙️ Live — Listening... (Speak naturally)'
              : isThinking
              ? 'Coach Thinking...'
              : 'Tap sphere to speak or type below'}
          </Text>
        </View>

        {/* Tap to Talk quick button */}
        <Pressable
          style={[styles.tapToTalkBtn, isListening && styles.tapToTalkBtnActive]}
          onPress={handleTapToTalkOrInterrupt}
          disabled={isThinking}
        >
          {isSpeaking ? (
            <>
              <Sparkles size={16} color="#FFD166" />
              <Text style={styles.tapToTalkText}>Tap to Interrupt Coach</Text>
            </>
          ) : isListening ? (
            <>
              <Radio size={16} color="#FFFFFF" />
              <Text style={[styles.tapToTalkText, styles.tapToTalkTextActive]}>
                {sessionState.audioLevel > 15 ? 'Listening (Tap to Process)' : 'Listening Naturally'}
              </Text>
            </>
          ) : (
            <>
              <Mic size={16} color="#4AB87A" />
              <Text style={styles.tapToTalkText}>Tap to Talk to Coach</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Live AI Speech & Conversation Bubble */}
      <View style={styles.speechCard}>
        <View style={styles.speechHeader}>
          <MessageSquare size={14} color="#4AB87A" />
          <Text style={styles.speechLabel}>HealthFreak AI Coach</Text>
        </View>
        <ScrollView style={styles.speechScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.speechText}>
            {`"${sessionState.coachTranscript || greeting || 'Hello! I am Coach Alex, your AI health coach from HealthFreak. How are you feeling today?'}"`}
          </Text>
          {sessionState.userTranscript ? (
            <Text style={styles.userEchoText}>You: {sessionState.userTranscript}</Text>
          ) : null}
        </ScrollView>
      </View>

      {/* Quick Voice Prompt Chips */}
      <View style={styles.chipsRow}>
        {[
          'My energy is great today!',
          'What should I eat for dinner?',
          'My knee feels a bit sore',
          'Plan my workout today',
        ].map((chip) => (
          <Pressable
            key={chip}
            style={styles.promptChip}
            onPress={() => handleSendMessage(chip)}
            disabled={isThinking}
          >
            <Text style={styles.promptChipText}>{chip}</Text>
          </Pressable>
        ))}
      </View>

      {/* Text / Voice Input Strip */}
      <View style={styles.inputStrip}>
        <TextInput
          style={styles.textInput}
          placeholder={isListening ? 'Listening to your voice...' : 'Speak or reply to your AI coach...'}
          placeholderTextColor="#6E8071"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSendMessage()}
          returnKeyType="send"
        />
        <Pressable
          style={[
            styles.sendBtn,
            inputText.trim()
              ? styles.sendBtnActive
              : isListening
              ? styles.sendBtnRecording
              : styles.sendBtnMic,
          ]}
          onPress={inputText.trim() ? () => handleSendMessage() : handleTapToTalkOrInterrupt}
          disabled={isThinking}
        >
          {isThinking ? (
            <ActivityIndicator size="small" color="#0E1610" />
          ) : inputText.trim() ? (
            <Send size={16} color="#0E1610" />
          ) : (
            <Mic size={18} color={isListening ? '#FFFFFF' : '#0E1610'} />
          )}
        </Pressable>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Mute Toggle */}
        <Pressable
          style={[styles.controlBtn, sessionState.isMuted && styles.controlBtnActive]}
          onPress={handleToggleMute}
        >
          {sessionState.isMuted ? (
            <MicOff size={24} color="#E04A4A" />
          ) : (
            <Mic size={24} color="#FFFFFF" />
          )}
          <Text style={styles.controlBtnLabel}>{sessionState.isMuted ? 'Unmute' : 'Mute'}</Text>
        </Pressable>

        {/* End Call Button */}
        <Pressable style={styles.endCallBtn} onPress={handleEndCall}>
          <PhoneOff size={32} color="#FFFFFF" />
        </Pressable>

        {/* Speaker Toggle */}
        <Pressable
          style={[styles.controlBtn, isSpeakerMuted && styles.controlBtnActive]}
          onPress={handleToggleSpeaker}
        >
          {!isSpeakerMuted ? (
            <Volume2 size={24} color="#FFFFFF" />
          ) : (
            <VolumeX size={24} color="#9EAEA0" />
          )}
          <Text style={styles.controlBtnLabel}>
            {!isSpeakerMuted ? 'Speaker' : 'Mute Audio'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1310',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  topBar: {
    alignItems: 'center',
    width: '100%',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 184, 122, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.3)',
  },
  liveText: {
    color: '#4AB87A',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 1,
  },
  coachTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: Typography.fontFamilies.sansBold,
    marginBottom: 4,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    color: '#9EAEA0',
    fontSize: 14,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  visualizerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  waveCircle: {
    position: 'absolute',
    borderRadius: 200,
  },
  waveOuter: {
    width: 190,
    height: 190,
    backgroundColor: 'rgba(74, 184, 122, 0.08)',
  },
  waveInner: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(74, 184, 122, 0.16)',
  },
  centerAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#19261D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4AB87A',
    shadowColor: '#4AB87A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  aiSpeakingBadge: {
    position: 'absolute',
    bottom: -14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C271F',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.3)',
  },
  aiSpeakingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  aiSpeakingTextRecording: {
    color: '#FF7B7B',
  },
  tapToTalkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'absolute',
    bottom: -54,
    backgroundColor: 'rgba(74, 184, 122, 0.14)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(74, 184, 122, 0.35)',
  },
  tapToTalkBtnActive: {
    backgroundColor: '#E04A4A',
    borderColor: '#FF7B7B',
  },
  tapToTalkText: {
    color: '#4AB87A',
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  tapToTalkTextActive: {
    color: '#FFFFFF',
  },
  speechCard: {
    width: '100%',
    backgroundColor: '#162118',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#243226',
    maxHeight: 120,
  },
  speechHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  speechLabel: {
    color: '#4AB87A',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  speechScroll: {
    maxHeight: 80,
  },
  speechText: {
    color: '#E0EDE2',
    fontSize: 13,
    fontFamily: Typography.fontFamilies.sansMedium,
    lineHeight: 18,
  },
  userEchoText: {
    color: '#7C8E7F',
    fontSize: 12,
    fontFamily: Typography.fontFamilies.sansRegular,
    marginTop: 4,
    fontStyle: 'italic',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    width: '100%',
  },
  promptChip: {
    backgroundColor: '#1C251F',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#29382B',
  },
  promptChipText: {
    color: '#A0B1A3',
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  inputStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#172019',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#253528',
    width: '100%',
    gap: 8,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Typography.fontFamilies.sansRegular,
    paddingVertical: 4,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4AB87A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#4AB87A',
  },
  sendBtnRecording: {
    backgroundColor: '#E04A4A',
  },
  sendBtnMic: {
    backgroundColor: '#4AB87A',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 4,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1F2A21',
  },
  controlBtnActive: {
    backgroundColor: '#382222',
  },
  controlBtnLabel: {
    color: '#A0B1A3',
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 3,
  },
  endCallBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E04A4A',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#E04A4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
});
