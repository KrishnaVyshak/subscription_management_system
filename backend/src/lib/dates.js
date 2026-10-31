import { formatInTimeZone } from 'date-fns-tz';
import { APP_TIMEZONE } from '@brightloop/shared';

// Business "today" as YYYY-MM-DD in IST, so billing day does not shift at 5:30 a.m.
export function todayIST(now = new Date()) {
  return formatInTimeZone(now, APP_TIMEZONE, 'yyyy-MM-dd');
}

export function nowIST(now = new Date()) {
  return formatInTimeZone(now, APP_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

// Calendar arithmetic on 'YYYY-MM-DD' strings (UTC under the hood, so no DST/TZ drift).
const toUTC = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUTC = (ms) => new Date(ms).toISOString().slice(0, 10);
const DAY = 86_400_000;

export function addDays(date, n) {
  return fromUTC(toUTC(date) + n * DAY);
}

// b − a in whole days.
export function diffDays(a, b) {
  return Math.round((toUTC(b) - toUTC(a)) / DAY);
}

export function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

// Adds months and clamps to month end: 31 Jan + 1 → 28/29 Feb.
export function addMonths(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const day = Math.min(d, daysInMonth(year, month));
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
