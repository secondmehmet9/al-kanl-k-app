/** Çekirdek veri tipleri — rapor bölüm 6.2 veri modeliyle uyumlu (yerel + Supabase). */

export type TaskKind = 'boolean' | 'count';

/**
 * daily        : her gün
 * weekdays     : haftanın seçili günleri (recurrenceDays: 1=Pzt … 7=Paz)
 * weekly_n     : haftada N kez (periodTargetN)
 * monthly_day  : ayın belirli günleri (recurrenceDays: 1…31; ay kısaysa son güne kayar)
 * monthly_n    : ayda N kez (periodTargetN)
 */
export type RecurrenceType = 'daily' | 'weekdays' | 'weekly_n' | 'monthly_day' | 'monthly_n';

export type LogStatus = 'done' | 'partial' | 'skipped' | 'missed';
export type Privacy = 'private' | 'friends' | 'challenge';

/** 'YYYY-MM-DD' — kullanıcının yerel günü. */
export type DateKey = string;

export interface PauseRange {
  from: DateKey;
  /** null = hâlâ duraklatılmış */
  to: DateKey | null;
}

export interface Task {
  id: string;
  title: string;
  icon: string;
  color: string;
  category: string;
  kind: TaskKind;
  /** Miktar görevinde günlük hedef (örn. 8 bardak). boolean için 1. */
  targetValue: number;
  unit: string;
  recurrenceType: RecurrenceType;
  recurrenceDays: number[];
  periodTargetN: number;
  startDate: DateKey;
  endDate: DateKey | null;
  /** Önem 1–3 (rapor 3.2). */
  weight: number;
  privacy: Privacy;
  /** 'HH:MM' veya null */
  reminderTime: string | null;
  pauses: PauseRange[];
  archived: boolean;
  sourceTaskId: string | null;
  /** Bu görev bir challenge'a bağlıysa challenge id'si. */
  challengeId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskLog {
  taskId: string;
  date: DateKey;
  value: number;
  status: LogStatus;
  note: string;
  updatedAt: string;
}

export type LogsByTask = Record<string, Record<DateKey, TaskLog>>;

export interface DateWindow {
  start: DateKey;
  end: DateKey;
}

export type ThemePref = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemePref;
  notificationsEnabled: boolean;
  displayName: string;
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  notificationsEnabled: true,
  displayName: '',
  onboarded: false,
};

/** Geriye dönük check-in sınırı (rapor 2.1 madde 13 / 3.5): bugün + 2 gün geri. */
export const BACKFILL_DAYS = 2;
/** Görev başına haftalık "atla / dinlenme" hakkı (rapor 3.5). */
export const MAX_SKIPS_PER_WEEK = 2;
