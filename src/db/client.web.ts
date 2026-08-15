/**
 * Web implementation of the DB client (Metro resolves this `.web.ts` over
 * `client.ts` on the web platform only — native still uses expo-sqlite).
 *
 * expo-sqlite's web build relies on a worker + SharedArrayBuffer + OPFS, which
 * is fragile to host. For the browser preview we instead use sql.js (SQLite
 * compiled to a single WASM, no worker/SAB/OPFS). It runs synchronously once
 * the WASM has loaded, so we expose the same `execSync/getAllSync/getFirstSync/
 * runSync` surface the repositories already call — no repo changes needed.
 *
 * Persistence: the database is snapshotted to localStorage after writes and
 * restored on load, so a browser refresh keeps your data (best-effort; fine for
 * a preview). Native builds get real on-device SQLite.
 */
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { DDL, SCHEMA_VERSION } from './schema';

type Params = unknown[];

const STORAGE_KEY = 'hisaabkitaab.sqljs.v1';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

/**
 * The absolute origin+base the app is served from, derived from the entry
 * bundle's own <script> src (e.g. 'https://user.github.io/hisaabkitaab'). Falls back
 * to the page origin for root-hosted deploys.
 */
function webBaseUrl(): string {
  try {
    const s = document.querySelector(
      'script[src*="/_expo/static/js/web/"]',
    ) as HTMLScriptElement | null;
    if (s?.src) {
      const u = new URL(s.src, location.href);
      const idx = u.pathname.indexOf('/_expo/');
      if (idx >= 0) return u.origin + u.pathname.slice(0, idx);
    }
  } catch {
    // fall through
  }
  return location.origin;
}

/** expo-sqlite-compatible thin wrapper over a sql.js Database. */
interface DbLike {
  execSync(sql: string): void;
  runSync(sql: string, ...params: Params): { changes: number; lastInsertRowId: number };
  getAllSync<T = any>(sql: string, ...params: Params): T[];
  getFirstSync<T = any>(sql: string, ...params: Params): T | null;
}

function persist(): void {
  if (!db) return;
  try {
    const bytes = db.export();
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    localStorage.setItem(STORAGE_KEY, btoa(binary));
  } catch {
    // best-effort; ignore quota/serialization errors in preview
  }
}

function restore(): Uint8Array | undefined {
  try {
    const b64 = localStorage.getItem(STORAGE_KEY);
    if (!b64) return undefined;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return undefined;
  }
}

const wrapper: DbLike = {
  execSync(sql) {
    db!.run(sql);
    persist();
  },
  runSync(sql, ...params) {
    db!.run(sql, params as any[]);
    persist();
    return { changes: 0, lastInsertRowId: 0 };
  },
  getAllSync(sql, ...params) {
    const stmt = db!.prepare(sql);
    try {
      stmt.bind(params as any[]);
      const rows: any[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      return rows;
    } finally {
      stmt.free();
    }
  },
  getFirstSync(sql, ...params) {
    const stmt = db!.prepare(sql);
    try {
      stmt.bind(params as any[]);
      const row = stmt.step() ? stmt.getAsObject() : null;
      return row as any;
    } finally {
      stmt.free();
    }
  },
};

export function getDb(): DbLike {
  if (!db) throw new Error('Web DB not initialised — call await initDb() first.');
  return wrapper;
}

/** Async on web: loads the WASM, restores any saved snapshot, applies DDL. */
export async function initDb(): Promise<void> {
  if (db) return;
  if (!SQL) {
    // Resolve the WASM against the deploy base (e.g. '/hisaabkitaab' on GitHub Pages),
    // derived from the bundle's own <script> URL so it works whether the site is
    // served from root or a subpath, and regardless of the current route.
    SQL = await initSqlJs({ locateFile: () => `${webBaseUrl()}/sql-wasm.wasm` });
  }
  const saved = restore();
  db = saved ? new SQL.Database(saved) : new SQL.Database();
  db.run(DDL);
  db.run(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  persist();
}

export function newId(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

export function clearAll(): void {
  getDb().execSync(
    `DELETE FROM entries; DELETE FROM price_versions; DELETE FROM cycles; DELETE FROM items;`,
  );
}
