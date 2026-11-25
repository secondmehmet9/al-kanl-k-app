/**
 * Uygulama durumu: bellekte tutulur, her değişiklik yerel veritabanına (SQLite) yazılır.
 * Ağ gerektirmez (offline-first). React tarafı useSyncExternalStore ile abone olur.
 */
import { useSyncExternalStore } from 'react';

import { canEditDate, canSkip, logForIncrement, logForStatus, logForToggle, logForValue } from '@/domain/checkin';
import { addDays, todayKey } from '@/domain/dates';
import { isCurrentlyPaused } from '@/domain/recurrence';
import { DEFAULT_SETTINGS, DateKey, LogsByTask, Settings, Task, TaskLog } from '@/domain/types';

import { uuid } from './id';
import { openPersistence } from './persistence';
import type { Persistence, Snapshot } from './schema';

export interface AppState {
  ready: boolean;
  error: string | null;
  tasks: Task[];
  logs: LogsByTask;
  settings: Settings;
}

let state: AppState = { ready: false, error: null, tasks: [], logs: {}, settings: DEFAULT_SETTINGS };
let persistence: Persistence | null = null;
const listeners = new Set<() => void>();
const taskChangeListeners = new Set<(state: AppState) => void>();
const logChangeListeners = new Set<(task: Task, date: DateKey, log: TaskLog | null) => void>();

function set(next: Partial<AppState>, tasksChanged = false) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
  if (tasksChanged) taskChangeListeners.forEach((l) => l(state));
}

function persist(op: (p: Persistence) => Promise<void>) {
  if (!persistence) return;
  op(persistence).catch((e) => console.warn('[store] kayıt hatası', e));
}

export const getState = () => state;
export const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
/** Görev listesi değişince (hatırlatıcıları yeniden planlamak için). */
export const onTasksChanged = (l: (state: AppState) => void) => {
  taskChangeListeners.add(l);
  return () => taskChangeListeners.delete(l);
};
/** Bir görevin check-in'i değişince (challenge senkronu için). */
export const onLogChanged = (l: (task: Task, date: DateKey, log: TaskLog | null) => void) => {
  logChangeListeners.add(l);
  return () => logChangeListeners.delete(l);
};

export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state)
  );
}

function indexLogs(logs: TaskLog[]): LogsByTask {
  const out: LogsByTask = {};
  for (const l of logs) (out[l.taskId] ??= {})[l.date] = l;
  return out;
}

function applySnapshot(snap: Snapshot) {
  set(
    {
      ready: true,
      error: null,
      tasks: [...snap.tasks].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)),
      logs: indexLogs(snap.logs),
      settings: { ...DEFAULT_SETTINGS, ...snap.settings },
    },
    true
  );
}

let initPromise: Promise<void> | null = null;
export function initStore(): Promise<void> {
  initPromise ??= (async () => {
    try {
      persistence = await openPersistence();
      applySnapshot(await persistence.load());
    } catch (e) {
      console.warn('[store] açılış hatası', e);
      set({ ready: true, error: String(e) });
    }
  })();
  return initPromise;
}

// ───────────── Görevler ─────────────

export type TaskDraft = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder' | 'pauses' | 'archived'>;

export function addTask(draft: TaskDraft): Task {
  const now = new Date().toISOString();
  const task: Task = {
    ...draft,
    id: uuid(),
    pauses: [],
    archived: false,
    sortOrder: state.tasks.reduce((m, t) => Math.max(m, t.sortOrder), 0) + 1,
    createdAt: now,
    updatedAt: now,
  };
  set({ tasks: [...state.tasks, task] }, true);
  persist((p) => p.saveTask(task));
  return task;
}

export function updateTask(id: string, patch: Partial<Task>): Task | null {
  const prev = state.tasks.find((t) => t.id === id);
  if (!prev) return null;
  const task: Task = { ...prev, ...patch, id, updatedAt: new Date().toISOString() };
  set({ tasks: state.tasks.map((t) => (t.id === id ? task : t)) }, true);
  persist((p) => p.saveTask(task));
  return task;
}

export function deleteTask(id: string) {
  const logs = { ...state.logs };
  delete logs[id];
  set({ tasks: state.tasks.filter((t) => t.id !== id), logs }, true);
  persist((p) => p.deleteTask(id));
}

