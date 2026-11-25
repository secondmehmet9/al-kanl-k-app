import type { RecurrenceType, TaskKind } from './types';

/** Şablon kütüphanesi — popüler alışkanlıklar. Başlık/birim i18n: `tpl.<id>`, `unit.<unitKey>` */
export interface TaskTemplate {
  id: string;
  icon: string;
  color: string;
  category: string;
  kind: TaskKind;
  targetValue: number;
  unitKey: string | null;
  recurrenceType: RecurrenceType;
  recurrenceDays: number[];
  periodTargetN: number;
  weight: number;
  reminderTime: string | null;
}

const d = (
  id: string,
  icon: string,
  color: string,
  category: string,
  extra: Partial<TaskTemplate> = {}
): TaskTemplate => ({
  id,
  icon,
  color,
  category,
  kind: 'boolean',
  targetValue: 1,
  unitKey: null,
  recurrenceType: 'daily',
  recurrenceDays: [],
  periodTargetN: 1,
  weight: 1,
  reminderTime: null,
  ...extra,
});

export const TEMPLATES: TaskTemplate[] = [
  // Sabah rutini
  d('erken_kalk', '⏰', '#F59E0B', 'sabah', { reminderTime: '06:30' }),
  d('yatak_topla', '🛏️', '#F97316', 'sabah'),
  d('soguk_dus', '🚿', '#06B6D4', 'sabah'),
  d('gunu_planla', '📝', '#6C5CE7', 'sabah', { reminderTime: '08:00' }),
  // Sağlık
  d('su_ic', '💧', '#3B82F6', 'saglik', { kind: 'count', targetValue: 8, unitKey: 'bardak' }),
  d('vitamin', '💊', '#EF4444', 'saglik', { reminderTime: '09:00' }),
  d('sekersiz', '🍬', '#EC4899', 'saglik'),
  d('erken_yat', '😴', '#8B5CF6', 'saglik', { reminderTime: '23:00' }),
  d('dis_ipi', '🦷', '#14B8A6', 'saglik'),
  d('sigara_yok', '🚭', '#EF4444', 'saglik', { weight: 3 }),
  // Spor
  d('spor', '🏋️', '#10B981', 'spor', { recurrenceType: 'weekly_n', periodTargetN: 3, weight: 2 }),
  d('adim', '🚶', '#84CC16', 'spor', { kind: 'count', targetValue: 10000, unitKey: 'adim' }),
  d('sinav', '💪', '#F97316', 'spor', { kind: 'count', targetValue: 30, unitKey: 'tekrar' }),
  d('esneme', '🤸', '#14B8A6', 'spor'),
  d('kosu', '🏃', '#10B981', 'spor', { recurrenceType: 'weekly_n', periodTargetN: 2, weight: 2 }),
  // Zihin / öğrenme
  d('kitap', '📚', '#06B6D4', 'ogrenme', { kind: 'count', targetValue: 20, unitKey: 'sayfa' }),
  d('dil', '🗣️', '#3B82F6', 'ogrenme', { kind: 'count', targetValue: 15, unitKey: 'dk' }),
  d('meditasyon', '🧘', '#14B8A6', 'zihin', { kind: 'count', targetValue: 10, unitKey: 'dk' }),
  d('gunluk', '✍️', '#8B5CF6', 'zihin'),
  d('ekran_yok', '📵', '#6C5CE7', 'zihin', { reminderTime: '22:00' }),
  // İş
  d('derin_calisma', '🧠', '#3B82F6', 'is', { recurrenceType: 'weekdays', recurrenceDays: [1, 2, 3, 4, 5], kind: 'count', targetValue: 2, unitKey: 'saat' }),
  d('eposta_sifir', '📧', '#06B6D4', 'is', { recurrenceType: 'weekdays', recurrenceDays: [1, 2, 3, 4, 5] }),
  d('haftalik_plan', '🗓️', '#6C5CE7', 'is', { recurrenceType: 'weekdays', recurrenceDays: [1], weight: 2 }),
  d('aylik_rapor', '📈', '#F59E0B', 'is', { recurrenceType: 'monthly_n', periodTargetN: 1, weight: 3 }),
  // Kişisel / ev / sosyal / finans
  d('aile_ara', '📞', '#EC4899', 'sosyal', { recurrenceType: 'weekly_n', periodTargetN: 2, weight: 2 }),
  d('ev_topla', '🧹', '#F97316', 'ev', { kind: 'count', targetValue: 10, unitKey: 'dk' }),
  d('harcama_yaz', '💰', '#84CC16', 'finans'),
  d('butce', '🧾', '#84CC16', 'finans', { recurrenceType: 'monthly_day', recurrenceDays: [1], weight: 3 }),
  d('hobi', '🎸', '#8B5CF6', 'kisisel', { recurrenceType: 'weekly_n', periodTargetN: 2, weight: 2 }),
  d('sukur', '🙏', '#F59E0B', 'kisisel'),
];
