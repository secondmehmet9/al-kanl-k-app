import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { draftFromTask, TaskForm } from '@/components/TaskForm';
import { EmptyState, Screen } from '@/components/ui';
import { useToday } from '@/components/useToday';
import { updateTask, useAppState } from '@/data/store';
import { t } from '@/i18n';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = useToday();
  const task = useAppState((s) => s.tasks.find((x) => x.id === id));
  if (!task) {
    return (
      <Screen padTop={false}>
        <EmptyState icon="🤷" title={t('detail.notFound')} />
      </Screen>
    );
  }
  return (
    <Screen padTop={false}>
      <TaskForm
        isEdit
        initial={draftFromTask(task)}
        today={today}
        submitLabel={t('common.save')}
        onSubmit={(draft) => {
          updateTask(task.id, draft);
          router.back();
        }}
      />
    </Screen>
  );
}
