import type { LogStatus, PauseRange, Task, TaskLog } from '@/domain/types';

export interface TaskRow {
  id: string;
  title: string;
  icon: string;
  color: string;
  category: string;
  kind: string;
  target_value: number;
  unit: string;
  recurrence_type: string;
  recurrence_days: string;
  period_target_n: number;
  start_date: string;
  end_date: string | null;
  weight: number;
  privacy: string;
  reminder_time: string | null;
  pauses: string;
  archived: number;
  source_task_id: string | null;
  challenge_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LogRow {
  task_id: string;
  date: string;
  value: number;
  status: string;
  note: string;
  updated_at: string;
}

function parseJson<T>(text: string, fallback: T): T {
  try {
    const v = JSON.parse(text);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export function rowToTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    icon: r.icon,
    color: r.color,
    category: r.category,
    kind: r.kind === 'count' ? 'count' : 'boolean',
    targetValue: r.target_value,
    unit: r.unit,
    recurrenceType: r.recurrence_type as Task['recurrenceType'],
    recurrenceDays: parseJson<number[]>(r.recurrence_days, []),
    periodTargetN: r.period_target_n,
    startDate: r.start_date,
    endDate: r.end_date,
    weight: r.weight,
    privacy: r.privacy as Task['privacy'],
    reminderTime: r.reminder_time,
    pauses: parseJson<PauseRange[]>(r.pauses, []),
    archived: !!r.archived,
    sourceTaskId: r.source_task_id,
    challengeId: r.challenge_id,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const TASK_COLUMNS = [
  'id', 'title', 'icon', 'color', 'category', 'kind', 'target_value', 'unit', 'recurrence_type',
  'recurrence_days', 'period_target_n', 'start_date', 'end_date', 'weight', 'privacy', 'reminder_time',
  'pauses', 'archived', 'source_task_id', 'challenge_id', 'sort_order', 'created_at', 'updated_at',
] as const;

export function taskToParams(t: Task): (string | number | null)[] {
  return [
    t.id, t.title, t.icon, t.color, t.category, t.kind, t.targetValue, t.unit, t.recurrenceType,
    JSON.stringify(t.recurrenceDays), t.periodTargetN, t.startDate, t.endDate, t.weight, t.privacy,
    t.reminderTime, JSON.stringify(t.pauses), t.archived ? 1 : 0, t.sourceTaskId, t.challengeId,
    t.sortOrder, t.createdAt, t.updatedAt,
  ];
}

export function rowToLog(r: LogRow): TaskLog {
  return {
    taskId: r.task_id,
    date: r.date,
    value: r.value,
    status: r.status as LogStatus,
    note: r.note,
    updatedAt: r.updated_at,
  };
}
