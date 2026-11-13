import { AppState, AppStateStatus } from 'react-native';
import { expoSecureStoreAdapter } from './auth/secureStorageAdapter';

export interface SleepSession {
  isSleeping: boolean;
  bedtimeIso: string | null;
  wakeTimeIso: string | null;
  durationMinutes: number;
  recoveryScore: number;
  qualityLabel: string;
  deepSleepMinutes: number;
  remSleepMinutes: number;
  lightSleepMinutes: number;
}

export interface SleepHistoryItem {
  id: string;
  date: string; // YYYY-MM-DD
  dayLabel: string; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
  bedtimeIso: string;
  wakeTimeIso: string;
  durationMinutes: number;
  recoveryScore: number;
  qualityLabel: string;
  deepSleepMinutes: number;
  remSleepMinutes: number;
  lightSleepMinutes: number;
  source: 'manual' | 'auto_inactivity' | 'historical';
}

export interface AutoSleepPrompt {
  id: string;
  bedtimeIso: string;
  wakeTimeIso: string;
  bedtimeFormatted: string; // "10:30 PM"
  wakeTimeFormatted: string; // "7:00 AM"
  durationMinutes: number;
  durationFormatted: string; // "8h 30m"
  estimatedRecoveryScore: number;
}

export interface SleepState {
  currentSession: SleepSession;
  history: SleepHistoryItem[];
  autoSleepPrompt: AutoSleepPrompt | null;
}

