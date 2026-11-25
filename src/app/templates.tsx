import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { useToday } from '@/components/useToday';
import { addTask, updateSettings, useAppState } from '@/data/store';
import { CATEGORIES } from '@/domain/categories';
import { TaskTemplate, TEMPLATES } from '@/domain/templates';
import { t, tDyn } from '@/i18n';
import { formatNum, recurrenceLabel } from '@/i18n/format';
import { alpha, radius, space, useTheme } from '@/theme';

export default function TemplatesScreen() {
  const p = useTheme();
  const today = useToday();
  const existing = useAppState((s) => s.tasks);
  const [picked, setPicked] = useState<string[]>([]);
  const title = (tpl: TaskTemplate) => tDyn(`tpl.${tpl.id}`);
  const has = (tpl: TaskTemplate) => existing.some((x) => !x.archived && x.title === title(tpl));

  const toggle = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const addPicked = () => {
    for (const tpl of TEMPLATES.filter((x) => picked.includes(x.id))) {
      addTask({
        title: title(tpl),
        icon: tpl.icon,
        color: tpl.color,
        category: tpl.category,
        kind: tpl.kind,
        targetValue: tpl.targetValue,
        unit: tpl.unitKey ? tDyn(`unit.${tpl.unitKey}`) : '',
        recurrenceType: tpl.recurrenceType,
        recurrenceDays: tpl.recurrenceDays,
        periodTargetN: tpl.periodTargetN,
        startDate: today,
        endDate: null,
        weight: tpl.weight,
        privacy: 'private',
        reminderTime: tpl.reminderTime,
        sourceTaskId: null,
        challengeId: null,
      });
    }
    updateSettings({ onboarded: true });
    router.back();
  };

  return (
    <Screen
      padTop={false}
      footer={
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg, backgroundColor: p.bg, borderTopWidth: 1, borderTopColor: p.border }}>
          <Button testID="tpl-add" title={picked.length > 0 ? t('tpl.addN', { n: picked.length }) : t('tpl.pickSome')} disabled={picked.length === 0} onPress={addPicked} />
        </View>
      }>
      <Txt v="dim">{t('tpl.intro')}</Txt>
      {CATEGORIES.map((cat) => {
        const list = TEMPLATES.filter((x) => x.category === cat.id);
        if (list.length === 0) return null;
        return (
          <View key={cat.id} style={{ gap: space.sm }}>
            <SectionTitle>{`${cat.icon} ${tDyn(`cat.${cat.id}`)}`}</SectionTitle>
            {list.map((tpl) => {
              const on = picked.includes(tpl.id);
              const added = has(tpl);
              return (
                <Pressable
                  key={tpl.id}
                  testID={`tpl-${tpl.id}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled: added }}
                  accessibilityLabel={title(tpl)}
                  disabled={added}
                  onPress={() => toggle(tpl.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    padding: space.md,
                    borderRadius: radius.lg,
                    backgroundColor: p.card,
                    borderWidth: 1.5,
                    borderColor: on ? tpl.color : p.border,
                    opacity: added ? 0.5 : 1,
                  }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: alpha(tpl.color, p.dark ? 0.28 : 0.15), alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{tpl.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt v="h3">{title(tpl)}</Txt>
                    <Row gap={6}>
                      <Txt v="small">
                        {recurrenceLabel(tpl)}
                        {tpl.kind === 'count' ? ` · ${formatNum(tpl.targetValue)} ${tpl.unitKey ? tDyn(`unit.${tpl.unitKey}`) : ''}` : ''}
                        {tpl.reminderTime ? ` · ⏰ ${tpl.reminderTime}` : ''}
                      </Txt>
                    </Row>
                  </View>
                  <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: on || added ? tpl.color : p.border, backgroundColor: on || added ? tpl.color : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>{on || added ? '✓' : ''}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </Screen>
  );
}
