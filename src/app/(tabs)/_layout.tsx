import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { ColorValue, Platform } from 'react-native';

import { t } from '@/i18n';
import { useTheme } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function TabsLayout() {
  const p = useTheme();
  const icon = (on: IconName, off: IconName) => {
    const TabIcon = ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
      <Ionicons name={focused ? on : off} size={size} color={color as string} />
    );
    return TabIcon;
  };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.dark ? p.primary : p.primaryText,
        tabBarInactiveTintColor: p.textDim,
        // Web önizlemede varsayılan çubuk yüksekliği etiketi kırpıyor; iOS'ta güvenli alan otomatik eklenir.
        tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.border, ...(Platform.OS === 'web' ? { height: 58 } : null) },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        sceneStyle: { backgroundColor: p.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tab.today'), tabBarIcon: icon('checkmark-circle', 'checkmark-circle-outline') }} />
      <Tabs.Screen name="stats" options={{ title: t('tab.stats'), tabBarIcon: icon('stats-chart', 'stats-chart-outline') }} />
      <Tabs.Screen name="social" options={{ title: t('tab.social'), tabBarActiveTintColor: p.socialText, tabBarIcon: icon('trophy', 'trophy-outline') }} />
      <Tabs.Screen name="settings" options={{ title: t('tab.settings'), tabBarIcon: icon('settings', 'settings-outline') }} />
    </Tabs>
  );
}
