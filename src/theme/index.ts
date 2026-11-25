import { useColorScheme } from 'react-native';

import { useAppState } from '@/data/store';

import { dark, light, Palette } from './tokens';

export * from './tokens';

/** Koyu tema VARSAYILAN: yalnızca kullanıcı "Açık" seçtiyse (ya da "Sistem" seçip sistem açıksa) açık tema. */
export function useTheme(): Palette {
  const system = useColorScheme();
  const pref = useAppState((s) => s.settings.theme);
  const mode = pref === 'system' ? (system ?? 'dark') : pref;
  return mode === 'light' ? light : dark;
}
