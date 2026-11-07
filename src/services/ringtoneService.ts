import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';

/**
 * Dynamically synthesizes a realistic telephone ringtone PCM WAV audio stream.
 * Pure TypeScript generation guarantees 100% offline availability across all devices.
 */
function generateTelephoneRingtoneBase64(): string {
  const sampleRate = 8000;
  const duration = 2.4; // 2.4-second repeating ring cycle
  const numSamples = Math.floor(sampleRate * duration);
  const dataSize = numSamples * 2;
  const totalSize = 44 + dataSize;
  const buffer = new Uint8Array(totalSize);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) buffer[offset + i] = str.charCodeAt(i);
  };
  const writeU32 = (offset: number, val: number) => {
    buffer[offset] = val & 0xff;
    buffer[offset + 1] = (val >> 8) & 0xff;
    buffer[offset + 2] = (val >> 16) & 0xff;
    buffer[offset + 3] = (val >> 24) & 0xff;
  };
  const writeU16 = (offset: number, val: number) => {
    buffer[offset] = val & 0xff;
    buffer[offset + 1] = (val >> 8) & 0xff;
  };

  // RIFF container & WAVE fmt subchunk
  writeStr(0, 'RIFF');
  writeU32(4, 36 + dataSize);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  writeU32(16, 16);
  writeU16(20, 1); // Linear PCM
  writeU16(22, 1); // Mono
  writeU32(24, sampleRate);
  writeU32(28, sampleRate * 2);
  writeU16(32, 2);
  writeU16(34, 16); // 16-bit
  writeStr(36, 'data');
  writeU32(40, dataSize);

  // Classic dual-tone European/American melodic telephone ring cadence:
  // Ring 1: 0.0s - 0.4s (Dual chime chord: 440Hz + 880Hz + 1320Hz)
  // Gap: 0.4s - 0.55s
  // Ring 2: 0.55s - 1.15s (Higher chime chord: 523Hz + 1046Hz + 1568Hz)
  // Silence pause: 1.15s - 2.4s
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    if (t < 0.4) {
      const env = Math.sin((t / 0.4) * Math.PI);
      sample =
        (Math.sin(2 * Math.PI * 440 * t) * 0.45 +
          Math.sin(2 * Math.PI * 880 * t) * 0.35 +
          Math.sin(2 * Math.PI * 1320 * t) * 0.2) *
        env;
    } else if (t >= 0.55 && t < 1.15) {
      const relT = t - 0.55;
      const env = Math.sin((relT / 0.6) * Math.PI);
      sample =
        (Math.sin(2 * Math.PI * 523.25 * relT) * 0.45 +
          Math.sin(2 * Math.PI * 1046.5 * relT) * 0.35 +
          Math.sin(2 * Math.PI * 1567.98 * relT) * 0.2) *
        env;
    }

    const intVal = Math.max(-32768, Math.min(32767, Math.floor(sample * 26000)));
    buffer[44 + i * 2] = intVal & 0xff;
    buffer[44 + i * 2 + 1] = (intVal >> 8) & 0xff;
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let b64 = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i += 3) {
    const b0 = buffer[i];
    const b1 = i + 1 < len ? buffer[i + 1] : 0;
    const b2 = i + 2 < len ? buffer[i + 2] : 0;
    b64 += chars[b0 >> 2];
    b64 += chars[((b0 & 3) << 4) | (b1 >> 4)];
    b64 += i + 1 < len ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    b64 += i + 2 < len ? chars[b2 & 63] : '=';
  }
  return b64;
}

export class RingtoneService {
  private static instance: RingtoneService;
  private isRinging: boolean = false;
  private nativePlayer: AudioPlayer | null = null;
  private hapticInterval: any = null;
  private loopTimer: any = null;
  private webAudioContext: any = null;
  private cachedRingtoneUri: string | null = null;

  private constructor() {}

