import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Heatmap } from '@/components/Heatmap';
import { Button, Card, confirmAction, EmptyState, Field, ProgressBar, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { useToday } from '@/components/useToday';
import { deleteTask, setArchived, setPaused, setValue, useAppState } from '@/data/store';
import { categoryById } from '@/domain/categories';
import { canEditDate } from '@/domain/checkin';
import { addDays, eachDay, monthWindow, weekWindow } from '@/domain/dates';
import { isCurrentlyPaused, isDayBased, isScheduledOn } from '@/domain/recurrence';
import { dayRatio, periodProgress, taskWindowRatio } from '@/domain/scoring';
import { bestStreak, currentStreak, totalCompletions } from '@/domain/streaks';
import { t, tDyn } from '@/i18n';
import { formatDayMonth, formatNum, formatPct, formatShortDate, recurrenceLabel } from '@/i18n/format';
import { socialEnabled } from '@/social/config';
import { alpha, scoreColor, space, useTheme } from '@/theme';

const WEEKS = 16;

export default function TaskDetailScreen() {
  const p = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = useToday();
  const task = useAppState((s) => s.tasks.find((x) => x.id === id));
  const logs = useAppState((s) => (id ? s.logs[id] : undefined));
  const [valueText, setValueText] = useState('');

  const cells = useMemo(() => {
    if (!task) return [];
    const end = weekWindow(today).end;
    return eachDay(addDays(end, -(WEEKS * 7 - 1)), end).map((date) => {
      const future = date > today;
      let score: number | null = null;
      if (!future && date >= task.startDate) {
        const r = dayRatio(task, logs?.[date]);
        if (isDayBased(task)) score = isScheduledOn(task, date) && r !== null ? r * 100 : null;
        else score = r !== null && r > 0 ? r * 100 : null;
      }
      return { date, score, future };
    });
  }, [task, logs, today]);

  if (!task) {
    return (
      <Screen padTop={false}>
        <EmptyState icon="🤷" title={t('detail.notFound')} />
      </Screen>
    );
  }

  const paused = isCurrentlyPaused(task);
  const cat = categoryById(task.category);
  const pct = (r: number | null) => (r === null ? null : r * 100);
  const weekPct = pct(taskWindowRatio(task, logs, weekWindow(today), today).ratio);
  const monthPct = pct(taskWindowRatio(task, logs, monthWindow(today), today).ratio);
  const allPct = pct(taskWindowRatio(task, logs, { start: task.startDate, end: today }, today).ratio);
  const progress = periodProgress(task, logs, today);
  const todayLog = logs?.[today];
  const stats: [string, string, string?][] = [
    [t('detail.streak'), `🔥 ${currentStreak(task, logs, today)}`],
    [t('detail.bestStreak'), `🏆 ${bestStreak(task, logs, today)}`],
    [t('detail.total'), `✓ ${totalCompletions(task, logs)}`],
  ];
  const scores: [string, number | null][] = [
    [t('stats.week'), weekPct],
    [t('stats.month'), monthPct],
    [t('stats.overall'), allPct],
  ];

  return (
    <Screen padTop={false}>
      <Card>
        <Row gap={space.md}>
          <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: alpha(task.color, p.dark ? 0.28 : 0.15), alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 30 }}>{task.icon}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="h2">{task.title}</Txt>
            <Txt v="dim">
              {cat.icon} {tDyn(`cat.${cat.id}`)} · {recurrenceLabel(task)}
            </Txt>
            <Txt v="small">
              {task.kind === 'count' ? `${t('detail.target')}: ${formatNum(task.targetValue)} ${task.unit} · ` : ''}
              {t('detail.weight')}: {tDyn(`form.weight.${task.weight}`)}
              {task.reminderTime ? ` · ⏰ ${task.reminderTime}` : ''}
            </Txt>
            <Txt v="small">
              {t('detail.since', { date: formatShortDate(task.startDate) })}
              {task.endDate ? ` → ${formatShortDate(task.endDate)}` : ''}
            </Txt>
          </View>
        </Row>
        {paused ? <Txt color={p.warning} style={{ fontWeight: '700' }}>⏸ {t('detail.pausedNote')}</Txt> : null}
        {task.archived ? <Txt color={p.textFaint} style={{ fontWeight: '700' }}>📦 {t('detail.archivedNote')}</Txt> : null}
        {task.challengeId ? <Txt color={p.primary} style={{ fontWeight: '700' }}>🏆 {t('detail.challengeNote')}</Txt> : null}
      </Card>

      <Row>
        {stats.map(([label, value]) => (
          <Card key={label} style={{ flex: 1, alignItems: 'center', padding: space.md }}>
            <Txt v="h2">{value}</Txt>
            <Txt v="small" center>{label}</Txt>
          </Card>
        ))}
      </Row>
      <Row>
        {scores.map(([label, value]) => (
          <Card key={label} style={{ flex: 1, alignItems: 'center', padding: space.md }}>
            <Txt v="h2" color={scoreColor(p, value)}>{formatPct(value)}</Txt>
            <Txt v="small" center>{label}</Txt>
          </Card>
        ))}
      </Row>

      {progress ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="h3">{task.recurrenceType === 'weekly_n' ? t('detail.thisWeek') : t('detail.thisMonth')}</Txt>
            <Txt v="h3" color={progress.met ? p.success : progress.onTrack ? p.success : p.warning}>
              {formatNum(Math.round(progress.done * 10) / 10)} / {progress.target}
            </Txt>
          </Row>
          <ProgressBar value={progress.done / progress.target} color={progress.onTrack ? p.success : p.warning} />
          <Txt v="small">
            {formatDayMonth(progress.period.start)} – {formatDayMonth(progress.period.end)} ·{' '}
            {progress.met ? t('detail.periodMet') : progress.onTrack ? t('detail.onTrack') : t('detail.behind')}
          </Txt>
        </Card>
      ) : null}

      {task.kind === 'count' && canEditDate(today, today) && !task.archived ? (
        <Card>
          <Txt v="h3">{t('detail.setValue')}</Txt>
          <Row>
            <View style={{ flex: 1 }}>
              <Field
                value={valueText}
                onChangeText={setValueText}
                keyboardType="decimal-pad"
                placeholder={`${formatNum(todayLog && todayLog.status !== 'skipped' ? todayLog.value : 0)} / ${formatNum(task.targetValue)} ${task.unit}`}
              />
            </View>
            <Button
              title={t('common.save')}
              small
              onPress={() => {
                const v = Number(valueText.replace(',', '.'));
                if (Number.isFinite(v) && v >= 0) {
                  setValue(task.id, today, v);
                  setValueText('');
                }
              }}
            />
          </Row>
        </Card>
      ) : null}

      <SectionTitle>{t('detail.heatmap', { n: WEEKS })}</SectionTitle>
      <Card>
        <Heatmap cells={cells} color={task.color} today={today} />
      </Card>

      <SectionTitle>{t('detail.actions')}</SectionTitle>
      <Button title={t('common.edit')} icon="✏️" kind="soft" onPress={() => router.push({ pathname: '/task/edit/[id]', params: { id: task.id } })} />
      {socialEnabled && !task.challengeId && !task.archived ? (
        <Button title={t('detail.startChallenge')} icon="🏆" kind="soft" onPress={() => router.push({ pathname: '/social/new-challenge', params: { taskId: task.id } })} />
      ) : null}
      {!task.archived ? (
        <Button title={paused ? t('detail.resume') : t('detail.pause')} icon={paused ? '▶️' : '⏸'} kind="ghost" onPress={() => setPaused(task.id, !paused, today)} />
      ) : null}
      <Button
        title={task.archived ? t('detail.unarchive') : t('detail.archive')}
        icon="📦"
        kind="ghost"
        onPress={() => {
          setArchived(task.id, !task.archived, today);
          if (!task.archived) router.back();
        }}
      />
      <Button
        title={t('common.delete')}
        icon="🗑"
        kind="danger"
        onPress={() =>
          confirmAction(t('detail.deleteTitle'), t('detail.deleteBody', { title: task.title }), () => {
            deleteTask(task.id);
            router.back();
          }, t('common.delete'))
        }
      />
    </Screen>
  );
}
