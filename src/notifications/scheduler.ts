/**
 * Yerel hatırlatıcılar (expo-notifications). Uzak push YOK — ücretsiz Apple ID / SideStore ile
 * yalnızca yerel bildirim çalışır. Plan saf fonksiyonda (plan.ts) üretilir, burada iOS'a yazılır.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { todayKey } from '@/domain/dates';
import type { Task } from '@/domain/types';
import { t } from '@/i18n';

import { buildReminderPlan, isoToExpoWeekday, ReminderPlan, ReminderTrigger } from './plan';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';
const CHANNEL = 'hatirlatici';

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

let configured = false;
export function configureNotifications() {
  if (!supported || configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL, {
      name: t('notif.channel'),
      // eslint-disable-next-line import/namespace -- enum `export *` ile geliyor; tsc doğruluyor, eslint çözemiyor
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {});
  }
}

export async function getPermissionState(): Promise<PermissionState> {
  if (!supported) return 'unsupported';
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted) return 'granted';
    return p.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unsupported';
  }
}

export async function requestPermission(): Promise<PermissionState> {
  if (!supported) return 'unsupported';
  try {
    const p = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unsupported';
  }
}

function toExpoTrigger(tr: ReminderTrigger): Notifications.NotificationTriggerInput {
  const channelId = Platform.OS === 'android' ? CHANNEL : undefined;
  switch (tr.type) {
    case 'weekly':
      return {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: isoToExpoWeekday(tr.weekday),
        hour: tr.hour,
        minute: tr.minute,
        channelId,
      };
    case 'monthly':
      return {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: tr.day,
        hour: tr.hour,
        minute: tr.minute,
        channelId,
      };
    default:
      return {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: tr.hour,
        minute: tr.minute,
        channelId,
      };
  }
}

export interface RescheduleResult {
  scheduled: number;
  dropped: string[];
  permission: PermissionState;
}

let lastResult: RescheduleResult = { scheduled: 0, dropped: [], permission: 'undetermined' };
export const getLastReschedule = () => lastResult;

/** Tüm hatırlatıcıları silip plana göre yeniden kurar (idempotent). */
export async function rescheduleAll(tasks: Task[], enabled: boolean): Promise<RescheduleResult> {
  if (!supported) return (lastResult = { scheduled: 0, dropped: [], permission: 'unsupported' });
  const permission = await getPermissionState();
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled || permission !== 'granted') {
      return (lastResult = { scheduled: 0, dropped: [], permission });
    }
    const plan: ReminderPlan = buildReminderPlan(tasks, todayKey());
    let scheduled = 0;
    for (const slot of plan.slots) {
      const many = slot.titles.length > 1;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: many ? t('notif.titleMany', { n: slot.titles.length }) : slot.titles[0],
          body: many ? slot.titles.join(' · ') : t('notif.bodyOne'),
          sound: true,
          data: { taskIds: slot.taskIds },
        },
        trigger: toExpoTrigger(slot.trigger),
      });
      scheduled++;
    }
    return (lastResult = { scheduled, dropped: plan.dropped, permission });
  } catch (e) {
    console.warn('[notif] planlama hatası', e);
    return (lastResult = { scheduled: 0, dropped: [], permission });
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
/** Art arda değişikliklerde tek sefer çalışsın diye geciktirilmiş yeniden planlama. */
export function scheduleRescheduleSoon(getArgs: () => { tasks: Task[]; enabled: boolean }) {
  if (!supported) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    const { tasks, enabled } = getArgs();
    void rescheduleAll(tasks, enabled);
  }, 600);
}

export async function sendTestNotification(): Promise<boolean> {
  if (!supported) return false;
  let permission = await getPermissionState();
  if (permission === 'undetermined') permission = await requestPermission();
  if (permission !== 'granted') return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: t('notif.testTitle'), body: t('notif.testBody'), sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: Platform.OS === 'android' ? CHANNEL : undefined,
    },
  });
  return true;
}
