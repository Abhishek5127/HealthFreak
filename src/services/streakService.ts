import { expoSecureStoreAdapter } from './auth/secureStorageAdapter';

export interface StreakState {
  streakDays: number;
  lastCompletedDate: string | null; // 'YYYY-MM-DD'
  lastActiveDate: string; // 'YYYY-MM-DD'
}

const STORAGE_KEY = 'HEALTHFREAK_DAILY_STREAK_V1';

export function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayKey(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class StreakService {
  private static instance: StreakService;

  private state: StreakState = {
    streakDays: 0,
    lastCompletedDate: null,
    lastActiveDate: getTodayKey(),
  };

  private listeners: Set<(streak: number) => void> = new Set();
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): StreakService {
    if (!StreakService.instance) {
      StreakService.instance = new StreakService();
    }
    return StreakService.instance;
  }

  public getState(): StreakState {
    return { ...this.state };
  }

  public subscribe(listener: (streak: number) => void): () => void {
    this.listeners.add(listener);
    listener(this.state.streakDays);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      try {
        l(this.state.streakDays);
      } catch (e) {
        console.warn('[StreakService] listener error:', e);
      }
    });
  }

  /**
   * Initializes and validates streak.
   * If user missed yesterday, streak automatically resets to 0.
   */
  public async initialize(): Promise<number> {
    if (this.isInitialized) return this.state.streakDays;
    this.isInitialized = true;

    try {
      const raw = await expoSecureStoreAdapter.getItem(STORAGE_KEY);
      const today = getTodayKey();
      const yesterday = getYesterdayKey();

      if (raw) {
        const parsed: StreakState = JSON.parse(raw);
        if (parsed) {
          this.state = parsed;

          // Check if streak was broken
          if (parsed.lastCompletedDate) {
            if (parsed.lastCompletedDate === today) {
              // Streak already completed today
              this.state.streakDays = parsed.streakDays;
            } else if (parsed.lastCompletedDate === yesterday) {
              // Yesterday completed, alive waiting for today's routine
              this.state.streakDays = parsed.streakDays;
            } else {
              // Missed a day! Reset to zero
              this.state.streakDays = 0;
              this.state.lastCompletedDate = null;
            }
          } else {
            this.state.streakDays = 0;
          }
        }
      } else {
        this.state = {
          streakDays: 0,
          lastCompletedDate: null,
          lastActiveDate: today,
        };
      }

      this.state.lastActiveDate = today;
      await this.persist();
    } catch (e) {
      console.warn('[StreakService] error loading streak:', e);
      this.state.streakDays = 0;
    }

    this.notify();
    return this.state.streakDays;
  }

  /**
   * Updates streak based on whether daily routine tasks are completed.
   */
  public async evaluateTaskCompletion(isCompleted: boolean): Promise<number> {
    const today = getTodayKey();
    const yesterday = getYesterdayKey();

    if (isCompleted) {
      if (this.state.lastCompletedDate !== today) {
        if (this.state.lastCompletedDate === yesterday) {
          // Completed consecutive day!
          this.state.streakDays += 1;
        } else {
          // First day or restart after break
          this.state.streakDays = 1;
        }
        this.state.lastCompletedDate = today;
        await this.persist();
        this.notify();
      }
    } else {
      // If user unmarked today's tasks
      if (this.state.lastCompletedDate === today) {
        this.state.streakDays = Math.max(0, this.state.streakDays - 1);
        this.state.lastCompletedDate = null;
        await this.persist();
        this.notify();
      }
    }

    return this.state.streakDays;
  }

  private async persist(): Promise<void> {
    try {
      await expoSecureStoreAdapter.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('[StreakService] error persisting streak:', e);
    }
  }
}

export const streakService = StreakService.getInstance();

