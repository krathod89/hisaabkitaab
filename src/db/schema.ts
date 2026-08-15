/** SQLite DDL. Local cache is aligned to the Supabase schema so sync is 1:1. */

// Bump when the DDL changes; initDb drops & recreates on a version mismatch
// (local data is a disposable cache — cloud users re-pull, local users reseed).
export const SCHEMA_VERSION = 2;

/**
 * Every syncable row carries:
 *   updated_at  ISO timestamp for last-write-wins
 *   deleted     soft-delete flag (reads filter it out; sync propagates it)
 *   pending     local-only: 1 = has unpushed changes
 * Items/price_versions/cycles/entries are scoped to a list_id.
 */
export const DDL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS lists (
  id          TEXT PRIMARY KEY NOT NULL,
  owner_id    TEXT,
  name        TEXT NOT NULL DEFAULT 'My list',
  currency    TEXT NOT NULL DEFAULT 'INR',
  cycle_type  TEXT NOT NULL DEFAULT 'monthly',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted     INTEGER NOT NULL DEFAULT 0,
  pending     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS items (
  id           TEXT PRIMARY KEY NOT NULL,
  list_id      TEXT NOT NULL,
  name         TEXT NOT NULL,
  unit         TEXT NOT NULL,
  custom_unit  TEXT,
  color_hex    TEXT NOT NULL,
  default_qty  REAL NOT NULL DEFAULT 1,
  reminder     INTEGER NOT NULL DEFAULT 1,
  archived     INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  deleted      INTEGER NOT NULL DEFAULT 0,
  pending      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_items_list ON items(list_id);

CREATE TABLE IF NOT EXISTS price_versions (
  id             TEXT PRIMARY KEY NOT NULL,
  item_id        TEXT NOT NULL,
  list_id        TEXT NOT NULL,
  price_per_unit REAL NOT NULL,
  effective_from TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  deleted        INTEGER NOT NULL DEFAULT 0,
  pending        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_price_item ON price_versions(item_id, effective_from);

CREATE TABLE IF NOT EXISTS cycles (
  id           TEXT PRIMARY KEY NOT NULL,
  list_id      TEXT NOT NULL,
  period       TEXT NOT NULL,
  label        TEXT NOT NULL,
  start_date   TEXT NOT NULL,
  end_date     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open',
  grand_total  REAL,
  generated_at TEXT,
  updated_at   TEXT NOT NULL,
  deleted      INTEGER NOT NULL DEFAULT 0,
  pending      INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cycles_list_period ON cycles(list_id, period);

CREATE TABLE IF NOT EXISTS entries (
  id         TEXT PRIMARY KEY NOT NULL,
  item_id    TEXT NOT NULL,
  list_id    TEXT NOT NULL,
  quantity   REAL NOT NULL,
  day        TEXT NOT NULL,
  logged_at  TEXT NOT NULL,
  period     TEXT NOT NULL,
  note       TEXT,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  deleted    INTEGER NOT NULL DEFAULT 0,
  pending    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_entries_list_period ON entries(list_id, period);
CREATE INDEX IF NOT EXISTS idx_entries_item_day ON entries(item_id, day);

CREATE TABLE IF NOT EXISTS kv (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT
);
`;

/** The five syncable tables, in dependency order (parents first). */
export const SYNC_TABLES = ['lists', 'items', 'price_versions', 'cycles', 'entries'] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];
