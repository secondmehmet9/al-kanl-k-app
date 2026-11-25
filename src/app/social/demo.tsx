import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ChallengeView } from '@/components/ChallengeView';
import { Screen, Txt } from '@/components/ui';
import { useToday } from '@/components/useToday';
import { t } from '@/i18n';
import { demoChallenge } from '@/social/demo';
import type { ChallengeReaction } from '@/social/types';
import { alpha, radius, space, useTheme } from '@/theme';

export default function DemoChallengeScreen() {
  const p = useTheme();
  const today = useToday();
  const base = useMemo(() => demoChallenge(today), [today]);
  const [extra, setExtra] = useState<ChallengeReaction[]>([]);
  return (
    <Screen padTop={false}>
      <View style={{ backgroundColor: alpha(p.warning, 0.15), borderRadius: radius.md, padding: space.md }}>
        <Txt v="small" color={p.dark ? p.warning : '#92400E'} style={{ fontWeight: '600' }}>
          ⚠️ {t('social.demoBanner')}
        </Txt>
      </View>
      <ChallengeView
        detail={{ ...base, reactions: [...base.reactions, ...extra] }}
        today={today}
        myUserId="me"
        onReact={(toUser, emoji) => setExtra((prev) => [...prev, { id: `x${prev.length}`, fromUser: 'me', toUser, date: today, emoji }])}
      />
    </Screen>
  );
}
