/**
 * Hatırlatıcı planı (saf fonksiyon — test edilebilir).
 *
 * iOS aynı anda en fazla 64 bekleyen yerel bildirime izin verir. Bu yüzden:
 *  - Tek tek tarih yerine TEKRARLI tetikleyici kullanılır (günlük / haftalık / aylık) → görev başına 1–7 slot.
 *  - Aynı tetikleyiciye (aynı saat + aynı gün) düşen görevler TEK bildirimde birleştirilir.
 *  - Toplam slot bütçeyi (varsayılan 60) aşarsa en az görevli slotlar atılır ve `dropped` ile bildirilir.
 */
import { isCurrentlyPaused } from '@/domain/recurrence';
import type { DateKey, Task } from '@/domain/types';

export const IOS_PENDING_LIMIT = 64;
export const DEFAULT_BUDGET = 60;

export type ReminderTrigger =
  | { type: 'daily'; hour: number; minute: number }
  /** weekday: 1=Pazartesi … 7=Pazar (ISO). iOS'a çevrim scheduler'da yapılır. */
  | { type: 'weekly'; weekday: number; hour: number; minute: number }
  | { type: 'monthly'; day: number; hour: number; minute: number };

export interface ReminderSlot {
  key: string;
  trigger: ReminderTrigger;
  taskIds: string[];
  titles: string[];
}

export interface ReminderPlan {
  slots: ReminderSlot[];
  /** Bütçeye sığmadığı için hatırlatıcısı eksik kalan görev id'leri. */
  dropped: string[];
}

export function parseTime(time: string | null): { hour: number; minute: number } | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function triggersForTask(task: Task): ReminderTrigger[] {
  const t = parseTime(task.reminderTime);
  if (!t) return [];
  switch (task.recurrenceType) {
    case 'weekdays': {
      const days = [...new Set(task.recurrenceDays)].filter((d) => d >= 1 && d <= 7).sort();
      if (days.length === 7) return [{ type: 'daily', ...t }];
      return days.map((weekday) => ({ type: 'weekly' as const, weekday, ...t }));
    }
    case 'monthly_day':
      return [...new Set(task.recurrenceDays)]
        .filter((d) => d >= 1 && d <= 31)
        .sort((a, b) => a - b)
        .map((day) => ({ type: 'monthly' as const, day, ...t }));
    // günlük + haftada N + ayda N: her gün aynı saatte hatırlat
    default:
      return [{ type: 'daily', ...t }];
  }
}

export function triggerKey(t: ReminderTrigger): string {
  const hm = `${t.hour}:${t.minute}`;
  if (t.type === 'weekly') return `w${t.weekday}@${hm}`;
  if (t.type === 'monthly') return `m${t.day}@${hm}`;
  return `d@${hm}`;
}

export function buildReminderPlan(tasks: Task[], today: DateKey, budget: number = DEFAULT_BUDGET): ReminderPlan {
  const map = new Map<string, ReminderSlot>();
  for (const task of tasks) {
    if (task.archived || isCurrentlyPaused(task)) continue;
    if (task.endDate && task.endDate < today) continue;
    for (const trigger of triggersForTask(task)) {
      const key = triggerKey(trigger);
      let slot = map.get(key);
      if (!slot) map.set(key, (slot = { key, trigger, taskIds: [], titles: [] }));
      slot.taskIds.push(task.id);
      slot.titles.push(`${task.icon} ${task.title}`);
    }
  }
  const all = [...map.values()];
  if (all.length <= budget) return { slots: all, dropped: [] };
  // Bütçe aşımı: en çok görev taşıyan slotlar korunur (sıra kararlı).
  const ranked = all
    .map((slot, i) => ({ slot, i }))
    .sort((a, b) => b.slot.taskIds.length - a.slot.taskIds.length || a.i - b.i);
  const kept = ranked.slice(0, budget).sort((a, b) => a.i - b.i).map((x) => x.slot);
  const dropped = new Set<string>();
  for (const { slot } of ranked.slice(budget)) slot.taskIds.forEach((id) => dropped.add(id));
  return { slots: kept, dropped: [...dropped] };
}

/** ISO hafta günü (1=Pzt…7=Paz) → iOS/Expo haftalık tetikleyici (1=Pazar…7=Cumartesi). */
export function isoToExpoWeekday(iso: number): number {
  return (iso % 7) + 1;
}
