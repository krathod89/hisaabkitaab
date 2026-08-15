import * as SQLite from 'expo-sqlite';
import { DDL, SCHEMA_VERSION } from './schema';

/**
 * Single shared SQLite handle. expo-sqlite's synchronous API is used
 * throughout — Phase 1 is local-only and the working set is tiny, so the
 * simplicity of sync calls outweighs any benefit of the async API.
 */
let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('hisaabkitaab.db');
  }
  return _db;
}

/** Create tables and record the schema version. Idempotent. */
export function initDb(): void {
  const db = getDb();
  db.execSync(DDL);
  db.execSync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
}

/** Generate a sortable-ish unique id without pulling in a uuid dependency. */
export function newId(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

/** DEV helper: drop all rows (keeps schema). Used before reseeding. */
export function clearAll(): void {
  const db = getDb();
  db.execSync(`DELETE FROM entries; DELETE FROM price_versions; DELETE FROM cycles; DELETE FROM items;`);
}
