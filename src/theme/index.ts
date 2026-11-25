import { useColorScheme } from 'react-native';

import { useAppState } from '@/data/store';

export interface Palette {
  dark: boolean;
  bg: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textDim: string;
  textFaint: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  success: string;
  warning: string;
  danger: string;
  track: string;
}

export const light: Palette = {
  dark: false,
  bg: '#F4F5FA',
  card: '#FFFFFF',
  cardAlt: '#EEF0F7',
  border: '#E3E6EF',
  text: '#11131A',
  textDim: '#5B6072',
  textFaint: '#9AA0B2',
  primary: '#6C5CE7',
  primarySoft: '#ECE9FF',
  onPrimary: '#FFFFFF',
  success: '#12B76A',
  warning: '#F59E0B',
  danger: '#EF4444',
  track: '#E6E8F0',
};

export const dark: Palette = {
  dark: true,
  bg: '#0B0D14',
  card: '#151824',
  cardAlt: '#1D2130',
  border: '#262B3D',
  text: '#F3F4F8',
  textDim: '#A4A9BD',
  textFaint: '#6A7088',
  primary: '#8B7DFF',
  primarySoft: '#252046',
  onPrimary: '#FFFFFF',
  success: '#32D583',
  warning: '#FBBF24',
  danger: '#F87171',
  track: '#232838',
};

export function useTheme(): Palette {
  const system = useColorScheme();
  const pref = useAppState((s) => s.settings.theme);
  const mode = pref === 'system' ? (system ?? 'light') : pref;
  return mode === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

/** Hex renge alfa ekle (#RRGGBB → #RRGGBBAA). */
export function alpha(hex: string, a: number): string {
  const v = Math.round(Math.min(1, Math.max(0, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex.length === 7 ? `${hex}${v}` : hex;
}

/** Skor rengi: düşük kırmızı → orta turuncu → yüksek yeşil. */
export function scoreColor(p: Palette, score: number | null): string {
  if (score === null) return p.textFaint;
  if (score >= 80) return p.success;
  if (score >= 50) return p.warning;
  return p.danger;
}
