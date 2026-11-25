import { addDays } from '@/domain/dates';

import type { ChallengeDetail, ChallengeLog } from './types';

/** Sosyal katman bağlanmadan arayüzü göstermek için ÖRNEK veri (sunucuya gitmez, kaydedilmez). */
export function demoChallenge(today: string, myName: string): ChallengeDetail {
  const start = addDays(today, -9);
  const members = [
    { userId: 'me', displayName: myName, role: 'owner' as const },
    { userId: 'u2', displayName: 'Ahmet', role: 'member' as const },
    { userId: 'u3', displayName: 'Elif', role: 'member' as const },
    { userId: 'u4', displayName: 'Marko', role: 'member' as const },
  ];
  // 10 günlük desen: her kişi için günlük bardak sayısı
  const pattern: Record<string, number[]> = {
    me: [8, 8, 6, 8, 8, 8, 4, 8, 8, 5],
    u2: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
    u3: [8, 4, 8, 0, 8, 8, 8, 6, 8, 0],
    u4: [3, 8, 0, 8, 2, 0, 8, 8, 0, 0],
  };
  const logs: ChallengeLog[] = [];
  for (const m of members) {
    pattern[m.userId].forEach((value, i) => {
      if (value > 0) logs.push({ challengeTaskId: 'demo-task', userId: m.userId, date: addDays(start, i), value, status: value >= 8 ? 'done' : 'partial' });
    });
  }
  return {
    challenge: {
      id: 'demo',
      ownerId: 'me',
      title: '30 Gün Su Challenge',
      description: 'Her gün 8 bardak su. Kaybeden kahve ısmarlar ☕',
      startDate: start,
      endDate: addDays(start, 29),
      joinCode: 'SU8K2M',
      status: 'active',
    },
    tasks: [
      {
        id: 'demo-task', challengeId: 'demo', title: 'Su iç', icon: '💧', color: '#3B82F6', category: 'saglik',
        kind: 'count', targetValue: 8, unit: 'bardak', recurrenceType: 'daily', recurrenceDays: [], periodTargetN: 1, weight: 1,
      },
    ],
    members,
    logs,
    reactions: [
      { id: 'r1', fromUser: 'u2', toUser: 'me', date: today, emoji: '🔥' },
      { id: 'r2', fromUser: 'u3', toUser: 'me', date: today, emoji: '👏' },
      { id: 'r3', fromUser: 'me', toUser: 'u2', date: today, emoji: '💪' },
    ],
  };
}
