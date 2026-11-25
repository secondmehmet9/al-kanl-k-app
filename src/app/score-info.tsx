import React from 'react';

import { Card, Screen, Txt } from '@/components/ui';
import { t } from '@/i18n';
import type { TKey } from '@/i18n';

const ITEMS: [string, TKey, TKey][] = [
  ['✅', 'scoreInfo.q1', 'scoreInfo.a1'],
  ['💧', 'scoreInfo.q2', 'scoreInfo.a2'],
  ['📅', 'scoreInfo.q3', 'scoreInfo.a3'],
  ['⚖️', 'scoreInfo.q4', 'scoreInfo.a4'],
  ['⏭', 'scoreInfo.q5', 'scoreInfo.a5'],
  ['🔥', 'scoreInfo.q6', 'scoreInfo.a6'],
];

export default function ScoreInfoScreen() {
  return (
    <Screen padTop={false}>
      <Txt v="dim">{t('scoreInfo.intro')}</Txt>
      {ITEMS.map(([icon, q, a]) => (
        <Card key={q}>
          <Txt v="h3">
            {icon} {t(q)}
          </Txt>
          <Txt v="dim">{t(a)}</Txt>
        </Card>
      ))}
    </Screen>
  );
}
