import { formatInTimeZone } from 'date-fns-tz';
import { APP_TIMEZONE } from '@brightloop/shared';

// Business "today" as YYYY-MM-DD in IST, so billing day does not shift at 5:30 a.m.
export function todayIST(now = new Date()) {
  return formatInTimeZone(now, APP_TIMEZONE, 'yyyy-MM-dd');
}

export function nowIST(now = new Date()) {
  return formatInTimeZone(now, APP_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}
