import type { LogStatus, LogsByTask, Task } from '../types';

let seq = 0;

export function makeTask(over: Partial<Task> = {}): Task {
  seq++;
  return {
    id: over.id ?? `t${seq}`,
    title: `Görev ${seq}`,
    icon: '✅',
    color: '#FC5200',
    category: 'kisisel',
    kind: 'boolean',
    targetValue: 1,
    unit: '',
    recurrenceType: 'daily',
    recurrenceDays: [],
    periodTargetN: 1,
    startDate: '2026-01-01',
    endDate: null,
    weight: 1,
    privacy: 'private',
    reminderTime: null,
    pauses: [],
    archived: false,
    sourceTaskId: null,
    challengeId: null,
    sortOrder: seq,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

/** logs({ t1: { '2026-11-02': 8, '2026-11-03': 'skipped', '2026-11-04': true } }) */
export function makeLogs(
  input: Record<string, Record<string, number | boolean | LogStatus>>,
  targets: Record<string, number> = {}
): LogsByTask {
  const out: LogsByTask = {};
  for (const [taskId, days] of Object.entries(input)) {
    out[taskId] = {};
    for (const [date, v] of Object.entries(days)) {
      let value = 0;
      let status: LogStatus;
      if (typeof v === 'number') {
        value = v;
        status = v >= (targets[taskId] ?? 1) ? 'done' : 'partial';
      } else if (typeof v === 'boolean') {
        value = v ? 1 : 0;
        status = v ? 'done' : 'missed';
      } else {
        status = v;
        value = v === 'done' ? 1 : 0;
      }
      out[taskId][date] = { taskId, date, value, status, note: '', updatedAt: '' };
    }
  }
  return out;
}
