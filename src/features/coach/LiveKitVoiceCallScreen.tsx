import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
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
import { DishaLogoEmblem } from '../../components/illustrations/DishaLogo';
import {
  livekitVoiceClient,
  LiveKitCallState,
} from '../../services/livekitVoiceClient';
import { ScheduledAICall, AICallService, LiveKitTokenData } from '../../services/aiCallService';
import {
  AudioModule,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
  type AudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { transcribeAndReplyAudio, cleanCoachReplyOnly } from '../../services/aiChatService';

interface LiveKitVoiceCallScreenProps {
  call: ScheduledAICall;
  livekitData?: LiveKitTokenData;
  greeting?: string;
  onCallEnded: () => void;
}

export const LiveKitVoiceCallScreen: React.FC<LiveKitVoiceCallScreenProps> = ({
  call,
  livekitData,
  greeting,
  onCallEnded,
}) => {
  const insets = useSafeAreaInsets();
  const [callState, setCallState] = useState<LiveKitCallState>(livekitVoiceClient.getState());

  const [coachSpeechText, setCoachSpeechText] = useState<string>(
    greeting || 'Namaste! I am Disha, your AI health coach from HealthFreak. How are you feeling today?'
  );
  const [userSpeechText, setUserSpeechText] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const recorderRef = useRef<AudioRecorder | null>(null);

  const waveScale1 = useSharedValue(1);
  const waveScale2 = useSharedValue(1);
  const isMountedRef = useRef<boolean>(true);

  // Play speech aloud using on-device text-to-speech
  const speakAloud = (text: string) => {
    try {
      Speech.stop();
      Speech.speak(text, {
        language: 'en-IN',
        pitch: 1.05,
        rate: 0.95,
        onStart: () => {
          if (isMountedRef.current) {
            livekitVoiceClient.getState().isAISpeaking = true;
          }
        },
        onDone: () => {
          if (isMountedRef.current) {
            livekitVoiceClient.getState().isAISpeaking = false;
          }
        },
        onError: () => {
          if (isMountedRef.current) {
            livekitVoiceClient.getState().isAISpeaking = false;
          }
        },
      });
    } catch (err: any) {
      console.warn('[LiveKitVoiceCallScreen] Speech playback note:', err.message);
    }
  };

  // Connect to room & speak greeting
  useEffect(() => {
    isMountedRef.current = true;

    const unsubscribe = livekitVoiceClient.subscribe((state) => {
      setCallState(state);
    });

    const connectToRoom = async () => {
      let token = livekitData?.token;
      let serverUrl = livekitData?.serverUrl || 'wss://healthfreak-4ruh4thc.livekit.cloud';
      let roomName = livekitData?.roomName || call.roomName;

      // If token wasn't pre-fetched, fetch now
      if (!token) {
        const tokenRes = await AICallService.getLiveKitToken({
          userId: call.userId,
          callId: call.id,
          roomName: call.roomName,
        });
        if (tokenRes.success && tokenRes.data) {
          token = tokenRes.data.token;
          serverUrl = tokenRes.data.serverUrl;
          roomName = tokenRes.data.roomName;
        }
      }

      await livekitVoiceClient.connect({
        serverUrl,
        token: token || '',
        roomName,
      });

      // Speak initial greeting aloud
      const greetingToSpeak =
        greeting ||
        'Namaste! I am Disha, your AI health coach from HealthFreak. How is your energy and body feeling today?';
      setCoachSpeechText(greetingToSpeak);

      // Brief delay so user sees incoming transition before voice speaks
      setTimeout(() => {
        if (isMountedRef.current) {
          speakAloud(greetingToSpeak);
        }
      }, 700);
    };

    connectToRoom();

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      Speech.stop();
      if (recorderRef.current) {
        try {
          recorderRef.current.stop();
        } catch {}
        recorderRef.current = null;
      }
      livekitVoiceClient.disconnect();
    };
  }, [call, livekitData, greeting]);

  // Audio wave animation reactive to speaking state and amplitude
  useEffect(() => {
    if (callState.status === 'connected') {
      const extra = (callState.audioLevel / 100) * 0.45;
      waveScale1.value = withRepeat(
        withSequence(
          withTiming(1.2 + extra, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      waveScale2.value = withRepeat(
        withSequence(
          withTiming(1.4 + extra * 1.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      waveScale1.value = withTiming(1.0, { duration: 300 });
      waveScale2.value = withTiming(1.0, { duration: 300 });
    }
  }, [callState.status, callState.audioLevel, waveScale1, waveScale2]);

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
    Speech.stop();
    if (recorderRef.current) {
      try {
        await recorderRef.current.stop();
      } catch {}
      recorderRef.current = null;
    }
    setIsRecording(false);
    livekitVoiceClient.disconnect();
    await AICallService.endCall(call.id);
    onCallEnded();
  };

  const handleToggleMute = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await livekitVoiceClient.toggleMute();
  };

  const handleToggleSpeaker = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const newState = livekitVoiceClient.toggleSpeaker();
    if (!newState) {
      Speech.stop();
    }
  };

  // Start live voice recording from microphone
  const startVoiceRecording = async () => {
    if (isAiProcessing || isRecording) return;
    try {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      Speech.stop(); // Stop coach speaking while user talks

      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        console.warn('[LiveKitVoiceCallScreen] Mic permission not granted');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      });

      const AudioRecorderConstructor = (AudioModule as any).AudioRecorder;
      const isAndroid = Platform.OS === 'android';
      const recorder: AudioRecorder = new AudioRecorderConstructor({
        extension: '.m4a',
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 64000,
        isMeteringEnabled: true,
        outputFormat: isAndroid ? 'mpeg4' : 'aac ',
        audioEncoder: 'aac',
        audioSource: isAndroid ? 'voice_communication' : undefined,
      });

      await recorder.prepareToRecordAsync({
        ...RecordingPresets.HIGH_QUALITY,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 64000,
      });

      recorder.record();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (err: any) {
      console.warn('[LiveKitVoiceCallScreen] Start recording error:', err.message);
      setIsRecording(false);
    }
  };

  // Stop live voice recording and process speech turn
  const stopVoiceRecording = async () => {
    if (!recorderRef.current) {
      setIsRecording(false);
      return;
    }
    try {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      setIsRecording(false);
      setIsAiProcessing(true);

      const recorder = recorderRef.current;
      recorderRef.current = null;
      await recorder.stop();
      const uri = (recorder as any).uri || (recorder.getStatus ? (recorder.getStatus() as any)?.url : null);

      if (uri) {
        const base64Data = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Transcribe and get coaching answer via multimodal audio
        const result = await transcribeAndReplyAudio(
          base64Data,
          'audio/m4a',
          'Alex',
          [],
          coachSpeechText
        );

        if (result.userTranscript && !result.isEcho) {
          setUserSpeechText(result.userTranscript);
        }

        const cleanReply = cleanCoachReplyOnly(result.coachReply);
        if (cleanReply) {
          setCoachSpeechText(cleanReply);
          speakAloud(cleanReply);
          // Also record in call transcript on server
          AICallService.sendUserMessage(call.id, result.userTranscript || 'Voice note');
        } else if (result.userTranscript) {
          const res = await AICallService.sendUserMessage(call.id, result.userTranscript);
          if (res.coachReply) {
            const cleanRes = cleanCoachReplyOnly(res.coachReply);
            setCoachSpeechText(cleanRes);
            speakAloud(cleanRes);
          }
        }
      }
    } catch (err: any) {
      console.warn('[LiveKitVoiceCallScreen] Stop recording error:', err.message);
    } finally {
      setIsAiProcessing(false);
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          interruptionMode: 'duckOthers',
          shouldRouteThroughEarpiece: false,
        });
      } catch {}
    }
  };

  const handleToggleVoiceRecord = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  // User sends text or speech to AI coach during active call
  const handleSendMessage = async (messageToSend?: string) => {
    const text = (messageToSend || inputText).trim();
    if (!text || isAiProcessing) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setUserSpeechText(text);
    setInputText('');
    setIsAiProcessing(true);

    const res = await AICallService.sendUserMessage(call.id, text);
    setIsAiProcessing(false);

    if (res.success && res.coachReply) {
      const clean = cleanCoachReplyOnly(res.coachReply);
      setCoachSpeechText(clean);
      speakAloud(clean);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      {/* Top Bar Info */}
      <View style={styles.topBar}>
        <View style={styles.liveBadge}>
          <Radio size={14} color="#4AB87A" />
          <Text style={styles.liveText}>
            {callState.status === 'connected' ? 'LIVE AUDIO CALL' : callState.status.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.coachTitle}>HealthFreak AI Coach</Text>

        <View style={styles.timerRow}>
          <Clock size={14} color="#9EAEA0" />
          <Text style={styles.timerText}>{formatDuration(callState.durationSeconds)}</Text>
        </View>
      </View>

      {/* Center Waveform Visualizer */}
      <View style={styles.visualizerContainer}>
        <Animated.View style={[styles.waveCircle, styles.waveOuter, animatedWave2]} />
        <Animated.View style={[styles.waveCircle, styles.waveInner, animatedWave1]} />

        <View style={styles.centerAvatar}>
          <DishaLogoEmblem size={64} />
        </View>

        <View style={styles.aiSpeakingBadge}>
          <Sparkles size={14} color={isRecording ? '#FF6B6B' : '#4AB87A'} />
          <Text style={[styles.aiSpeakingText, isRecording && styles.aiSpeakingTextRecording]}>
            {isRecording
              ? 'Listening to you... Speak now'
              : isAiProcessing
              ? 'Coach Thinking...'
              : callState.isAISpeaking
              ? 'Coach Speaking...'
              : 'Tap to speak or type below'}
          </Text>
        </View>

        {/* Tap to Talk quick button */}
        <Pressable
          style={[styles.tapToTalkBtn, isRecording && styles.tapToTalkBtnActive]}
          onPress={handleToggleVoiceRecord}
          disabled={isAiProcessing}
        >
          {isRecording ? (
            <Radio size={16} color="#FFFFFF" />
          ) : (
            <Mic size={16} color="#4AB87A" />
          )}
          <Text style={[styles.tapToTalkText, isRecording && styles.tapToTalkTextActive]}>
            {isRecording ? 'Tap When Done Speaking' : 'Tap to Talk to Disha'}
          </Text>
        </Pressable>
      </View>

      {/* Live AI Speech & Conversation Bubble */}
      <View style={styles.speechCard}>
        <View style={styles.speechHeader}>
          <MessageSquare size={14} color="#4AB87A" />
          <Text style={styles.speechLabel}>HealthFreak AI (Disha)</Text>
        </View>
        <ScrollView style={styles.speechScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.speechText}>{`"${coachSpeechText}"`}</Text>
          {userSpeechText ? (
            <Text style={styles.userEchoText}>You: {userSpeechText}</Text>
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
            disabled={isAiProcessing || isRecording}
          >
            <Text style={styles.promptChipText}>{chip}</Text>
          </Pressable>
        ))}
      </View>

      {/* Text / Voice Input Strip */}
      <View style={styles.inputStrip}>
        <TextInput
          style={styles.textInput}
          placeholder={isRecording ? 'Listening to your voice...' : 'Speak or reply to your AI coach...'}
          placeholderTextColor="#6E8071"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSendMessage()}
          returnKeyType="send"
          editable={!isRecording}
        />
        <Pressable
          style={[
            styles.sendBtn,
            isRecording && styles.sendBtnRecording,
            !inputText.trim() && !isRecording && styles.sendBtnMic,
          ]}
          onPress={inputText.trim() ? () => handleSendMessage() : handleToggleVoiceRecord}
          disabled={isAiProcessing}
        >
          {isAiProcessing ? (
            <ActivityIndicator size="small" color="#0E1610" />
          ) : inputText.trim() ? (
            <Send size={16} color="#0E1610" />
          ) : (
            <Mic size={18} color={isRecording ? '#FFFFFF' : '#0E1610'} />
          )}
        </Pressable>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Mute Toggle */}
        <Pressable
          style={[styles.controlBtn, callState.isMuted && styles.controlBtnActive]}
          onPress={handleToggleMute}
        >
          {callState.isMuted ? (
            <MicOff size={24} color="#E04A4A" />
          ) : (
            <Mic size={24} color="#FFFFFF" />
          )}
          <Text style={styles.controlBtnLabel}>{callState.isMuted ? 'Unmute' : 'Mute'}</Text>
        </Pressable>

        {/* End Call Button */}
        <Pressable style={styles.endCallBtn} onPress={handleEndCall}>
          <PhoneOff size={32} color="#FFFFFF" />
        </Pressable>

        {/* Speaker Toggle */}
        <Pressable
          style={[styles.controlBtn, !callState.isSpeakerOn && styles.controlBtnActive]}
          onPress={handleToggleSpeaker}
        >
          {callState.isSpeakerOn ? (
            <Volume2 size={24} color="#FFFFFF" />
          ) : (
            <VolumeX size={24} color="#9EAEA0" />
          )}
          <Text style={styles.controlBtnLabel}>
            {callState.isSpeakerOn ? 'Speaker' : 'Mute Audio'}
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
