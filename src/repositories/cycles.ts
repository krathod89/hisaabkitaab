import { getDb } from '../db/client';
import type { Cycle, CycleStatus } from '../models/types';
import { cycleLabel, monthBounds, parseDay, toCycleId } from '../lib/date';

interface CycleRow {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  status: string;
  grand_total: number | null;
  generated_at: string | null;
}

const mapCycle = (r: CycleRow): Cycle => ({
  id: r.id,
  label: r.label,
  startDate: r.start_date,
  endDate: r.end_date,
  status: r.status as CycleStatus,
  grandTotal: r.grand_total,
  generatedAt: r.generated_at,
});

/** Fetch a cycle, creating the (open) calendar-month cycle if missing. */
export function ensureCycle(cycleId: string): Cycle {
  const db = getDb();
  const existing = db.getFirstSync<CycleRow>(`SELECT * FROM cycles WHERE id = ?`, cycleId);
  if (existing) return mapCycle(existing);

  const [y, m] = cycleId.split('-').map(Number);
  const { start, end } = monthBounds(new Date(y, m - 1, 1));
  db.runSync(
    `INSERT INTO cycles (id, label, start_date, end_date, status, grand_total, generated_at)
     VALUES (?, ?, ?, ?, 'open', NULL, NULL)`,
    cycleId,
    cycleLabel(cycleId),
    start,
    end,
  );
  return mapCycle(db.getFirstSync<CycleRow>(`SELECT * FROM cycles WHERE id = ?`, cycleId)!);
}

export function currentCycle(): Cycle {
  return ensureCycle(toCycleId());
}

export function getCycle(cycleId: string): Cycle | null {
  const row = getDb().getFirstSync<CycleRow>(`SELECT * FROM cycles WHERE id = ?`, cycleId);
  return row ? mapCycle(row) : null;
}

export function listCycles(): Cycle[] {
  return getDb()
    .getAllSync<CycleRow>(`SELECT * FROM cycles ORDER BY id DESC`)
    .map(mapCycle);
}

export function listLockedCycles(): Cycle[] {
  return getDb()
    .getAllSync<CycleRow>(`SELECT * FROM cycles WHERE status = 'locked' ORDER BY id DESC`)
    .map(mapCycle);
}

/** Freeze a cycle at a computed grand total. */
export function lockCycle(cycleId: string, grandTotal: number): void {
  getDb().runSync(
    `UPDATE cycles SET status = 'locked', grand_total = ?, generated_at = ? WHERE id = ?`,
    grandTotal,
    new Date().toISOString(),
    cycleId,
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
