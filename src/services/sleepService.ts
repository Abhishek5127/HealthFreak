import { expoSecureStoreAdapter } from './auth/secureStorageAdapter';

export interface SleepSession {
  isSleeping: boolean;
  bedtimeIso: string | null;
  wakeTimeIso: string | null;
  durationMinutes: number;
  recoveryScore: number;
  qualityLabel: string;
}

const STORAGE_KEY = 'HEALTHFREAK_SLEEP_SESSION_V1';

export class SleepService {
  private static instance: SleepService;

  private state: SleepSession = {
    isSleeping: false,
    bedtimeIso: null,
    wakeTimeIso: null,
    durationMinutes: 0,
    recoveryScore: 0,
    qualityLabel: 'No sleep logged yet',
  };

  private listeners: Set<(session: SleepSession) => void> = new Set();
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): SleepService {
    if (!SleepService.instance) {
      SleepService.instance = new SleepService();
    }
    return SleepService.instance;
  }

  public getState(): SleepSession {
    return { ...this.state };
  }

  public subscribe(listener: (session: SleepSession) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const s = this.getState();
    this.listeners.forEach((l) => {
      try {
        l(s);
      } catch (e) {
        console.warn('[SleepService] listener error:', e);
      }
    });
  }

  public async initialize(): Promise<SleepSession> {
    if (this.isInitialized) return this.getState();
    this.isInitialized = true;

    try {
      const raw = await expoSecureStoreAdapter.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          this.state = parsed;
        }
      }
    } catch (e) {
      console.warn('[SleepService] error loading sleep session:', e);
    }
    this.notify();
    return this.getState();
  }

  public async startSleep(): Promise<SleepSession> {
    const nowIso = new Date().toISOString();
    this.state = {
      ...this.state,
      isSleeping: true,
      bedtimeIso: nowIso,
      wakeTimeIso: null,
      qualityLabel: 'Sleeping...',
    };
    await this.persist();
    this.notify();
    return this.getState();
  }

  public async wakeUp(): Promise<{ session: SleepSession; summaryText: string }> {
    const now = new Date();
    const wakeTimeIso = now.toISOString();
    const bedtime = this.state.bedtimeIso
      ? new Date(this.state.bedtimeIso)
      : new Date(now.getTime() - 8 * 3600 * 1000);

    const diffMinutes = Math.max(1, Math.round((now.getTime() - bedtime.getTime()) / (1000 * 60)));

    let recoveryScore = 50;
    let qualityLabel = 'Short Sleep';

    if (diffMinutes >= 480) {
      // 8+ hours
      recoveryScore = Math.min(100, Math.round(92 + Math.min(8, (diffMinutes - 480) / 15)));
      qualityLabel = 'Optimal Deep Recovery';
    } else if (diffMinutes >= 420) {
      // 7-8 hours
      recoveryScore = Math.round(85 + ((diffMinutes - 420) / 60) * 7);
      qualityLabel = 'Restored Balance';
    } else if (diffMinutes >= 360) {
      // 6-7 hours
      recoveryScore = Math.round(75 + ((diffMinutes - 360) / 60) * 10);
      qualityLabel = 'Moderate Rest';
    } else if (diffMinutes >= 300) {
      // 5-6 hours
      recoveryScore = Math.round(60 + ((diffMinutes - 300) / 60) * 15);
      qualityLabel = 'Light Sleep';
    } else {
      recoveryScore = Math.max(30, Math.round((diffMinutes / 300) * 60));
      qualityLabel = 'Minimal Rest';
    }

    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const summaryText = `${hours}h ${mins}m (${recoveryScore}% recovery)`;

    this.state = {
      isSleeping: false,
      bedtimeIso: bedtime.toISOString(),
      wakeTimeIso,
      durationMinutes: diffMinutes,
      recoveryScore,
      qualityLabel,
    };

    await this.persist();
    this.notify();
    return { session: this.getState(), summaryText };
  }

  private async persist(): Promise<void> {
    try {
      await expoSecureStoreAdapter.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('[SleepService] error saving sleep session:', e);
    }
  }
}

export const sleepService = SleepService.getInstance();

