import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfQuarter,
  format,
  parseISO,
  startOfMonth,
  startOfQuarter,
  subMonths,
} from 'date-fns';
import { APP_TIMEZONE } from '@brightloop/shared';

const iso = (d) => format(d, 'yyyy-MM-dd');

/** Today's business date in Asia/Kolkata as YYYY-MM-DD (matches the API's `today`). */
export function todayIST(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(now);
}

export function addDaysISO(date, days) {
  return iso(addDays(parseISO(date), days));
}

export function daysUntil(date, from = todayIST()) {
  return differenceInCalendarDays(parseISO(date), parseISO(from));
}

export const DATE_PRESETS = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'custom', label: 'Custom range' },
];

/** A preset → { from, to } in YYYY-MM-DD. `to` stops at today for the current period. */
export function presetRange(preset, today = todayIST()) {
  const t = parseISO(today);
  switch (preset) {
    case 'this_month':
      return { from: iso(startOfMonth(t)), to: today };
    case 'last_month': {
      const m = subMonths(t, 1);
      return { from: iso(startOfMonth(m)), to: iso(endOfMonth(m)) };
    }
    case 'this_quarter':
      return { from: iso(startOfQuarter(t)), to: today };
    default:
      return { from: '', to: '' };
  }
}

/** Which preset (if any) a from/to pair is, so the picker can show it as selected. */
export function matchPreset(from, to, today = todayIST()) {
  if (!from && !to) return '';
  for (const { value } of DATE_PRESETS) {
    if (value === 'custom') continue;
    const r = presetRange(value, today);
    if (r.from === from && r.to === to) return value;
  }
  return 'custom';
}

/** Whole months covered by a range, at least 1 (revenue trend takes a month count). */
export function monthsInRange(from, to) {
  if (!from || !to) return 12;
  const a = parseISO(from);
  const b = parseISO(to);
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
  return Math.min(60, Math.max(1, months));
}

/** End of the quarter, used for the "this quarter" label. */
export function quarterEnd(today = todayIST()) {
  return iso(endOfQuarter(parseISO(today)));
}
