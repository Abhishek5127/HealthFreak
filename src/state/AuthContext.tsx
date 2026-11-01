import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import {
  signInWithGoogle as initiateGoogleSignIn,
  processOAuthCallbackUrl,
  signOutFromSupabase,
} from '../services/auth/googleAuth';
import { UserProfile } from '../types';
import { voiceClient } from '../services/voiceClient';

export type AuthState =
  | 'initializing'
  | 'logged_out'
  | 'authenticating'
  | 'authenticated'
  | 'session_refreshing'
  | 'error';

interface AuthContextType {
  authState: AuthState;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  error: string | null;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string; cancelled?: boolean }>;
  signInAsDemoUser: () => void;
  signOut: () => Promise<void>;
  clearError: () => void;
  updateProfileState: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getBackendUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:3001`;
  }
  return process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>('initializing');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Guard against duplicate concurrent OAuth requests
  const isAuthenticatingRef = useRef<boolean>(false);

  /**
   * Syncs user profile with the backend / database idempotently
   */
  const syncProfileWithBackend = useCallback(async (currentSession: Session): Promise<UserProfile | null> => {
    try {
      const token = currentSession.access_token;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(`${getBackendUrl()}/api/auth/sync-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: currentSession.user?.user_metadata?.full_name || currentSession.user?.email?.split('@')[0],
          email: currentSession.user?.email,
          avatarUrl: currentSession.user?.user_metadata?.avatar_url || currentSession.user?.user_metadata?.picture,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.profile) {
          const synced: UserProfile = {
            id: json.profile.id,
            name: json.profile.name,
            email: json.profile.email,
            avatarUrl: json.profile.avatarUrl,
            streakDays: 21,
            selectedGoal: 'metabolic_fitness',
            goalLabel: 'Metabolic Fitness & Energy',
            language: 'Hinglish',
            onboardingCompleted: Boolean(json.profile.onboardingCompleted),
            currentMood: 'balanced',
            healthConditions: ['sedentary_desk_job'],
            authProvider: 'google',
          };
          return synced;
        }
      }
    } catch (err: any) {
      console.warn('[AuthContext] Backend profile sync failed or timed out, falling back to session metadata:', err.message);
    }

    // Local fallback profile based on Google OAuth metadata
    const fallbackProfile: UserProfile = {
      id: currentSession.user.id,
      name:
        currentSession.user.user_metadata?.full_name ||
        currentSession.user.email?.split('@')[0] ||
        'Disha Member',
      email: currentSession.user.email,
      avatarUrl:
        currentSession.user.user_metadata?.avatar_url ||
        currentSession.user.user_metadata?.picture,
      streakDays: 21,
      selectedGoal: 'metabolic_fitness',
      goalLabel: 'Metabolic Fitness & Energy',
      language: 'Hinglish',
      onboardingCompleted: false,
      currentMood: 'balanced',
      healthConditions: [],
      authProvider: 'google',
    };
    return fallbackProfile;
  }, []);

  /**
   * Central session handler — unlocks UI immediately, syncs profile concurrently
   */
  const handleSessionEstablished = useCallback(
    async (newSession: Session) => {
      setSession(newSession);
      setUser(newSession.user);
      setError(null);

      // Instant optimistic profile from Google OAuth metadata so user enters app without delay
      const initialProfile: UserProfile = {
        id: newSession.user.id,
        name:
          newSession.user.user_metadata?.full_name ||
          newSession.user.email?.split('@')[0] ||
          'Disha Member',
        email: newSession.user.email,
        avatarUrl:
          newSession.user.user_metadata?.avatar_url ||
          newSession.user.user_metadata?.picture,
        streakDays: 21,
        selectedGoal: 'metabolic_fitness',
        goalLabel: 'Metabolic Fitness & Energy',
        language: 'Hinglish',
        onboardingCompleted: false,
        currentMood: 'balanced',
        healthConditions: [],
        authProvider: 'google',
      };

      setProfile(initialProfile);
      setAuthState('authenticated');

      // Sync with database profile in the background
      syncProfileWithBackend(newSession)
        .then((synced) => {
          if (synced) {
            setProfile(synced);
          }
        })
        .catch(() => {});
    },
    [syncProfileWithBackend]
  );

  /**
   * 1. Application Startup: Restore and verify session from SecureStore
   */
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn('[AuthContext] Error restoring session:', sessionError.message);
          if (isMounted) {
            setAuthState('logged_out');
          }
          return;
        }

        if (data?.session && isMounted) {
          await handleSessionEstablished(data.session);
        } else if (isMounted) {
          setAuthState('logged_out');
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('[AuthContext] Unexpected session initialization error:', err.message);
          setAuthState('logged_out');
        }
      }
    }

    initializeAuth();

    // 2. Subscribe to Supabase Auth State Changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, updatedSession: Session | null) => {
      if (!isMounted) return;

      switch (event) {
        case 'SIGNED_IN':
        case 'INITIAL_SESSION':
          if (updatedSession) {
            await handleSessionEstablished(updatedSession);
          }
          break;

        case 'TOKEN_REFRESHED':
          if (updatedSession) {
            setSession(updatedSession);
            setUser(updatedSession.user);
          }
          break;

        case 'USER_UPDATED':
          if (updatedSession) {
            setUser(updatedSession.user);
            setSession(updatedSession);
          }
          break;

        case 'SIGNED_OUT':
          setSession(null);
          setUser(null);
          setProfile(null);
          setAuthState('logged_out');
          break;

        default:
          break;
      }
    });

    // 3. Deep Link Handlers (Cold Start & In-App Link Redirects)
    const handleDeepLink = async (event: { url: string }) => {
      if (
        event.url.includes('auth/callback') ||
        event.url.includes('#access_token') ||
        event.url.includes('access_token=') ||
        event.url.includes('code=')
      ) {
        setAuthState('authenticating');
        const res = await processOAuthCallbackUrl(event.url);
        if (res.success && res.session) {
          await handleSessionEstablished(res.session);
          if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else if (res.error) {
          setError(res.error);
          setAuthState('error');
        }
      }
    };

    const linkSubscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((initialUrl) => {
      const urlToCheck = initialUrl || (typeof window !== 'undefined' ? window.location.href : null);
      if (
        urlToCheck &&
        (urlToCheck.includes('auth/callback') ||
          urlToCheck.includes('access_token=') ||
          urlToCheck.includes('code='))
      ) {
        handleDeepLink({ url: urlToCheck });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, [handleSessionEstablished]);

  /**
   * Google Sign-In Trigger
   */
  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string; cancelled?: boolean }> => {
    if (isAuthenticatingRef.current) {
      return { success: false, error: 'Sign-in already in progress' };
    }

    try {
      isAuthenticatingRef.current = true;
      setAuthState('authenticating');
      setError(null);

      const result = await initiateGoogleSignIn();

      if (result.cancelled) {
        setAuthState('logged_out');
        isAuthenticatingRef.current = false;
        return { success: false, cancelled: true };
      }

      if (!result.success || !result.session) {
        const errorMsg = result.error || 'Failed to authenticate with Google.';
        setError(errorMsg);
        setAuthState('error');
        isAuthenticatingRef.current = false;
        return { success: false, error: errorMsg };
      }

      await handleSessionEstablished(result.session);
      isAuthenticatingRef.current = false;
      return { success: true };
    } catch (err: any) {
      const errorMsg = err?.message || 'Google authentication error';
      setError(errorMsg);
      setAuthState('error');
      isAuthenticatingRef.current = false;
      return { success: false, error: errorMsg };
    }
  };

  /**
   * One-tap Instant Demo Access (Preloaded with Alex Sharma's 30-day health profile)
   */
  const signInAsDemoUser = () => {
    const demoUser = {
      id: 'usr_synthetic_alex',
      app_metadata: { provider: 'demo' },
      user_metadata: { full_name: 'Alex Sharma' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'alex.sharma@healthfreak.com',
    } as any;

    const demoSession = {
      access_token: 'demo_token_usr_synthetic_alex',
      token_type: 'bearer',
      user: demoUser,
      expires_in: 3600,
      refresh_token: 'demo_refresh_token',
    } as any;

    const demoProfile: UserProfile = {
      id: 'usr_synthetic_alex',
      name: 'Alex Sharma',
      email: 'alex.sharma@healthfreak.com',
      avatarUrl: undefined,
      streakDays: 21,
      selectedGoal: 'metabolic_fitness',
      goalLabel: 'Metabolic Fitness & Energy',
      language: 'Hinglish',
      onboardingCompleted: true,
      currentMood: 'balanced',
      healthConditions: ['patellofemoral_knee_pain', 'sedentary_desk_job'],
      authProvider: 'demo',
    };

    setSession(demoSession);
    setUser(demoUser);
    setProfile(demoProfile);
    setError(null);
    setAuthState('authenticated');
  };

  /**
   * Account Sign Out
   */
  const signOut = async (): Promise<void> => {
    try {
      setAuthState('initializing');

      // 1. Terminate any active LiveKit voice session
      try {
        voiceClient.endSession();
      } catch (voiceErr: any) {
        console.warn('[AuthContext] Voice disconnect error:', voiceErr.message);
      }

      // 2. Clear remote Supabase session
      await signOutFromSupabase();

      // 3. Purge local state
      setSession(null);
      setUser(null);
      setProfile(null);
      setError(null);
      setAuthState('logged_out');
    } catch (err: any) {
      console.warn('[AuthContext] Sign out warning:', err.message);
      setAuthState('logged_out');
    }
  };

  const clearError = () => {
    setError(null);
    if (authState === 'error') {
      setAuthState(session ? 'authenticated' : 'logged_out');
    }
  };

  const updateProfileState = (updates: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        session,
        user,
        profile,
        error,
        signInWithGoogle,
        signInAsDemoUser,
        signOut,
        clearError,
        updateProfileState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
