/**
 * Basit i18n: Türkçe ana dil. İngilizce (en.ts) sonradan doldurulacak — eksik anahtar Türkçe'ye düşer.
 * Kullanım: t('today.title') veya t('notif.titleMany', { n: 3 })
 */
import { getLocales } from 'expo-localization';

import { en } from './en';
import { tr } from './tr';

export type TKey = keyof typeof tr;
export type Lang = 'tr' | 'en';

const dicts: Record<Lang, Partial<Record<TKey, string>>> = { tr, en };

function detect(): Lang {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === 'en' && Object.keys(en).length > 50 ? 'en' : 'tr';
  } catch {
    return 'tr';
  }
}

let lang: Lang = detect();
export const getLang = () => lang;
export const setLang = (l: Lang) => {
  lang = l;
};

export function t(key: TKey, params?: Record<string, string | number>): string {
  let s: string = dicts[lang][key] ?? tr[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Dinamik anahtar (ör. `cat.${id}`); yoksa fallback döner. */
export function tDyn(key: string, fallback: string = key): string {
  return (dicts[lang] as Record<string, string | undefined>)[key] ?? (tr as Record<string, string | undefined>)[key] ?? fallback;
}
