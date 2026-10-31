import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
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
import { askDishaAI, transcribeAndReplyAudio, getBackendBaseUrl } from './aiChatService';

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
  provider: 'gemini' | 'openai';
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
  private provider: 'gemini' | 'openai' = 'gemini';
  private isSynthetic: boolean = true;
  private hasAudioPermission: boolean = false;
  private currentUserId: string = 'usr_synthetic_alex';
  private audioLevel: number = 0;
  private isHandsFree: boolean = true;

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

  constructor() {
    this.initAvailableVoices();
  }

  public async initAvailableVoices(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        const voices = await Speech.getAvailableVoicesAsync();
        if (voices && voices.length > 0) {
          // Indian English female voice (e.g. Google en-in-x-end-network, en-in-x-ene, iOS Isha)
          const enInVoice = voices.find(
            (v) =>
              (v.language === 'en-IN' || v.identifier.toLowerCase().includes('en_in') || v.identifier.toLowerCase().includes('en-in')) &&
              (v.name.toLowerCase().includes('female') ||
                v.identifier.includes('end') ||
                v.identifier.includes('ene') ||
                v.identifier.includes('enc') ||
                v.name.toLowerCase().includes('isha') ||
                v.name.toLowerCase().includes('veena'))
          ) || voices.find((v) => v.language === 'en-IN' || v.identifier.includes('en_IN'));

          // Hindi female voice (e.g. Google hi-in-x-hie-local, hi-in-x-hid, iOS Lekha)
          const hiInVoice = voices.find(
            (v) =>
              (v.language === 'hi-IN' || v.language === 'hi' || v.identifier.toLowerCase().includes('hi_in') || v.identifier.toLowerCase().includes('hi-in')) &&
              (v.name.toLowerCase().includes('female') ||
                v.identifier.includes('hie') ||
                v.identifier.includes('hid') ||
                v.identifier.includes('hia') ||
                v.name.toLowerCase().includes('lekha') ||
                v.name.toLowerCase().includes('kalpana'))
          ) || voices.find((v) => v.language.startsWith('hi'));

          if (enInVoice) this.cachedIndianVoices.indianEnglish = enInVoice.identifier;
          if (hiInVoice) this.cachedIndianVoices.hindi = hiInVoice.identifier;
        }
      }
    } catch {
      // Handled gracefully
    }
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
   * Plays high-fidelity human speech synthesized directly by Gemini's neural voice
   * with authentic Indian accent and natural intonation.
   */
  public async playGeneratedAudio(
    audioBase64: string,
    audioMime = 'audio/wav',
    fallbackText = ''
  ): Promise<void> {
    this.status = 'speaking';
    this.notify();

    let finished = false;
    const finishSpeaking = () => {
      if (finished) return;
      finished = true;
      if (this.status === 'speaking') {
        this.startListening();
      }
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

        const audio = new Audio(`data:${audioMime};base64,${audioBase64}`);
        this.currentWebAudio = audio;

        audio.onended = () => {
          this.currentWebAudio = null;
          finishSpeaking();
        };

        audio.onerror = (e) => {
          console.warn('[VoiceClient] Web audio error, using speech fallback:', e);
          this.currentWebAudio = null;
          this.speakAloud(fallbackText);
        };

        await audio.play();
        return;
      } catch (err) {
        console.warn('[VoiceClient] Web audio play error:', err);
      }
    }

    // 2. Native Mobile (iOS / Android via expo-audio & expo-file-system)
    try {
      if (this.currentPlayer) {
        try {
          this.currentPlayer.pause();
          this.currentPlayer.remove();
        } catch {}
        this.currentPlayer = null;
      }

      await setAudioModeAsync({
        allowsRecording: true, // Keep full-duplex active for instant barge-in
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: false, // Stay loud and clear on speakerphone!
      });

      // Keep microphone active and listening while Disha speaks
      if (!this.nativeRecorder && Platform.OS !== 'web' && this.hasAudioPermission) {
        this.startListening();
      }

      const speechPath = `${FileSystem.cacheDirectory || ''}disha_speech_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(speechPath, audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const player = createAudioPlayer(speechPath);
      this.currentPlayer = player;

      player.addListener('playbackStatusUpdate', (status: any) => {
        if (status.didJustFinish) {
          if (this.currentPlayer === player) {
            this.currentPlayer = null;
            try {
              player.remove();
            } catch {}
            if (this.status === 'speaking') {
              this.status = 'listening';
              this.notify();
            }
          }
        }
      });

      player.play();
      return;
    } catch (err) {
      console.warn('[VoiceClient] Native player error, falling back to TTS:', err);
    }

    // 3. Fallback to device speech engine
    this.speakAloud(fallbackText);
  }

  /**
   * Speaks text aloud through device speakers with safety watchdog timer to prevent UI hanging.
   */
  public speakAloud(text: string, onEnd?: () => void) {
    this.status = 'speaking';
    this.notify();

    let finished = false;
    const finishSpeaking = () => {
      if (finished) return;
      finished = true;
      if (this.status === 'speaking') {
        this.startListening();
      }
      if (onEnd) onEnd();
    };

    // Watchdog safety timer: Guarantees transition to 'listening' within estimated speech duration
    const wordCount = text.split(/\s+/).length;
    const estimatedDurationMs = Math.max(3000, wordCount * 350 + 1000);
    const watchdogTimer = setTimeout(finishSpeaking, estimatedDurationMs);

    // Detect Indian English vs Hindi for accurate pronunciation
    const isHindiText =
      /[\u0900-\u097F]/.test(text) ||
      /\b(namaste|aap|kaisa|kaise|karti|karta|hoon|hai|karein|theek|accha|shukriya|shuru|bol)\b/i.test(text);
    const speechLang = isHindiText ? 'hi-IN' : 'en-IN';

    // 1. Web Speech Synthesis (Reliable across Chrome, Edge, Safari, Firefox)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.98;
        utterance.pitch = 1.05;

        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const matchedVoice =
            voices.find((v) => v.lang === speechLang || v.lang.startsWith(isHindiText ? 'hi' : 'en-IN')) ||
            voices.find(
              (v) =>
                v.name.toLowerCase().includes('india') ||
                v.name.toLowerCase().includes('zira') ||
                v.name.toLowerCase().includes('natural') ||
                v.name.toLowerCase().includes('google')
            ) ||
            voices[0];

          if (matchedVoice) {
            utterance.voice = matchedVoice;
          }
        }

        utterance.onstart = () => {
          this.status = 'speaking';
          this.notify();
        };

        utterance.onend = () => {
          clearTimeout(watchdogTimer);
          finishSpeaking();
        };

        utterance.onerror = (e) => {
          console.log('[VoiceClient] Speech synthesis event:', e);
          clearTimeout(watchdogTimer);
          finishSpeaking();
        };

        window.speechSynthesis.speak(utterance);
        return;
      } catch (err) {
        console.warn('[VoiceClient] window.speechSynthesis error:', err);
      }
    }

    // 2. Native mobile playback via expo-speech with dedicated Indian voices (iOS / Android)
    try {
      if (Platform.OS !== 'web') {
        setAudioModeAsync({
          allowsRecording: true, // Keep recording enabled for continuous full-duplex voice
          playsInSilentMode: true,
          interruptionMode: 'duckOthers',
          shouldRouteThroughEarpiece: false, // Stay on loud speaker!
        }).catch(() => {});

        if (!this.nativeRecorder && this.hasAudioPermission) {
          this.startListening();
        }
      }
      const chosenVoice = isHindiText
        ? this.cachedIndianVoices.hindi
        : this.cachedIndianVoices.indianEnglish;

      Speech.stop();
      Speech.speak(text, {
        language: speechLang,
        voice: chosenVoice,
        pitch: 1.05,
        rate: 0.98,
        onDone: () => {
          clearTimeout(watchdogTimer);
          if (this.status === 'speaking') {
            this.status = 'listening';
            this.notify();
          }
          if (onEnd) onEnd();
        },
        onError: () => {
          clearTimeout(watchdogTimer);
          if (this.status === 'speaking') {
            this.status = 'listening';
            this.notify();
          }
          if (onEnd) onEnd();
        },
      });
    } catch {
      // Handled by watchdogTimer
    }
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
          if (this.status === 'speaking') {
            this.interrupt();
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
            }, 900);
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
          if (base64Data && !this.isProcessingTurn) {
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

      // Barge-in: User starts speaking while Disha is speaking
      if (isSpeakingNow && this.status === 'speaking') {
        this.interrupt();
      }

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
    this.coachTranscript = 'Disha is thinking...';
    this.notify();

    try {
      const result = await transcribeAndReplyAudio(base64Data, mimeType, 'Alex', ['patellofemoral_knee_pain']);
      this.userTranscript = result.userTranscript;
      this.coachTranscript = result.coachReply;
      this.status = 'speaking';
      this.isProcessingTurn = false;
      this.notify();

      if (result.audioBase64) {
        await this.playGeneratedAudio(result.audioBase64, result.audioMime || 'audio/wav', result.coachReply);
      } else {
        this.speakAloud(result.coachReply);
      }
    } catch (err) {
      console.error('[VoiceClient] Audio turn error:', err);
      this.isProcessingTurn = false;
      const fallback = 'Main sun rahi hoon Alex. Aaj aapke nutrition ya workout par discuss karein?';
      this.coachTranscript = fallback;
      this.status = 'speaking';
      this.notify();
      this.speakAloud(fallback);
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
              audioSource: 'mic', // Normal mic mode keeps Android on speaker without switching to earpiece
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
            audioSource: 'mic' as any,
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

          // Barge-in: While Disha is speaking, if the user speaks directly into the mic:
          // User voice right next to phone mic registers >= -24 dB (well above speaker volume).
          if (this.status === 'speaking') {
            const isUserBargeIn = metering >= -24;
            if (isUserBargeIn) {
              consecutiveSpeechFrames++;
              if (consecutiveSpeechFrames >= 2) {
                console.log('[VoiceClient] Barge-in detected during AI speech! Interrupting...');
                consecutiveSpeechFrames = 0;
                this.interrupt();
                return;
              }
            } else {
              consecutiveSpeechFrames = 0;
            }
          }

          // Active Turn Silence Detection
          if (this.status === 'listening' && !this.isMuted) {
            const isSpeechFrame = metering >= -40;
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
                const silenceThreshold = Math.min(-42, peakVoiceDb - 8);
                const isQuietNow = metering <= silenceThreshold;

                if (isQuietNow) {
                  silenceDurationMs += 80;

                  // Rapid turn completion:
                  // 650ms of silence after a phrase -> trigger instant send!
                  // 800ms for short quick answers ("Haan", "Nahi", "Good", "Yes")
                  const requiredSilenceMs = speechDurationMs >= 300 ? 650 : 800;

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

            // Safety Guard 1: Max 10 seconds of speech per utterance
            if (speechDetected && totalElapsed > 10000) {
              console.log('[VoiceClient] Max utterance time reached (10s), finishing turn');
              speechDetected = false;
              this.stopListening();
              return;
            }

            // Safety Guard 2: Inactivity timeout if user never spoke after 8 seconds of listening
            if (!speechDetected && totalElapsed > 8000) {
              console.log('[VoiceClient] Inactivity timeout (8s of quiet), resetting turn');
              this.stopListening();
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
   * Handles user spoken text, queries Gemini AI Coach, and speaks response aloud.
   */
  public async handleUserSpokenInput(text: string) {
    if (this.isProcessingTurn) return;
    this.isProcessingTurn = true;

    this.userTranscript = text;
    this.status = 'connecting';
    this.coachTranscript = 'Disha is thinking...';
    this.notify();

    try {
      const aiResponse = await askDishaAI(text, 'Alex', ['patellofemoral_knee_pain']);
      const replyText = aiResponse.text;

      this.coachTranscript = replyText;
      this.status = 'speaking';
      this.isProcessingTurn = false;
      this.notify();

      if (aiResponse.audioBase64) {
        await this.playGeneratedAudio(aiResponse.audioBase64, aiResponse.audioMime || 'audio/wav', replyText);
      } else {
        this.speakAloud(replyText);
      }
    } catch (err) {
      console.error('[VoiceClient] Input error:', err);
      this.isProcessingTurn = false;
      const fallbackText =
        'Bahut badhiya! Maine note kar liya hai. Aaj hum gentle movement aur hydration par focus karenge.';
      this.coachTranscript = fallbackText;
      this.status = 'speaking';
      this.notify();
      this.speakAloud(fallbackText);
    }
  }

  /**
   * Starts a live hands-free voice session.
   */
  public async startSession(userId = 'usr_synthetic_alex'): Promise<void> {
    this.currentUserId = userId;
    this.status = 'connecting';
    this.errorMessage = null;
    this.durationSeconds = 0;
    this.coachTranscript = 'Connecting to Disha Live Voice...';
    this.userTranscript = '';
    this.currentSpeechText = '';
    this.isProcessingTurn = false;
    this.notify();

    this.unlockAudio();
    await this.initMicrophone();
    await this.initAvailableVoices();

    try {
      const backendUrl = getBackendBaseUrl();
      const res = await fetch(`${backendUrl}/api/voice/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        const data = await res.json();
        this.callId = data.callId;
        this.provider = data.provider || 'gemini';
        this.isSynthetic = data.isSynthetic ?? true;
      }
    } catch {
      // Local mode
    }

    this.status = 'connected';
    this.notify();

    // Immediately start listening so the microphone is HOT from the very beginning of the call!
    if (this.hasAudioPermission) {
      this.startListening();
    }

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.durationSeconds++;
      this.notify();
    }, 1000);

    // Dynamic greeting based on time of day
    const hour = new Date().getHours();
    let greeting = '';
    if (hour >= 5 && hour < 12) {
      greeting = 'Good morning Alex! Main Disha bol rahi hoon, aapki AI health coach. How did you sleep, and how is your morning energy today?';
    } else if (hour >= 12 && hour < 17) {
      greeting = 'Namaste Alex! Disha here. Taking a quick wellness check-in—how was your lunch and routine so far?';
    } else if (hour >= 17 && hour < 22) {
      greeting = 'Good evening Alex! Disha here. How are you feeling after today’s activities? Any discomfort or meal questions tonight?';
    } else {
      greeting = 'Namaste Alex! Main Disha bol rahi hoon. Time for a peaceful wind-down. How did your day go overall?';
    }

    // Fetch neural greeting from backend so initial voice is ALWAYS Gemini Aoede
    try {
      const backendUrl = getBackendBaseUrl();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const greetRes = await fetch(`${backendUrl}/api/voice/greeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (greetRes.ok) {
        const greetData = await greetRes.json();
        if (greetData.greeting) {
          greeting = greetData.greeting;
          this.coachTranscript = greeting;
          if (greetData.audioBase64) {
            this.status = 'speaking';
            this.notify();
            await this.playGeneratedAudio(greetData.audioBase64, greetData.audioMime || 'audio/wav', greeting);
            return;
          }
        }
      }
    } catch {
      // Fallback to local audio
    }

    this.coachTranscript = greeting;
    this.speakAloud(greeting);
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
    if (this.currentPlayer) {
      try {
        this.currentPlayer.pause();
        this.currentPlayer.remove();
      } catch {}
      this.currentPlayer = null;
    }
    if (this.currentWebAudio) {
      try {
        this.currentWebAudio.pause();
      } catch {}
      this.currentWebAudio = null;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    try {
      Speech.stop();
    } catch {
      // Ignored
    }
    this.status = 'interrupted';
    this.coachTranscript = '(Listening to you...)';
    this.notify();

    setTimeout(() => {
      this.startListening();
    }, 150);
  }

  public simulateUserUtterance(text: string): void {
    this.unlockAudio();
    this.handleUserSpokenInput(text);
  }

  public endSession(): void {
    this.isProcessingTurn = false;
    this.status = 'disconnected';

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

    // 3. Stop native Speech synthesis
    try {
      Speech.stop();
    } catch {
      // Ignored
    }

    // 4. Stop web audio and speech synthesis
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
