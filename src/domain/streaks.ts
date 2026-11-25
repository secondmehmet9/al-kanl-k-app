/**
 * SERİ (streak) — rapor 3.5: skordan ayrı metrik.
 *  - Gün-bazlı görev: ardışık "başarılı" planlı gün (oran ≥ 1). Atlanan / duraklatılan gün seriyi BOZMAZ.
 *    Bugün henüz yapılmadıysa seri bozulmuş sayılmaz (gün bitmedi).
 *  - Haftada N / ayda N: ardışık "hedefi tutan" periyot. Açık periyot hedefi tuttuysa sayılır, tutmadıysa nötr.
 */
import { addDays } from './dates';
import { calendarPeriodOf, effectivePeriod, isDayBased, isScheduledOn, nextPeriodStart, prevPeriodEnd } from './recurrence';
import { dayRatio, evaluatePeriod } from './scoring';
import type { DateKey, Task, TaskLog } from './types';

type TaskLogs = Record<DateKey, TaskLog> | undefined;

const EPS = 1e-9;

export function currentStreak(task: Task, logs: TaskLogs, today: DateKey): number {
  let streak = 0;
  if (isDayBased(task)) {
    let day = task.endDate && task.endDate < today ? task.endDate : today;
    while (day >= task.startDate) {
      if (isScheduledOn(task, day)) {
        const r = dayRatio(task, logs?.[day]);
        if (r !== null) {
          if (r >= 1 - EPS) streak++;
          else if (day !== today) break;
        }
      }
      day = addDays(day, -1);
    }
    return streak;
  }
  let cursor = today;
  while (cursor >= task.startDate) {
    const cal = calendarPeriodOf(task, cursor);
    const res = evaluatePeriod(task, logs, cal);
    if (res) {
      const met = res.done + EPS >= res.target;
      const open = res.period.end >= today;
      if (met) streak++;
      else if (!open) break;
    }
    cursor = prevPeriodEnd(cal);
  }
  return streak;
}

export function bestStreak(task: Task, logs: TaskLogs, today: DateKey): number {
  let best = 0;
  let run = 0;
  const last = task.endDate && task.endDate < today ? task.endDate : today;
  if (isDayBased(task)) {
    let day = task.startDate;
    while (day <= last) {
      if (isScheduledOn(task, day)) {
        const r = dayRatio(task, logs?.[day]);
        if (r !== null) {
          if (r >= 1 - EPS) run++;
          else if (day !== today) run = 0;
          if (run > best) best = run;
        }
      }
      day = addDays(day, 1);
    }
    return best;
  }
  let cursor = task.startDate;
  while (cursor <= last) {
    const cal = calendarPeriodOf(task, cursor);
    const res = evaluatePeriod(task, logs, cal);
    const eff = effectivePeriod(task, cal);
    if (res && eff) {
      const met = res.done + EPS >= res.target;
      const open = eff.end >= today;
      if (met) run++;
      else if (!open) run = 0;
      if (run > best) best = run;
    }
    cursor = nextPeriodStart(cal);
  }
  return best;
}

/** Görevin toplam tamamlanma sayısı (challenge eşitlik bozucu). */
export function totalCompletions(task: Task, logs: TaskLogs): number {
  if (!logs) return 0;
  let n = 0;
  for (const log of Object.values(logs)) {
    const r = dayRatio(task, log);
    if (r !== null && r >= 1 - EPS) n++;
  }
  return n;
}
