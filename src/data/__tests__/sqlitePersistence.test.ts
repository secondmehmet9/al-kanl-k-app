/**
 * SQLite katmanını GERÇEK bir SQLite motorunda dener (Node'un yerleşik node:sqlite modülü).
 * expo-sqlite'ın kullandığımız 3 metodu (execAsync / runAsync / getAllAsync) aynı imzayla sarılır;
 * böylece tablo şeması, upsert ve silme SQL'leri cihaza gitmeden doğrulanır.
 */
import { makeTask } from '@/domain/__tests__/helpers';
import type { TaskLog } from '@/domain/types';

import type { SqlDb } from '../schema';
import { createSqlitePersistence } from '../sqlitePersistence';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite');

function memoryDb(): SqlDb {
  const db = new DatabaseSync(':memory:');
  return {
    async execAsync(source) {
      db.exec(source);
    },
    async runAsync(source, params) {
      return db.prepare(source).run(...params);
    },
    async getAllAsync<T>(source: string, params: (string | number | null)[]) {
      return db.prepare(source).all(...params).map((r: object) => ({ ...r })) as T[];
    },
  };
}

const log = (taskId: string, date: string, value = 1, status: TaskLog['status'] = 'done'): TaskLog => ({
  taskId, date, value, status, note: '', updatedAt: '2026-11-25T10:00:00.000Z',
});

describe('SQLite kalıcılık', () => {
  it('boş veritabanı: şema kurulur, boş anlık görüntü döner; migrasyon tekrar çalışınca bozulmaz', async () => {
    const db = memoryDb();
    const p = await createSqlitePersistence(db);
    expect(await p.load()).toEqual({ version: 1, tasks: [], logs: [], settings: {} });
    const again = await createSqlitePersistence(db);
    expect((await again.load()).tasks).toEqual([]);
    expect(await db.getAllAsync<{ user_version: number }>('PRAGMA user_version', [])).toEqual([{ user_version: 1 }]);
  });

  it('görev tüm alanlarıyla (emoji, Türkçe, diziler, null) yazılıp aynen okunur', async () => {
    const p = await createSqlitePersistence(memoryDb());
    const task = makeTask({
      id: 'a1', title: 'Şınav çek — İĞÜŞÖÇ', icon: '🏋️', kind: 'count', targetValue: 2.5, unit: 'saat',
      recurrenceType: 'weekdays', recurrenceDays: [1, 3, 5], periodTargetN: 3, endDate: '2026-12-31', weight: 3,
      privacy: 'friends', reminderTime: '07:30', pauses: [{ from: '2026-11-01', to: null }], archived: true,
      sourceTaskId: 'src', challengeId: 'ch',
    });
    await p.saveTask(task);
    expect((await p.load()).tasks).toEqual([task]);
  });

  it('görev güncelleme (upsert) çoğaltmaz; sıralama sort_order’a göre', async () => {
    const p = await createSqlitePersistence(memoryDb());
    const a = makeTask({ id: 'a', sortOrder: 2 });
    const b = makeTask({ id: 'b', sortOrder: 1 });
    await p.saveTask(a);
    await p.saveTask(b);
    await p.saveTask({ ...a, title: 'Yeni ad' });
    const { tasks } = await p.load();
    expect(tasks.map((x) => x.id)).toEqual(['b', 'a']);
    expect(tasks[1].title).toBe('Yeni ad');
  });

  it('check-in: gün başına tek kayıt (upsert), silme, ondalık değer', async () => {
    const p = await createSqlitePersistence(memoryDb());
    await p.saveTask(makeTask({ id: 'a' }));
    await p.saveLog(log('a', '2026-11-25', 3, 'partial'));
    await p.saveLog(log('a', '2026-11-25', 7.5, 'partial'));
    await p.saveLog(log('a', '2026-11-24', 0, 'skipped'));
    let { logs } = await p.load();
    expect(logs).toHaveLength(2);
    expect(logs.find((l) => l.date === '2026-11-25')).toMatchObject({ value: 7.5, status: 'partial' });
    await p.deleteLog('a', '2026-11-25');
    ({ logs } = await p.load());
    expect(logs.map((l) => l.date)).toEqual(['2026-11-24']);
  });

  it('görev silinince kayıtları da silinir, diğer görevler etkilenmez', async () => {
    const p = await createSqlitePersistence(memoryDb());
    await p.saveTask(makeTask({ id: 'a' }));
    await p.saveTask(makeTask({ id: 'b' }));
    await p.saveLog(log('a', '2026-11-25'));
    await p.saveLog(log('b', '2026-11-25'));
    await p.deleteTask('a');
    const snap = await p.load();
    expect(snap.tasks.map((x) => x.id)).toEqual(['b']);
    expect(snap.logs.map((l) => l.taskId)).toEqual(['b']);
  });

  it('ayarlar anahtar bazında saklanır ve üzerine yazılır', async () => {
    const p = await createSqlitePersistence(memoryDb());
    await p.saveSettings({ theme: 'dark', displayName: 'Mehmet' });
    await p.saveSettings({ theme: 'light', notificationsEnabled: false });
    expect((await p.load()).settings).toEqual({ theme: 'light', displayName: 'Mehmet', notificationsEnabled: false });
  });

  it('yedekten geri yükleme her şeyi değiştirir; hatada eski veri korunur (rollback)', async () => {
    const p = await createSqlitePersistence(memoryDb());
    await p.saveTask(makeTask({ id: 'eski' }));
    await p.saveLog(log('eski', '2026-11-25'));
    const yeni = makeTask({ id: 'yeni' });
    await p.replaceAll({ version: 1, tasks: [yeni], logs: [log('yeni', '2026-11-20')], settings: { displayName: 'X' } });
    let snap = await p.load();
    expect(snap.tasks.map((x) => x.id)).toEqual(['yeni']);
    expect(snap.logs.map((l) => l.taskId)).toEqual(['yeni']);
    expect(snap.settings).toEqual({ displayName: 'X' });

    const bozuk = { ...makeTask({ id: 'bozuk' }), title: null as unknown as string }; // NOT NULL ihlali
    await expect(p.replaceAll({ version: 1, tasks: [bozuk], logs: [], settings: {} })).rejects.toThrow();
    snap = await p.load();
    expect(snap.tasks.map((x) => x.id)).toEqual(['yeni']);
  });
});
