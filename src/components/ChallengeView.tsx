import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { diffDays, minKey } from '@/domain/dates';
import { t } from '@/i18n';
import { formatDayMonth, formatNum, formatPct, recurrenceLabel } from '@/i18n/format';
import { buildLeaderboard } from '@/social/leaderboard';
import { ChallengeDetail, REACTION_EMOJIS } from '@/social/types';
import { alpha, radius, scoreTone, space, useTheme } from '@/theme';

import { Card, ProgressBar, Row, SectionTitle, Txt } from './ui';

const MEDALS = ['🥇', '🥈', '🥉'];

/** Challenge detayının saf görünümü — gerçek veriyle de örnek (demo) veriyle de aynı bileşen. */
export function ChallengeView({
  detail,
  today,
  myUserId,
  onReact,
  onCopyCode,
}: {
  detail: ChallengeDetail;
  today: string;
  myUserId: string | null;
  onReact?: (toUser: string, emoji: string) => void;
  onCopyCode?: () => void;
}) {
  const p = useTheme();
  const { challenge, tasks, members, logs, reactions } = detail;
  const rows = buildLeaderboard(challenge, tasks, members, logs, today);
  const total = diffDays(challenge.startDate, challenge.endDate) + 1;
  const started = today >= challenge.startDate;
  const ended = today > challenge.endDate;
  const elapsed = started ? diffDays(challenge.startDate, minKey(today, challenge.endDate)) + 1 : 0;
  const status = ended ? t('ch.ended') : started ? t('ch.dayOf', { day: elapsed, total }) : t('ch.startsIn', { n: diffDays(today, challenge.startDate) });

  return (
    <View style={{ gap: space.md }}>
      <Card>
        <Txt v="h2">🏆 {challenge.title}</Txt>
        {challenge.description ? <Txt v="dim">{challenge.description}</Txt> : null}
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="small">
            {formatDayMonth(challenge.startDate)} – {formatDayMonth(challenge.endDate)}
          </Txt>
          <Txt v="small" style={{ fontWeight: '700' }} color={ended ? p.textDim : p.socialText}>
            {status}
          </Txt>
        </Row>
        <ProgressBar value={elapsed / total} color={p.social} height={6} />
        {tasks.map((ct) => (
          <Row key={ct.id} gap={space.md} style={{ marginTop: 4 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: alpha(ct.color, p.dark ? 0.28 : 0.15), alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 19 }}>{ct.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: '700' }}>{ct.title}</Txt>
              <Txt v="small">
                {recurrenceLabel(ct)}
                {ct.kind === 'count' ? ` · ${formatNum(ct.targetValue)} ${ct.unit}` : ''}
              </Txt>
            </View>
          </Row>
        ))}
      </Card>

      <Pressable accessibilityRole="button" accessibilityLabel={t('ch.copyCode')} onPress={onCopyCode} disabled={!onCopyCode}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: p.socialSoft, borderColor: 'transparent' }}>
          <View style={{ flex: 1 }}>
            <Txt v="label" color={p.socialText}>
              {t('ch.joinCode')}
            </Txt>
            <Txt v="small">{t('ch.joinCodeHint')}</Txt>
          </View>
          <Text style={{ fontSize: 24, fontWeight: '800', letterSpacing: 3, color: p.socialText }}>{challenge.joinCode}</Text>
        </Card>
      </Pressable>

      <SectionTitle>{t('ch.leaderboard', { n: members.length })}</SectionTitle>
      {rows.map((row) => {
        const me = row.userId === myUserId;
        const first = row.rank === 1 && row.score !== null;
        const tone = scoreTone(p, row.score);
        const todays = reactions.filter((r) => r.toUser === row.userId && r.date === today);
        const counts = REACTION_EMOJIS.map((e) => ({ e, n: todays.filter((r) => r.emoji === e).length, mine: todays.some((r) => r.emoji === e && r.fromUser === myUserId) }));
        return (
          <View
            key={row.userId}
            style={{ backgroundColor: p.card, borderRadius: radius.lg, borderWidth: me || first ? 2 : 1, borderColor: first ? p.gold : me ? p.social : p.border, padding: space.md, gap: space.sm }}>
            <Row gap={space.md}>
              <Text style={{ fontSize: row.rank <= 3 && row.score !== null ? 26 : 16, width: 34, textAlign: 'center', fontWeight: '800', color: p.textDim }}>
                {row.rank <= 3 && row.score !== null ? MEDALS[row.rank - 1] : `${row.rank}.`}
              </Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="h3" numberOfLines={1}>
                  {row.displayName}
                  {me ? ` (${t('ch.you')})` : ''}
                </Txt>
                <Txt v="small">
                  🔥 {row.streak} · ✓ {row.completions} · {row.todayRatio >= 1 ? t('ch.todayDone') : row.todayRatio > 0 ? t('ch.todayPartial', { pct: Math.round(row.todayRatio * 100) }) : t('ch.todayNotYet')}
                </Txt>
              </View>
              <Text style={{ fontSize: 24, fontWeight: '800', color: first ? p.goldText : tone.text }}>{formatPct(row.score)}</Text>
            </Row>
            <ProgressBar value={(row.score ?? 0) / 100} color={first ? p.gold : tone.fill} height={6} />
            <Row gap={6} wrap>
              {counts.map(({ e, n, mine }) =>
                me ? (
                  n > 0 ? (
                    <View key={e} style={{ flexDirection: 'row', gap: 3, backgroundColor: p.cardAlt, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 13 }}>{e}</Text>
                      <Txt v="small" style={{ fontWeight: '700' }}>{n}</Txt>
                    </View>
                  ) : null
                ) : (
                  <Pressable
                    key={e}
                    accessibilityRole="button"
                    accessibilityLabel={t('ch.react', { emoji: e, name: row.displayName })}
                    disabled={!onReact || mine}
                    onPress={() => onReact?.(row.userId, e)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      gap: 3,
                      backgroundColor: mine ? alpha(p.social, 0.3) : p.cardAlt,
                      borderRadius: radius.pill,
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      opacity: pressed ? 0.6 : 1,
                    })}>
                    <Text style={{ fontSize: 13 }}>{e}</Text>
                    {n > 0 ? <Txt v="small" style={{ fontWeight: '700' }}>{n}</Txt> : null}
                  </Pressable>
                )
              )}
              {me && todays.length === 0 ? <Txt v="small">{t('ch.noReactions')}</Txt> : null}
            </Row>
          </View>
        );
      })}
      <Txt v="small" center>
        {t('ch.fairNote')}
      </Txt>
    </View>
  );
}
