import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { BillSummary, Item } from './models/types';
import { listItems } from './repositories/items';
import { currentCycle } from './repositories/cycles';
import { buildBill } from './billing/engine';
import { getSession, Session } from './auth/session';

/**
 * Minimal reactive layer over the synchronous SQLite repositories.
 *
 * Reads happen synchronously inside selector hooks; a monotonically increasing
 * `revision` is bumped after any mutation so dependent hooks recompute. This
 * keeps screen code declarative without pulling in a full state library.
 */
interface AppState {
  revision: number;
  /** Run a mutation, then trigger dependent hooks to re-read. */
  mutate: (fn: () => void) => void;
  /** Force a re-read without mutating (e.g. on screen focus / day rollover). */
  refresh: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [revision, setRevision] = useState(0);
  const bump = useCallback(() => setRevision((r) => r + 1), []);
  const mutate = useCallback(
    (fn: () => void) => {
      fn();
      bump();
    },
    [bump],
  );
  const value = useMemo<AppState>(() => ({ revision, mutate, refresh: bump }), [revision, bump, mutate]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}

/** Active, non-archived items. Recomputes on each mutation. */
export function useItems(): Item[] {
  const { revision } = useApp();
  return useMemo(() => listItems(false), [revision]);
}

/** Bill summary for a cycle (defaults to the current open cycle). */
export function useBill(cycleId?: string): BillSummary {
  const { revision } = useApp();
  return useMemo(() => buildBill(cycleId ?? currentCycle().id), [revision, cycleId]);
}

/** Current device-local session (null when signed out). */
export function useSession(): Session | null {
  const { revision } = useApp();
  return useMemo(() => getSession(), [revision]);
}
