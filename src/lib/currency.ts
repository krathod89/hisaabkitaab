/**
 * Currency formatting. The PRD requires the currency mark not be hardcoded to
 * one region, so the symbol lives in one place. The design uses the generic
 * currency mark '¤' as a placeholder; swap CURRENCY_SYMBOL for a real locale.
 */

export const CURRENCY_SYMBOL = '¤';

/**
 * Format a monetary amount. Whole numbers render without decimals (¤840),
 * fractional amounts keep two places (¤1.50), matching the design's samples.
 * Thousands are grouped (¤1,906).
 */
export function formatMoney(amount: number, symbol = CURRENCY_SYMBOL): string {
  const rounded = Math.round(amount * 100) / 100;
  const isWhole = Number.isInteger(rounded);
  const body = isWhole
    ? rounded.toLocaleString('en-US')
    : rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol}${body}`;
}

/** Price shown per unit, e.g. '¤60/litre' or '¤1.00/piece'. */
export function formatUnitPrice(price: number, unitSuffix: string, symbol = CURRENCY_SYMBOL): string {
  const body = Number.isInteger(price)
    ? String(price)
    : price.toFixed(2);
  return `${symbol}${body}/${unitSuffix}`;
}

/** Trim trailing zeros from a quantity: 1 -> '1', 1.5 -> '1.5'. */
export function formatQty(qty: number): string {
  return String(Math.round(qty * 100) / 100);
}
