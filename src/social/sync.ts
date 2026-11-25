/**
 * Yerel → challenge senkronu (offline-first): kaynak her zaman cihazdaki kayıttır.
 *  - Challenge'a bağlı bir görevde check-in değişince ilgili gün sunucuya yazılır (ağ yoksa sessizce atlanır).
 *  - Challenge ekranı açılınca o görevin tüm yerel kayıtları toplu gönderilir → çevrimdışı yapılanlar da yetişir.
 */
import { getState, onLogChanged } from '@/data/store';
import type { Task } from '@/domain/types';

import { deleteChallengeLog, pushChallengeLogs } from './api';
import { socialEnabled } from './config';
import { getCurrentUserId, initSessionTracking } from './session';
import type { Challenge } from './types';

/** Bu challenge görevine bağlı yerel görev (varsa). */
export function findLocalTask(challengeId: string, challengeTaskId: string): Task | undefined {
  return getState().tasks.find((t) => t.challengeId === challengeId && t.sourceTaskId === challengeTaskId);
}

export async function pushAllLocalLogs(userId: string, challenge: Pick<Challenge, 'id' | 'startDate' | 'endDate'>, challengeTaskId: string): Promise<void> {
  const local = findLocalTask(challenge.id, challengeTaskId);
  if (!local) return;
  const logs = Object.values(getState().logs[local.id] ?? {});
  await pushChallengeLogs(userId, challenge, challengeTaskId, logs);
}

let started = false;
export function startChallengeSync() {
  if (!socialEnabled || started) return;
  started = true;
  initSessionTracking();
  onLogChanged((task, date, log) => {
    const userId = getCurrentUserId();
    if (!userId || !task.challengeId || !task.sourceTaskId) return;
    const op = log
      ? // Tarih aralığını sunucu (RLS) denetler; burada süzmeye gerek yok.
        pushChallengeLogs(userId, { id: task.challengeId, startDate: '0000-01-01', endDate: '9999-12-31' }, task.sourceTaskId, [log])
      : deleteChallengeLog(userId, task.sourceTaskId, date);
    op.catch(() => {
      // çevrimdışı / aralık dışı → challenge ekranı açılınca toplu eşitlenir
    });
  });
}
