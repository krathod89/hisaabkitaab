import { getDb, newId } from '../db/client';
import type { Entry } from '../models/types';
import { toCycleId, toDayString } from '../lib/date';
import { getSetting } from '../auth/session';
import { ensureActiveList } from './lists';
import { ensureCycle } from './cycles';

interface EntryRow {
  id: string;
  item_id: string;
  list_id: string;
  quantity: number;
  day: string;
  logged_at: string;
  period: string;
  note: string | null;
  created_by: string | null;
}

const mapEntry = (r: EntryRow): Entry => ({
  id: r.id,
  itemId: r.item_id,
  listId: r.list_id,
  quantity: r.quantity,
  day: r.day,
  loggedAt: r.logged_at,
  period: r.period,
  note: r.note,
  createdBy: r.created_by,
});

export interface LogInput {
  itemId: string;
  quantity: number;
  day?: string;
  note?: string | null;
}

/** Record a consumption entry. Refuses to write into a locked cycle. */
export function logEntry(input: LogInput): Entry {
  const listId = ensureActiveList();
  const day = input.day ?? toDayString();
  const period = toCycleId(new Date(day));
  const cycle = ensureCycle(period);
  if (cycle.status === 'locked') throw new Error(`Cannot log into locked cycle ${period}`);

  const id = newId();
  const now = new Date().toISOString();
  const createdBy = getSetting('current_user_id');
  getDb().runSync(
    `INSERT INTO entries (id, item_id, list_id, quantity, day, logged_at, period, note, created_by, updated_at, deleted, pending)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
    id,
    input.itemId,
    listId,
    input.quantity,
    day,
    now,
    period,
    input.note ?? null,
    createdBy,
    now,
  );
  return { id, itemId: input.itemId, listId, quantity: input.quantity, day, loggedAt: now, period, note: input.note ?? null, createdBy };
}

export function updateEntry(id: string, quantity: number): void {
  getDb().runSync(
    `UPDATE entries SET quantity = ?, updated_at = ?, pending = 1 WHERE id = ?`,
    quantity,
    new Date().toISOString(),
    id,
  );
}

export function deleteEntry(id: string): void {
  getDb().runSync(
    `UPDATE entries SET deleted = 1, updated_at = ?, pending = 1 WHERE id = ?`,
    new Date().toISOString(),
    id,
  );
}

/** Entries for a period ('YYYY-MM') on the active list. */
export function entriesForPeriod(period: string): Entry[] {
  const listId = ensureActiveList();
  return getDb()
    .getAllSync<EntryRow>(
      `SELECT * FROM entries WHERE list_id = ? AND period = ? AND deleted = 0 ORDER BY day, logged_at`,
      listId,
      period,
    )
    .map(mapEntry);
}

/** True if the item has at least one (non-deleted) entry dated today. */
export function isLoggedToday(itemId: string): boolean {
  const row = getDb().getFirstSync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM entries WHERE item_id = ? AND day = ? AND deleted = 0`,
    itemId,
    toDayString(),
  );
  return (row?.n ?? 0) > 0;
}

/** Any entry logged today on the active list. */
export function hasAnyEntryToday(): boolean {
  const listId = ensureActiveList();
  const row = getDb().getFirstSync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM entries WHERE list_id = ? AND day = ? AND deleted = 0`,
    listId,
    toDayString(),
  );
  return (row?.n ?? 0) > 0;
}
