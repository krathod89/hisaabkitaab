import type { BillLine, BillSummary, Cycle, Item } from '../models/types';
import { listItems, priceAt, currentPrice, getItem } from '../repositories/items';
import { entriesForPeriod, isLoggedToday } from '../repositories/entries';
import { getCycle, currentCycle, cycleProgress, lockCycle } from '../repositories/cycles';

/**
 * Build a bill/running-total for a cycle (by cycle id).
 *
 * Each entry is priced at the version active on its own `day`, so a mid-cycle
 * rate change bills earlier days at the old price and later days at the new one.
 * For an open cycle this is the live running total; for a locked cycle it
 * reproduces the frozen figure.
 */
export function buildBill(cycleId: string): BillSummary {
  const cycle: Cycle = getCycle(cycleId) ?? currentCycle();
  const entries = entriesForPeriod(cycle.period);

  const byItem = new Map<string, { qty: number; subtotal: number }>();
  for (const e of entries) {
    const acc = byItem.get(e.itemId) ?? { qty: 0, subtotal: 0 };
    acc.qty += e.quantity;
    acc.subtotal += e.quantity * priceAt(e.itemId, e.day);
    byItem.set(e.itemId, acc);
  }

  const items = listItems(false);
  const seen = new Set(items.map((i) => i.id));
  for (const itemId of byItem.keys()) {
    if (!seen.has(itemId)) {
      const it = getItem(itemId);
      if (it) items.push(it);
    }
  }

  const lines: BillLine[] = items.map((item: Item) => {
    const agg = byItem.get(item.id) ?? { qty: 0, subtotal: 0 };
    return {
      item,
      quantity: agg.qty,
      pricePerUnit: currentPrice(item.id),
      subtotal: Math.round(agg.subtotal * 100) / 100,
      loggedToday: cycle.status === 'open' && isLoggedToday(item.id),
    };
  });

  lines.sort((a, b) => {
    if ((a.quantity > 0) !== (b.quantity > 0)) return a.quantity > 0 ? -1 : 1;
    return b.subtotal - a.subtotal;
  });

  const grandTotal =
    cycle.status === 'locked' && cycle.grandTotal != null
      ? cycle.grandTotal
      : Math.round(lines.reduce((s, l) => s + l.subtotal, 0) * 100) / 100;

  const { dayOfCycle, daysInCycle } = cycleProgress(cycle);

  return {
    cycle,
    lines,
    grandTotal,
    dayOfCycle,
    daysInCycle,
    progress: daysInCycle ? dayOfCycle / daysInCycle : 0,
  };
}

/** Only the lines that actually have logged quantity (for locked-bill receipts). */
export function billLinesWithQty(cycleId: string): BillLine[] {
  return buildBill(cycleId).lines.filter((l) => l.quantity > 0);
}

/** Compute the final total and freeze the cycle. Returns the locked total. */
export function closeCycle(cycleId: string): number {
  const summary = buildBill(cycleId);
  lockCycle(cycleId, summary.grandTotal);
  return summary.grandTotal;
}
