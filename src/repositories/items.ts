import { getDb, newId } from '../db/client';
import type { Item, PriceVersion, Unit } from '../models/types';
import { toDayString } from '../lib/date';

interface ItemRow {
  id: string;
  name: string;
  unit: string;
  custom_unit: string | null;
  color_hex: string;
  default_qty: number;
  reminder: number;
  archived: number;
  sort_order: number;
  created_at: string;
}

interface PriceRow {
  id: string;
  item_id: string;
  price_per_unit: number;
  effective_from: string;
  created_at: string;
}

const mapItem = (r: ItemRow): Item => ({
  id: r.id,
  name: r.name,
  unit: r.unit as Unit,
  customUnit: r.custom_unit,
  colorHex: r.color_hex,
  defaultQty: r.default_qty,
  reminderEnabled: !!r.reminder,
  archived: !!r.archived,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
});

const mapPrice = (r: PriceRow): PriceVersion => ({
  id: r.id,
  itemId: r.item_id,
  pricePerUnit: r.price_per_unit,
  effectiveFrom: r.effective_from,
  createdAt: r.created_at,
});

export function listItems(includeArchived = false): Item[] {
  const db = getDb();
  const rows = db.getAllSync<ItemRow>(
    `SELECT * FROM items ${includeArchived ? '' : 'WHERE archived = 0'} ORDER BY sort_order, created_at`,
  );
  return rows.map(mapItem);
}

export function getItem(id: string): Item | null {
  const row = getDb().getFirstSync<ItemRow>(`SELECT * FROM items WHERE id = ?`, id);
  return row ? mapItem(row) : null;
}

export interface NewItemInput {
  name: string;
  unit: Unit;
  customUnit?: string | null;
  colorHex: string;
  pricePerUnit: number;
  effectiveFrom?: string; // defaults to today
  defaultQty?: number;
  reminderEnabled?: boolean;
}

/** Create an item together with its first price version. Returns the item id. */
export function createItem(input: NewItemInput): string {
  const db = getDb();
  const now = new Date().toISOString();
  const id = newId('itm_');
  const order =
    (db.getFirstSync<{ n: number }>(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM items`)?.n) ?? 0;

  db.runSync(
    `INSERT INTO items (id, name, unit, custom_unit, color_hex, default_qty, reminder, archived, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    id,
    input.name,
    input.unit,
    input.customUnit ?? null,
    input.colorHex,
    input.defaultQty ?? 1,
    input.reminderEnabled === false ? 0 : 1,
    order,
    now,
  );
  addPriceVersion(id, input.pricePerUnit, input.effectiveFrom ?? toDayString());
  return id;
}

export interface UpdateItemInput {
  name?: string;
  unit?: Unit;
  customUnit?: string | null;
  colorHex?: string;
  defaultQty?: number;
  reminderEnabled?: boolean;
}

export function updateItem(id: string, patch: UpdateItemInput): void {
  const existing = getItem(id);
  if (!existing) return;
  const merged = { ...existing, ...patch };
  getDb().runSync(
    `UPDATE items SET name=?, unit=?, custom_unit=?, color_hex=?, default_qty=?, reminder=? WHERE id=?`,
    merged.name,
    merged.unit,
    merged.customUnit ?? null,
    merged.colorHex,
    merged.defaultQty,
    merged.reminderEnabled ? 1 : 0,
    id,
  );
}

export function archiveItem(id: string): void {
  getDb().runSync(`UPDATE items SET archived = 1 WHERE id = ?`, id);
}

// ---- Price versions -------------------------------------------------------

/**
 * Add a new effective-dated price. Editing a price never mutates history:
 * past entries continue to bill at the version active on their day.
 */
export function addPriceVersion(itemId: string, pricePerUnit: number, effectiveFrom: string): string {
  const id = newId('prc_');
  getDb().runSync(
    `INSERT INTO price_versions (id, item_id, price_per_unit, effective_from, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    id,
    itemId,
    pricePerUnit,
    effectiveFrom,
    new Date().toISOString(),
  );
  return id;
}

export function listPriceVersions(itemId: string): PriceVersion[] {
  const rows = getDb().getAllSync<PriceRow>(
    `SELECT * FROM price_versions WHERE item_id = ? ORDER BY effective_from`,
    itemId,
  );
  return rows.map(mapPrice);
}

/** The price in effect for an item on a given day ('YYYY-MM-DD'). */
export function priceAt(itemId: string, day: string): number {
  const row = getDb().getFirstSync<PriceRow>(
    `SELECT * FROM price_versions
     WHERE item_id = ? AND effective_from <= ?
     ORDER BY effective_from DESC LIMIT 1`,
    itemId,
    day,
  );
  if (row) return row.price_per_unit;
  // Fall back to the earliest known price if the entry predates all versions.
  const first = getDb().getFirstSync<PriceRow>(
    `SELECT * FROM price_versions WHERE item_id = ? ORDER BY effective_from LIMIT 1`,
    itemId,
  );
  return first?.price_per_unit ?? 0;
}

/** The current (latest-effective) price for display. */
export function currentPrice(itemId: string): number {
  return priceAt(itemId, toDayString());
}
