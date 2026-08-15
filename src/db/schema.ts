/** SQLite DDL and lightweight migration runner. */

export const SCHEMA_VERSION = 1;

export const DDL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS items (
  id            TEXT PRIMARY KEY NOT NULL,
  name          TEXT NOT NULL,
  unit          TEXT NOT NULL,
  custom_unit   TEXT,
  color_hex     TEXT NOT NULL,
  default_qty   REAL NOT NULL DEFAULT 1,
  reminder      INTEGER NOT NULL DEFAULT 1,
  archived      INTEGER NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS price_versions (
  id             TEXT PRIMARY KEY NOT NULL,
  item_id        TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  price_per_unit REAL NOT NULL,
  effective_from TEXT NOT NULL,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_price_item ON price_versions(item_id, effective_from);

CREATE TABLE IF NOT EXISTS cycles (
  id           TEXT PRIMARY KEY NOT NULL,
  label        TEXT NOT NULL,
  start_date   TEXT NOT NULL,
  end_date     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open',
  grand_total  REAL,
  generated_at TEXT
);

CREATE TABLE IF NOT EXISTS entries (
  id         TEXT PRIMARY KEY NOT NULL,
  item_id    TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity   REAL NOT NULL,
  day        TEXT NOT NULL,
  logged_at  TEXT NOT NULL,
  cycle_id   TEXT NOT NULL,
  note       TEXT
);
CREATE INDEX IF NOT EXISTS idx_entries_cycle ON entries(cycle_id);
CREATE INDEX IF NOT EXISTS idx_entries_item_day ON entries(item_id, day);

CREATE TABLE IF NOT EXISTS kv (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT
);
`;
