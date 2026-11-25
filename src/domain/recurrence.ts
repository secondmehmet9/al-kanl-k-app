import {
  addDays,
  daysInMonth,
  endOfMonth,
  endOfWeek,
  isoWeekday,
  maxKey,
  minKey,
  parts,
  startOfMonth,
  startOfWeek,
} from './dates';
import type { DateKey, DateWindow, Task } from './types';

/** Gün-bazlı görev: her planlı gün ayrı bir "periyot"tur (rapor 3.1). */
export function isDayBased(task: Pick<Task, 'recurrenceType'>): boolean {
  return (
    task.recurrenceType === 'daily' ||
    task.recurrenceType === 'weekdays' ||
    task.recurrenceType === 'monthly_day'
  );
}

export function isPeriodBased(task: Pick<Task, 'recurrenceType'>): boolean {
  return task.recurrenceType === 'weekly_n' || task.recurrenceType === 'monthly_n';
}

export function isPausedOn(task: Pick<Task, 'pauses'>, date: DateKey): boolean {
  return task.pauses.some((p) => date >= p.from && (p.to === null || date <= p.to));
}

export function isCurrentlyPaused(task: Pick<Task, 'pauses'>): boolean {
  return task.pauses.some((p) => p.to === null);
}

/** Görev o gün "yaşıyor" mu: başlangıç–bitiş aralığında ve duraklatılmamış. */
export function isActiveOn(task: Task, date: DateKey): boolean {
  if (date < task.startDate) return false;
  if (task.endDate && date > task.endDate) return false;
  return !isPausedOn(task, date);
}

function matchesPattern(task: Task, date: DateKey): boolean {
  switch (task.recurrenceType) {
    case 'daily':
      return true;
    case 'weekdays':
      return task.recurrenceDays.includes(isoWeekday(date));
    case 'monthly_day': {
      const { y, m, d } = parts(date);
      const last = daysInMonth(y, m);
      // 29/30/31 seçilmiş ama ay kısaysa → ayın son gününe kayar.
      return task.recurrenceDays.some((x) => Math.min(x, last) === d);
    }
    default:
      return false;
  }
}

/** Gün-bazlı görev o gün planlı mı? (Periyot-bazlı görevlerde her zaman false.) */
export function isScheduledOn(task: Task, date: DateKey): boolean {
  if (!isDayBased(task)) return false;
  return isActiveOn(task, date) && matchesPattern(task, date);
}

/** "Bugün" listesinde gösterilsin mi: planlı günlük görev veya aktif haftalık/aylık hedef. */
export function isVisibleOn(task: Task, date: DateKey): boolean {
  if (task.archived && (!task.endDate || date > task.endDate)) return false;
  return isDayBased(task) ? isScheduledOn(task, date) : isActiveOn(task, date);
}

/** Periyot-bazlı görevin, verilen günü içeren takvim periyodu (hafta veya ay). */
export function calendarPeriodOf(task: Pick<Task, 'recurrenceType'>, date: DateKey): DateWindow {
  if (task.recurrenceType === 'monthly_n') {
    return { start: startOfMonth(date), end: endOfMonth(date) };
  }
  return { start: startOfWeek(date), end: endOfWeek(date) };
}

/**
 * Takvim periyodunun görevin ömrüyle (startDate/endDate) kesişimi.
 * Kesişim yoksa null.
 */
export function effectivePeriod(task: Task, period: DateWindow): DateWindow | null {
  const start = maxKey(period.start, task.startDate);
  const end = task.endDate ? minKey(period.end, task.endDate) : period.end;
  return start <= end ? { start, end } : null;
}

export function nextPeriodStart(period: DateWindow): DateKey {
  return addDays(period.end, 1);
}

export function prevPeriodEnd(period: DateWindow): DateKey {
  return addDays(period.start, -1);
}
