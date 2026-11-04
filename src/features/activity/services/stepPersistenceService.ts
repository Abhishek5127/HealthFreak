import { expoSecureStoreAdapter } from '../../../services/auth/secureStorageAdapter';
import { StepSummary, PedometerTrackingSession } from '../types/pedometer.types';
import { getLocalDateString, getPastDates } from '../utils/stepDateUtils';

const KEYS = {
  STEP_GOAL: 'HEALTHFREAK_STEP_GOAL',
  CURRENT_SESSION: 'HEALTHFREAK_STEP_CURRENT_SESSION',
  HISTORY: 'HEALTHFREAK_STEP_HISTORY',
  PENDING_SYNCS: 'HEALTHFREAK_STEP_PENDING_SYNCS',
};

const DEFAULT_STEP_GOAL = 10000;

export class StepPersistenceService {
  /**
   * Retrieves the configured daily step goal. Defaults to 10,000 steps.
   */
  public static async getStepGoal(): Promise<number> {
    try {
      const raw = await expoSecureStoreAdapter.getItem(KEYS.STEP_GOAL);
      if (raw) {
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch (err) {
      console.warn('[StepPersistence] Failed to read step goal:', err);
    }
    return DEFAULT_STEP_GOAL;
  }

  /**
   * Persists a new daily step goal.
   */
  public static async setStepGoal(goal: number): Promise<void> {
    try {
      await expoSecureStoreAdapter.setItem(KEYS.STEP_GOAL, goal.toString());
    } catch (err) {
      console.warn('[StepPersistence] Failed to save step goal:', err);
    }
  }

  /**
   * Loads the current tracking session.
   * If stored date is prior to today (midnight rollover), seals previous day and resets today.
   */
  public static async getOrCreateTodaySession(): Promise<PedometerTrackingSession> {
    const today = getLocalDateString();
    try {
      const raw = await expoSecureStoreAdapter.getItem(KEYS.CURRENT_SESSION);
      if (raw) {
        const session: PedometerTrackingSession = JSON.parse(raw);
        if (session.date === today) {
          return session;
        }

        // Midnight Rollover detected: finalize yesterday's record
        const yesterdayTotal = (session.accumulatedSteps || 0) + (session.sessionSteps || 0);
        if (yesterdayTotal > 0) {
          const goal = await this.getStepGoal();
          await this.saveDailySummary({
            date: session.date,
            steps: yesterdayTotal,
            stepGoal: goal,
            distanceMeters: Math.round(yesterdayTotal * 0.74),
            caloriesBurned: Math.round(yesterdayTotal * 70 * 0.0005),
            activeMinutes: Math.max(1, Math.round(yesterdayTotal / 105)),
            source: 'device',
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.warn('[StepPersistence] Error loading tracking session:', err);
    }

    // Initialize fresh session for today
    const newSession: PedometerTrackingSession = {
      date: today,
      accumulatedSteps: 0,
      sessionSteps: 0,
      lastUpdated: new Date().toISOString(),
    };
    await this.saveCurrentSession(newSession);
    return newSession;
  }

  /**
   * Saves the current tracking session state.
   */
  public static async saveCurrentSession(session: PedometerTrackingSession): Promise<void> {
    try {
      await expoSecureStoreAdapter.setItem(KEYS.CURRENT_SESSION, JSON.stringify(session));
    } catch (err) {
      console.warn('[StepPersistence] Error saving tracking session:', err);
    }
  }

  /**
   * Returns a specific date's summary from history.
   */
  public static async getDailySummary(dateStr: string): Promise<StepSummary | null> {
    try {
      const history = await this.getAllHistory();
      return history[dateStr] || null;
    } catch {
      return null;
    }
  }

  /**
   * Saves or updates a daily summary in persistent local history.
   */
  public static async saveDailySummary(summary: StepSummary): Promise<void> {
    try {
      const history = await this.getAllHistory();
      const existing = history[summary.date];

      // Safe update: don't overwrite with lower steps unless explicit manual sync
      if (existing && existing.steps > summary.steps && summary.source === 'device') {
        summary.steps = existing.steps;
      }

      history[summary.date] = summary;

      // Keep maximum 30 days in local history
      const sortedKeys = Object.keys(history).sort();
      if (sortedKeys.length > 30) {
        const toRemove = sortedKeys.slice(0, sortedKeys.length - 30);
        toRemove.forEach((k) => delete history[k]);
      }

      await expoSecureStoreAdapter.setItem(KEYS.HISTORY, JSON.stringify(history));

      // Also queue for offline cloud sync
      await this.queuePendingSync(summary);
    } catch (err) {
      console.warn('[StepPersistence] Error saving daily summary:', err);
    }
  }

  /**
   * Retrieves past N days of history in chronological order.
   */
  public static async getRecentHistory(daysCount: number = 7): Promise<StepSummary[]> {
    const dates = getPastDates(daysCount);
    const history = await this.getAllHistory();
    const goal = await this.getStepGoal();

    return dates.map((dateStr) => {
      if (history[dateStr]) {
        return history[dateStr];
      }
      return {
        date: dateStr,
        steps: 0,
        stepGoal: goal,
        distanceMeters: 0,
        caloriesBurned: 0,
        activeMinutes: 0,
        source: 'device',
        updatedAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Internal helper to load entire history map.
   */
  private static async getAllHistory(): Promise<Record<string, StepSummary>> {
    try {
      const raw = await expoSecureStoreAdapter.getItem(KEYS.HISTORY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[StepPersistence] Error parsing history:', err);
    }
    return {};
  }

  /**
   * Queues an activity summary for offline cloud synchronization.
   */
  public static async queuePendingSync(summary: StepSummary): Promise<void> {
    try {
      const pending = await this.getPendingSyncs();
      const idx = pending.findIndex((p) => p.date === summary.date);
      if (idx >= 0) {
        pending[idx] = summary;
      } else {
        pending.push(summary);
      }
      await expoSecureStoreAdapter.setItem(KEYS.PENDING_SYNCS, JSON.stringify(pending));
    } catch (err) {
      console.warn('[StepPersistence] Failed to queue pending sync:', err);
    }
  }

  /**
   * Retrieves pending activity summaries awaiting synchronization.
   */
  public static async getPendingSyncs(): Promise<StepSummary[]> {
    try {
      const raw = await expoSecureStoreAdapter.getItem(KEYS.PENDING_SYNCS);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }

  /**
   * Removes successfully synchronized dates from the pending queue.
   */
  public static async markSynced(syncedDates: string[]): Promise<void> {
    try {
      const pending = await this.getPendingSyncs();
      const remaining = pending.filter((p) => !syncedDates.includes(p.date));
      await expoSecureStoreAdapter.setItem(KEYS.PENDING_SYNCS, JSON.stringify(remaining));
    } catch (err) {
      console.warn('[StepPersistence] Failed to clear synced items:', err);
    }
  }
}

