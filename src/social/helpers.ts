import { addTask } from '@/data/store';
import { t, tDyn } from '@/i18n';

import { SocialError } from './api';
import { findLocalTask } from './sync';
import type { ChallengeDetail } from './types';

export function socialErrorText(e: unknown): string {
  const code = e instanceof SocialError ? e.code : 'unknown';
  return tDyn(`social.err.${code}`, t('social.err.unknown'));
}

/** Challenge görevlerini bu cihaza (yerel takip listesine) ekle; zaten varsa dokunma. */
export function ensureLocalTasks(detail: ChallengeDetail, today: string) {
  for (const ct of detail.tasks) {
    if (findLocalTask(detail.challenge.id, ct.id)) continue;
    addTask({
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
      startDate: detail.challenge.startDate > today ? detail.challenge.startDate : today,
      endDate: detail.challenge.endDate,
      weight: ct.weight,
      privacy: 'challenge',
      reminderTime: null,
      sourceTaskId: ct.id,
      challengeId: detail.challenge.id,
    });
  }
}
