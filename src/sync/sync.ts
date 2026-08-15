import { getDb, newId } from '../db/client';
import { SYNC_TABLES, SyncTable } from '../db/schema';
import { getSetting, setSetting } from '../auth/session';
import { setActiveListId } from '../repositories/lists';
import { supabase } from '../supabase/client';

/**
 * Pragmatic local-first sync (last-write-wins).
 *
 * The local SQLite/sql.js cache is the fast read path. Writes mark rows
 * `pending`; push() upserts them to Supabase; pull() brings down rows changed
 * since the last pull and applies them locally (a locally-pending row wins until
 * it's been pushed). Soft-deletes (`deleted`) propagate both ways.
 */

const LAST_PULLED = 'last_pulled_at';
const EPOCH = '1970-01-01T00:00:00.000Z';

/** Cloud column list per table (order used for local INSERT OR REPLACE). */
const COLUMNS: Record<SyncTable, string[]> = {
  lists: ['id', 'owner_id', 'name', 'currency', 'cycle_type', 'created_at', 'updated_at', 'deleted'],
  items: ['id', 'list_id', 'name', 'unit', 'custom_unit', 'color_hex', 'default_qty', 'reminder', 'archived', 'sort_order', 'created_at', 'updated_at', 'deleted'],
  price_versions: ['id', 'item_id', 'list_id', 'price_per_unit', 'effective_from', 'created_at', 'updated_at', 'deleted'],
  cycles: ['id', 'list_id', 'period', 'label', 'start_date', 'end_date', 'status', 'grand_total', 'generated_at', 'updated_at', 'deleted'],
  entries: ['id', 'item_id', 'list_id', 'quantity', 'day', 'logged_at', 'period', 'note', 'created_by', 'updated_at', 'deleted'],
};

/** Columns stored as INTEGER 0/1 locally but boolean in Postgres. */
const BOOL_COLS: Record<SyncTable, string[]> = {
  lists: ['deleted'],
  items: ['reminder', 'archived', 'deleted'],
  price_versions: ['deleted'],
  cycles: ['deleted'],
  entries: ['deleted'],
};

function isConfigured(): boolean {
  return !!supabase;
}

// ---- Push -----------------------------------------------------------------

async function pushTable(table: SyncTable): Promise<void> {
  const db = getDb();
  const cols = COLUMNS[table];
  const rows = db.getAllSync<Record<string, any>>(`SELECT ${cols.join(', ')} FROM ${table} WHERE pending = 1`);
  if (!rows.length) return;

  const payload = rows.map((r) => {
    const o: Record<string, any> = { ...r };
    for (const b of BOOL_COLS[table]) o[b] = !!o[b];
    return o;
  });

  const { error } = await supabase!.from(table).upsert(payload, { onConflict: 'id' });
  if (error) throw new Error(`push ${table}: ${error.message}`);

  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');
  db.runSync(`UPDATE ${table} SET pending = 0 WHERE id IN (${placeholders})`, ...ids);
}

/** Push all locally-pending rows to Supabase (parents before children). */
export async function pushAll(): Promise<void> {
  if (!isConfigured()) return;
  for (const table of SYNC_TABLES) await pushTable(table);
}

// ---- Pull -----------------------------------------------------------------

async function pullTable(table: SyncTable, since: string): Promise<string> {
  const db = getDb();
  const { data, error } = await supabase!.from(table).select('*').gt('updated_at', since).order('updated_at', { ascending: true });
  if (error) throw new Error(`pull ${table}: ${error.message}`);

  let maxTs = since;
  const cols = COLUMNS[table];
  const placeholders = cols.map(() => '?').join(',');
  for (const cloud of data ?? []) {
    const local = db.getFirstSync<{ pending: number }>(`SELECT pending FROM ${table} WHERE id = ?`, cloud.id);
    if (local && local.pending === 1) continue; // unpushed local edit wins

    const vals = cols.map((c) => {
      let v = (cloud as any)[c];
      if (BOOL_COLS[table].includes(c)) v = v ? 1 : 0;
      return v ?? null;
    });
    db.runSync(`INSERT OR REPLACE INTO ${table} (${cols.join(', ')}, pending) VALUES (${placeholders}, 0)`, ...vals);
    if ((cloud as any).updated_at > maxTs) maxTs = (cloud as any).updated_at;
  }
  return maxTs;
}

/** Pull rows changed since last pull. Returns true if anything was applied. */
export async function pullAll(): Promise<boolean> {
  if (!isConfigured()) return false;
  const since = getSetting(LAST_PULLED) ?? EPOCH;
  let maxTs = since;
  for (const table of SYNC_TABLES) {
    const t = await pullTable(table, since);
    if (t > maxTs) maxTs = t;
  }
  if (maxTs !== since) setSetting(LAST_PULLED, maxTs);
  return maxTs !== since;
}

/** Push then pull. */
export async function fullSync(): Promise<boolean> {
  if (!isConfigured()) return false;
  await pushAll();
  return pullAll();
}

// ---- Bootstrap / teardown -------------------------------------------------

/**
 * On login: ensure the user has a cloud list, point the local cache at it,
 * wipe any stale local rows, and pull the user's data down.
 */
export async function bootstrapForUser(userId: string): Promise<void> {
  if (!isConfigured()) return;
  const db = getDb();

  // Find or create the user's default list in the cloud.
  const { data: lists, error } = await supabase!
    .from('lists')
    .select('*')
    .eq('owner_id', userId)
    .eq('deleted', false)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw new Error(`bootstrap: ${error.message}`);

  let list = lists?.[0];
  if (!list) {
    const id = newId();
    const { data: created, error: insErr } = await supabase!
      .from('lists')
      .insert({ id, owner_id: userId, name: 'My list' })
      .select('*')
      .single();
    if (insErr) throw new Error(`bootstrap create list: ${insErr.message}`);
    list = created;
  }

  // Reset local cache to this account and mirror the list row locally.
  db.execSync('DELETE FROM entries; DELETE FROM price_versions; DELETE FROM cycles; DELETE FROM items; DELETE FROM lists;');
  setSetting(LAST_PULLED, EPOCH);
  setSetting('current_user_id', userId);
  setActiveListId(list.id);

  const cols = COLUMNS.lists;
  const vals = cols.map((c) => {
    let v = (list as any)[c];
    if (c === 'deleted') v = v ? 1 : 0;
    return v ?? null;
  });
  db.runSync(
    `INSERT OR REPLACE INTO lists (${cols.join(', ')}, pending) VALUES (${cols.map(() => '?').join(',')}, 0)`,
    ...vals,
  );

  await pullAll();
}

/** On sign-out: clear the local cache and sync bookmarks. */
export function resetForSignOut(): void {
  const db = getDb();
  db.execSync('DELETE FROM entries; DELETE FROM price_versions; DELETE FROM cycles; DELETE FROM items; DELETE FROM lists;');
  db.runSync(`DELETE FROM kv WHERE key IN ('active_list_id', 'last_pulled_at', 'current_user_id')`);
}
