import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, Switch, View } from 'react-native';

import { Button, Card, Chip, confirmAction, Field, notify, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { exportSnapshot, importSnapshot, setArchived, updateSettings, useAppState, wipeAll } from '@/data/store';
import type { ThemePref } from '@/domain/types';
import { t, tDyn } from '@/i18n';
import { IOS_PENDING_LIMIT } from '@/notifications/plan';
import { getPermissionState, PermissionState, requestPermission, rescheduleAll, RescheduleResult, sendTestNotification } from '@/notifications/scheduler';
import { socialEnabled } from '@/social/config';
import { space, useTheme } from '@/theme';

const THEMES: ThemePref[] = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const p = useTheme();
  const settings = useAppState((s) => s.settings);
  const tasks = useAppState((s) => s.tasks);
  const archived = tasks.filter((x) => x.archived);
  const [name, setName] = useState(settings.displayName);
  const [perm, setPerm] = useState<PermissionState>('undetermined');
  const [result, setResult] = useState<RescheduleResult | null>(null);
  const [backupText, setBackupText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const refresh = useCallback(async () => {
    const r = await rescheduleAll(tasks, settings.notificationsEnabled);
    setResult(r);
    setPerm(r.permission === 'unsupported' ? 'unsupported' : await getPermissionState());
  }, [tasks, settings.notificationsEnabled]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const withReminder = tasks.filter((x) => !x.archived && x.reminderTime).length;

  return (
    <Screen>
      <Txt v="h1">{t('settings.title')}</Txt>

      <SectionTitle>{t('settings.profile')}</SectionTitle>
      <Card>
        <Field
          label={t('settings.name')}
          placeholder={t('settings.namePh')}
          value={name}
          onChangeText={setName}
          onBlur={() => updateSettings({ displayName: name.trim() })}
          maxLength={40}
          returnKeyType="done"
        />
      </Card>

      <SectionTitle>{t('settings.appearance')}</SectionTitle>
      <Card>
        <Row wrap>
          {THEMES.map((th) => (
            <Chip key={th} testID={`theme-${th}`} label={tDyn(`settings.theme.${th}`)} selected={settings.theme === th} onPress={() => updateSettings({ theme: th })} />
          ))}
        </Row>
      </Card>

      <SectionTitle>{t('settings.notifications')}</SectionTitle>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt v="h3">{t('settings.reminders')}</Txt>
            <Txt v="small">{t('settings.remindersHint')}</Txt>
          </View>
          <Switch
            accessibilityLabel={t('settings.reminders')}
            value={settings.notificationsEnabled}
            onValueChange={(v) => updateSettings({ notificationsEnabled: v })}
            trackColor={{ true: p.primary, false: p.track }}
          />
        </Row>
        {perm === 'unsupported' ? (
          <Txt v="small">{t('settings.notifUnsupported')}</Txt>
        ) : (
          <>
            <Txt v="small" color={perm === 'granted' ? p.success : p.warning}>
              {tDyn(`settings.perm.${perm}`)}
            </Txt>
            <Txt v="small">
              {t('settings.notifCount', { tasks: withReminder, scheduled: result?.scheduled ?? 0, limit: IOS_PENDING_LIMIT })}
            </Txt>
            {result && result.dropped.length > 0 ? (
              <Txt v="small" color={p.danger}>
                {t('settings.notifDropped', { n: result.dropped.length })}
              </Txt>
            ) : null}
            <Row wrap>
              {perm !== 'granted' ? (
                <Button
                  small
                  title={t('settings.askPermission')}
                  onPress={async () => {
                    const r = await requestPermission();
                    setPerm(r);
                    if (r === 'denied') notify(t('settings.permDeniedTitle'), t('settings.permDeniedBody'));
                    void refresh();
                  }}
                />
              ) : null}
              <Button
                small
                kind="soft"
                title={t('settings.testNotif')}
                onPress={async () => {
                  const ok = await sendTestNotification();
                  notify(ok ? t('settings.testSent') : t('settings.permDeniedTitle'), ok ? t('settings.testSentBody') : t('settings.permDeniedBody'));
                  void refresh();
                }}
              />
            </Row>
          </>
        )}
      </Card>

      <SectionTitle>{t('settings.data')}</SectionTitle>
      <Card>
        <Txt v="small">{t('settings.backupHint')}</Txt>
        <Row wrap>
          <Button
            small
            kind="soft"
            icon="📋"
            title={t('settings.backupCopy')}
            onPress={async () => {
              await Clipboard.setStringAsync(JSON.stringify(exportSnapshot()));
              notify(t('settings.backupCopied'), t('settings.backupCopiedBody'));
            }}
          />
          <Button small kind="ghost" icon="📥" title={t('settings.backupRestore')} onPress={() => setShowImport((v) => !v)} />
        </Row>
        {showImport ? (
          <>
            <Field value={backupText} onChangeText={setBackupText} placeholder={t('settings.backupPastePh')} multiline style={{ minHeight: 90, fontSize: 12 }} autoCapitalize="none" autoCorrect={false} />
            <Row wrap>
              <Button
                small
                kind="ghost"
                title={t('settings.pasteClipboard')}
                onPress={async () => setBackupText(await Clipboard.getStringAsync())}
              />
              <Button
                small
                kind="danger"
                title={t('settings.backupApply')}
                disabled={!backupText.trim()}
                onPress={() =>
                  confirmAction(t('settings.backupApplyTitle'), t('settings.backupApplyBody'), async () => {
                    try {
                      await importSnapshot(backupText);
                      setBackupText('');
                      setShowImport(false);
                      notify(t('settings.backupRestored'));
                    } catch {
                      notify(t('settings.backupInvalid'));
                    }
                  })
                }
              />
            </Row>
          </>
        ) : null}
      </Card>

      {archived.length > 0 ? (
        <>
          <SectionTitle>{t('settings.archived', { n: archived.length })}</SectionTitle>
          <Card>
            {archived.map((task) => (
              <Row key={task.id} style={{ justifyContent: 'space-between' }}>
                <Txt numberOfLines={1} style={{ flex: 1 }}>
                  {task.icon} {task.title}
                </Txt>
                <Button small kind="ghost" title={t('detail.unarchive')} onPress={() => setArchived(task.id, false)} />
                <Button small kind="ghost" title={t('task.actionDetail')} onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })} />
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      <SectionTitle>{t('settings.about')}</SectionTitle>
      <Card>
        <Button small kind="soft" icon="ⓘ" title={t('scoreInfo.title')} onPress={() => router.push('/score-info')} />
        <Txt v="small">
          {t('settings.version', { v: Constants.expoConfig?.version ?? '1.0.0' })} · {Platform.OS} · {socialEnabled ? t('settings.socialOn') : t('settings.socialOff')}
        </Txt>
        <Txt v="small">{t('settings.privacyNote')}</Txt>
      </Card>

      <Button
        kind="danger"
        title={t('settings.wipe')}
        style={{ marginTop: space.md }}
        onPress={() => confirmAction(t('settings.wipeTitle'), t('settings.wipeBody'), () => void wipeAll(), t('common.delete'))}
      />
    </Screen>
  );
}
