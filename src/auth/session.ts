import { getDb } from '../db/client';

/**
 * Device-local session (Phase 1). Per the agreed plan, auth is stubbed: the
 * onboarding screen "signs in" by writing a local session row. There is no
 * network auth or cloud identity yet — that arrives in Phase 2 with sync.
 */
export interface Session {
  name: string;
  email: string;
  signedInAt: string;
}

const KEY = 'session';

export function getSession(): Session | null {
  const row = getDb().getFirstSync<{ value: string }>(`SELECT value FROM kv WHERE key = ?`, KEY);
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value) as Session;
  } catch {
    return null;
  }
}

export function signIn(email: string, name = ''): Session {
  const session: Session = { name: name || email.split('@')[0], email, signedInAt: new Date().toISOString() };
  getDb().runSync(
    `INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    KEY,
    JSON.stringify(session),
  );
  return session;
}

export function signOut(): void {
  getDb().runSync(`DELETE FROM kv WHERE key = ?`, KEY);
}

// ---- Generic small-settings helpers (reminder time, onboarding, etc.) -----

export function getSetting(key: string): string | null {
  return getDb().getFirstSync<{ value: string }>(`SELECT value FROM kv WHERE key = ?`, key)?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb().runSync(
    `INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}
