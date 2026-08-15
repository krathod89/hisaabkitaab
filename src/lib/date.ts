/** Local-date helpers. All calendar dates are ISO 'YYYY-MM-DD' in local time. */

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' for a Date in local time. */
export function toDayString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYY-MM' cycle id for a Date. */
export function toCycleId(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** e.g. 'August 2026' from a 'YYYY-MM' cycle id. */
export function cycleLabel(cycleId: string): string {
  const [y, m] = cycleId.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** e.g. 'Aug 1 – Aug 31' */
export function cycleRangeLabel(startDay: string, endDay: string): string {
  const s = parseDay(startDay);
  const e = parseDay(endDay);
  return `${MONTHS_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTHS_SHORT[e.getMonth()]} ${e.getDate()}`;
}

/** e.g. 'Aug 14, 2026' */
export function longDate(day: string): string {
  const d = parseDay(day);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** e.g. 'Thursday, Aug 14' */
export function weekdayDate(d: Date = new Date()): string {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** First and last day strings of the calendar month containing `d`. */
export function monthBounds(d: Date = new Date()): { start: string; end: string; days: number } {
  const y = d.getFullYear();
  const m = d.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  return {
    start: `${y}-${pad(m + 1)}-01`,
    end: `${y}-${pad(m + 1)}-${pad(days)}`,
    days,
  };
}

/** Greeting keyed to the local hour. */
export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
