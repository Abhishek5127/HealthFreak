import { Platform } from 'react-native';
import {
  AudioModule,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  createAudioPlayer,
  RecordingPresets,
  type AudioRecorder,
  type AudioPlayer,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import {
  streamHealthCoachAI,
  type AudioChunkPayload,
  transcribeAndReplyAudio,
  getBackendBaseUrl,
  isSelfEcho,
  cleanCoachReplyOnly,
} from './aiChatService';

export type VoiceConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'speaking'
  | 'interrupted'
  | 'disconnected'
  | 'error';

export interface VoiceSessionState {
  status: VoiceConnectionStatus;
  isMuted: boolean;
  coachTranscript: string;
  userTranscript: string;
  callDuration: number;
  errorMessage: string | null;
  provider: 'sarvam' | 'livekit' | 'gemini' | 'openai';
  isSynthetic: boolean;
  hasAudioPermission: boolean;
  audioLevel: number;
  isHandsFree: boolean;
}

export class VoiceClientService {
  private status: VoiceConnectionStatus = 'idle';
  private isMuted: boolean = false;
  private callId: string | null = null;
  private timer: any = null;
  private durationSeconds: number = 0;
  private listeners: Set<(state: VoiceSessionState) => void> = new Set();
  private coachTranscript: string = '';
  private userTranscript: string = '';
  private errorMessage: string | null = null;
  private provider: 'sarvam' | 'livekit' | 'gemini' | 'openai' = 'sarvam';
  private isSynthetic: boolean = true;
  private hasAudioPermission: boolean = false;
  private currentUserId: string = 'user_local';
  private currentUserName: string = 'Abhishek';
  private audioLevel: number = 0;
  private isHandsFree: boolean = true;
  private consolePollTimer: any = null;
  private lastEventTimestamp: number = 0;

  // Web Speech Recognition
  private recognition: any = null;
  private isRecognitionActive: boolean = false;
  private silenceTimer: any = null;
  private currentSpeechText: string = '';

  // Web MediaRecorder & VAD
  private mediaStream: any = null;
  private mediaRecorder: any = null;
  private audioChunks: any[] = [];
  private audioContext: any = null;
  private analyser: any = null;
  private animFrameId: any = null;
  private isUserSpeakingVAD: boolean = false;
  private vadSilenceStart: number = 0;
  private isProcessingTurn: boolean = false;

  // Native Mobile Recording (iOS / Android via expo-audio)
  private nativeRecorder: AudioRecorder | null = null;
  private nativeInterval: any = null;
  private currentPlayer: AudioPlayer | null = null;
  private currentWebAudio: any = null;
  private cachedIndianVoices: { hindi?: string; indianEnglish?: string } = {};
  private lastCoachReply: string = '';

  // Streaming Audio Chunk Queue
  private audioChunkQueue: AudioChunkPayload[] = [];
  private isPlayingChunkQueue: boolean = false;
  private currentStreamAbortController: AbortController | null = null;

  constructor() {
    this.initAvailableVoices();
  }

  public async initAvailableVoices(): Promise<void> {
    // Authentic neural voice (Sarvam Bulbul Shubh) is used exclusively.
    // Robotic operating system voice scanning is completely disabled.
  }

  public subscribe(listener: (state: VoiceSessionState) => void) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }

  public getState(): VoiceSessionState {
    return {
      status: this.status,
      isMuted: this.isMuted,
      coachTranscript: this.coachTranscript,
      userTranscript: this.userTranscript,
      callDuration: this.durationSeconds,
      errorMessage: this.errorMessage,
      provider: this.provider,
      isSynthetic: this.isSynthetic,
      hasAudioPermission: this.hasAudioPermission,
      audioLevel: this.audioLevel,
      isHandsFree: this.isHandsFree,
    };
  }

  /**
   * Unlock browser audio context and speech synthesis on user touch.
   */
  public unlockAudio() {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {
        // Ignored
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        this.audioContext.resume();
      } catch {
        // Ignored
      }
    }
  }

  /**
   * Enqueues an incremental audio chunk emitted by the streaming backend.
   * Immediately plays chunk 0 upon arrival, while sequentially chaining subsequent chunks.
   */
  public enqueueAudioChunk(chunk: AudioChunkPayload): void {
    if (this.currentStreamAbortController?.signal.aborted) return;
    this.audioChunkQueue.push(chunk);
    this.audioChunkQueue.sort((a, b) => a.sequence - b.sequence);

    if (!this.isPlayingChunkQueue) {
      this.playChunkQueue();
    }
  }

  private async playChunkQueue(): Promise<void> {
    if (this.isPlayingChunkQueue) return;
    this.isPlayingChunkQueue = true;

    try {
      while (this.audioChunkQueue.length > 0) {
        if (this.currentStreamAbortController?.signal.aborted) {
          this.audioChunkQueue = [];
          break;
        }

        const nextChunk = this.audioChunkQueue.shift();
        if (nextChunk && (nextChunk.audioBase64 || nextChunk.text)) {
          this.status = 'speaking';
          this.notify();
          await this.playGeneratedAudio(
            nextChunk.audioBase64,
            nextChunk.mimeType || 'audio/wav',
            nextChunk.text,
            undefined,
            false
          );
        }
      }
    } finally {
      this.isPlayingChunkQueue = false;
      this.finishTurnSpeaking();
    }
  }

  public finishTurnSpeaking(): void {
    if (!this.isPlayingChunkQueue && this.audioChunkQueue.length === 0) {
      this.isProcessingTurn = false;
      if (this.status === 'speaking' || this.status === 'connecting') {
        this.status = 'listening';
        this.notify();
        this.startListening();
      }
    }
  }

  /**
   * Plays high-fidelity human speech synthesized directly by Sarvam Bulbul neural voice
   * with authentic Indian accent and natural intonation.
   * Resolves when the audio has completely finished playing.
   */
  public playGeneratedAudio(
    audioBase64?: string,
    audioMime = 'audio/wav',
    fallbackText = '',
    audioUrl?: string,
    autoListenOnFinish = true,
    onPlaybackFinished?: () => void
  ): Promise<void> {
    this.status = 'speaking';
    if (fallbackText) {
      this.lastCoachReply = fallbackText;
    }
    this.notify();

    return new Promise<void>(async (resolve) => {
      let isDone = false;
      const onFinished = () => {
        if (isDone) return;
        isDone = true;
        if (autoListenOnFinish && !this.isPlayingChunkQueue && this.audioChunkQueue.length === 0) {
          this.finishTurnSpeaking();
        }
        if (onPlaybackFinished) onPlaybackFinished();
        resolve();
      };

      // 1. Web HTML5 Audio
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          if (this.currentWebAudio) {
            try {
              this.currentWebAudio.pause();
            } catch {}
            this.currentWebAudio = null;
          }

          let webSrc = '';
          if (audioUrl) {
            webSrc = audioUrl.startsWith('http') ? audioUrl : `${getBackendBaseUrl()}${audioUrl}`;
          } else if (audioBase64) {
            webSrc = `data:${audioMime};base64,${audioBase64}`;
          }

          if (webSrc) {
            const audio = new Audio(webSrc);
            this.currentWebAudio = audio;

            const wordCount = (fallbackText || '').split(/\s+/).length;
            const watchdogMs = Math.max(4000, wordCount * 550 + 2000);
            const watchdog = setTimeout(() => {
              if (this.currentWebAudio === audio) {
                this.currentWebAudio = null;
                onFinished();
              }
            }, watchdogMs);

            audio.onended = () => {
              clearTimeout(watchdog);
              this.currentWebAudio = null;
              onFinished();
            };

            audio.onerror = (e) => {
              clearTimeout(watchdog);
              console.warn('[VoiceClient] Web audio error:', e);
              this.currentWebAudio = null;
              this.speakAloud(fallbackText, onFinished);
            };

            await audio.play();
            return;
          }
        } catch (err) {
          console.warn('[VoiceClient] Web audio play error:', err);
        }
      }

      // 2. Native Mobile (iOS / Android via expo-audio & expo-file-system)
      try {
        if (this.currentPlayer) {
          try {
            this.currentPlayer.pause();
            this.currentPlayer.release?.();
            this.currentPlayer.remove?.();
          } catch {}
          this.currentPlayer = null;
        }

        // Disengage recording mode so Android routes audio through
        // the device loudspeaker with full volume and fidelity
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'duckOthers',
          shouldRouteThroughEarpiece: false,
        });

        let playerSource: any = null;

        if (audioUrl) {
          const fullUrl = audioUrl.startsWith('http') ? audioUrl : `${getBackendBaseUrl()}${audioUrl}`;
          playerSource = fullUrl;
        } else if (audioBase64) {
          const speechPath = `${FileSystem.cacheDirectory || ''}healthfreak_speech_${Date.now()}.wav`;
          try {
            await FileSystem.writeAsStringAsync(speechPath, audioBase64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            playerSource = speechPath;
          } catch (writeErr) {
            console.warn('[VoiceClient] Cache audio write notice:', writeErr);
          }
        }

        if (playerSource) {
          const player = createAudioPlayer(playerSource);
          this.currentPlayer = player;
          try { player.volume = 1.0; } catch {}

          const wordCount = (fallbackText || '').split(/\s+/).length;
          const watchdogMs = Math.max(5000, wordCount * 650 + 3000);
          const watchdog = setTimeout(() => {
            if (this.currentPlayer === player) {
              this.currentPlayer = null;
              try {
                player.release?.();
                player.remove?.();
              } catch {}
              onFinished();
            }
          }, watchdogMs);

          player.addListener('playbackStatusUpdate', (status: any) => {
            if (status?.error) {
              console.warn('[VoiceClient] Player playback status error:', status.error);
              clearTimeout(watchdog);
              if (this.currentPlayer === player) {
                this.currentPlayer = null;
                onFinished();
              }
            } else if (status?.didJustFinish) {
              clearTimeout(watchdog);
              if (this.currentPlayer === player) {
                this.currentPlayer = null;
                try {
                  player.release?.();
                  player.remove?.();
                } catch {}
                onFinished();
              }
            }
          });

          player.play();
          return;
        }
      } catch (err) {
        console.warn('[VoiceClient] Native player error, falling back to TTS:', err);
      }

      // If audio playback failed or no source, finish cleanly without robotic voice
      onFinished();
    });
  }

  /**
   * Speaks text aloud through authentic neural audio (Sarvam Bulbul Shubh).
   * Robotic operating system / browser TTS is completely disabled.
   */
  public async speakAloud(text: string, onEnd?: () => void) {
    if (!text || !text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    this.status = 'speaking';
    this.lastCoachReply = text;
    this.notify();

    // Request genuine neural TTS audio from backend
    try {
      const backendUrl = getBackendBaseUrl();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${backendUrl}/api/voice/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speaker: 'shubh' }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          await this.playGeneratedAudio(data.audioBase64, 'audio/wav', text, undefined, false, onEnd);
          return;
        }
      }
    } catch (err) {
      console.warn('[VoiceClient] Neural TTS synthesis notice:', err);
    }

    // Robotic device TTS is completely eliminated per design requirements.
    // Conclude speaking state smoothly without robotic noise.
    setTimeout(() => {
      if (this.status === 'speaking') {
        this.status = 'listening';
        this.notify();
        this.startListening();
      }
      if (onEnd) onEnd();
    }, 1200);
  }

  /**
   * Explicitly requests microphone permissions on Native Mobile and Web platforms.
   */
  public async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'web') {
      try {
        const { granted } = await requestRecordingPermissionsAsync();
        this.hasAudioPermission = granted;
        if (granted) {
          await setAudioModeAsync({
            allowsRecording: true,
            playsInSilentMode: true,
            interruptionMode: 'duckOthers',
            shouldRouteThroughEarpiece: false,
          });
        }
        this.notify();
        return granted;
      } catch (err: any) {
        console.error('[VoiceClient] requestPermission error:', err?.message || err);
        return false;
      }
    } else {
      await this.initMicrophone();
      return this.hasAudioPermission;
    }
  }

  /**
   * Initializes microphone capture on BOTH Native Mobile and Web platforms.
   */
  public async initMicrophone(): Promise<void> {
    // -------------------------------------------------------------
    // A. Native Mobile (Expo Go on iOS / Android via expo-audio)
    // -------------------------------------------------------------
    if (Platform.OS !== 'web') {
      try {
        const current = await getRecordingPermissionsAsync();
        if (current.granted) {
          this.hasAudioPermission = true;
        } else {
          const req = await requestRecordingPermissionsAsync();
          this.hasAudioPermission = req.granted;
        }
        this.notify();

        if (this.hasAudioPermission) {
          await setAudioModeAsync({
            allowsRecording: true,
            playsInSilentMode: true,
            interruptionMode: 'duckOthers',
            shouldRouteThroughEarpiece: false,
          });
        } else {
          console.warn('[VoiceClient] Mobile microphone permission was denied by user.');
        }
      } catch (err: any) {
        console.error('[VoiceClient] Mobile audio permission error:', err?.message || err);
      }
      return;
    }

    // -------------------------------------------------------------
    // B. Web Platform (Chrome, Edge, Safari, Firefox)
    // -------------------------------------------------------------
    if (typeof window === 'undefined') return;

    if (navigator?.mediaDevices?.getUserMedia && !this.mediaStream) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        this.mediaStream = stream;
        this.hasAudioPermission = true;
        this.setupAudioAnalyser(stream);
        this.setupMediaRecorder(stream);
        this.notify();
      } catch (err: any) {
        console.warn('[VoiceClient] Web microphone stream error/denied:', err?.message || err);
        this.hasAudioPermission = false;
        this.notify();
      }
    }

    // Web Speech Recognition
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec && !this.recognition) {
      try {
        this.recognition = new SpeechRec();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-IN';

        this.recognition.onresult = (event: any) => {
          // Ignore speech recognition feedback while Coach is speaking
          if (this.status === 'speaking') {
            return;
          }

          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          const currentText = (finalTranscript || interimTranscript).trim();
          if (currentText) {
            this.currentSpeechText = currentText;
            this.userTranscript = currentText;
            this.status = 'listening';
            this.notify();

            if (this.silenceTimer) clearTimeout(this.silenceTimer);

            this.silenceTimer = setTimeout(() => {
              if (this.currentSpeechText.trim() && !this.isProcessingTurn) {
                const phrase = this.currentSpeechText.trim();
                this.currentSpeechText = '';
                this.handleUserSpokenInput(phrase);
              }
            }, 1400);
          }
        };

        this.recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.log('[VoiceClient] Web SpeechRecognition:', event.error);
          }
        };

        this.recognition.onend = () => {
          this.isRecognitionActive = false;
          if (this.status === 'listening' && !this.isMuted) {
            try {
              this.recognition.start();
              this.isRecognitionActive = true;
            } catch {
              // Ignore
            }
          }
        };
      } catch (e) {
        console.log('[VoiceClient] SpeechRecognition init:', e);
      }
    }
  }

  private setupAudioAnalyser(stream: any) {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);
        this.startContinuousVADMonitor();
      }
    } catch (e) {
      console.log('[VoiceClient] Analyser setup:', e);
    }
  }

  private setupMediaRecorder(stream: any) {
    try {
      const mimeType =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });

      this.mediaRecorder.ondataavailable = (e: any) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        if (this.audioChunks.length === 0 || this.isProcessingTurn) return;

        const blob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType || 'audio/webm' });
        this.audioChunks = [];

        if (blob.size < 400) return;

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          // On Web: if Web Speech Recognition is active, avoid double-submitting duplicate raw audio turns
          if (base64Data && !this.isProcessingTurn && !this.isRecognitionActive) {
            await this.processRecordedAudioTurn(base64Data, blob.type);
          }
        };
      };
    } catch (e) {
      console.log('[VoiceClient] MediaRecorder setup:', e);
    }
  }

  private startContinuousVADMonitor() {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkAudioFrame = () => {
      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      this.audioLevel = Math.min(100, Math.round((avg / 128) * 100));

      const isSpeakingNow = this.audioLevel > 18;

      // Continuous VAD Turn Detection on Web
      if (this.status === 'listening' && !this.isMuted) {
        if (isSpeakingNow) {
          if (!this.isUserSpeakingVAD) {
            this.isUserSpeakingVAD = true;
            this.vadSilenceStart = 0;
            if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
              this.audioChunks = [];
              try {
                this.mediaRecorder.start(200);
              } catch {
                // Ignored
              }
            }
          }
        } else if (this.isUserSpeakingVAD) {
          const now = Date.now();
          if (this.vadSilenceStart === 0) {
            this.vadSilenceStart = now;
          } else if (now - this.vadSilenceStart > 750) {
            this.isUserSpeakingVAD = false;
            this.vadSilenceStart = 0;
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
              try {
                this.mediaRecorder.stop();
              } catch {
                // Ignored
              }
            }
          }
        }
      }

      this.notify();
      this.animFrameId = requestAnimationFrame(checkAudioFrame);
    };

    checkAudioFrame();
  }

  private async processRecordedAudioTurn(base64Data: string, mimeType: string) {
    if (this.isProcessingTurn) return;
    this.isProcessingTurn = true;
    this.status = 'connecting';
    this.notify();

    const turnStartTime = Date.now();
    try {
      const result = await transcribeAndReplyAudio(
        base64Data,
        mimeType,
        this.currentUserName || 'Abhishek',
        ['patellofemoral_knee_pain'],
        this.lastCoachReply,
        this.currentUserId || 'user_local'
      );
      console.log(`[VoiceClient] Turn response received from backend in ${Date.now() - turnStartTime}ms`);

      // Anti-Echo Guard: If result is an echo of Coach's previous utterance, suppress it!
      if (
        result.isEcho ||
        !result.coachReply?.trim() ||
        isSelfEcho(result.userTranscript, this.lastCoachReply)
      ) {
        console.log(`[VoiceClient] Speaker echo suppressed ("${result.userTranscript}"). Waiting for user.`);
        this.isProcessingTurn = false;
        this.status = 'listening';
        this.notify();
        this.startListening();
        return;
      }

      const cleanReply = cleanCoachReplyOnly(result.coachReply);
      this.lastCoachReply = cleanReply;
      this.userTranscript = result.userTranscript;
      this.coachTranscript = cleanReply;
      this.status = 'speaking';
      this.isProcessingTurn = false;
      this.notify();

      if (result.audioUrl || result.audioBase64) {
        await this.playGeneratedAudio(result.audioBase64, result.audioMime || 'audio/wav', cleanReply, result.audioUrl);
      } else {
        this.speakAloud(cleanReply);
      }
    } catch (err) {
      console.error('[VoiceClient] Audio turn error:', err);
      this.isProcessingTurn = false;
      this.coachTranscript = 'Error: Voice turn failed. Please try speaking again.';
      this.status = 'listening';
      this.notify();
      this.startListening();
    }
  }

  /**
   * Starts listening to user's microphone across Mobile and Web.
   */
  public async startListening() {
    this.status = 'listening';
    this.notify();

    if (this.isMuted) return;

    // 1. Native Mobile (iOS / Android) Recording Start with Automatic Voice Activity Detection (VAD) via expo-audio
    if (Platform.OS !== 'web') {
      try {
        if (this.nativeRecorder) {
          try {
            await this.nativeRecorder.stop();
          } catch {
            // Ignored
          }
          this.nativeRecorder = null;
        }
        if (this.nativeInterval) {
          clearInterval(this.nativeInterval);
          this.nativeInterval = null;
        }

        if (!this.hasAudioPermission) {
          const granted = await this.requestPermission();
          if (!granted) {
            console.warn('[VoiceClient] Cannot record without audio permission');
            return;
          }
        }

        await setAudioModeAsync({
          allowsRecording: true, // Keep full-duplex active
          playsInSilentMode: true,
          interruptionMode: 'duckOthers',
          shouldRouteThroughEarpiece: false, // Prevents switching to earpiece ("voice mode")!
        });

        const isAndroid = Platform.OS === 'android';
        const isIOS = Platform.OS === 'ios';

        const platformOptions = isAndroid
          ? {
              extension: '.m4a',
              sampleRate: 44100,
              numberOfChannels: 1,
              bitRate: 64000,
              isMeteringEnabled: true,
              outputFormat: 'mpeg4',
              audioEncoder: 'aac',
              audioSource: 'voice_communication', // Enables hardware DSP Acoustic Echo Cancellation (AEC)
            }
          : isIOS
          ? {
              extension: '.m4a',
              sampleRate: 44100,
              numberOfChannels: 1,
              bitRate: 64000,
              isMeteringEnabled: true,
              outputFormat: 'aac ',
              audioQuality: 127,
              linearPCMBitDepth: 16,
              linearPCMIsBigEndian: false,
              linearPCMIsFloat: false,
            }
          : {
              extension: '.webm',
              sampleRate: 44100,
              numberOfChannels: 1,
              bitRate: 64000,
              isMeteringEnabled: true,
            };

        const AudioRecorderConstructor = (AudioModule as any).AudioRecorder;
        const recorder: AudioRecorder = new AudioRecorderConstructor(platformOptions);

        await recorder.prepareToRecordAsync({
          ...RecordingPresets.HIGH_QUALITY,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 64000,
          isMeteringEnabled: true,
          android: {
            outputFormat: 'mpeg4',
            audioEncoder: 'aac',
            audioSource: 'voice_communication' as any, // Hardware DSP AEC on Android
          },
          ios: {
            outputFormat: 'aac ',
            audioQuality: 127,
          },
        });
        recorder.record();
        this.nativeRecorder = recorder;
        this.hasAudioPermission = true;
        this.notify();

        let speechDetected = false;
        let speechDurationMs = 0;
        let silenceDurationMs = 0;
        let peakVoiceDb = -100;
        let consecutiveSpeechFrames = 0;
        const turnStartTime = Date.now();

        this.nativeInterval = setInterval(() => {
          if (!this.nativeRecorder || this.isProcessingTurn) return;

          const status = this.nativeRecorder.getStatus();
          if (!status.isRecording) return;

          // Metering on Android/iOS: range -160 dB to 0 dB
          const metering = typeof status.metering === 'number' && !isNaN(status.metering)
            ? status.metering
            : -100;

          // Normalized 0 to 100 level for fluid visual pulsing
          const level = Math.min(100, Math.max(0, Math.round(((metering + 60) / 50) * 100)));
          this.audioLevel = level;
          this.notify();

          const now = Date.now();
          const totalElapsed = now - turnStartTime;

          // While Coach is speaking, let them complete the entire sentence without auto-stopping!
          if (this.status === 'speaking') {
            return;
          }

          // Active Turn Silence Detection
          if (this.status === 'listening' && !this.isMuted) {
            // Highly sensitive threshold for natural speaking distance (-52 dB vs old -38 dB)
            const isSpeechFrame = metering >= -52;
            if (isSpeechFrame) {
              consecutiveSpeechFrames++;
              // 2 consecutive frames (~160ms) confirms user is speaking (filters sudden mic bumps/clicks)
              if (consecutiveSpeechFrames >= 2) {
                if (!speechDetected) {
                  speechDetected = true;
                  speechDurationMs = 0;
                }
                if (metering > peakVoiceDb) {
                  peakVoiceDb = metering;
                }
                speechDurationMs += 80;
                silenceDurationMs = 0; // Reset silence counter while user continues speaking
              }
            } else {
              consecutiveSpeechFrames = 0;
              if (speechDetected) {
                // User spoke, and volume has now dropped below the voice peak or below quiet threshold
                const silenceThreshold = Math.max(-54, peakVoiceDb - 12);
                const isQuietNow = metering <= silenceThreshold;

                if (isQuietNow) {
                  silenceDurationMs += 80;

                  // Rapid real-time conversational turn completion:
                  // 500ms of quiet after speaking confirms turn completion
                  const requiredSilenceMs = speechDurationMs >= 350 ? 500 : 700;

                  if (silenceDurationMs >= requiredSilenceMs) {
                    console.log(`[VoiceClient] End of user speech detected (${speechDurationMs}ms speech, ${silenceDurationMs}ms silence). Submitting turn...`);
                    speechDetected = false;
                    silenceDurationMs = 0;
                    this.stopListening();
                    return;
                  }
                }
              }
            }

            // Safety Guard 1: Max 12 seconds of speech per utterance
            if (speechDetected && totalElapsed > 12000) {
              console.log('[VoiceClient] Max utterance time reached, finishing turn');
              speechDetected = false;
              this.stopListening();
              return;
            }

            // Safety Guard 2: Inactivity timeout if quiet for 15s without speaking - roll over buffer
            if (!speechDetected && totalElapsed > 15000) {
              console.log('[VoiceClient] Inactivity timeout, refreshing audio buffer');
              this.startListening();
              return;
            }
          }
        }, 80);
      } catch (err) {
        console.warn('[VoiceClient] Native recording start error:', err);
      }
      return;
    }

    // 2. Web Speech Recognition Start
    if (this.recognition && !this.isRecognitionActive) {
      try {
        this.recognition.start();
        this.isRecognitionActive = true;
      } catch {
        // Ignored
      }
    }

    // 3. Web MediaRecorder Start
    if (this.mediaRecorder && this.mediaRecorder.state === 'inactive' && !this.isUserSpeakingVAD) {
      this.audioChunks = [];
      try {
        this.mediaRecorder.start(250);
      } catch {
        // Ignored
      }
    }
  }

  /**
   * Stops listening to microphone and triggers processing immediately.
   */
  public async stopListening() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // A. Native Mobile (iOS / Android) Stop & Send via expo-audio & expo-file-system
    if (Platform.OS !== 'web' && this.nativeRecorder) {
      try {
        if (this.nativeInterval) {
          clearInterval(this.nativeInterval);
          this.nativeInterval = null;
        }
        const rec = this.nativeRecorder;
        this.nativeRecorder = null;
        await rec.stop();
        const uri = rec.uri || (rec.getStatus ? rec.getStatus()?.url : null);
        console.log('[VoiceClient] Native recording completed, uri:', uri);

        if (uri) {
          let base64Data = '';
          try {
            base64Data = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          } catch (err: any) {
            console.warn('[VoiceClient] FileSystem.readAsStringAsync error:', err?.message || err);
            try {
              const response = await fetch(uri);
              const blob = await response.blob();
              base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const res = reader.result as string;
                  resolve(res.includes(',') ? res.split(',')[1] : res);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            } catch (blobErr) {
              console.warn('[VoiceClient] Fallback blob read error:', blobErr);
            }
          }

          if (base64Data && base64Data.length > 300 && !this.isProcessingTurn) {
            console.log('[VoiceClient] Submitting turn, base64 length:', base64Data.length);
            await this.processRecordedAudioTurn(base64Data, 'audio/mp4');
          } else if (!this.isProcessingTurn) {
            console.warn('[VoiceClient] Audio turn was too short/empty, restarting listening');
            this.startListening();
          }
        }
      } catch (err) {
        console.warn('[VoiceClient] Native recording stop error:', err);
      }
      return;
    }

    // B. Web Speech Recognition Text Process
    if (this.currentSpeechText.trim() && !this.isProcessingTurn) {
      const phrase = this.currentSpeechText.trim();
      this.currentSpeechText = '';
      this.handleUserSpokenInput(phrase);
      return;
    }

    // C. Web MediaRecorder Stop & Send
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignored
      }
    }
  }

  /**
   * Handles user spoken text, streams response tokens and incremental audio chunks.
   */
  public async handleUserSpokenInput(text: string) {
    if (!text || !text.trim()) return;

    if (this.isProcessingTurn) {
      console.log('[VoiceClient] Turn already processing, ignoring secondary trigger');
      return;
    }

    // Anti-Echo Check: If spoken text matches Coach's own reply, suppress it!
    if (this.lastCoachReply && isSelfEcho(text, this.lastCoachReply)) {
      console.log(`[VoiceClient] Suppressed echo in user input: "${text}"`);
      this.status = 'listening';
      this.notify();
      this.startListening();
      return;
    }

    this.isProcessingTurn = true;

    // Cancel any previous audio playback
    if (this.currentWebAudio) {
      try { this.currentWebAudio.pause(); } catch {}
      this.currentWebAudio = null;
    }
    if (this.currentPlayer) {
      try { this.currentPlayer.pause(); } catch {}
      this.currentPlayer = null;
    }

    // Stop microphone recording while AI generates and speaks to prevent acoustic self-interruption
    this.stopListening();

    this.audioChunkQueue = [];
    this.isPlayingChunkQueue = false;
    this.currentStreamAbortController = new AbortController();

    this.userTranscript = text;
    this.coachTranscript = '';
    this.status = 'connecting';
    this.notify();

    try {
      await streamHealthCoachAI({
        message: text,
        userId: this.currentUserId,
        userName: this.currentUserName || 'Abhishek',
        signal: this.currentStreamAbortController.signal,
        onTextDelta: (delta) => {
          this.status = 'speaking';
          this.coachTranscript += delta;
          this.notify();
        },
        onAudioChunk: (chunk) => {
          this.enqueueAudioChunk(chunk);
        },
        onComplete: (result) => {
          this.lastCoachReply = result.fullText;
          this.coachTranscript = result.fullText;
          this.notify();
          this.finishTurnSpeaking();
        },
      });
    } catch (err: any) {
      if (this.currentStreamAbortController?.signal.aborted) {
        return;
      }
      console.error('[VoiceClient] Streaming turn error:', err);
      this.isProcessingTurn = false;
      this.coachTranscript = 'Error: Coach Alex could not connect. Please try speaking again.';
      this.status = 'listening';
      this.notify();
      this.startListening();
    } finally {
      this.finishTurnSpeaking();
    }
  }

  /**
   * Starts a live hands-free voice session.
   */
  public async startSession(
    userId = 'user_local',
    customGreeting?: string,
    userName = 'Abhishek'
  ): Promise<void> {
    this.currentUserId = userId;
    this.currentUserName = userName;
    this.status = 'connecting';
    this.errorMessage = null;
    this.durationSeconds = 0;
    this.provider = 'sarvam';
    const defaultGreeting =
      customGreeting ||
      `Coach Alex is ready. Ask anything about your fitness, nutrition, or recovery.`;
    this.coachTranscript = defaultGreeting;
    this.userTranscript = '';
    this.currentSpeechText = '';
    this.isProcessingTurn = false;
    this.lastEventTimestamp = Date.now() / 1000 - 1;
    this.notify();

    this.unlockAudio();
    await this.initMicrophone();
    await this.initAvailableVoices();

    const backendUrl = getBackendBaseUrl();
    const isLocalhostOnNative =
      Platform.OS !== 'web' &&
      (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1'));

    if (!isLocalhostOnNative) {
      try {
        const res = await fetch(`${backendUrl}/api/voice/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, userName }),
        });

        if (res.ok) {
          const data = await res.json();
          this.callId = data.callId;
          this.provider = data.provider || 'sarvam';
          this.isSynthetic = data.isSynthetic ?? true;
        }
      } catch {
        // Local mode
      }
    }

    this.status = 'connected';
    this.notify();

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.durationSeconds++;
      this.notify();
    }, 1000);

    // Dynamic greeting based on time of day, or custom scheduled call greeting
    let greeting = defaultGreeting;

    // Only fetch default neural greeting if no custom greeting was provided and backend is reachable
    if (!customGreeting && !isLocalhostOnNative) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1800);
        const greetRes = await fetch(`${backendUrl}/api/voice/greeting`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, userName }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (greetRes.ok) {
          const greetData = await greetRes.json();
          if (greetData.greeting) {
            greeting = greetData.greeting;
            this.coachTranscript = greeting;
            if (greetData.audioUrl || greetData.audioBase64) {
              await this.playGeneratedAudio(
                greetData.audioBase64,
                greetData.audioMime || 'audio/wav',
                greeting,
                greetData.audioUrl,
                true // auto-listen on finish
              );
              return;
            }
          }
        }
      } catch {
        // Fallback to local audio
      }
    }

    this.coachTranscript = greeting;
    this.status = 'listening';
    this.notify();
    this.startListening();
  }

  public toggleMute(): void {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopListening();
    } else if (this.status === 'listening') {
      this.startListening();
    }
    this.notify();
  }

  /**
   * Instant interruption: yields floor to user immediately.
   */
  public interrupt(): void {
    if (this.currentStreamAbortController) {
      try {
        this.currentStreamAbortController.abort();
      } catch {}
      this.currentStreamAbortController = null;
    }
    this.audioChunkQueue = [];
    this.isPlayingChunkQueue = false;
    this.isProcessingTurn = false;

    if (this.currentPlayer) {
      try {
        this.currentPlayer.pause();
        this.currentPlayer.release?.();
        this.currentPlayer.remove?.();
      } catch {}
      this.currentPlayer = null;
    }
    if (this.currentWebAudio) {
      try {
        this.currentWebAudio.pause();
      } catch {}
      this.currentWebAudio = null;
    }
    this.status = 'interrupted';
    this.notify();

    setTimeout(() => {
      this.startListening();
    }, 150);
  }

  public async replayLastReply(): Promise<void> {
    if (!this.lastCoachReply) return;
    this.unlockAudio();
    this.status = 'speaking';
    this.notify();
    await this.speakAloud(this.lastCoachReply);
  }

  public simulateUserUtterance(text: string): void {
    this.unlockAudio();
    this.isProcessingTurn = false;
    this.handleUserSpokenInput(text);
  }

  public endSession(): void {
    this.isProcessingTurn = false;
    this.status = 'disconnected';

    // Stop console transcript polling
    if (this.consolePollTimer) {
      clearInterval(this.consolePollTimer);
      this.consolePollTimer = null;
    }

    // Stop standalone console agent process on host
    try {
      const backendUrl = getBackendBaseUrl();
      fetch(`${backendUrl}/api/voice/console/stop`, {
        method: 'POST',
      }).catch(() => {});
    } catch {}

    // 1. Stop native recorder interval & recorder instance
    if (this.nativeInterval) {
      clearInterval(this.nativeInterval);
      this.nativeInterval = null;
    }
    if (this.nativeRecorder) {
      try {
        this.nativeRecorder.stop();
      } catch {
        // Ignored
      }
      this.nativeRecorder = null;
    }

    // 2. Stop audio player
    if (this.currentPlayer) {
      try {
        this.currentPlayer.pause();
        this.currentPlayer.remove();
      } catch {}
      this.currentPlayer = null;
    }

    // 3. Stop web audio
    if (this.currentWebAudio) {
      try {
        this.currentWebAudio.pause();
      } catch {}
      this.currentWebAudio = null;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // 5. CRITICAL: Stop and release browser microphone tracks!
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track: any) => track.stop());
      } catch {}
      this.mediaStream = null;
    }

    // 6. CRITICAL: Stop Web SpeechRecognition completely without auto-restarting!
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.abort();
      } catch {}
      this.recognition = null;
      this.isRecognitionActive = false;
    }

    // 7. CRITICAL: Turn OFF native microphone recording session in mobile OS!
    if (Platform.OS !== 'web') {
      setAudioModeAsync({
        allowsRecording: false, // Releases the OS microphone hardware cleanly
        playsInSilentMode: false,
        interruptionMode: 'mixWithOthers',
        shouldRouteThroughEarpiece: false,
      }).catch(() => {});
    }

    // 8. Clear timers and visual frames
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.currentSpeechText = '';
    this.audioLevel = 0;
    this.notify();
  }
}

export const voiceClient = new VoiceClientService();
