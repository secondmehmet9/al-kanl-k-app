import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ChallengeView } from '@/components/ChallengeView';
import { Screen, Txt } from '@/components/ui';
import { useToday } from '@/components/useToday';
import { useAppState } from '@/data/store';
import { t } from '@/i18n';
import { demoChallenge } from '@/social/demo';
import type { ChallengeReaction } from '@/social/types';
import { radius, space, useTheme } from '@/theme';

export default function DemoChallengeScreen() {
  const p = useTheme();
  const today = useToday();
  const name = useAppState((st) => st.settings.displayName);
  const base = useMemo(() => demoChallenge(today, name || 'Ben'), [today, name]);
  const [extra, setExtra] = useState<ChallengeReaction[]>([]);
  return (
    <Screen padTop={false}>
      <View style={{ backgroundColor: p.socialSoft, borderRadius: radius.md, padding: space.md }}>
        <Txt v="small" color={p.socialText} style={{ fontWeight: '600' }}>
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
