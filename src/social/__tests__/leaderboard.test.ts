import { buildLeaderboard } from '../leaderboard';
import type { ChallengeLog, ChallengeMember, ChallengeTask } from '../types';

const challenge = { id: 'c1', startDate: '2026-11-02', endDate: '2026-11-15' };
const water: ChallengeTask = {
  id: 'ct1', challengeId: 'c1', title: 'Su', icon: '💧', color: '#000000', category: 'saglik',
  kind: 'count', targetValue: 8, unit: 'bardak', recurrenceType: 'daily', recurrenceDays: [], periodTargetN: 1, weight: 1,
};
const members: ChallengeMember[] = [
  { userId: 'a', displayName: 'Ali', role: 'owner' },
  { userId: 'b', displayName: 'Berk', role: 'member' },
  { userId: 'c', displayName: 'Cem', role: 'member' },
];
const log = (userId: string, day: number, value: number, status: ChallengeLog['status'] = value >= 8 ? 'done' : 'partial'): ChallengeLog => ({
  challengeTaskId: 'ct1', userId, date: `2026-11-${String(day).padStart(2, '0')}`, value, status,
});

describe('challenge liderlik tablosu', () => {
  it('yüzde skora göre sıralar; kısmi kredi sayılır', () => {
    const logs = [
      log('a', 2, 8), log('a', 3, 8), log('a', 4, 4), log('a', 5, 8), // (1+1+.5+1)/4 = 87.5
      log('b', 2, 8), log('b', 3, 8), log('b', 4, 8), log('b', 5, 8), // 100
      log('c', 2, 8), // 25
    ];
    const rows = buildLeaderboard(challenge, [water], members, logs, '2026-11-05');
    expect(rows.map((r) => r.displayName)).toEqual(['Berk', 'Ali', 'Cem']);
    expect(rows.map((r) => Math.round((r.score ?? 0) * 10) / 10)).toEqual([100, 87.5, 25]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(rows[0].streak).toBe(4);
    expect(rows[0].todayRatio).toBe(1);
    expect(rows[2].todayRatio).toBe(0);
  });

  it('eşit skorda seri, sonra tamamlanma sayısı kırar; tam eşitlikte aynı sıra', () => {
    const logs = [
      log('a', 2, 8), log('a', 3, 0, 'missed'), // %50, seri 0
      log('b', 2, 0, 'missed'), log('b', 3, 8), // %50, seri 1
      log('c', 2, 0, 'missed'), log('c', 3, 8), // %50, seri 1 → b ile tam eşit
    ];
    const rows = buildLeaderboard(challenge, [water], members, logs, '2026-11-04');
    expect(rows.map((r) => [r.displayName, r.rank])).toEqual([['Berk', 1], ['Cem', 1], ['Ali', 3]]);
  });

  it('atla hakkı skoru düşürmez; pencere dışı kayıtlar yok sayılır', () => {
    const logs = [log('a', 2, 8), log('a', 3, 0, 'skipped'), log('a', 1, 8), log('b', 2, 8), log('b', 3, 0, 'missed')];
    const rows = buildLeaderboard(challenge, [water], members.slice(0, 2), logs, '2026-11-03');
    expect(rows[0]).toMatchObject({ displayName: 'Ali', score: 100, completions: 1 });
    expect(rows[1]).toMatchObject({ displayName: 'Berk', score: 50 });
  });

  it('challenge bittikten sonra skor bitiş gününde donar', () => {
    const logs = [log('a', 2, 8)];
    const during = buildLeaderboard(challenge, [water], members.slice(0, 1), logs, '2026-11-15');
    const after = buildLeaderboard(challenge, [water], members.slice(0, 1), logs, '2026-12-20');
    expect(after[0].score).toBeCloseTo(during[0].score!, 6);
    expect(after[0].score).toBeCloseTo(100 / 14, 6);
  });

  it('başlamamış challenge: skor null, herkes 1. sırada', () => {
    const rows = buildLeaderboard(challenge, [water], members, [], '2026-11-01');
    expect(rows.every((r) => r.score === null && r.rank === 1)).toBe(true);
  });

  it('haftada N görevli challenge: hafta kapanınca skora girer', () => {
    const gym: ChallengeTask = { ...water, id: 'ct2', kind: 'boolean', targetValue: 1, recurrenceType: 'weekly_n', periodTargetN: 3 };
    const l = (userId: string, day: number): ChallengeLog => ({ challengeTaskId: 'ct2', userId, date: `2026-11-${String(day).padStart(2, '0')}`, value: 1, status: 'done' });
    const logs = [l('a', 2), l('a', 4), l('a', 6), l('b', 3)];
    expect(buildLeaderboard(challenge, [gym], members.slice(0, 2), logs, '2026-11-07').every((r) => r.score === null)).toBe(true);
    const rows = buildLeaderboard(challenge, [gym], members.slice(0, 2), logs, '2026-11-08');
    expect(rows[0]).toMatchObject({ displayName: 'Ali', score: 100 });
    expect(rows[1].score).toBeCloseTo(33.33, 1);
  });
});