  public static getInstance(): RingtoneService {
    if (!RingtoneService.instance) {
      RingtoneService.instance = new RingtoneService();
    }
    return RingtoneService.instance;
  }

  /**
   * Starts playing a realistic repeating telephone ringtone and haptic pulses.
   */
  public async start(): Promise<void> {
    if (this.isRinging) return;
    this.isRinging = true;

    // Start repeating haptic pulses
    this.startHaptics();

    // 1. Web Platform (Web Audio API Synthesizer)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.playWebRingtoneLoop();
      return;
    }

    // 2. Native Mobile Platform (iOS / Android via expo-audio)
    await this.playNativeRingtoneLoop();
  }

  /**
   * Stops the ringtone, releases audio players, and cancels vibration intervals.
   */
  public async stop(): Promise<void> {
    this.isRinging = false;

    if (this.hapticInterval) {
      clearInterval(this.hapticInterval);
      this.hapticInterval = null;
    }

    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }

    // Stop Native audio player
    if (this.nativePlayer) {
      try {
        this.nativePlayer.pause();
        this.nativePlayer.release?.();
        this.nativePlayer.remove?.();
      } catch {}
      this.nativePlayer = null;
    }

    // Stop Web audio context
    if (this.webAudioContext) {
      try {
        this.webAudioContext.close();
      } catch {}
      this.webAudioContext = null;
    }
  }

  private startHaptics(): void {
    if (this.hapticInterval) clearInterval(this.hapticInterval);
    const triggerHaptic = () => {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    };
    triggerHaptic();
    this.hapticInterval = setInterval(() => {
      if (!this.isRinging) return;
      triggerHaptic();
    }, 1200);
  }

  private async playNativeRingtoneLoop(): Promise<void> {
    try {
      // Disengage recording to allow maximum physical speaker loudness
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
      }).catch(() => {});

      if (!this.cachedRingtoneUri) {
        const base64 = generateTelephoneRingtoneBase64();
        const path = `${FileSystem.cacheDirectory || ''}healthfreak_ringtone.wav`;
        await FileSystem.writeAsStringAsync(path, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        this.cachedRingtoneUri = path;
      }

      if (!this.isRinging) return;

      const player = createAudioPlayer(this.cachedRingtoneUri);
      this.nativePlayer = player;
      player.loop = true;

      // In case loop property is not supported on certain Android versions, trigger manual repeat
      player.addListener('playbackStatusUpdate', (status: any) => {
        if (status.didJustFinish && this.isRinging) {
          player.seekTo(0).then(() => player.play()).catch(() => {});
        }
      });

      player.play();
    } catch (err) {
      console.warn('[RingtoneService] Native ringtone error:', err);
    }
  }

  private playWebRingtoneLoop(): void {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.webAudioContext = new AudioCtx();

      const playBurst = (freq1: number, freq2: number, durationSec: number, delaySec: number) => {
        if (!this.webAudioContext || !this.isRinging) return;
        const now = this.webAudioContext.currentTime + delaySec;

        const osc1 = this.webAudioContext.createOscillator();
        const osc2 = this.webAudioContext.createOscillator();
        const gainNode = this.webAudioContext.createGain();

        osc1.frequency.setValueAtTime(freq1, now);
        osc2.frequency.setValueAtTime(freq2, now);

        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.exponentialRampToValueAtTime(0.35, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.webAudioContext.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + durationSec);
        osc2.stop(now + durationSec);
      };

      const runLoop = () => {
        if (!this.isRinging || !this.webAudioContext) return;
        // Burst 1: 440Hz + 880Hz
        playBurst(440, 880, 0.4, 0);
        // Burst 2: 523Hz + 1046Hz
        playBurst(523.25, 1046.5, 0.55, 0.55);

        this.loopTimer = setTimeout(runLoop, 2400);
      };

      runLoop();
    } catch (err) {
      console.warn('[RingtoneService] Web ringtone error:', err);
    }
  }
}

export const ringtoneService = RingtoneService.getInstance();
