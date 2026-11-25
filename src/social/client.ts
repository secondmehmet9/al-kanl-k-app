import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { socialEnabled, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

let client: SupabaseClient | null = null;

/** Supabase istemcisi. Bayrak kapalıysa null — çağıran taraf socialEnabled'ı kontrol etmeli. */
export function getSupabase(): SupabaseClient | null {
  if (!socialEnabled) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Sideload'da universal link yok → giriş e-postadaki 6 haneli KOD ile yapılır.
      detectSessionInUrl: false,
    },
  });
  return client;
}

export function requireSupabase(): SupabaseClient {
  const c = getSupabase();
  if (!c) throw new Error('social_disabled');
  return c;
}
