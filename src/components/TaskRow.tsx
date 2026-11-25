import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { clearLog, increment, markMissed, skipDay, toggleDone, useAppState } from '@/data/store';
import { canSkip } from '@/domain/checkin';
import { isDayBased } from '@/domain/recurrence';
import { dayRatio, periodProgress } from '@/domain/scoring';
import { currentStreak } from '@/domain/streaks';
import { MAX_SKIPS_PER_WEEK, Task } from '@/domain/types';
import { t } from '@/i18n';
import { formatNum, recurrenceLabel } from '@/i18n/format';
import { alpha, radius, space, useTheme } from '@/theme';

import { Chip, notify, ProgressBar, Row, Txt } from './ui';

function tap() {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

export function TaskRow({ task, date, today, editable }: { task: Task; date: string; today: string; editable: boolean }) {
  const p = useTheme();
  const logs = useAppState((s) => s.logs[task.id]);
  const [open, setOpen] = useState(false);
  const log = logs?.[date];
  const ratio = dayRatio(task, log);
  const skipped = log?.status === 'skipped';
  const missed = log?.status === 'missed';
  const done = ratio !== null && ratio >= 1;
  const streak = currentStreak(task, logs, today);
  const progress = isDayBased(task) ? null : periodProgress(task, logs, date);
  const isCount = task.kind === 'count';
  const value = log && !skipped && !missed ? log.value : 0;

  const onToggle = () => {
    if (!editable) return;
    tap();
    toggleDone(task.id, date);
  };
  const onInc = (delta: number) => {
    if (!editable) return;
    tap();
    increment(task.id, date, delta);
  };
  const step = task.targetValue >= 1000 ? 1000 : task.targetValue >= 100 ? 10 : task.targetValue > 30 ? 5 : 1;

  let sub: string;
  if (skipped) sub = t('task.skipped');
  else if (missed) sub = t('task.missed');
  else if (isCount) sub = `${formatNum(value)} / ${formatNum(task.targetValue)} ${task.unit}`.trim();
  else sub = recurrenceLabel(task);
  if (progress) sub += ` · ${t('task.periodProgress', { done: formatNum(Math.round(progress.done * 10) / 10), target: progress.target })}`;

  return (
    <View
      testID={`task-${task.title}`}
      style={{
        backgroundColor: p.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: done ? alpha(task.color, 0.55) : p.border,
        padding: space.md,
        gap: space.sm,
        opacity: skipped ? 0.6 : 1,
      }}>
      <Row gap={space.md}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('a11y.taskDetail', { title: task.title })}
          onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              backgroundColor: alpha(task.color, p.dark ? 0.25 : 0.14),
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ fontSize: 23 }}>{task.icon}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="h3" numberOfLines={1} style={done ? { textDecorationLine: 'line-through', color: p.textDim } : undefined}>
              {task.title}
            </Txt>
            <Row gap={6}>
              <Txt v="small" numberOfLines={1} style={{ flexShrink: 1 }}>
                {sub}
              </Txt>
              {streak > 0 ? (
                <Txt v="small" color={p.warning} style={{ fontWeight: '700' }}>
                  🔥 {streak}
                </Txt>
              ) : null}
            </Row>
          </View>
        </Pressable>

        {isCount ? (
          <Row gap={6}>
            <RoundBtn label="−" a11y={t('a11y.decrease')} onPress={() => onInc(-step)} disabled={!editable || value <= 0} color={task.color} />
            <RoundBtn label={done ? '✓' : `+${step === 1 ? '1' : formatNum(step)}`} a11y={t('a11y.increase')} onPress={() => onInc(step)} disabled={!editable} color={task.color} filled={done} wide />
          </Row>
        ) : (
          <Pressable
            testID={`check-${task.title}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done, disabled: !editable }}
            accessibilityLabel={t('a11y.markDone', { title: task.title })}
            onPress={onToggle}
            disabled={!editable}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              borderWidth: 2.5,
              borderColor: done ? task.color : missed ? p.danger : p.border,
              backgroundColor: done ? task.color : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: !editable ? 0.5 : pressed ? 0.7 : 1,
            })}>
            <Text style={{ color: done ? '#fff' : missed ? p.danger : p.textFaint, fontSize: 20, fontWeight: '800' }}>
              {done ? '✓' : missed ? '✕' : skipped ? '⏭' : ''}
            </Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('a11y.moreActions')}
          onPress={() => setOpen((o) => !o)}
          hitSlop={8}
          style={{ paddingHorizontal: 2, paddingVertical: 8 }}>
          <Text style={{ color: p.textFaint, fontSize: 18, fontWeight: '800' }}>⋮</Text>
        </Pressable>
      </Row>

      {isCount && !skipped ? <ProgressBar value={ratio ?? 0} color={task.color} height={6} /> : null}
      {progress && !isCount ? <ProgressBar value={progress.target > 0 ? progress.done / progress.target : 0} color={progress.onTrack ? p.success : p.warning} height={6} /> : null}

      {open ? (
        <Row wrap>
          {editable ? (
            <>
              <Chip
                icon="⏭"
                label={t('task.actionSkip')}
                selected={skipped}
                onPress={() => {
                  if (skipped) clearLog(task.id, date);
                  else if (!canSkip(logs, date)) notify(t('task.skipLimitTitle'), t('task.skipLimitBody', { n: MAX_SKIPS_PER_WEEK }));
                  else skipDay(task.id, date);
                  setOpen(false);
                }}
              />
              <Chip
                icon="✕"
                label={t('task.actionMissed')}
                selected={missed}
                color={p.danger}
                onPress={() => {
                  if (missed) clearLog(task.id, date);
                  else markMissed(task.id, date);
                  setOpen(false);
                }}
              />
              {log ? (
                <Chip
                  icon="↺"
                  label={t('task.actionClear')}
                  onPress={() => {
                    clearLog(task.id, date);
                    setOpen(false);
                  }}
                />
              ) : null}
            </>
          ) : (
            <Txt v="small">{t('today.locked')}</Txt>
          )}
          <Chip icon="📊" label={t('task.actionDetail')} onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })} />
        </Row>
      ) : null}
    </View>
  );
}

function RoundBtn({
  label,
  onPress,
  disabled,
  color,
  filled,
  wide,
  a11y,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color: string;
  filled?: boolean;
  wide?: boolean;
  a11y: string;
}) {
  const p = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => ({
        minWidth: wide ? 52 : 38,
        height: 40,
        paddingHorizontal: 8,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? color : alpha(color, p.dark ? 0.25 : 0.14),
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}>
      <Text style={{ color: filled ? '#fff' : p.dark ? p.text : color, fontWeight: '800', fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}
