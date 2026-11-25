import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Heatmap } from '@/components/Heatmap';
import { Card, EmptyState, ProgressBar, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { useToday } from '@/components/useToday';
import { useAppState } from '@/data/store';
import { CATEGORIES } from '@/domain/categories';
import { addDays, monthWindow, parts, weekWindow } from '@/domain/dates';
import { computeScore, dailyScore, heatmapDays, monthlyScore, overallScore, weeklyScore } from '@/domain/scoring';
import { currentStreak } from '@/domain/streaks';
import { t, tDyn } from '@/i18n';
import { formatDayMonth, formatPct, monthName } from '@/i18n/format';
import { radius, scoreColor, space, useTheme } from '@/theme';

const WEEKS = 16;
const TREND_WEEKS = 8;

export default function StatsScreen() {
  const p = useTheme();
  const today = useToday();
  const tasks = useAppState((s) => s.tasks);
  const logs = useAppState((s) => s.logs);

  const data = useMemo(() => {
    const day = dailyScore(tasks, logs, today, today).score;
    const week = weeklyScore(tasks, logs, today, today).score;
    const month = monthlyScore(tasks, logs, today, today);
    const overall = overallScore(tasks, logs, today).score;
    const cells = heatmapDays(tasks, logs, today, WEEKS);
    const trend = Array.from({ length: TREND_WEEKS }, (_, i) => {
      const anchor = addDays(today, -7 * (TREND_WEEKS - 1 - i));
      return { start: weekWindow(anchor).start, score: weeklyScore(tasks, logs, anchor, today).score };
    });
    const mWin = monthWindow(today);
    const categories = CATEGORIES.map((c) => ({
      cat: c,
      score: computeScore(tasks.filter((x) => x.category === c.id), logs, mWin, today).score,
    })).filter((x) => x.score !== null);
    const perTask = month.items
      .map((it) => ({ task: tasks.find((x) => x.id === it.taskId)!, pct: it.ratio * 100 }))
      .filter((x) => x.task)
      .sort((a, b) => b.pct - a.pct);
    return { day, week, month: month.score, overall, cells, trend, categories, perTask };
  }, [tasks, logs, today]);

  if (tasks.length === 0) {
    return (
      <Screen>
        <Txt v="h1">{t('stats.title')}</Txt>
        <EmptyState icon="📊" title={t('stats.emptyTitle')} body={t('stats.emptyBody')} />
      </Screen>
    );
  }

  const tiles: [string, number | null][] = [
    [t('stats.today'), data.day],
    [t('stats.week'), data.week],
    [t('stats.month'), data.month],
    [t('stats.overall'), data.overall],
  ];

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="h1">{t('stats.title')}</Txt>
        <Pressable accessibilityRole="button" accessibilityLabel={t('scoreInfo.title')} onPress={() => router.push('/score-info')} hitSlop={10}>
          <Txt color={p.primary} style={{ fontWeight: '700' }}>
            ⓘ {t('stats.how')}
          </Txt>
        </Pressable>
      </Row>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {tiles.map(([label, value]) => (
          <Card key={label} style={{ flexBasis: '47%', flexGrow: 1 }}>
            <Txt v="label">{label}</Txt>
            <Text testID={`score-${label}`} style={{ fontSize: 34, fontWeight: '800', color: scoreColor(p, value), letterSpacing: -0.5 }}>
              {formatPct(value)}
            </Text>
            <ProgressBar value={(value ?? 0) / 100} color={scoreColor(p, value)} height={6} />
          </Card>
        ))}
      </View>

      <SectionTitle>{t('stats.heatmap', { n: WEEKS })}</SectionTitle>
      <Card>
        <Heatmap cells={data.cells} today={today} />
      </Card>

      <SectionTitle>{t('stats.trend', { n: TREND_WEEKS })}</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 130 }}>
          {data.trend.map((w, i) => {
            const last = i === data.trend.length - 1;
            return (
              <View key={w.start} style={{ flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <Txt v="small" style={{ fontSize: 10, fontWeight: '700' }} color={scoreColor(p, w.score)}>
                  {w.score === null ? '' : Math.round(w.score)}
                </Txt>
                <View
                  style={{
                    width: '100%',
                    height: `${Math.max(3, Math.round((w.score ?? 0) * 0.68))}%`,
                    borderRadius: 6,
                    backgroundColor: w.score === null ? p.track : scoreColor(p, w.score),
                    opacity: last ? 1 : 0.75,
                  }}
                />
                <Txt v="small" style={{ fontSize: 9 }} numberOfLines={1}>
                  {formatDayMonth(w.start)}
                </Txt>
              </View>
            );
          })}
        </View>
        <Txt v="small">{t('stats.trendHint')}</Txt>
      </Card>

      {data.categories.length > 0 ? (
        <>
          <SectionTitle>{t('stats.byCategory', { month: monthName(parts(today).m) })}</SectionTitle>
          <Card style={{ gap: space.md }}>
            {data.categories.map(({ cat, score }) => (
              <View key={cat.id} style={{ gap: 5 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt>
                    {cat.icon} {tDyn(`cat.${cat.id}`)}
                  </Txt>
                  <Txt style={{ fontWeight: '700' }} color={scoreColor(p, score)}>
                    {formatPct(score)}
                  </Txt>
                </Row>
                <ProgressBar value={(score ?? 0) / 100} color={cat.color} height={6} />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {data.perTask.length > 0 ? (
        <>
          <SectionTitle>{t('stats.byTask', { month: monthName(parts(today).m) })}</SectionTitle>
          <Card style={{ gap: 2, paddingVertical: space.sm }}>
            {data.perTask.map(({ task, pct }, i) => (
              <Pressable
                key={task.id}
                accessibilityRole="button"
                accessibilityLabel={task.title}
                onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 9, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: p.border }}>
                <Text style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{task.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Txt numberOfLines={1} style={{ fontWeight: '600' }}>
                    {task.title}
                  </Txt>
                  <Txt v="small">🔥 {currentStreak(task, logs[task.id], today)}</Txt>
                </View>
                <View style={{ backgroundColor: p.cardAlt, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Txt style={{ fontWeight: '800' }} color={scoreColor(p, pct)}>
                    {formatPct(pct)}
                  </Txt>
                </View>
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
