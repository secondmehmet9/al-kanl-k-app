import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button, Card, confirmAction, EmptyState, Field, notify, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { useToday } from '@/components/useToday';
import { getState, updateSettings, useAppState } from '@/data/store';
import { t } from '@/i18n';
import { formatDayMonth } from '@/i18n/format';
import {
  addFriendByCode,
  blockUser,
  deleteAccount,
  getChallengeDetail,
  getMyProfile,
  joinChallengeByCode,
  listFriends,
  listMyChallenges,
  removeFriend,
  reportTarget,
  sendLoginCode,
  signOut,
  updateDisplayName,
  verifyLoginCode,
} from '@/social/api';
import { socialEnabled } from '@/social/config';
import { useSession } from '@/social/session';
import { ensureLocalTasks, socialErrorText } from '@/social/helpers';
import type { Challenge, Profile } from '@/social/types';
import { space, useTheme } from '@/theme';

export default function SocialScreen() {
  const session = useSession();
  if (!socialEnabled) return <Locked />;
  if (session.loading) {
    return (
      <Screen>
        <Txt v="h1">{t('social.title')}</Txt>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!session.userId) return <Login />;
  return <Hub userId={session.userId} email={session.email} />;
}

function Locked() {
  const features: [string, string][] = [
    ['👥', t('social.f1')],
    ['🏆', t('social.f2')],
    ['📈', t('social.f3')],
    ['👏', t('social.f4')],
  ];
  return (
    <Screen>
      <Txt v="h1">{t('social.title')}</Txt>
      <EmptyState icon="🚀" title={t('social.soonTitle')} body={t('social.soonBody')}>
        <Button testID="demo-btn" title={t('social.seeDemo')} icon="👀" onPress={() => router.push('/social/demo')} style={{ alignSelf: 'stretch' }} />
      </EmptyState>
      <Card>
        <Txt v="label">{t('social.whatsComing')}</Txt>
        {features.map(([icon, text]) => (
          <Row key={text} gap={space.md} style={{ alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
            <Txt v="dim" style={{ flex: 1 }}>
              {text}
            </Txt>
          </Row>
        ))}
      </Card>
      <Card>
        <Txt v="h3">🔌 {t('social.connectTitle')}</Txt>
        <Txt v="dim">{t('social.connectBody')}</Txt>
      </Card>
    </Screen>
  );
}

function Login() {
  const p = useTheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(socialErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Txt v="h1">{t('social.title')}</Txt>
      <Card>
        <Txt v="h2">{t('social.loginTitle')}</Txt>
        <Txt v="dim">{t('social.loginBody')}</Txt>
        <Field label={t('social.email')} value={email} onChangeText={setEmail} placeholder="ornek@eposta.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!sent} />
        {sent ? (
          <>
            <Field label={t('social.code')} value={code} onChangeText={setCode} placeholder="123456" keyboardType="number-pad" maxLength={8} hint={t('social.codeHint', { email })} />
            <Button title={t('social.verify')} loading={busy} disabled={code.trim().length < 6} onPress={() => run(() => verifyLoginCode(email, code))} />
            <Button
              kind="ghost"
              small
              title={t('social.changeEmail')}
              onPress={() => {
                setSent(false);
                setCode('');
              }}
            />
          </>
        ) : (
          <Button
            title={t('social.sendCode')}
            loading={busy}
            disabled={!/^\S+@\S+\.\S+$/.test(email.trim())}
            onPress={() =>
              run(async () => {
                await sendLoginCode(email);
                setSent(true);
              })
            }
          />
        )}
        {err ? <Txt color={p.danger}>{err}</Txt> : null}
        <Txt v="small">{t('social.loginPrivacy')}</Txt>
      </Card>
    </Screen>
  );
}

function Hub({ userId, email }: { userId: string; email: string | null }) {
  const p = useTheme();
  const today = useToday();
  const localName = useAppState((s) => s.settings.displayName);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [friendCode, setFriendCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setErr(null);
      let me = await getMyProfile(userId);
      // İlk girişte yerel adı profile taşı.
      const local = getState().settings.displayName;
      if ((!me.displayName || me.displayName === '—') && local) {
        await updateDisplayName(userId, local);
        me = { ...me, displayName: local };
      }
      const [fr, ch] = await Promise.all([listFriends(userId), listMyChallenges()]);
      setProfile(me);
      setName(me.displayName === '—' ? '' : me.displayName);
      setFriends(fr);
      setChallenges(ch);
    } catch (e) {
      setErr(socialErrorText(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const act = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
      await load();
    } catch (e) {
      notify(socialErrorText(e));
    } finally {
      setBusy(null);
    }
  };

  const friendMenu = (f: Profile) => (
    <Row gap={4}>
      <Button small kind="ghost" title={t('social.remove')} onPress={() => confirmAction(t('social.removeTitle'), f.displayName, () => void act('f', () => removeFriend(userId, f.id)))} />
      <Button
        small
        kind="ghost"
        title={t('social.block')}
        onPress={() => confirmAction(t('social.blockTitle'), t('social.blockBody', { name: f.displayName }), () => void act('f', () => blockUser(userId, f.id)), t('social.block'))}
      />
      <Button
        small
        kind="ghost"
        title={t('social.report')}
        onPress={() =>
          confirmAction(t('social.reportTitle'), t('social.reportBody', { name: f.displayName }), () =>
            void act('f', async () => {
              await reportTarget(userId, 'user', f.id, 'in-app report');
              notify(t('social.reported'));
            }), t('social.report'))
        }
      />
    </Row>
  );

  return (
    <Screen>
      <Txt v="h1">{t('social.title')}</Txt>
      {loading ? <ActivityIndicator color={p.primary} /> : null}
      {err ? (
        <Card>
          <Txt color={p.danger}>{err}</Txt>
          <Button small kind="soft" title={t('common.retry')} onPress={() => void load()} />
        </Card>
      ) : null}

      {profile ? (
        <Card style={{ backgroundColor: p.primarySoft, borderColor: 'transparent' }}>
          <Txt v="label" color={p.primary}>
            {t('social.myCode')}
          </Txt>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: 3, color: p.primary }}>{profile.friendCode}</Text>
            <Button
              small
              title={t('common.copy')}
              onPress={async () => {
                await Clipboard.setStringAsync(profile.friendCode ?? '');
                notify(t('social.codeCopied'));
              }}
            />
          </Row>
          <Txt v="small">{t('social.myCodeHint')}</Txt>
          <Field
            placeholder={t('settings.namePh')}
            value={name}
            onChangeText={setName}
            maxLength={40}
            onBlur={() => {
              const v = name.trim();
              if (v && v !== profile.displayName) {
                if (!localName) updateSettings({ displayName: v });
                void act('name', () => updateDisplayName(userId, v));
              }
            }}
          />
        </Card>
      ) : null}

      <SectionTitle>{t('social.challenges')}</SectionTitle>
      {challenges.length === 0 && !loading ? <Txt v="dim">{t('social.noChallenges')}</Txt> : null}
      {challenges.map((c) => (
        <Card key={c.id} onPress={() => router.push({ pathname: '/social/challenge/[id]', params: { id: c.id } })}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="h3" style={{ flex: 1 }} numberOfLines={1}>
              🏆 {c.title}
            </Txt>
            <Txt v="small" color={today > c.endDate ? p.textFaint : p.primary} style={{ fontWeight: '700' }}>
              {today > c.endDate ? t('ch.ended') : today < c.startDate ? t('ch.upcoming') : t('ch.active')}
            </Txt>
          </Row>
          <Txt v="small">
            {formatDayMonth(c.startDate)} – {formatDayMonth(c.endDate)}
          </Txt>
        </Card>
      ))}
      <Button title={t('social.newChallenge')} icon="🏆" onPress={() => router.push('/social/new-challenge')} />
      <Card>
        <Txt v="h3">{t('social.joinByCode')}</Txt>
        <Row>
          <View style={{ flex: 1 }}>
            <Field value={joinCode} onChangeText={(v) => setJoinCode(v.toUpperCase())} placeholder="ABC234" autoCapitalize="characters" autoCorrect={false} maxLength={6} />
          </View>
          <Button
            small
            title={t('social.join')}
            loading={busy === 'join'}
            disabled={joinCode.trim().length < 6}
            onPress={() =>
              act('join', async () => {
                const id = await joinChallengeByCode(joinCode);
                ensureLocalTasks(await getChallengeDetail(id), today);
                setJoinCode('');
                router.push({ pathname: '/social/challenge/[id]', params: { id } });
              })
            }
          />
        </Row>
      </Card>

      <SectionTitle>{t('social.friends', { n: friends.length })}</SectionTitle>
      <Card>
        <Txt v="h3">{t('social.addFriend')}</Txt>
        <Row>
          <View style={{ flex: 1 }}>
            <Field value={friendCode} onChangeText={(v) => setFriendCode(v.toUpperCase())} placeholder="ABCD2345" autoCapitalize="characters" autoCorrect={false} maxLength={8} />
          </View>
          <Button
            small
            title={t('social.add')}
            loading={busy === 'friend'}
            disabled={friendCode.trim().length < 8}
            onPress={() =>
              act('friend', async () => {
                await addFriendByCode(friendCode);
                setFriendCode('');
              })
            }
          />
        </Row>
        {friends.length === 0 && !loading ? <Txt v="small">{t('social.noFriends')}</Txt> : null}
        {friends.map((f) => (
          <View key={f.id} style={{ borderTopWidth: 1, borderTopColor: p.border, paddingTop: space.sm, gap: 4 }}>
            <Txt style={{ fontWeight: '700' }}>👤 {f.displayName}</Txt>
            {friendMenu(f)}
          </View>
        ))}
      </Card>

      <SectionTitle>{t('social.account')}</SectionTitle>
      <Card>
        <Txt v="small">{email}</Txt>
        <Row wrap>
          <Button small kind="ghost" title={t('social.signOut')} onPress={() => void signOut()} />
          <Button
            small
            kind="danger"
            title={t('social.deleteAccount')}
            onPress={() =>
              confirmAction(t('social.deleteAccountTitle'), t('social.deleteAccountBody'), () => void deleteAccount().catch((e) => notify(socialErrorText(e))), t('common.delete'))
            }
          />
        </Row>
      </Card>
    </Screen>
  );
}
