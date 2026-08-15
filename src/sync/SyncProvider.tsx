import React, { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { useApp } from '../store';
import { bootstrapForUser, resetForSignOut, pushAll, pullAll } from './sync';

/**
 * Drives the local-first sync loop:
 *  - on login: bootstrap the user's list + pull their data
 *  - on sign-out: clear the local cache
 *  - after local edits: debounced push
 *  - periodically / on focus / on reconnect: pull
 * Only active when Supabase is configured; a no-op in local-only mode.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, cloud } = useAuth();
  const { revision, refresh } = useApp();
  const bootstrappedFor = useRef<string | null>(null);

  // Login / logout.
  useEffect(() => {
    if (!cloud) return;
    let cancelled = false;
    if (user) {
      if (bootstrappedFor.current === user.id) return;
      bootstrappedFor.current = user.id;
      bootstrapForUser(user.id)
        .then(() => !cancelled && refresh())
        .catch((e) => console.warn('[sync] bootstrap failed', e?.message ?? e));
    } else {
      bootstrappedFor.current = null;
      resetForSignOut();
      refresh();
    }
    return () => {
      cancelled = true;
    };
  }, [cloud, user?.id, refresh]);

  // Debounced push after local edits.
  useEffect(() => {
    if (!cloud || !user) return;
    const t = setTimeout(() => {
      pushAll()
        .then(() => pullAll())
        .then((changed) => changed && refresh())
        .catch((e) => console.warn('[sync] push failed', e?.message ?? e));
    }, 900);
    return () => clearTimeout(t);
  }, [revision, cloud, user, refresh]);

  // Periodic pull + on focus / reconnect / app-foreground.
  useEffect(() => {
    if (!cloud || !user) return;
    const doPull = () =>
      pullAll()
        .then((changed) => changed && refresh())
        .catch(() => {});
    const interval = setInterval(doPull, 30_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && doPull());
    let onWeb: (() => void) | null = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      onWeb = doPull;
      window.addEventListener('online', onWeb);
      window.addEventListener('focus', onWeb);
    }
    return () => {
      clearInterval(interval);
      sub.remove();
      if (onWeb && typeof window !== 'undefined') {
        window.removeEventListener('online', onWeb);
        window.removeEventListener('focus', onWeb);
      }
    };
  }, [cloud, user, refresh]);

  return <>{children}</>;
}
