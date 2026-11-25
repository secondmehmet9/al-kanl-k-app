import React, { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import type { TaskDraft } from '@/data/store';
import { CATEGORIES, TASK_COLORS, TASK_ICONS } from '@/domain/categories';
import { addDays } from '@/domain/dates';
import type { Privacy, RecurrenceType, Task, TaskKind } from '@/domain/types';
import { t, tDyn } from '@/i18n';
import { formatShortDate, parseUserDate, weekdayShort } from '@/i18n/format';
import { parseTime } from '@/notifications/plan';
import { socialEnabled } from '@/social/config';
import { alpha, space, useTheme } from '@/theme';

import { Button, Card, Chip, Field, Row, Stepper, switchColors, Txt } from './ui';

const REC_TYPES: RecurrenceType[] = ['daily', 'weekdays', 'weekly_n', 'monthly_n', 'monthly_day'];
const TIME_PRESETS = ['07:00', '09:00', '12:30', '18:00', '21:00'];
const END_PRESETS = [7, 21, 30, 66, 90];

export function draftFromTask(task: Task): TaskDraft {
  const { id, createdAt, updatedAt, sortOrder, pauses, archived, ...rest } = task;
  void id; void createdAt; void updatedAt; void sortOrder; void pauses; void archived;
  return rest;
}

export function emptyDraft(today: string): TaskDraft {
  return {
    title: '',
    icon: '✅',
    color: TASK_COLORS[0],
    category: 'kisisel',
    kind: 'boolean',
    targetValue: 1,
    unit: '',
    recurrenceType: 'daily',
    recurrenceDays: [],
    periodTargetN: 3,
    startDate: today,
    endDate: null,
    weight: 1,
    privacy: 'private',
    reminderTime: null,
    sourceTaskId: null,
    challengeId: null,
  };
}

/** Rapor 3.2: haftalık hedef varsayılan w=2, aylık w=3 ("daha büyük taahhüt"); kullanıcı değiştirebilir. */
function defaultWeight(type: RecurrenceType): number {
  if (type === 'weekly_n') return 2;
  if (type === 'monthly_n' || type === 'monthly_day') return 3;
  return 1;
}

export function TaskForm({
  initial,
  today,
  submitLabel,
  onSubmit,
  isEdit,
}: {
  initial: TaskDraft;
  today: string;
  submitLabel: string;
  onSubmit: (draft: TaskDraft) => void;
  isEdit?: boolean;
}) {
  const p = useTheme();
  const [d, setD] = useState<TaskDraft>(initial);
  const [targetText, setTargetText] = useState(String(initial.kind === 'count' ? initial.targetValue : 8));
  const [timeText, setTimeText] = useState(initial.reminderTime ?? '09:00');
  const [endText, setEndText] = useState(initial.endDate ? formatShortDate(initial.endDate) : '');
  const [weightTouched, setWeightTouched] = useState(!!isEdit);
  const [error, setError] = useState<string | null>(null);
  const patch = (x: Partial<TaskDraft>) => setD((prev) => ({ ...prev, ...x }));

  const setRecurrence = (type: RecurrenceType) => {
    const next: Partial<TaskDraft> = { recurrenceType: type };
    if (type === 'weekdays' && (d.recurrenceType !== 'weekdays' || d.recurrenceDays.length === 0)) next.recurrenceDays = [1, 2, 3, 4, 5];
    if (type === 'monthly_day' && d.recurrenceType !== 'monthly_day') next.recurrenceDays = [1];
    if (type === 'weekly_n') next.periodTargetN = Math.min(Math.max(d.periodTargetN, 1), 7);
    if (type === 'monthly_n' && d.recurrenceType !== 'monthly_n') next.periodTargetN = 1;
    if (!weightTouched) next.weight = defaultWeight(type);
    patch(next);
  };

  const toggleDay = (day: number) => {
    const has = d.recurrenceDays.includes(day);
    patch({ recurrenceDays: has ? d.recurrenceDays.filter((x) => x !== day) : [...d.recurrenceDays, day].sort((a, b) => a - b) });
  };

  const submit = () => {
    const title = d.title.trim();
    if (!title) return setError(t('form.errTitle'));
    let targetValue = 1;
    if (d.kind === 'count') {
      targetValue = Number(targetText.replace(',', '.'));
      if (!Number.isFinite(targetValue) || targetValue <= 0) return setError(t('form.errTarget'));
    }
    if ((d.recurrenceType === 'weekdays' || d.recurrenceType === 'monthly_day') && d.recurrenceDays.length === 0) {
      return setError(t('form.errDays'));
    }
    let reminderTime: string | null = null;
    if (d.reminderTime !== null) {
      const tm = parseTime(timeText.trim());
      if (!tm) return setError(t('form.errTime'));
      reminderTime = `${String(tm.hour).padStart(2, '0')}:${String(tm.minute).padStart(2, '0')}`;
    }
    let endDate: string | null = null;
    if (endText.trim()) {
      endDate = parseUserDate(endText);
      if (!endDate) return setError(t('form.errDate'));
      if (endDate < d.startDate) return setError(t('form.errEndBeforeStart'));
    }
    setError(null);
    onSubmit({
      ...d,
      title,
      targetValue,
      unit: d.kind === 'count' ? d.unit.trim() : '',
      recurrenceDays: d.recurrenceType === 'weekdays' || d.recurrenceType === 'monthly_day' ? d.recurrenceDays : [],
      reminderTime,
      endDate,
    });
  };

  const kinds: TaskKind[] = ['boolean', 'count'];
  const privacies: Privacy[] = ['private', 'friends', 'challenge'];

  return (
    <View style={{ gap: space.md }}>
      <Card>
        <Row gap={space.md}>
          <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: alpha(d.color, p.dark ? 0.28 : 0.15), alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28 }}>{d.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Field testID="task-title" placeholder={t('form.titlePh')} value={d.title} onChangeText={(title) => patch({ title })} maxLength={80} autoFocus={!isEdit} returnKeyType="done" />
          </View>
        </Row>
        <Txt v="label">{t('form.icon')}</Txt>
        <Row wrap gap={6}>
          {TASK_ICONS.map((icon) => (
            <Pressable
              key={icon}
              accessibilityRole="button"
              accessibilityLabel={icon}
              onPress={() => patch({ icon })}
              style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: d.icon === icon ? alpha(d.color, 0.25) : p.cardAlt, borderWidth: 1.5, borderColor: d.icon === icon ? d.color : 'transparent' }}>
              <Text style={{ fontSize: 20 }}>{icon}</Text>
            </Pressable>
          ))}
        </Row>
        <Txt v="label">{t('form.color')}</Txt>
        <Row wrap gap={10}>
          {TASK_COLORS.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={`${t('form.color')} ${c}`}
              onPress={() => patch({ color: c })}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, borderWidth: 3, borderColor: d.color === c ? p.text : 'transparent' }}
            />
          ))}
        </Row>
      </Card>

      <Card>
        <Txt v="label">{t('form.category')}</Txt>
        <Row wrap>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} icon={c.icon} label={tDyn(`cat.${c.id}`)} selected={d.category === c.id} color={c.color} onPress={() => patch({ category: c.id })} />
          ))}
        </Row>
      </Card>

      <Card>
        <Txt v="label">{t('form.kind')}</Txt>
        <Row wrap>
          {kinds.map((k) => (
            <Chip key={k} testID={`kind-${k}`} icon={k === 'boolean' ? '✓' : '🔢'} label={t(k === 'boolean' ? 'form.kindBoolean' : 'form.kindCount')} selected={d.kind === k} onPress={() => patch({ kind: k })} />
          ))}
        </Row>
        {d.kind === 'count' ? (
          <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Field testID="task-target" label={t('form.target')} value={targetText} onChangeText={setTargetText} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1.4 }}>
              <Field testID="task-unit" label={t('form.unit')} placeholder={t('form.unitPh')} value={d.unit} onChangeText={(unit) => patch({ unit })} maxLength={16} autoCapitalize="none" />
            </View>
          </Row>
        ) : null}
        {d.kind === 'count' ? <Txt v="small">{t('form.countHint')}</Txt> : null}
      </Card>

      <Card>
        <Txt v="label">{t('form.recurrence')}</Txt>
        <Row wrap>
          {REC_TYPES.map((r) => (
            <Chip key={r} testID={`rec-${r}`} label={tDyn(`form.rec.${r}`)} selected={d.recurrenceType === r} onPress={() => setRecurrence(r)} />
          ))}
        </Row>
        {d.recurrenceType === 'weekdays' ? (
          <Row gap={6}>
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const on = d.recurrenceDays.includes(day);
              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={weekdayShort(day)}
                  onPress={() => toggleDay(day)}
                  style={{ flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? p.primarySoft : p.cardAlt, borderWidth: 1.5, borderColor: on ? p.primary : 'transparent' }}>
                  <Text style={{ color: on ? p.text : p.textDim, fontWeight: '700', fontSize: 13 }}>{weekdayShort(day)}</Text>
                </Pressable>
              );
            })}
          </Row>
        ) : null}
        {d.recurrenceType === 'weekly_n' ? (
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt>{t('form.timesPerWeek')}</Txt>
            <Stepper value={d.periodTargetN} min={1} max={7} onChange={(periodTargetN) => patch({ periodTargetN })} />
          </Row>
        ) : null}
        {d.recurrenceType === 'monthly_n' ? (
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt>{t('form.timesPerMonth')}</Txt>
            <Stepper value={d.periodTargetN} min={1} max={31} onChange={(periodTargetN) => patch({ periodTargetN })} />
          </Row>
        ) : null}
        {d.recurrenceType === 'monthly_day' ? (
          <View style={{ gap: 6 }}>
            <Row wrap gap={5}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const on = d.recurrenceDays.includes(day);
                return (
                  <Pressable
                    key={day}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={String(day)}
                    onPress={() => toggleDay(day)}
                    style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? p.primarySoft : p.cardAlt, borderWidth: 1.5, borderColor: on ? p.primary : 'transparent' }}>
                    <Text style={{ color: on ? p.text : p.textDim, fontWeight: on ? '700' : '600', fontSize: 13 }}>{day}</Text>
                  </Pressable>
                );
              })}
            </Row>
            <Txt v="small">{t('form.monthDayHint')}</Txt>
          </View>
        ) : null}
        {d.recurrenceType === 'weekly_n' || d.recurrenceType === 'monthly_n' ? <Txt v="small">{t('form.periodHint')}</Txt> : null}
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt v="h3">{t('form.reminder')}</Txt>
            <Txt v="small">{t('form.reminderHint')}</Txt>
          </View>
          <Switch
            testID="reminder-switch"
            accessibilityLabel={t('form.reminder')}
            value={d.reminderTime !== null}
            onValueChange={(on) => patch({ reminderTime: on ? timeText : null })}
            {...switchColors(p)}
          />
        </Row>
        {d.reminderTime !== null ? (
          <>
            <Field testID="reminder-time" value={timeText} onChangeText={setTimeText} placeholder="09:00" keyboardType="numbers-and-punctuation" maxLength={5} style={{ fontSize: 22, fontWeight: '700', textAlign: 'center' }} />
            <Row wrap>
              {TIME_PRESETS.map((tm) => (
                <Chip key={tm} label={tm} selected={timeText === tm} onPress={() => setTimeText(tm)} />
              ))}
            </Row>
          </>
        ) : null}
      </Card>

      <Card>
        <Txt v="h3">{t('form.weight')}</Txt>
        <Txt v="small">{t('form.weightHint')}</Txt>
        <Row wrap>
          {[1, 2, 3].map((w) => (
            <Chip
              key={w}
              testID={`weight-${w}`}
              label={tDyn(`form.weight.${w}`)}
              selected={d.weight === w}
              onPress={() => {
                setWeightTouched(true);
                patch({ weight: w });
              }}
            />
          ))}
        </Row>
      </Card>

      <Card>
        <Txt v="h3">{t('form.endDate')}</Txt>
        <Txt v="small">{t('form.endDateHint', { start: formatShortDate(d.startDate) })}</Txt>
        <Row wrap>
          <Chip label={t('form.endNone')} selected={!endText.trim()} onPress={() => setEndText('')} />
          {END_PRESETS.map((n) => {
            const key = formatShortDate(addDays(d.startDate > today ? d.startDate : today, n - 1));
            return <Chip key={n} label={t('form.endDays', { n })} selected={endText === key} onPress={() => setEndText(key)} />;
          })}
        </Row>
        <Field value={endText} onChangeText={setEndText} placeholder={t('form.datePh')} keyboardType="numbers-and-punctuation" maxLength={10} />
      </Card>

      {socialEnabled ? (
        <Card>
          <Txt v="h3">{t('form.privacy')}</Txt>
          <Row wrap>
            {privacies.map((x) => (
              <Chip key={x} label={tDyn(`form.privacy.${x}`)} selected={d.privacy === x} onPress={() => patch({ privacy: x })} />
            ))}
          </Row>
        </Card>
      ) : null}

      {error ? (
        <Txt color={p.missedText} style={{ fontWeight: '600' }}>
          {error}
        </Txt>
      ) : null}
      <Button testID="task-save" title={submitLabel} onPress={submit} />
    </View>
  );
}
