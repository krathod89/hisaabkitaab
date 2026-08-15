import { getDb, clearAll } from './client';
import { color } from '../theme/tokens';
import { createItem } from '../repositories/items';
import { logEntry } from '../repositories/entries';
import { ensureCycle } from '../repositories/cycles';
import { closeCycle } from '../billing/engine';
import { getSetting, setSetting } from '../auth/session';
import { toCycleId } from '../lib/date';

const SEED_FLAG = 'seeded_v1';

const pad = (n: number) => String(n).padStart(2, '0');
const dayStr = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/**
 * Populate a realistic demo dataset once: three recurring items, ~two weeks of
 * logs in the current cycle, and one fully locked prior-month bill so History
 * and the locked-bill screen have something to show. Idempotent via a kv flag.
 */
export function seedIfEmpty(): void {
  if (getSetting(SEED_FLAG)) return;
  clearAll();

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-based
  const today = now.getDate();

  // Prior month (for a locked bill in history).
  const prevDate = new Date(y, m - 2, 1);
  const py = prevDate.getFullYear();
  const pm = prevDate.getMonth() + 1;
  const prevDaysInMonth = new Date(py, pm, 0).getDate();

  // --- Items with an initial price effective from the prior month ---------
  const priorStart = dayStr(py, pm, 1);
  const milk = createItem({
    name: 'Milk',
    unit: 'litre',
    colorHex: color.accent,
    pricePerUnit: 60,
    effectiveFrom: priorStart,
    defaultQty: 1,
  });
  const water = createItem({
    name: 'Water can',
    unit: 'piece',
    colorHex: color.greenIcon,
    pricePerUnit: 40,
    effectiveFrom: priorStart,
    defaultQty: 1,
  });
  const paper = createItem({
    name: 'Newspaper',
    unit: 'piece',
    colorHex: color.blueIcon,
    pricePerUnit: 8,
    effectiveFrom: priorStart,
    defaultQty: 1,
  });

  ensureCycle(toCycleId(prevDate));

  // Prior month: milk daily, water every 3rd day, paper on weekdays.
  for (let d = 1; d <= prevDaysInMonth; d++) {
    const day = dayStr(py, pm, d);
    logEntry({ itemId: milk, quantity: 1, day });
    if (d % 3 === 0) logEntry({ itemId: water, quantity: 1, day });
    const dow = new Date(py, pm - 1, d).getDay();
    if (dow >= 1 && dow <= 5) logEntry({ itemId: paper, quantity: 1, day });
  }
  closeCycle(toCycleId(prevDate));

  // Current month up to (but not including) today, so "today" is un-logged and
  // the Home screen invites the first tap.
  ensureCycle(toCycleId(now));
  for (let d = 1; d < Math.max(today, 1); d++) {
    const day = dayStr(y, m, d);
    logEntry({ itemId: milk, quantity: 1, day });
    if (d % 3 === 0) logEntry({ itemId: water, quantity: 1, day });
    const dow = new Date(y, m - 1, d).getDay();
    if (dow >= 1 && dow <= 5) logEntry({ itemId: paper, quantity: 1, day });
  }

  setSetting(SEED_FLAG, new Date().toISOString());
}

/** DEV: wipe everything and reseed (used from Settings). */
export function resetAndReseed(): void {
  const db = getDb();
  db.runSync(`DELETE FROM kv WHERE key = ?`, SEED_FLAG);
  clearAll();
  seedIfEmpty();
}
