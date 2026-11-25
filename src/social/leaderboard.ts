/**
 * Challenge liderlik tablosu (saf fonksiyon). Rapor 3.5:
 *  - Katılımcılar AYNI formül ve AYNI pencerede (challenge başlangıç–bitiş) karşılaştırılır.
 *  - Yalnız challenge'ın ortak görevleri baz alınır (kişisel görevler dahil değil).
 *  - Eşitlikte önce seri (streak), sonra toplam tamamlanma sayısı kırar.
 * Skor, uygulamanın kendi skor motoruyla (domain/scoring) ham check-in kayıtlarından hesaplanır.
 */
import { minKey } from '@/domain/dates';
import { computeScore, dayRatio } from '@/domain/scoring';
import { currentStreak, totalCompletions } from '@/domain/streaks';
import type { LogsByTask, Task } from '@/domain/types';

import type { Challenge, ChallengeLog, ChallengeMember, ChallengeTask } from './types';

export interface LeaderboardRow {
  userId: string;
  displayName: string;
  role: 'owner' | 'member';
  /** 0–100; null = henüz skorlanacak periyot yok */
  score: number | null;
  streak: number;
  completions: number;
  /** Bugünkü durum: tüm challenge görevleri bugün tamam mı (0–1) */
  todayRatio: number;
  rank: number;
}

/** Challenge görevini skor motorunun anlayacağı Task'a çevir (challenge penceresiyle sınırlı). */
export function challengeTaskAsTask(ct: ChallengeTask, challenge: Pick<Challenge, 'id' | 'startDate' | 'endDate'>): Task {
  return {
    id: ct.id,
    title: ct.title,
    icon: ct.icon,
    color: ct.color,
    category: ct.category,
    kind: ct.kind,
    targetValue: ct.targetValue,
    unit: ct.unit,
    recurrenceType: ct.recurrenceType,
    recurrenceDays: ct.recurrenceDays,
    periodTargetN: ct.periodTargetN,
    startDate: challenge.startDate,
    endDate: challenge.endDate,
    weight: ct.weight,
    privacy: 'challenge',
    reminderTime: null,
    pauses: [],
    archived: false,
    sourceTaskId: ct.id,
    challengeId: challenge.id,
    sortOrder: 0,
    createdAt: '',
    updatedAt: '',
  };
}

export function buildLeaderboard(
  challenge: Pick<Challenge, 'id' | 'startDate' | 'endDate'>,
  challengeTasks: ChallengeTask[],
  members: ChallengeMember[],
  logs: ChallengeLog[],
  today: string
): LeaderboardRow[] {
  const tasks = challengeTasks.map((ct) => challengeTaskAsTask(ct, challenge));
  const window = { start: challenge.startDate, end: challenge.endDate };
  const asOf = minKey(today, challenge.endDate);

  const byUser = new Map<string, LogsByTask>();
  for (const l of logs) {
    if (l.date < challenge.startDate || l.date > challenge.endDate) continue;
    let m = byUser.get(l.userId);
    if (!m) byUser.set(l.userId, (m = {}));
    (m[l.challengeTaskId] ??= {})[l.date] = {
      taskId: l.challengeTaskId,
      date: l.date,
      value: l.value,
      status: l.status,
      note: '',
      updatedAt: '',
    };
  }

  const rows = members.map((member) => {
    const userLogs = byUser.get(member.userId) ?? {};
    const { score } = computeScore(tasks, userLogs, window, asOf);
    let streak = 0;
    let completions = 0;
    let todaySum = 0;
    for (const task of tasks) {
      streak = Math.max(streak, currentStreak(task, userLogs[task.id], asOf));
      completions += totalCompletions(task, userLogs[task.id]);
      todaySum += dayRatio(task, userLogs[task.id]?.[today]) ?? 0;
    }
    return {
      userId: member.userId,
      displayName: member.displayName,
      role: member.role,
      score,
      streak,
      completions,
      todayRatio: tasks.length ? todaySum / tasks.length : 0,
      rank: 0,
    };
  });

  const cmp = (a: LeaderboardRow, b: LeaderboardRow) =>
    (b.score ?? -1) - (a.score ?? -1) || b.streak - a.streak || b.completions - a.completions;
  rows.sort((a, b) => cmp(a, b) || a.displayName.localeCompare(b.displayName, 'tr'));
  rows.forEach((row, i) => {
    row.rank = i > 0 && cmp(rows[i - 1], row) === 0 ? rows[i - 1].rank : i + 1;
  });
  return rows;
}
