import { getDb, newId } from '../db/client';
import { getSetting, setSetting } from '../auth/session';
import { isSupabaseConfigured } from '../supabase/client';
import type { List } from '../models/types';

const ACTIVE_KEY = 'active_list_id';

interface ListRow {
  id: string;
  owner_id: string | null;
  name: string;
  currency: string;
  cycle_type: string;
  created_at: string;
  updated_at: string;
}

const mapList = (r: ListRow): List => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  currency: r.currency,
  cycleType: r.cycle_type,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export function getActiveListId(): string | null {
  return getSetting(ACTIVE_KEY);
}

export function setActiveListId(id: string): void {
  setSetting(ACTIVE_KEY, id);
}

export function getList(id: string): List | null {
  const r = getDb().getFirstSync<ListRow>(`SELECT * FROM lists WHERE id = ?`, id);
  return r ? mapList(r) : null;
}

/** Create a list locally (owner_id null = device-local; a uid = cloud-owned). */
export function createList(ownerId: string | null, name = 'My list'): string {
  const id = newId();
  const now = new Date().toISOString();
  getDb().runSync(
    `INSERT INTO lists (id, owner_id, name, currency, cycle_type, created_at, updated_at, deleted, pending)
     VALUES (?, ?, ?, 'INR', 'monthly', ?, ?, 0, 1)`,
    id,
    ownerId,
    name,
    now,
    now,
  );
  return id;
}

/**
 * Return the active list id, creating a device-local list if none is set.
 * In cloud mode the sync bootstrap sets the active list to the user's cloud list.
 */
export function ensureActiveList(): string {
  const current = getActiveListId();
  // Cloud mode: the sync bootstrap owns list creation. Return whatever is set
  // (empty string before bootstrap → reads are simply empty, no stray list).
  if (isSupabaseConfigured) return current ?? '';

  // Local-only mode: create a device-local list on demand.
  if (current) {
    const exists = getDb().getFirstSync<{ id: string }>(`SELECT id FROM lists WHERE id = ? AND deleted = 0`, current);
    if (exists) return current;
  }
  const id = createList(null);
  setActiveListId(id);
  return id;
}
