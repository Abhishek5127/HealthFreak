/**
 * TEMPORARY KEEP-ALIVE SERVICE
 * Pings the backend /health endpoint every 4 minutes while the app is active
 * to prevent the Render free-tier instance from sleeping (cold start avoidance).
 *
 * NOTE: REMOVE THIS SERVICE BEFORE FINAL PRODUCTION / APP STORE PUBLISHING!
 */
import { AppState, AppStateStatus } from 'react-native';
import { getBackendBaseUrl } from './aiChatService';

const PING_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

class KeepAliveService {
  private timer: any = null;
  private isRunning: boolean = false;
  private appStateSubscription: any = null;

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Initial ping on start
    this.pingNow();

    // Periodic ping every 4 minutes
    this.timer = setInterval(() => {
      this.pingNow();
    }, PING_INTERVAL_MS);

    // Watch AppState to immediately wake/ping when app comes to foreground
    this.appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        this.pingNow();
      }
    });

    console.log('[KeepAliveService] Started 4-minute keep-alive ping for Render backend.');
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.isRunning = false;
    console.log('[KeepAliveService] Stopped keep-alive service.');
  }

  public async pingNow(): Promise<void> {
    try {
      const baseUrl = getBackendBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        console.log(`[KeepAliveService] Keep-alive ping succeeded (${baseUrl}/health)`);
      }
    } catch {
      // Ignored: silent background keep-alive
    }
  }
}

export const keepAliveService = new KeepAliveService();

