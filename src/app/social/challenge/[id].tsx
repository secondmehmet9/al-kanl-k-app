import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { ChallengeView } from '@/components/ChallengeView';
import { Button, Card, confirmAction, EmptyState, notify, Screen, Txt } from '@/components/ui';
import { useToday } from '@/components/useToday';
import { getState, updateTask } from '@/data/store';
import { t } from '@/i18n';
import { deleteChallenge, deleteChallengeLog, getChallengeDetail, leaveChallenge, reportTarget, sendReaction, subscribeChallenge } from '@/social/api';
import { socialEnabled } from '@/social/config';
import { ensureLocalTasks, socialErrorText } from '@/social/helpers';
import { useSession } from '@/social/session';
import { findLocalTask, pushAllLocalLogs } from '@/social/sync';
import type { ChallengeDetail } from '@/social/types';
import { useTheme } from '@/theme';

/** Yerel kayıt kaynak kabul edilir: yereli gönder, yerelde silinmiş günleri sunucudan da sil. */
async function reconcile(userId: string, detail: ChallengeDetail): Promise<boolean> {
  let changed = false;
  for (const ct of detail.tasks) {
    const local = findLocalTask(detail.challenge.id, ct.id);
    if (!local) continue;
    const localLogs = getState().logs[local.id] ?? {};
    const mine = detail.logs.filter((l) => l.userId === userId && l.challengeTaskId === ct.id);
    const serverByDate = new Map(mine.map((l) => [l.date, l]));
    const needsPush = Object.values(localLogs).some((l) => {
      if (l.date < detail.challenge.startDate || l.date > detail.challenge.endDate) return false;
      const s = serverByDate.get(l.date);
      return !s || s.value !== l.value || s.status !== l.status;
    });
    if (needsPush) {
      await pushAllLocalLogs(userId, detail.challenge, ct.id);
      changed = true;
    }
    for (const s of mine) {
      if (!localLogs[s.date] && s.date >= local.startDate) {
        await deleteChallengeLog(userId, ct.id, s.date);
        changed = true;
      }
    }
  }
  return changed;
}

export default function ChallengeScreen() {
  const p = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = useToday();
  const session = useSession();
  const [detail, setDetail] = useState<ChallengeDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const userId = session.userId;

  const load = useCallback(
    async (sync: boolean) => {
      if (!userId || !id) return;
      try {
        let d = await getChallengeDetail(id);
        if (sync) {
          ensureLocalTasks(d, today);
          if (await reconcile(userId, d).catch(() => false)) d = await getChallengeDetail(id);
        }
        setDetail(d);
        setErr(null);
      } catch (e) {
        setErr(socialErrorText(e));
      }
    },
    [id, userId, today]
  );

  useFocusEffect(
    useCallback(() => {
      if (!socialEnabled || !userId || !id) return;
      void load(true);
      return subscribeChallenge(id, () => void load(false));
    }, [id, userId, load])
  );

  if (!socialEnabled || (!session.loading && !userId)) {
    return (
      <Screen padTop={false}>
        <EmptyState icon="🔌" title={t('social.soonTitle')} body={t('social.needLogin')} />
      </Screen>
    );
  }
  if (!detail || !userId) {
    return (
      <Screen padTop={false}>
        {err ? (
          <Card>
            <Txt color={p.danger}>{err}</Txt>
            <Button small kind="soft" title={t('common.retry')} onPress={() => void load(true)} />
          </Card>
        ) : (
          <ActivityIndicator color={p.primary} />
        )}
      </Screen>
    );
  }

  const isOwner = detail.challenge.ownerId === userId;
  const unlinkLocal = () => {
    for (const ct of detail.tasks) {
      const local = findLocalTask(detail.challenge.id, ct.id);
      if (local) updateTask(local.id, { challengeId: null, sourceTaskId: null, privacy: 'private' });
    }
  };

  return (
    <Screen padTop={false}>
      {err ? <Txt color={p.danger}>{err}</Txt> : null}
      <ChallengeView
        detail={detail}
        today={today}
        myUserId={userId}
        onCopyCode={async () => {
          await Clipboard.setStringAsync(detail.challenge.joinCode);
          notify(t('social.codeCopied'));
        }}
        onReact={(toUser, emoji) => {
          sendReaction(userId, detail.challenge.id, toUser, today, emoji)
            .then(() => load(false))
            .catch((e) => notify(socialErrorText(e)));
        }}
      />
      <Button small kind="ghost" title={t('common.refresh')} onPress={() => void load(true)} />
      {isOwner ? (
        <Button
          kind="danger"
          title={t('ch.delete')}
          onPress={() =>
            confirmAction(t('ch.deleteTitle'), t('ch.deleteBody'), () => {
              deleteChallenge(detail.challenge.id)
                .then(() => {
                  unlinkLocal();
                  router.back();
                })
                .catch((e) => notify(socialErrorText(e)));
            }, t('common.delete'))
          }
        />
      ) : (
        <>
          <Button
            kind="danger"
            title={t('ch.leave')}
            onPress={() =>
              confirmAction(t('ch.leaveTitle'), t('ch.leaveBody'), () => {
                leaveChallenge(detail.challenge.id)
                  .then(() => {
                    unlinkLocal();
                    router.back();
                  })
                  .catch((e) => notify(socialErrorText(e)));
              }, t('ch.leave'))
            }
          />
          <Button
            small
            kind="ghost"
            title={t('social.report')}
            onPress={() =>
              confirmAction(t('social.reportTitle'), t('social.reportBody', { name: detail.challenge.title }), () => {
                reportTarget(userId, 'challenge', detail.challenge.id, 'in-app report')
                  .then(() => notify(t('social.reported')))
                  .catch((e) => notify(socialErrorText(e)));
              }, t('social.report'))
            }
          />
        </>
      )}
    </Screen>
  );
}
