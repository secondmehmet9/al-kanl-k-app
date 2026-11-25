import type { Persistence, Snapshot } from './schema';

/**
 * Web önizleme: localStorage (expo-sqlite'ın web sürümü özel sunucu başlıkları ister;
 * web sadece önizleme/ekran görüntüsü için kullanıldığından basit tutuldu).
 */
export const WEB_KEY = 'aliskanlik:v1';

function read(): Snapshot {
  try {
    const raw = globalThis.localStorage?.getItem(WEB_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return { version: 1, tasks: s.tasks ?? [], logs: s.logs ?? [], settings: s.settings ?? {} };
    }
  } catch {
    // bozuk veri → boş başla
  }
  return { version: 1, tasks: [], logs: [], settings: {} };
}

function write(s: Snapshot) {
  try {
    globalThis.localStorage?.setItem(WEB_KEY, JSON.stringify(s));
  } catch {
    // kota dolu vb. — önizlemede yok say
  }
}

export async function openPersistence(): Promise<Persistence> {
  let snap = read();
  return {
    async load() {
      return snap;
    },
    async saveTask(task) {
      snap = { ...snap, tasks: [...snap.tasks.filter((t) => t.id !== task.id), task] };
      write(snap);
    },
    async deleteTask(taskId) {
      snap = {
        ...snap,
        tasks: snap.tasks.filter((t) => t.id !== taskId),
        logs: snap.logs.filter((l) => l.taskId !== taskId),
      };
      write(snap);
    },
    async saveLog(log) {
      snap = { ...snap, logs: [...snap.logs.filter((l) => !(l.taskId === log.taskId && l.date === log.date)), log] };
      write(snap);
    },
    async deleteLog(taskId, date) {
      snap = { ...snap, logs: snap.logs.filter((l) => !(l.taskId === taskId && l.date === date)) };
      write(snap);
    },
    async saveSettings(settings) {
      snap = { ...snap, settings: { ...snap.settings, ...settings } };
      write(snap);
    },
    async replaceAll(next) {
      snap = next;
      write(snap);
    },
  };
}
