import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { AICallService } from './aiCallService';

// Configure foreground notification behavior for Expo SDK 58
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private static isInitialized = false;

  /**
   * Registers Android notification channels and permissions.
   */
  public static async init(userId = ''): Promise<string | null> {
    if (this.isInitialized) return null;
    this.isInitialized = true;

    try {
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('incoming-calls', {
            name: 'HealthFreak AI Calls',
            importance: AndroidImportance.MAX,
            vibrationPattern: [0, 500, 500, 500],
            lightColor: '#4AB87A',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
          });
        } catch {
          // Expo Go on Android doesn't support custom remote channels; local in-app alerts handle calls seamlessly
        }
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[NotificationService] Push notification permissions not granted.');
        return null;
      }

      // Web platform doesn't need Expo Push Token
      if (Platform.OS === 'web') {
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;
      console.log('[NotificationService] Registered device push token:', token);

      // Register on the backend
      await AICallService.registerPushToken(userId, token);
      return token;
    } catch (err: any) {
      console.warn('[NotificationService] Failed to initialize push notifications:', err.message);
      return null;
    }
  }

  /**
   * Subscribes to notification taps to launch incoming call screen.
   */
  public static listenForIncomingCalls(onIncomingCall: (callData: { callId: string; roomName: string }) => void) {
    // 1. Notification arrived while app is foreground
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as any;
      if (data && data.type === 'incoming_ai_call' && data.callId) {
        onIncomingCall({
          callId: String(data.callId),
          roomName: String(data.roomName || ''),
        });
      }
    });

    // 2. User tapped on notification banner
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data && data.type === 'incoming_ai_call' && data.callId) {
        onIncomingCall({
          callId: String(data.callId),
          roomName: String(data.roomName || ''),
        });
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }
}
