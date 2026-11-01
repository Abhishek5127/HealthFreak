import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { SupportedStorage } from '@supabase/supabase-js';

/**
 * Custom Storage Adapter for Supabase Auth in Expo React Native.
 * Uses expo-secure-store for native platforms (iOS/Android) and
 * falls back gracefully to localStorage or in-memory storage for web.
 */
class ExpoSecureStoreAdapter implements SupportedStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (err: any) {
      console.warn(`[SecureStoreAdapter] Failed to read key "${key}":`, err?.message);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (err: any) {
      console.warn(`[SecureStoreAdapter] Failed to save key "${key}":`, err?.message);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (err: any) {
      console.warn(`[SecureStoreAdapter] Failed to delete key "${key}":`, err?.message);
    }
  }
}

export const expoSecureStoreAdapter = new ExpoSecureStoreAdapter();

