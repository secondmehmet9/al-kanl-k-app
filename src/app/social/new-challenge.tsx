import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { Button, Card, Chip, EmptyState, Field, Row, Screen, Txt } from '@/components/ui';
import { useToday } from '@/components/useToday';
import { updateTask, useAppState } from '@/data/store';
import { addDays } from '@/domain/dates';
import { t } from '@/i18n';
import { formatShortDate, parseUserDate, recurrenceLabel } from '@/i18n/format';
import { createChallengeFromTask } from '@/social/api';
import { socialEnabled } from '@/social/config';
import { socialErrorText } from '@/social/helpers';
import { useSession } from '@/social/session';
import { radius, space, useTheme } from '@/theme';

const DURATIONS = [7, 14, 21, 30];

export default function NewChallengeScreen() {
  const p = useTheme();
  const today = useToday();
  const session = useSession();
  const params = useLocalSearchParams<{ taskId?: string }>();
  const tasks = useAppState((s) => s.tasks.filter((x) => !x.archived && !x.challengeId));
  const [taskId, setTaskId] = useState<string | null>(params.taskId ?? null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startText, setStartText] = useState(formatShortDate(today));
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const task = tasks.find((x) => x.id === taskId) ?? null;

  if (!socialEnabled || !session.userId) {
    return (
      <Screen padTop={false}>
        <EmptyState icon="🔌" title={t('social.soonTitle')} body={t('social.needLogin')} />
      </Screen>
    );
  }
  const userId = session.userId;

  const submit = async () => {
    if (!task) return setErr(t('social.errPickTask'));
    const startDate = parseUserDate(startText);
    if (!startDate) return setErr(t('form.errDate'));
    if (startDate < today) return setErr(t('social.errStartPast'));
    setBusy(true);
    setErr(null);
    try {
      const endDate = addDays(startDate, days - 1);
      const res = await createChallengeFromTask(userId, task, { title: title.trim() || task.title, description, startDate, endDate });
      // Paylaşılan yerel görev challenge'a bağlanır → check-in'leri otomatik eşitlenir.
      updateTask(task.id, { challengeId: res.challenge.id, sourceTaskId: res.task.id, privacy: 'challenge' });
      router.replace({ pathname: '/social/challenge/[id]', params: { id: res.challenge.id } });
    } catch (e) {
      setErr(socialErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen padTop={false}>
      <Txt v="dim">{t('social.newChallengeIntro')}</Txt>
      <Card>
        <Txt v="label">{t('social.pickTask')}</Txt>
        {tasks.length === 0 ? <Txt v="dim">{t('social.noTasksToShare')}</Txt> : null}
        {tasks.map((x) => {
          const on = x.id === taskId;
          return (
            <Pressable
              key={x.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={x.title}
              onPress={() => setTaskId(x.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: radius.md, borderWidth: 1.5, borderColor: on ? p.primary : 'transparent', backgroundColor: on ? p.primarySoft : p.cardAlt }}>
              <Text style={{ fontSize: 20 }}>{x.icon}</Text>
              <Txt style={{ flex: 1, fontWeight: '600' }} numberOfLines={1}>
                {x.title}
              </Txt>
              <Txt v="small">{recurrenceLabel(x)}</Txt>
            </Pressable>
          );
        })}
      </Card>
      <Card>
        <Field label={t('social.challengeName')} value={title} onChangeText={setTitle} placeholder={task ? task.title : t('social.challengeNamePh')} maxLength={60} />
        <Field label={t('social.challengeDesc')} value={description} onChangeText={setDescription} placeholder={t('social.challengeDescPh')} maxLength={300} multiline />
      </Card>
      <Card>
        <Field label={t('social.startDate')} value={startText} onChangeText={setStartText} placeholder={t('form.datePh')} keyboardType="numbers-and-punctuation" maxLength={10} />
        <Txt v="label">{t('social.duration')}</Txt>
        <Row wrap>
          {DURATIONS.map((n) => (
            <Chip key={n} label={t('form.endDays', { n })} selected={days === n} onPress={() => setDays(n)} />
          ))}
        </Row>
        {parseUserDate(startText) ? <Txt v="small">{t('social.endsOn', { date: formatShortDate(addDays(parseUserDate(startText)!, days - 1)) })}</Txt> : null}
      </Card>
      {err ? <Txt color={p.danger}>{err}</Txt> : null}
      <Button title={t('social.createChallenge')} icon="🏆" loading={busy} disabled={!task} onPress={() => void submit()} />
    </Screen>
  );
}