const STORAGE_SESSION_KEY = 'HEALTHFREAK_SLEEP_SESSION_V2';
const STORAGE_HISTORY_KEY = 'HEALTHFREAK_SLEEP_HISTORY_V2';
const STORAGE_LAST_ACTIVE_KEY = 'HEALTHFREAK_LAST_ACTIVE_TIMESTAMP';
const STORAGE_PROMPT_DISMISSED_KEY = 'HEALTHFREAK_PROMPT_DISMISSED_DATE';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export class SleepService {
  private static instance: SleepService;

  private state: SleepState = {
    currentSession: {
      isSleeping: false,
      bedtimeIso: null,
      wakeTimeIso: null,
      durationMinutes: 0,
      recoveryScore: 0,
      qualityLabel: 'No sleep logged',
      deepSleepMinutes: 0,
      remSleepMinutes: 0,
      lightSleepMinutes: 0,
    },
    history: [],
    autoSleepPrompt: null,
  };

  private listeners: Set<(state: SleepState) => void> = new Set();
  private isInitialized: boolean = false;
  private appStateSubscription: any = null;

  private constructor() {
    this.state.history = [];
  }

  public static getInstance(): SleepService {
    if (!SleepService.instance) {
      SleepService.instance = new SleepService();
    }
    return SleepService.instance;
  }

  public getState(): SleepState {
    return {
      currentSession: { ...this.state.currentSession },
      history: this.getWeeklySleepData(),
      autoSleepPrompt: this.state.autoSleepPrompt ? { ...this.state.autoSleepPrompt } : null,
    };
  }

  public getSession(): SleepSession {
    return { ...this.state.currentSession };
  }

  public getHistory(): SleepHistoryItem[] {
    return this.getWeeklySleepData();
  }

  public getAutoSleepPrompt(): AutoSleepPrompt | null {
    return this.state.autoSleepPrompt ? { ...this.state.autoSleepPrompt } : null;
  }

  public subscribe(listener: (state: SleepState) => void): () => void {
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

  public async initialize(): Promise<SleepState> {
    if (this.isInitialized) return this.getState();
    this.isInitialized = true;

    try {
      // 1. Load session
      const rawSession = await expoSecureStoreAdapter.getItem(STORAGE_SESSION_KEY);
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (parsed) {
          // If stored session is the old demo 460m (7h 40m) and not currently sleeping, reset to 0
          if (parsed.durationMinutes === 460 && !parsed.isSleeping) {
            this.state.currentSession = {
              isSleeping: false,
              bedtimeIso: null,
              wakeTimeIso: null,
              durationMinutes: 0,
              recoveryScore: 0,
              qualityLabel: 'No sleep logged',
              deepSleepMinutes: 0,
              remSleepMinutes: 0,
              lightSleepMinutes: 0,
            };
          } else {
            this.state.currentSession = {
              ...this.state.currentSession,
              ...parsed,
            };
          }
        }
      }

      // 2. Load history (Strictly real data only, discard dummy entries)
      const rawHistory = await expoSecureStoreAdapter.getItem(STORAGE_HISTORY_KEY);
      if (rawHistory) {
        const parsedHist = JSON.parse(rawHistory);
        if (Array.isArray(parsedHist) && parsedHist.length > 0) {
          this.state.history = parsedHist.filter(
            (item: SleepHistoryItem) =>
              item.source !== 'historical' && !item.id?.startsWith('hist_sleep_')
          );
        }
      }
      await this.persist();

      // 3. Setup app state listener for inactivity tracking
      this.setupAppStateListener();

      // 4. Check for inactivity auto-detection (7-8 hours gap)
      await this.checkForInactivitySleep();
    } catch (e) {
      console.warn('[SleepService] error initializing sleep service:', e);
    }

    this.notify();
    return this.getState();
  }

  /**
   * Monitor app background/foreground transitions to track inactivity
   */
  private setupAppStateListener(): void {
    if (this.appStateSubscription) return;

    this.appStateSubscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      const now = Date.now();
      if (nextState === 'background' || nextState === 'inactive') {
        try {
          await expoSecureStoreAdapter.setItem(STORAGE_LAST_ACTIVE_KEY, now.toString());
        } catch {}
      } else if (nextState === 'active') {
        await this.checkForInactivitySleep();
        try {
          await expoSecureStoreAdapter.setItem(STORAGE_LAST_ACTIVE_KEY, now.toString());
        } catch {}
      }
    });
  }

  /**
   * Check if user was inactive for 7-8+ hours overnight and prompt
   * "Did you sleep from 9PM to 7AM"
   */
  public async checkForInactivitySleep(): Promise<void> {
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // Check if already dismissed today
      const dismissedDate = await expoSecureStoreAdapter.getItem(STORAGE_PROMPT_DISMISSED_KEY);
      if (dismissedDate === todayStr) {
        return;
      }

      // Check if user is actively in manual sleep mode
      if (this.state.currentSession.isSleeping) {
        return;
      }

      // Check last active timestamp
      const lastActiveRaw = await expoSecureStoreAdapter.getItem(STORAGE_LAST_ACTIVE_KEY);

      if (!lastActiveRaw) {
        // First run or no prior inactivity saved: record current timestamp and DO NOT show prompt
        await expoSecureStoreAdapter.setItem(STORAGE_LAST_ACTIVE_KEY, now.getTime().toString());
        this.state.autoSleepPrompt = null;
        return;
      }

      const lastActiveTime = parseInt(lastActiveRaw, 10);
      const gapMs = now.getTime() - lastActiveTime;
      const gapMinutes = Math.round(gapMs / (1000 * 60));

      // Strictly require 7 to 14 hours (420 to 840 mins) of inactivity
      if (gapMinutes < 420 || gapMinutes > 840) {
        this.state.autoSleepPrompt = null;
        return;
      }

      const bedtime = new Date(lastActiveTime);
      const wakeTime = now;
      const durationMinutes = gapMinutes;

      const bedtimeFormatted = this.formatTime12(bedtime);
      const wakeTimeFormatted = this.formatTime12(wakeTime);
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      const durationFormatted = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;

      const score = this.calculateRecoveryScore(durationMinutes);

      this.state.autoSleepPrompt = {
        id: `prompt_${Date.now()}`,
        bedtimeIso: bedtime.toISOString(),
        wakeTimeIso: wakeTime.toISOString(),
        bedtimeFormatted,
        wakeTimeFormatted,
        durationMinutes,
        durationFormatted,
        estimatedRecoveryScore: score.recoveryScore,
      };

      this.notify();
    } catch (err) {
      console.warn('[SleepService] checkForInactivitySleep error:', err);
    }
  }

  /**
   * User confirms the auto-detected sleep prompt: "Did you sleep from 9PM to 7AM?" -> Yes
   */
  public async confirmAutoSleep(): Promise<SleepSession> {
    const prompt = this.state.autoSleepPrompt;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const bedtimeIso = prompt?.bedtimeIso || new Date(now.getTime() - 8.5 * 3600 * 1000).toISOString();
    const wakeTimeIso = prompt?.wakeTimeIso || now.toISOString();
    const durationMinutes = prompt?.durationMinutes || 510;

    const { recoveryScore, qualityLabel } = this.calculateRecoveryScore(durationMinutes);

    const deepSleepMinutes = Math.round(durationMinutes * 0.24);
    const remSleepMinutes = Math.round(durationMinutes * 0.22);
    const lightSleepMinutes = durationMinutes - deepSleepMinutes - remSleepMinutes;

    const newSession: SleepSession = {
      isSleeping: false,
      bedtimeIso,
      wakeTimeIso,
      durationMinutes,
      recoveryScore,
      qualityLabel,
      deepSleepMinutes,
      remSleepMinutes,
      lightSleepMinutes,
    };

    this.state.currentSession = newSession;

    // Add to 7-day history for today
    this.addOrUpdateTodayHistory({
      id: `sleep_${Date.now()}`,
      date: todayStr,
      dayLabel: DAY_NAMES[now.getDay()],
      bedtimeIso,
      wakeTimeIso,
      durationMinutes,
      recoveryScore,
      qualityLabel,
      deepSleepMinutes,
      remSleepMinutes,
      lightSleepMinutes,
      source: 'auto_inactivity',
    });

    this.state.autoSleepPrompt = null;
    await expoSecureStoreAdapter.setItem(STORAGE_PROMPT_DISMISSED_KEY, todayStr);
    await this.persist();
    this.notify();
    return newSession;
  }

  /**
   * User dismisses auto-detected sleep prompt
   */
  public async dismissAutoSleep(): Promise<void> {
    const todayStr = new Date().toISOString().split('T')[0];
    this.state.autoSleepPrompt = null;
    await expoSecureStoreAdapter.setItem(STORAGE_PROMPT_DISMISSED_KEY, todayStr);
    this.notify();
  }

  /**
   * Manual bedtime tap: "Going to Bed"
   */
  public async startSleep(): Promise<SleepSession> {
    const nowIso = new Date().toISOString();
    this.state.currentSession = {
      ...this.state.currentSession,
      isSleeping: true,
      bedtimeIso: nowIso,
      wakeTimeIso: null,
      durationMinutes: 0,
      recoveryScore: 0,
      qualityLabel: 'Sleeping...',
    };
    await this.persist();
    this.notify();
    return this.state.currentSession;
  }

  /**
   * Manual wake-up tap: "I Woke Up"
   */
  public async wakeUp(): Promise<{ session: SleepSession; summaryText: string }> {
    const now = new Date();
    const wakeTimeIso = now.toISOString();
    const bedtime = this.state.currentSession.bedtimeIso
      ? new Date(this.state.currentSession.bedtimeIso)
      : new Date(now.getTime() - 8 * 3600 * 1000);

    const diffMinutes = Math.max(1, Math.round((now.getTime() - bedtime.getTime()) / (1000 * 60)));
    const { recoveryScore, qualityLabel } = this.calculateRecoveryScore(diffMinutes);

    const deepSleepMinutes = Math.round(diffMinutes * 0.25);
    const remSleepMinutes = Math.round(diffMinutes * 0.22);
    const lightSleepMinutes = Math.max(0, diffMinutes - deepSleepMinutes - remSleepMinutes);

    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const summaryText = hours > 0 ? `${hours}h ${mins}m (${recoveryScore}% recovery)` : `${mins}m (${recoveryScore}% recovery)`;

    const updatedSession: SleepSession = {
      isSleeping: false,
      bedtimeIso: bedtime.toISOString(),
      wakeTimeIso,
      durationMinutes: diffMinutes,
      recoveryScore,
      qualityLabel,
      deepSleepMinutes,
      remSleepMinutes,
      lightSleepMinutes,
    };

    this.state.currentSession = updatedSession;

    // Add to 7-day history
    const todayStr = now.toISOString().split('T')[0];
    this.addOrUpdateTodayHistory({
      id: `sleep_${Date.now()}`,
      date: todayStr,
      dayLabel: DAY_NAMES[now.getDay()],
      bedtimeIso: bedtime.toISOString(),
      wakeTimeIso,
      durationMinutes: diffMinutes,
      recoveryScore,
      qualityLabel,
      deepSleepMinutes,
      remSleepMinutes,
      lightSleepMinutes,
      source: 'manual',
    });

    await this.persist();
    this.notify();
    return { session: updatedSession, summaryText };
  }

  private addOrUpdateTodayHistory(item: SleepHistoryItem): void {
    const history = this.state.history.filter(
      (h) => h.source !== 'historical' && !h.id.startsWith('hist_sleep_')
    );
    const existingIdx = history.findIndex((h) => h.date === item.date);

    if (existingIdx >= 0) {
      history[existingIdx] = item;
    } else {
      history.push(item);
    }

    history.sort((a, b) => a.date.localeCompare(b.date));
    // Rolling 7-day FIFO window: keeps the latest 7 entries, drops older than 7 days
    this.state.history = history.slice(-7);
  }

  /**
   * Returns a rolling 7-day window ending today (FIFO):
   * Day 1 (today - 6 days) to Day 7 (today).
   * When day 8 arrives, it becomes Day 7, Day 7 becomes Day 6, Day 2 becomes Day 1, and Day 1 is removed.
   */
  public getWeeklySleepData(): SleepHistoryItem[] {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 6);

    const historyMap: Record<string, SleepHistoryItem> = {};
    this.state.history.forEach((h) => {
      if (h.source !== 'historical' && !h.id.startsWith('hist_sleep_')) {
        historyMap[h.date] = h;
      }
    });

    const todayDateStr = now.toISOString().split('T')[0];
    const weeklyItems: SleepHistoryItem[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yr}-${mo}-${da}`;
      const dayLabel = DAY_NAMES[d.getDay()];

      if (dateKey === todayDateStr && this.state.currentSession.durationMinutes > 0) {
        weeklyItems.push({
          id: `sleep_today_${dateKey}`,
          date: dateKey,
          dayLabel,
          bedtimeIso: this.state.currentSession.bedtimeIso || '',
          wakeTimeIso: this.state.currentSession.wakeTimeIso || '',
          durationMinutes: this.state.currentSession.durationMinutes,
          recoveryScore: this.state.currentSession.recoveryScore,
          qualityLabel: this.state.currentSession.qualityLabel,
          deepSleepMinutes: this.state.currentSession.deepSleepMinutes,
          remSleepMinutes: this.state.currentSession.remSleepMinutes,
          lightSleepMinutes: this.state.currentSession.lightSleepMinutes,
          source: 'manual',
        });
      } else if (historyMap[dateKey]) {
        weeklyItems.push(historyMap[dateKey]);
      } else {
        weeklyItems.push({
          id: `empty_${dateKey}`,
          date: dateKey,
          dayLabel,
          bedtimeIso: '',
          wakeTimeIso: '',
          durationMinutes: 0,
          recoveryScore: 0,
          qualityLabel: 'No sleep logged',
          deepSleepMinutes: 0,
          remSleepMinutes: 0,
          lightSleepMinutes: 0,
          source: 'manual',
        });
      }
    }

    return weeklyItems;
  }

  private calculateRecoveryScore(minutes: number): { recoveryScore: number; qualityLabel: string } {
    if (minutes >= 480) {
      // 8+ hours
      const score = Math.min(100, Math.round(92 + Math.min(7, (minutes - 480) / 15)));
      return { recoveryScore: score, qualityLabel: 'Optimal Deep Recovery' };
    } else if (minutes >= 420) {
      // 7-8 hours
      const score = Math.round(84 + ((minutes - 420) / 60) * 8);
      return { recoveryScore: score, qualityLabel: 'Restored Balance' };
    } else if (minutes >= 360) {
      // 6-7 hours
      const score = Math.round(72 + ((minutes - 360) / 60) * 12);
      return { recoveryScore: score, qualityLabel: 'Moderate Rest' };
    } else if (minutes >= 300) {
      // 5-6 hours
      const score = Math.round(58 + ((minutes - 300) / 60) * 14);
      return { recoveryScore: score, qualityLabel: 'Light Sleep' };
    } else {
      const score = Math.max(30, Math.round((minutes / 300) * 58));
      return { recoveryScore: score, qualityLabel: 'Minimal Rest' };
    }
  }

  private formatTime12(d: Date): string {
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minStr = minutes < 10 ? `0${minutes}` : minutes;
    return `${hours}:${minStr} ${ampm}`;
  }

  private async persist(): Promise<void> {
    try {
      await expoSecureStoreAdapter.setItem(STORAGE_SESSION_KEY, JSON.stringify(this.state.currentSession));
      await expoSecureStoreAdapter.setItem(STORAGE_HISTORY_KEY, JSON.stringify(this.state.history));
    } catch (e) {
      console.warn('[SleepService] error saving sleep state:', e);
    }
  }
}

export const sleepService = SleepService.getInstance();
