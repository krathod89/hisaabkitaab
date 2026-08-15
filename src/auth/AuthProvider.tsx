import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../supabase/client';
import * as local from './session';

/** Where the magic-link email should send the user back to. */
function redirectTo(): string | undefined {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.origin : undefined;
  }
  return Linking.createURL('/');
}

/**
 * Authentication layer.
 *
 * When Supabase is configured (env keys present), this uses real email-OTP auth
 * and reflects the Supabase session. When it isn't (e.g. the keyless GitHub
 * Pages preview), it falls back to the Phase-1 device-local stub so the demo
 * still signs in. Screens consume `useAuth()` and don't care which path is live.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface SendResult {
  /** 'link' = magic-link email sent (cloud); 'done' = signed in already (local stub). */
  mode: 'link' | 'done';
  error: string | null;
}

interface AuthState {
  user: AuthUser | null;
  initializing: boolean;
  /** Whether real cloud auth is active (vs. the local stub). */
  cloud: boolean;
  sendLink: (email: string, name?: string) => Promise<SendResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function fromSession(session: Session | null): AuthUser | null {
  if (!session?.user) return null;
  const email = session.user.email ?? '';
  const name = (session.user.user_metadata?.name as string) || email.split('@')[0] || 'You';
  return { id: session.user.id, email, name };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const cloud = isSupabaseConfigured && !!supabase;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    if (cloud && supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (!active) return;
        setUser(fromSession(data.session));
        setInitializing(false);
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(fromSession(session));
      });
      return () => {
        active = false;
        sub.subscription.unsubscribe();
      };
    }
    // Local fallback: read the device-local session synchronously.
    const s = local.getSession();
    setUser(s ? { id: s.email, email: s.email, name: s.name } : null);
    setInitializing(false);
    return () => {
      active = false;
    };
  }, [cloud]);

  const sendLink = useCallback<AuthState['sendLink']>(
    async (email, name) => {
      const clean = email.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
        return { mode: 'link', error: 'Enter a valid email address.' };
      }
      if (cloud && supabase) {
        // Free-tier Supabase can't customise the OTP email, so we use the
        // default magic-link email: the user taps the link to sign in.
        const { error } = await supabase.auth.signInWithOtp({
          email: clean,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: redirectTo(),
            data: name?.trim() ? { name: name.trim() } : undefined,
          },
        });
        return { mode: 'link', error: error?.message ?? null };
      }
      // Local stub: sign in immediately, no email needed.
      const s = local.signIn(clean, name?.trim() || '');
      setUser({ id: s.email, email: s.email, name: s.name });
      return { mode: 'done', error: null };
    },
    [cloud],
  );

  const signOut = useCallback<AuthState['signOut']>(async () => {
    if (cloud && supabase) {
      await supabase.auth.signOut();
    } else {
      local.signOut();
      setUser(null);
    }
  }, [cloud]);

  const value = useMemo<AuthState>(
    () => ({ user, initializing, cloud, sendLink, signOut }),
    [user, initializing, cloud, sendLink, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