/** Duraklat / devam ettir. Duraklatılan günler skora ve seriye girmez. */
export function setPaused(id: string, paused: boolean, today: DateKey = todayKey()) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task || isCurrentlyPaused(task) === paused) return;
  const pauses = paused
    ? [...task.pauses, { from: today, to: null }]
    : task.pauses
        .map((p) => (p.to === null ? { ...p, to: addDays(today, -1) } : p))
        .filter((p) => p.to === null || p.to >= p.from);
  updateTask(id, { pauses });
}

/** Arşivle: geçmiş istatistikte kalır, bugünden itibaren listede görünmez. */
export function setArchived(id: string, archived: boolean, today: DateKey = todayKey()) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  if (archived) {
    const doneToday = state.logs[id]?.[today]?.status === 'done';
    updateTask(id, { archived: true, endDate: task.endDate && task.endDate < today ? task.endDate : doneToday ? today : addDays(today, -1) });
  } else {
    updateTask(id, { archived: false, endDate: null });
  }
}

// ───────────── Check-in ─────────────

function commitLog(task: Task, date: DateKey, log: TaskLog | null) {
  const taskLogs = { ...(state.logs[task.id] ?? {}) };
  if (log) taskLogs[date] = log;
  else delete taskLogs[date];
  set({ logs: { ...state.logs, [task.id]: taskLogs } });
  persist((p) => (log ? p.saveLog(log) : p.deleteLog(task.id, date)));
  logChangeListeners.forEach((l) => l(task, date, log));
}

function ctx(taskId: string, date: DateKey) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task || !canEditDate(date, todayKey())) return null;
  return { task, prev: state.logs[taskId]?.[date], now: new Date().toISOString() };
}

export function toggleDone(taskId: string, date: DateKey) {
  const c = ctx(taskId, date);
  if (c) commitLog(c.task, date, logForToggle(c.task, date, c.prev, c.now));
}

export function increment(taskId: string, date: DateKey, delta: number) {
  const c = ctx(taskId, date);
  if (c) commitLog(c.task, date, logForIncrement(c.task, date, delta, c.prev, c.now));
}

export function setValue(taskId: string, date: DateKey, value: number) {
  const c = ctx(taskId, date);
  if (c) commitLog(c.task, date, logForValue(c.task, date, value, c.prev, c.now));
}

/** Dönüş false = bu hafta atlama hakkı kalmadı. */
export function skipDay(taskId: string, date: DateKey): boolean {
  const c = ctx(taskId, date);
  if (!c) return false;
  if (!canSkip(state.logs[taskId], date)) return false;
  commitLog(c.task, date, logForStatus(c.task, date, 'skipped', c.prev, c.now));
  return true;
}

export function markMissed(taskId: string, date: DateKey) {
  const c = ctx(taskId, date);
  if (c) commitLog(c.task, date, logForStatus(c.task, date, 'missed', c.prev, c.now));
}

export function clearLog(taskId: string, date: DateKey) {
  const c = ctx(taskId, date);
  if (c) commitLog(c.task, date, null);
}

// ───────────── Ayarlar & yedek ─────────────

export function updateSettings(patch: Partial<Settings>) {
  set({ settings: { ...state.settings, ...patch } }, 'notificationsEnabled' in patch);
  persist((p) => p.saveSettings(patch));
}

export function exportSnapshot(): Snapshot {
  return {
    version: 1,
    tasks: state.tasks,
    logs: Object.values(state.logs).flatMap((m) => Object.values(m)),
    settings: state.settings,
  };
}

/** Yedekten geri yükle (mevcut verinin ÜZERİNE yazar). Geçersiz veride hata fırlatır. */
export async function importSnapshot(json: string): Promise<void> {
  const raw = JSON.parse(json);
  if (!raw || raw.version !== 1 || !Array.isArray(raw.tasks) || !Array.isArray(raw.logs)) {
    throw new Error('invalid-backup');
  }
  for (const t of raw.tasks) {
    if (typeof t?.id !== 'string' || typeof t?.title !== 'string' || typeof t?.startDate !== 'string') {
      throw new Error('invalid-backup');
    }
  }
  const snap: Snapshot = { version: 1, tasks: raw.tasks, logs: raw.logs, settings: raw.settings ?? {} };
  if (persistence) await persistence.replaceAll(snap);
  applySnapshot(snap);
}

export async function wipeAll(): Promise<void> {
  const snap: Snapshot = { version: 1, tasks: [], logs: [], settings: { ...state.settings } };
  if (persistence) await persistence.replaceAll(snap);
  applySnapshot(snap);
}
