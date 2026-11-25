import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getState, initStore, onTasksChanged, useAppState } from '@/data/store';
import { t } from '@/i18n';
import { configureNotifications, rescheduleAll, scheduleRescheduleSoon } from '@/notifications/scheduler';
import { startChallengeSync } from '@/social/sync';
import { useTheme } from '@/theme';

export default function RootLayout() {
  const p = useTheme();
  const ready = useAppState((s) => s.ready);

  useEffect(() => {
    configureNotifications();
    void initStore();
    startChallengeSync();
    const args = () => ({ tasks: getState().tasks, enabled: getState().settings.notificationsEnabled });
    const off = onTasksChanged(() => scheduleRescheduleSoon(args));
    // Uygulama öne gelince hatırlatıcıları tazele (izin sonradan verilmiş olabilir).
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && getState().ready) void rescheduleAll(args().tasks, args().enabled);
    });
    return () => {
      off();
      sub.remove();
    };
  }, []);

  const base = p.dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: p.bg, card: p.bg, text: p.text, border: p.border, primary: p.primary },
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style={p.dark ? 'light' : 'dark'} />
        {!ready ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg }}>
            <ActivityIndicator color={p.primary} />
          </View>
        ) : (
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: p.bg },
              headerTintColor: p.text,
              headerTitleStyle: { fontWeight: '700' },
              headerShadowVisible: false,
              headerBackTitle: t('common.back'),
              contentStyle: { backgroundColor: p.bg },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="task/new" options={{ title: t('form.newTitle') }} />
            <Stack.Screen name="task/[id]" options={{ title: t('detail.title') }} />
            <Stack.Screen name="task/edit/[id]" options={{ title: t('form.editTitle') }} />
            <Stack.Screen name="templates" options={{ title: t('tpl.title') }} />
            <Stack.Screen name="score-info" options={{ title: t('scoreInfo.title') }} />
            <Stack.Screen name="social/demo" options={{ title: t('social.demoTitle') }} />
            <Stack.Screen name="social/new-challenge" options={{ title: t('social.newChallenge') }} />
            <Stack.Screen name="social/challenge/[id]" options={{ title: t('social.challenge') }} />
          </Stack>
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
