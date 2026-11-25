import { isoWeekday, parts } from '@/domain/dates';
import type { DateKey, Task } from '@/domain/types';

import { t, tDyn } from './index';

export const weekdayShort = (iso: number) => tDyn(`wd.short.${iso}`);
export const weekdayLong = (iso: number) => tDyn(`wd.long.${iso}`);
export const monthName = (m: number) => tDyn(`month.${m}`);

/** "25 Kasım Çarşamba" */
export function formatLongDate(key: DateKey): string {
  const { m, d } = parts(key);
  return `${d} ${monthName(m)} ${weekdayLong(isoWeekday(key))}`;
}

/** "25.11.2026" */
export function formatShortDate(key: DateKey): string {
  const { y, m, d } = parts(key);
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
}

/** "25 Kas" */
export function formatDayMonth(key: DateKey): string {
  const { m, d } = parts(key);
  return `${d} ${monthName(m).slice(0, 3)}`;
}

/** "25.11.2026" / "25.11.26" / "2026-11-25" → DateKey; geçersizse null. */
export function parseUserDate(text: string): DateKey | null {
  const s = text.trim();
  let y: number, m: number, d: number;
  let mt = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/.exec(s);
  if (mt) {
    d = Number(mt[1]);
    m = Number(mt[2]);
    y = Number(mt[3]);
    if (y < 100) y += 2000;
  } else {
    mt = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!mt) return null;
    y = Number(mt[1]);
    m = Number(mt[2]);
    d = Number(mt[3]);
  }
  if (m < 1 || m > 12 || d < 1 || y < 2000 || y > 2100) return null;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > last) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function formatPct(score: number | null): string {
  return score === null ? '—' : `%${Math.round(score)}`;
}

/** Miktar: 8 → "8", 2.5 → "2,5", 10000 → "10.000" */
export function formatNum(n: number): string {
  const r = Math.round(n * 100) / 100;
  const [int, frac] = String(r).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return frac ? `${grouped},${frac}` : grouped;
}

export function recurrenceLabel(task: Pick<Task, 'recurrenceType' | 'recurrenceDays' | 'periodTargetN'>): string {
  switch (task.recurrenceType) {
    case 'daily':
      return t('rec.daily');
    case 'weekdays': {
      const days = [...task.recurrenceDays].sort();
      if (days.length === 7) return t('rec.daily');
      if (days.join() === '1,2,3,4,5') return t('rec.weekdaysOnly');
      if (days.join() === '6,7') return t('rec.weekend');
      return days.map(weekdayShort).join(' · ');
    }
    case 'weekly_n':
      return t('rec.weeklyN', { n: task.periodTargetN });
    case 'monthly_n':
      return t('rec.monthlyN', { n: task.periodTargetN });
    case 'monthly_day':
      return t('rec.monthlyDay', { days: [...task.recurrenceDays].sort((a, b) => a - b).join(', ') });
  }
}
