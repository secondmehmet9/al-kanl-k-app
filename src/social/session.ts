import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { getSupabase } from './client';

export interface SessionState {
  loading: boolean;
  userId: string | null;
  email: string | null;
}

let current: Session | null = null;
export const getCurrentUserId = () => current?.user.id ?? null;

let tracking = false;
/** Ekran açık olmasa da oturumu takip et (arka plan senkronu için). */
export function initSessionTracking() {
  const sb = getSupabase();
  if (!sb || tracking) return;
  tracking = true;
  sb.auth
    .getSession()
    .then(({ data }) => {
      current = data.session;
    })
    .catch(() => {});
  sb.auth.onAuthStateChange((_event, s) => {
    current = s;
  });
}

/** Oturum durumu. Sosyal bayrak kapalıysa her zaman { userId: null }. */
export function useSession(): SessionState {
  const sb = getSupabase();
  const [state, setState] = useState<SessionState>({ loading: !!sb, userId: null, email: null });
  useEffect(() => {
    if (!sb) return;
    let alive = true;
    const apply = (s: Session | null) => {
      current = s;
      if (alive) setState({ loading: false, userId: s?.user.id ?? null, email: s?.user.email ?? null });
    };
    sb.auth.getSession().then(({ data }) => apply(data.session)).catch(() => apply(null));
    const { data } = sb.auth.onAuthStateChange((_event, s) => apply(s));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [sb]);
  return state;
}
