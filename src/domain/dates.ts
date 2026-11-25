import type { DateKey, DateWindow } from './types';

/**
 * Tüm tarih matematiği 'YYYY-MM-DD' anahtarları ve UTC gün numaraları üzerinden yapılır;
 * böylece yaz/kış saati geçişleri gün kaydırmaz. Hafta Pazartesi başlar (TR / Sırbistan).
 */
const MS_DAY = 86_400_000;

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(now: Date = new Date()): DateKey {
  return toKey(now);
}

export function parts(key: DateKey): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

export function dayNum(key: DateKey): number {
  const { y, m, d } = parts(key);
  return Math.round(Date.UTC(y, m - 1, d) / MS_DAY);
}

export function fromDayNum(n: number): DateKey {
  const dt = new Date(n * MS_DAY);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function makeKey(y: number, m: number, d: number): DateKey {
  return fromDayNum(Math.round(Date.UTC(y, m - 1, d) / MS_DAY));
}

export function addDays(key: DateKey, n: number): DateKey {
  return fromDayNum(dayNum(key) + n);
}

/** b − a (gün). */
export function diffDays(a: DateKey, b: DateKey): number {
  return dayNum(b) - dayNum(a);
}

/** ISO hafta günü: 1=Pazartesi … 7=Pazar. */
export function isoWeekday(key: DateKey): number {
  // 1970-01-01 Perşembe (ISO 4)
  const n = dayNum(key);
  return ((((n + 3) % 7) + 7) % 7) + 1;
}

export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -(isoWeekday(key) - 1));
}

export function endOfWeek(key: DateKey): DateKey {
  return addDays(startOfWeek(key), 6);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function startOfMonth(key: DateKey): DateKey {
  const { y, m } = parts(key);
  return makeKey(y, m, 1);
}

export function endOfMonth(key: DateKey): DateKey {
  const { y, m } = parts(key);
  return makeKey(y, m, daysInMonth(y, m));
}

export function weekWindow(key: DateKey): DateWindow {
  return { start: startOfWeek(key), end: endOfWeek(key) };
}

export function monthWindow(key: DateKey): DateWindow {
  return { start: startOfMonth(key), end: endOfMonth(key) };
}

export function eachDay(start: DateKey, end: DateKey): DateKey[] {
  const out: DateKey[] = [];
  const a = dayNum(start);
  const b = dayNum(end);
  for (let n = a; n <= b; n++) out.push(fromDayNum(n));
  return out;
}

export const minKey = (a: DateKey, b: DateKey): DateKey => (a <= b ? a : b);
export const maxKey = (a: DateKey, b: DateKey): DateKey => (a >= b ? a : b);
