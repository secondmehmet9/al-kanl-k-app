import { router } from 'expo-router';
import React from 'react';

import { emptyDraft, TaskForm } from '@/components/TaskForm';
import { Screen } from '@/components/ui';
import { useToday } from '@/components/useToday';
import { addTask } from '@/data/store';
import { t } from '@/i18n';

export default function NewTaskScreen() {
  const today = useToday();
  return (
    <Screen padTop={false}>
      <TaskForm
        initial={emptyDraft(today)}
        today={today}
        submitLabel={t('form.create')}
        onSubmit={(draft) => {
          addTask(draft);
          router.back();
        }}
      />
    </Screen>
  );
}
