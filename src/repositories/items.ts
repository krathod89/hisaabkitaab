import { getDb, newId } from '../db/client';
import type { Item, PriceVersion, Unit } from '../models/types';
import { toDayString } from '../lib/date';
import { ensureActiveList } from './lists';

interface ItemRow {
  id: string;
  list_id: string;
  name: string;
  unit: string;
  custom_unit: string | null;
  color_hex: string;
  default_qty: number;
  reminder: number;
  archived: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface PriceRow {
  id: string;
  item_id: string;
  list_id: string;
  price_per_unit: number;
  effective_from: string;
  created_at: string;
  updated_at: string;
}

const mapItem = (r: ItemRow): Item => ({
  id: r.id,
  listId: r.list_id,
  name: r.name,
  unit: r.unit as Unit,
  customUnit: r.custom_unit,
  colorHex: r.color_hex,
  defaultQty: r.default_qty,
  reminderEnabled: !!r.reminder,
  archived: !!r.archived,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const mapPrice = (r: PriceRow): PriceVersion => ({
  id: r.id,
  itemId: r.item_id,
  listId: r.list_id,
  pricePerUnit: r.price_per_unit,
  effectiveFrom: r.effective_from,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export function listItems(includeArchived = false): Item[] {
  const listId = ensureActiveList();
  const rows = getDb().getAllSync<ItemRow>(
    `SELECT * FROM items WHERE list_id = ? AND deleted = 0 ${includeArchived ? '' : 'AND archived = 0'}
     ORDER BY sort_order, created_at`,
    listId,
  );
  return rows.map(mapItem);
}

export function getItem(id: string): Item | null {
  const row = getDb().getFirstSync<ItemRow>(`SELECT * FROM items WHERE id = ? AND deleted = 0`, id);
  return row ? mapItem(row) : null;
}

export interface NewItemInput {
  name: string;
  unit: Unit;
  customUnit?: string | null;
  colorHex: string;
  pricePerUnit: number;
  effectiveFrom?: string;
  defaultQty?: number;
  reminderEnabled?: boolean;
}

/** Create an item together with its first price version. Returns the item id. */
export function createItem(input: NewItemInput): string {
  const db = getDb();
  const listId = ensureActiveList();
  const now = new Date().toISOString();
  const id = newId();
  const order =
    db.getFirstSync<{ n: number }>(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM items WHERE list_id = ?`, listId)
      ?.n ?? 0;

  db.runSync(
    `INSERT INTO items (id, list_id, name, unit, custom_unit, color_hex, default_qty, reminder, archived, sort_order, created_at, updated_at, deleted, pending)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 0, 1)`,
    id,
    listId,
    input.name,
    input.unit,
    input.customUnit ?? null,
    input.colorHex,
    input.defaultQty ?? 1,
    input.reminderEnabled === false ? 0 : 1,
    order,
    now,
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
  const m = { ...existing, ...patch };
  getDb().runSync(
    `UPDATE items SET name=?, unit=?, custom_unit=?, color_hex=?, default_qty=?, reminder=?, updated_at=?, pending=1 WHERE id=?`,
    m.name,
    m.unit,
    m.customUnit ?? null,
    m.colorHex,
    m.defaultQty,
    m.reminderEnabled ? 1 : 0,
    new Date().toISOString(),
    id,
  );
}

export function archiveItem(id: string): void {
  getDb().runSync(`UPDATE items SET archived = 1, updated_at = ?, pending = 1 WHERE id = ?`, new Date().toISOString(), id);
}

// ---- Price versions -------------------------------------------------------

/** Add an effective-dated price. Editing never mutates prior versions. */
export function addPriceVersion(itemId: string, pricePerUnit: number, effectiveFrom: string): string {
  const listId = ensureActiveList();
  const now = new Date().toISOString();
  const id = newId();
  getDb().runSync(
    `INSERT INTO price_versions (id, item_id, list_id, price_per_unit, effective_from, created_at, updated_at, deleted, pending)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)`,
    id,
    itemId,
    listId,
    pricePerUnit,
    effectiveFrom,
    now,
    now,
  );
  return id;
}

export function listPriceVersions(itemId: string): PriceVersion[] {
  return getDb()
    .getAllSync<PriceRow>(
      `SELECT * FROM price_versions WHERE item_id = ? AND deleted = 0 ORDER BY effective_from`,
      itemId,
    )
    .map(mapPrice);
}

/** The price in effect for an item on a given day ('YYYY-MM-DD'). */
export function priceAt(itemId: string, day: string): number {
  const db = getDb();
  const row = db.getFirstSync<PriceRow>(
    `SELECT * FROM price_versions WHERE item_id = ? AND deleted = 0 AND effective_from <= ?
     ORDER BY effective_from DESC LIMIT 1`,
    itemId,
    day,
  );
  if (row) return row.price_per_unit;
  const first = db.getFirstSync<PriceRow>(
    `SELECT * FROM price_versions WHERE item_id = ? AND deleted = 0 ORDER BY effective_from LIMIT 1`,
    itemId,
  );
  return first?.price_per_unit ?? 0;
}

/** The current (latest-effective) price for display. */
export function currentPrice(itemId: string): number {
  return priceAt(itemId, toDayString());
}
