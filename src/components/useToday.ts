import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { todayKey } from '@/domain/dates';

/** Bugünün tarihi; gece yarısı geçince veya uygulama öne gelince güncellenir. */
export function useToday(): string {
  const [today, setToday] = useState(() => todayKey());
  useEffect(() => {
    const check = () => setToday((prev) => (prev === todayKey() ? prev : todayKey()));
    const timer = setInterval(check, 30_000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return today;
}
