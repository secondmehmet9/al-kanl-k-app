/** Check-in kuralları (saf fonksiyonlar): kayıt üretimi, geriye dönük sınır, atlama hakkı. */
import { diffDays } from './dates';
import { skipsUsedInWeek } from './scoring';
import { BACKFILL_DAYS, DateKey, MAX_SKIPS_PER_WEEK, Task, TaskLog } from './types';

type TaskLogs = Record<DateKey, TaskLog> | undefined;

/** Bugün ve en fazla BACKFILL_DAYS gün geriye check-in yapılabilir; geleceğe yapılamaz. */
export function canEditDate(date: DateKey, today: DateKey): boolean {
  const back = diffDays(date, today);
  return back >= 0 && back <= BACKFILL_DAYS;
}

export function canSkip(logs: TaskLogs, date: DateKey): boolean {
  if (logs?.[date]?.status === 'skipped') return true;
  return skipsUsedInWeek(logs, date) < MAX_SKIPS_PER_WEEK;
}

function base(task: Task, date: DateKey, prev: TaskLog | undefined, nowIso: string): TaskLog {
  return { taskId: task.id, date, value: 0, status: 'missed', note: prev?.note ?? '', updatedAt: nowIso };
}

/** Miktar değeri ata. Dönen null = kaydı sil (0'a indi). */
export function logForValue(task: Task, date: DateKey, value: number, prev: TaskLog | undefined, nowIso: string): TaskLog | null {
  const v = Math.max(0, Math.round(value * 100) / 100);
  if (v <= 0) return null;
  const target = Math.max(task.targetValue, 1);
  return { ...base(task, date, prev, nowIso), value: v, status: v >= target ? 'done' : 'partial' };
}

/** +1 / −1 dokunuşu. Atlanmış günde + yapılırsa atlama kalkar. */
export function logForIncrement(task: Task, date: DateKey, delta: number, prev: TaskLog | undefined, nowIso: string): TaskLog | null {
  const current = prev && prev.status !== 'skipped' && prev.status !== 'missed' ? prev.value : 0;
  return logForValue(task, date, current + delta, prev, nowIso);
}

/** Tek dokunuş: yapıldı ↔ boş. Miktar görevinde hedefi doldurur. */
export function logForToggle(task: Task, date: DateKey, prev: TaskLog | undefined, nowIso: string): TaskLog | null {
  if (prev?.status === 'done') return null;
  const value = task.kind === 'count' ? Math.max(task.targetValue, 1) : 1;
  return { ...base(task, date, prev, nowIso), value, status: 'done' };
}

export function logForStatus(task: Task, date: DateKey, status: 'skipped' | 'missed', prev: TaskLog | undefined, nowIso: string): TaskLog {
  return { ...base(task, date, prev, nowIso), value: 0, status };
}
