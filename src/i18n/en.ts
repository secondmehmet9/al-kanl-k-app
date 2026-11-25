import type { tr } from './tr';

/** İngilizce çeviriler sonra eklenecek. Boş anahtarlar Türkçe'ye düşer. */
export const en: Partial<Record<keyof typeof tr, string>> = {};
