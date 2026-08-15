import { getDb, newId } from '../db/client';
import type { Cycle, CycleStatus } from '../models/types';
import { cycleLabel, monthBounds, parseDay, toCycleId } from '../lib/date';
import { ensureActiveList } from './lists';

interface CycleRow {
  id: string;
  list_id: string;
  period: string;
  label: string;
  start_date: string;
  end_date: string;
  status: string;
  grand_total: number | null;
  generated_at: string | null;
}

const mapCycle = (r: CycleRow): Cycle => ({
  id: r.id,
  listId: r.list_id,
  period: r.period,
  label: r.label,
  startDate: r.start_date,
  endDate: r.end_date,
  status: r.status as CycleStatus,
  grandTotal: r.grand_total,
  generatedAt: r.generated_at,
});

/** Fetch (or create) the open cycle for a period ('YYYY-MM') on the active list. */
export function ensureCycle(period: string): Cycle {
  const db = getDb();
  const listId = ensureActiveList();
  const existing = db.getFirstSync<CycleRow>(
    `SELECT * FROM cycles WHERE list_id = ? AND period = ? AND deleted = 0`,
    listId,
    period,
  );
  if (existing) return mapCycle(existing);

  const [y, m] = period.split('-').map(Number);
  const { start, end } = monthBounds(new Date(y, m - 1, 1));
  const id = newId();
  db.runSync(
    `INSERT INTO cycles (id, list_id, period, label, start_date, end_date, status, grand_total, generated_at, updated_at, deleted, pending)
     VALUES (?, ?, ?, ?, ?, ?, 'open', NULL, NULL, ?, 0, 1)`,
    id,
    listId,
    period,
    cycleLabel(period),
    start,
    end,
    new Date().toISOString(),
  );
  return mapCycle(db.getFirstSync<CycleRow>(`SELECT * FROM cycles WHERE id = ?`, id)!);
}

export function currentCycle(): Cycle {
  return ensureCycle(toCycleId());
}

export function getCycle(id: string): Cycle | null {
  const row = getDb().getFirstSync<CycleRow>(`SELECT * FROM cycles WHERE id = ? AND deleted = 0`, id);
  return row ? mapCycle(row) : null;
}

export function listLockedCycles(): Cycle[] {
  const listId = ensureActiveList();
  return getDb()
    .getAllSync<CycleRow>(
      `SELECT * FROM cycles WHERE list_id = ? AND status = 'locked' AND deleted = 0 ORDER BY period DESC`,
      listId,
    )
    .map(mapCycle);
}

/** Freeze a cycle at a computed grand total. */
export function lockCycle(id: string, grandTotal: number): void {
  getDb().runSync(
    `UPDATE cycles SET status = 'locked', grand_total = ?, generated_at = ?, updated_at = ?, pending = 1 WHERE id = ?`,
    grandTotal,
    new Date().toISOString(),
    new Date().toISOString(),
    id,
  );
}

/** Day index (1-based) and total days for a cycle, given "today". */
export function cycleProgress(cycle: Cycle, today = new Date()): { dayOfCycle: number; daysInCycle: number } {
  const start = parseDay(cycle.startDate);
  const end = parseDay(cycle.endDate);
  const daysInCycle = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const raw = Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1;
  const dayOfCycle = Math.min(Math.max(raw, 1), daysInCycle);
  return { dayOfCycle, daysInCycle };
}
