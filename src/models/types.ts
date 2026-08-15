/**
 * Core domain types for HisaabKitaab (Phase 1, single-user).
 *
 * Dates: calendar dates are stored as ISO 'YYYY-MM-DD' strings (local day).
 * Timestamps: stored as ISO 8601 strings (Date#toISOString()).
 * Money: integer/float in the item's currency minor-agnostic unit — we keep
 *   plain numbers (e.g. 60, 1.5) and format at the edge (see lib/currency).
 */

export type Unit = 'litre' | 'piece' | 'kg' | 'tablet' | 'custom';

export const UNIT_LABELS: Record<Unit, string> = {
  litre: 'Litre',
  piece: 'Piece',
  kg: 'Kg',
  tablet: 'Tablet',
  custom: 'Custom',
};

/** Short suffix shown after a quantity, e.g. "1 litre", "2 piece". */
export const UNIT_SUFFIX: Record<Unit, string> = {
  litre: 'litre',
  piece: 'piece',
  kg: 'kg',
  tablet: 'tablet',
  custom: 'unit',
};

export interface Item {
  id: string;
  name: string;
  unit: Unit;
  customUnit: string | null; // label when unit === 'custom'
  colorHex: string; // avatar/icon swatch
  defaultQty: number; // pre-filled quantity for one-tap logging
  reminderEnabled: boolean;
  archived: boolean;
  sortOrder: number;
  createdAt: string;
}

/** Versioned price. Past entries bill at the price active when they were logged. */
export interface PriceVersion {
  id: string;
  itemId: string;
  pricePerUnit: number;
  effectiveFrom: string; // 'YYYY-MM-DD'
  createdAt: string;
}

export interface Entry {
  id: string;
  itemId: string;
  quantity: number;
  day: string; // 'YYYY-MM-DD' — the consumption day
  loggedAt: string; // ISO timestamp
  cycleId: string; // owning cycle (calendar month)
  note: string | null;
}

export type CycleStatus = 'open' | 'locked';

export interface Cycle {
  id: string; // 'YYYY-MM'
  label: string; // e.g. 'August 2026'
  startDate: string; // 'YYYY-MM-01'
  endDate: string; // 'YYYY-MM-<lastDay>'
  status: CycleStatus;
  grandTotal: number | null; // frozen at lock time
  generatedAt: string | null; // ISO timestamp of lock
}

/** A single item's contribution to a bill/running total. */
export interface BillLine {
  item: Item;
  quantity: number; // total quantity logged in the cycle
  pricePerUnit: number; // representative price (active price for open cycle)
  subtotal: number; // sum of qty * priceAt(day) across entries
  loggedToday: boolean;
}

export interface BillSummary {
  cycle: Cycle;
  lines: BillLine[];
  grandTotal: number;
  dayOfCycle: number; // 1-based day index within the cycle
  daysInCycle: number;
  progress: number; // 0..1
}
