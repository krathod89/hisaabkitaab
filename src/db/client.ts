import * as SQLite from 'expo-sqlite';
import { DDL, SCHEMA_VERSION, SYNC_TABLES } from './schema';
import { uuid } from '../lib/uuid';

/**
 * Single shared SQLite handle. expo-sqlite's synchronous API is used
 * throughout — the working set is tiny and the cloud sync happens out of band.
 */
let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('hisaabkitaab.db');
  }
  return _db;
}

/** Create tables. On a schema-version bump, drop & recreate (cache is disposable). */
export function initDb(): void {
  const db = getDb();
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version !== SCHEMA_VERSION) {
    for (const t of [...SYNC_TABLES].reverse()) db.execSync(`DROP TABLE IF EXISTS ${t};`);
    db.execSync('DROP TABLE IF EXISTS kv;');
  }
  db.execSync(DDL);
  db.execSync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
}

/** Client-generated UUID id (prefix kept in the signature for call-site clarity). */
export function newId(_prefix = ''): string {
  return uuid();
}

/** Wipe all syncable rows (keeps kv). Used on account switch / reseed. */
export function clearAll(): void {
  const db = getDb();
  db.execSync(
    `DELETE FROM entries; DELETE FROM price_versions; DELETE FROM cycles; DELETE FROM items; DELETE FROM lists;`,
  );
}
