import type { Settings, Task, TaskLog } from '@/domain/types';

/** Yerel veritabanının tamamı — yedekleme/geri yükleme de bu şekli kullanır. */
export interface Snapshot {
  version: 1;
  tasks: Task[];
  logs: TaskLog[];
  settings: Partial<Settings>;
}

/** Kalıcı depolama arayüzü: native = SQLite (expo-sqlite), web = localStorage. */
export interface Persistence {
  load(): Promise<Snapshot>;
  saveTask(task: Task): Promise<void>;
  deleteTask(taskId: string): Promise<void>;
  saveLog(log: TaskLog): Promise<void>;
  deleteLog(taskId: string, date: string): Promise<void>;
  saveSettings(settings: Partial<Settings>): Promise<void>;
  replaceAll(snapshot: Snapshot): Promise<void>;
}

/** expo-sqlite SQLiteDatabase'in kullandığımız alt kümesi (testte node:sqlite ile taklit edilir). */
export interface SqlDb {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: (string | number | null)[]): Promise<unknown>;
  getAllAsync<T>(source: string, params: (string | number | null)[]): Promise<T[]>;
}

export const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '✅',
    color TEXT NOT NULL DEFAULT '#FC5200',
    category TEXT NOT NULL DEFAULT 'kisisel',
    kind TEXT NOT NULL DEFAULT 'boolean',
    target_value REAL NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT '',
    recurrence_type TEXT NOT NULL DEFAULT 'daily',
    recurrence_days TEXT NOT NULL DEFAULT '[]',
    period_target_n INTEGER NOT NULL DEFAULT 1,
    start_date TEXT NOT NULL,
    end_date TEXT,
    weight INTEGER NOT NULL DEFAULT 1,
    privacy TEXT NOT NULL DEFAULT 'private',
    reminder_time TEXT,
    pauses TEXT NOT NULL DEFAULT '[]',
    archived INTEGER NOT NULL DEFAULT 0,
    source_task_id TEXT,
    challenge_id TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS task_logs (
    task_id TEXT NOT NULL,
    date TEXT NOT NULL,
    value REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    PRIMARY KEY (task_id, date)
  );
  CREATE INDEX IF NOT EXISTS idx_task_logs_date ON task_logs(date);
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];
