/**
 * Sosyal katman özellik bayrağı.
 * EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY (.env) ikisi de doluysa açılır.
 * Boşsa uygulama tamamen yerel çalışır ve sosyal sekme "Yakında / hesap bağla" gösterir.
 */
export const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
export const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

export const socialEnabled = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
