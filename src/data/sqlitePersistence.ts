import type { Settings, Task, TaskLog } from '@/domain/types';

import { LogRow, rowToLog, rowToTask, TASK_COLUMNS, TaskRow, taskToParams } from './mapping';
import { MIGRATIONS, Persistence, Snapshot, SqlDb } from './schema';

const TASK_UPSERT = `INSERT OR REPLACE INTO tasks (${TASK_COLUMNS.join(', ')}) VALUES (${TASK_COLUMNS.map(() => '?').join(', ')})`;
const LOG_UPSERT =
  'INSERT OR REPLACE INTO task_logs (task_id, date, value, status, note, updated_at) VALUES (?, ?, ?, ?, ?, ?)';
const SETTING_UPSERT = 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)';

async function migrate(db: SqlDb): Promise<void> {
  const rows = await db.getAllAsync<{ user_version: number }>('PRAGMA user_version', []);
  let version = rows[0]?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    await db.execAsync(MIGRATIONS[version]);
    version++;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}

const logParams = (l: TaskLog) => [l.taskId, l.date, l.value, l.status, l.note, l.updatedAt];

/** SQLite tabanlı kalıcı depolama. `db` expo-sqlite veritabanıdır (testte node:sqlite). */
export async function createSqlitePersistence(db: SqlDb): Promise<Persistence> {
  await migrate(db);

  const saveSettings = async (settings: Partial<Settings>) => {
    for (const [key, value] of Object.entries(settings)) {
      await db.runAsync(SETTING_UPSERT, [key, JSON.stringify(value)]);
    }
  };

  return {
    async load(): Promise<Snapshot> {
      const taskRows = await db.getAllAsync<TaskRow>('SELECT * FROM tasks ORDER BY sort_order, created_at', []);
      const logRows = await db.getAllAsync<LogRow>('SELECT * FROM task_logs', []);
      const settingRows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings', []);
      const settings: Record<string, unknown> = {};
      for (const r of settingRows) {
        try {
          settings[r.key] = JSON.parse(r.value);
        } catch {
          // bozuk ayar satırı yok sayılır
        }
      }
      return {
        version: 1,
        tasks: taskRows.map(rowToTask),
        logs: logRows.map(rowToLog),
        settings: settings as Partial<Settings>,
      };
    },
    async saveTask(task: Task) {
      await db.runAsync(TASK_UPSERT, taskToParams(task));
    },
    async deleteTask(taskId: string) {
      await db.runAsync('DELETE FROM task_logs WHERE task_id = ?', [taskId]);
      await db.runAsync('DELETE FROM tasks WHERE id = ?', [taskId]);
    },
    async saveLog(log: TaskLog) {
      await db.runAsync(LOG_UPSERT, logParams(log));
    },
    async deleteLog(taskId: string, date: string) {
      await db.runAsync('DELETE FROM task_logs WHERE task_id = ? AND date = ?', [taskId, date]);
    },
    saveSettings,
    async replaceAll(snapshot: Snapshot) {
      await db.execAsync('BEGIN');
      try {
        await db.execAsync('DELETE FROM task_logs; DELETE FROM tasks; DELETE FROM settings;');
        for (const t of snapshot.tasks) await db.runAsync(TASK_UPSERT, taskToParams(t));
        for (const l of snapshot.logs) await db.runAsync(LOG_UPSERT, logParams(l));
        await saveSettings(snapshot.settings);
        await db.execAsync('COMMIT');
      } catch (e) {
        await db.execAsync('ROLLBACK');
        throw e;
      }
    },
  };
}
