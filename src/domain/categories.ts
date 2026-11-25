export interface Category {
  id: string;
  icon: string;
  color: string;
}

/** Görev kategorileri. Etiketler i18n'de: `cat.<id>` */
export const CATEGORIES: Category[] = [
  { id: 'sabah', icon: '🌅', color: '#F59E0B' },
  { id: 'saglik', icon: '❤️', color: '#EF4444' },
  { id: 'spor', icon: '🏃', color: '#10B981' },
  { id: 'is', icon: '💼', color: '#3B82F6' },
  { id: 'kisisel', icon: '✨', color: '#8B5CF6' },
  { id: 'ogrenme', icon: '📚', color: '#06B6D4' },
  { id: 'zihin', icon: '🧘', color: '#14B8A6' },
  { id: 'ev', icon: '🏠', color: '#F97316' },
  { id: 'sosyal', icon: '👥', color: '#EC4899' },
  { id: 'finans', icon: '💰', color: '#84CC16' },
];

export const categoryById = (id: string): Category => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[4];

export const TASK_COLORS = [
  '#6C5CE7', '#3B82F6', '#06B6D4', '#10B981', '#84CC16',
  '#F59E0B', '#F97316', '#EF4444', '#EC4899', '#8B5CF6',
];

export const TASK_ICONS = [
  '✅', '⏰', '🌅', '💧', '🏃', '🏋️', '🧘', '🚶', '🚴', '🏊',
  '🥗', '🍎', '💊', '😴', '🦷', '🚿', '📚', '✍️', '🧠', '🎧',
  '💼', '📈', '📧', '📞', '🧹', '🛒', '🐕', '🌱', '💰', '🙏',
  '❤️', '👨‍👩‍👧', '🎸', '🎨', '🚭', '📵', '☕', '🧴', '🗣️', '⭐',
];
