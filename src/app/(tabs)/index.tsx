import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TaskRow } from '@/components/TaskRow';
import { Button, Card, EmptyState, ProgressBar, Row, Screen, SectionTitle, Streak, Txt } from '@/components/ui';
import { useToday } from '@/components/useToday';
import { useAppState } from '@/data/store';
import { canEditDate } from '@/domain/checkin';
import { addDays, isoWeekday, parts } from '@/domain/dates';
import { isCurrentlyPaused, isDayBased, isVisibleOn } from '@/domain/recurrence';
import { dailyScore, dayRatio, weeklyScore } from '@/domain/scoring';
import { currentStreak } from '@/domain/streaks';
import { BACKFILL_DAYS } from '@/domain/types';
import { t } from '@/i18n';
import { formatLongDate, formatPct, weekdayShort } from '@/i18n/format';
import { liveScoreTone, radius, scoreTone, space, useTheme } from '@/theme';

export default function TodayScreen() {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const tasks = useAppState((s) => s.tasks);
  const logs = useAppState((s) => s.logs);
  const name = useAppState((s) => s.settings.displayName);
  const [offset, setOffset] = useState(0); // 0 = bugün, 1 = dün …
  const date = addDays(today, -offset);
  const editable = canEditDate(date, today);

  const visible = useMemo(() => tasks.filter((x) => isVisibleOn(x, date)), [tasks, date]);
  const dayTasks = visible.filter(isDayBased);
  const periodTasks = visible.filter((x) => !isDayBased(x));
  const pausedCount = tasks.filter((x) => !x.archived && isCurrentlyPaused(x)).length;

  const score = dailyScore(tasks, logs, date, today).score;
  const week = weeklyScore(tasks, logs, date, today).score;
  const doneCount = dayTasks.filter((x) => (dayRatio(x, logs[x.id]?.[date]) ?? 0) >= 1).length;
  const skippedCount = dayTasks.filter((x) => logs[x.id]?.[date]?.status === 'skipped').length;
  const dueCount = dayTasks.length - skippedCount;
  const bestStreak = tasks.reduce((m, x) => Math.max(m, x.archived ? 0 : currentStreak(x, logs[x.id], today)), 0);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const key = addDays(today, -(6 - i));
        return { key, off: 6 - i, score: dailyScore(tasks, logs, key, today).score };
      }),
    [today, tasks, logs]
  );

  const hasAny = tasks.some((x) => !x.archived);
  const mainTone = offset === 0 ? liveScoreTone(p, score) : scoreTone(p, score);

  return (
    <Screen
      footer={
        hasAny ? (
          <Pressable
            testID="fab-add"
            accessibilityRole="button"
            accessibilityLabel={t('today.add')}
            onPress={() => router.push('/task/new')}
            style={({ pressed }) => ({
              position: 'absolute',
              right: space.lg,
              bottom: space.lg,
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: pressed ? p.primaryPressed : p.primary,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: p.primary,
              shadowOpacity: 0.4,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            })}>
            <Text style={{ color: p.onPrimary, fontSize: 32, fontWeight: '500', marginTop: -2 }}>+</Text>
          </Pressable>
        ) : null
      }>
      <View style={{ gap: 2 }}>
        <Txt v="dim">{formatLongDate(date)}</Txt>
        <Txt v="h1">{offset === 0 ? (name ? t('today.hello', { name }) : t('today.title')) : offset === 1 ? t('today.yesterday') : t('today.daysAgo', { n: offset })}</Txt>
      </View>

      <Row gap={6}>
        {days.map((d) => {
          const sel = d.off === offset;
          const c = (d.off === 0 ? liveScoreTone(p, d.score) : scoreTone(p, d.score)).fill;
          return (
            <Pressable
              key={d.key}
              accessibilityRole="button"
              accessibilityState={{ selected: sel }}
              accessibilityLabel={formatLongDate(d.key)}
              onPress={() => setOffset(d.off)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 8,
                borderRadius: radius.md,
                backgroundColor: sel ? p.primarySoft : p.card,
                borderWidth: sel ? 1.5 : 1,
                borderColor: sel ? p.primary : p.border,
                gap: 2,
                opacity: d.off > BACKFILL_DAYS && !sel ? 0.6 : 1,
              }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: sel ? p.text : p.textDim }}>{weekdayShort(isoWeekday(d.key))}</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: p.text }}>{parts(d.key).d}</Text>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: d.score === null ? 'transparent' : c }} />
            </Pressable>
          );
        })}
      </Row>

      {hasAny ? (
        <Card>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Txt v="label">{offset === 0 ? t('today.scoreToday') : t('today.scoreDay')}</Txt>
              <Text testID="daily-score" style={{ fontSize: 46, fontWeight: '800', color: mainTone.text, letterSpacing: -1 }}>
                {formatPct(score)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Streak pill n={bestStreak} label={t('today.bestStreak', { n: bestStreak })} />
              <Txt v="small">{t('today.weekScore', { pct: formatPct(week) })}</Txt>
            </View>
          </Row>
          <ProgressBar value={(score ?? 0) / 100} color={mainTone.fill} height={10} />
          <Txt v="dim">
            {dueCount > 0 ? t('today.doneOf', { done: doneCount, total: dueCount }) : t('today.nothingDue')}
            {skippedCount > 0 ? ` · ${t('today.skippedN', { n: skippedCount })}` : ''}
          </Txt>
        </Card>
      ) : null}

      {!editable ? (
        <View style={{ backgroundColor: p.cardAlt, borderRadius: radius.md, padding: space.md }}>
          <Txt v="small">🔒 {t('today.lockedBanner', { n: BACKFILL_DAYS })}</Txt>
        </View>
      ) : null}

      {!hasAny ? (
        <EmptyState icon="🌱" title={t('today.emptyTitle')} body={t('today.emptyBody')}>
          <Button testID="empty-templates" title={t('today.pickTemplate')} icon="✨" onPress={() => router.push('/templates')} style={{ alignSelf: 'stretch' }} />
          <Button testID="empty-add" title={t('today.addOwn')} kind="soft" onPress={() => router.push('/task/new')} style={{ alignSelf: 'stretch' }} />
        </EmptyState>
      ) : null}

      {dayTasks.length > 0 ? <SectionTitle>{t('today.sectionDaily')}</SectionTitle> : null}
      {dayTasks.map((task) => (
        <TaskRow key={task.id} task={task} date={date} today={today} editable={editable} />
      ))}

      {periodTasks.length > 0 ? <SectionTitle>{t('today.sectionPeriod')}</SectionTitle> : null}
      {periodTasks.map((task) => (
        <TaskRow key={task.id} task={task} date={date} today={today} editable={editable} />
      ))}

      {hasAny && visible.length === 0 ? (
        <Card style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 34 }}>🎉</Text>
          <Txt v="dim" center>
            {t('today.noneScheduled')}
          </Txt>
        </Card>
      ) : null}

      {hasAny ? (
        <Row style={{ justifyContent: 'center', marginTop: space.sm }} wrap>
          <Button small kind="ghost" icon="✨" title={t('today.templates')} onPress={() => router.push('/templates')} />
          {pausedCount > 0 ? <Txt v="small">{t('today.pausedN', { n: pausedCount })}</Txt> : null}
        </Row>
      ) : null}
      <View style={{ height: insets.bottom + 40 }} />
    </Screen>
  );
}
