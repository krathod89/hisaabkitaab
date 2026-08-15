import { getDb, newId } from '../db/client';
import type { Entry } from '../models/types';
import { toCycleId, toDayString } from '../lib/date';
import { ensureCycle } from './cycles';

interface EntryRow {
  id: string;
  item_id: string;
  quantity: number;
  day: string;
  logged_at: string;
  cycle_id: string;
  note: string | null;
}

const mapEntry = (r: EntryRow): Entry => ({
  id: r.id,
  itemId: r.item_id,
  quantity: r.quantity,
  day: r.day,
  loggedAt: r.logged_at,
  cycleId: r.cycle_id,
  note: r.note,
});

export interface LogInput {
  itemId: string;
  quantity: number;
  day?: string; // defaults to today
  note?: string | null;
}

/** Record a consumption entry. Refuses to write into a locked cycle. */
export function logEntry(input: LogInput): Entry {
  const day = input.day ?? toDayString();
  const cycleId = toCycleId(new Date(day));
  const cycle = ensureCycle(cycleId);
  if (cycle.status === 'locked') {
    throw new Error(`Cannot log into locked cycle ${cycleId}`);
  }
  const id = newId('ent_');
  const now = new Date().toISOString();
  getDb().runSync(
    `INSERT INTO entries (id, item_id, quantity, day, logged_at, cycle_id, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.itemId,
    input.quantity,
    day,
    now,
    cycleId,
    input.note ?? null,
  );
  return { id, itemId: input.itemId, quantity: input.quantity, day, loggedAt: now, cycleId, note: input.note ?? null };
}

export function updateEntry(id: string, quantity: number): void {
  getDb().runSync(`UPDATE entries SET quantity = ? WHERE id = ?`, quantity, id);
}

export function deleteEntry(id: string): void {
  getDb().runSync(`DELETE FROM entries WHERE id = ?`, id);
}

export function entriesForCycle(cycleId: string): Entry[] {
  return getDb()
    .getAllSync<EntryRow>(`SELECT * FROM entries WHERE cycle_id = ? ORDER BY day, logged_at`, cycleId)
    .map(mapEntry);
}

export function entriesForItemInCycle(itemId: string, cycleId: string): Entry[] {
  return getDb()
    .getAllSync<EntryRow>(
      `SELECT * FROM entries WHERE item_id = ? AND cycle_id = ? ORDER BY day, logged_at`,
      itemId,
      cycleId,
    )
    .map(mapEntry);
}

/** True if the item has at least one entry dated today. */
export function isLoggedToday(itemId: string): boolean {
  const today = toDayString();
  const row = getDb().getFirstSync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM entries WHERE item_id = ? AND day = ?`,
    itemId,
    today,
  );
  return (row?.n ?? 0) > 0;
}

/** Any entry logged today, across all items (for the "logged today" streak/reminder). */
export function hasAnyEntryToday(): boolean {
  const row = getDb().getFirstSync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM entries WHERE day = ?`,
    toDayString(),
  );
  return (row?.n ?? 0) > 0;
}
