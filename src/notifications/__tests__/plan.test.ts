import { makeTask } from '@/domain/__tests__/helpers';

import { buildReminderPlan, IOS_PENDING_LIMIT, isoToExpoWeekday, parseTime, triggersForTask } from '../plan';

const TODAY = '2026-11-25';

describe('hatırlatıcı planı', () => {
  it('saat ayrıştırma', () => {
    expect(parseTime('07:05')).toEqual({ hour: 7, minute: 5 });
    expect(parseTime('7:30')).toEqual({ hour: 7, minute: 30 });
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('ab')).toBeNull();
    expect(parseTime(null)).toBeNull();
  });

  it('günlük görev = 1 tekrarlı tetikleyici', () => {
    expect(triggersForTask(makeTask({ reminderTime: '08:00' }))).toEqual([{ type: 'daily', hour: 8, minute: 0 }]);
    expect(triggersForTask(makeTask({ reminderTime: null }))).toEqual([]);
  });

  it('seçili günler = gün başına 1 haftalık tetikleyici; 7 gün seçiliyse tek günlük', () => {
    const t = makeTask({ recurrenceType: 'weekdays', recurrenceDays: [5, 1, 3], reminderTime: '18:30' });
    expect(triggersForTask(t).map((x) => (x.type === 'weekly' ? x.weekday : 0))).toEqual([1, 3, 5]);
    const all = makeTask({ recurrenceType: 'weekdays', recurrenceDays: [1, 2, 3, 4, 5, 6, 7], reminderTime: '18:30' });
    expect(triggersForTask(all)).toEqual([{ type: 'daily', hour: 18, minute: 30 }]);
  });

  it('ayın günü = aylık tetikleyici; haftada N = günlük', () => {
    const m = makeTask({ recurrenceType: 'monthly_day', recurrenceDays: [15, 1], reminderTime: '10:00' });
    expect(triggersForTask(m)).toEqual([
      { type: 'monthly', day: 1, hour: 10, minute: 0 },
      { type: 'monthly', day: 15, hour: 10, minute: 0 },
    ]);
    const w = makeTask({ recurrenceType: 'weekly_n', periodTargetN: 3, reminderTime: '10:00' });
    expect(triggersForTask(w)).toEqual([{ type: 'daily', hour: 10, minute: 0 }]);
  });

  it('ISO → iOS hafta günü (1=Pazar)', () => {
    expect(isoToExpoWeekday(1)).toBe(2); // Pzt
    expect(isoToExpoWeekday(6)).toBe(7); // Cmt
    expect(isoToExpoWeekday(7)).toBe(1); // Paz
  });

  it('aynı saat/gün → tek bildirimde birleşir', () => {
    const a = makeTask({ id: 'a', title: 'Su', reminderTime: '09:00' });
    const b = makeTask({ id: 'b', title: 'Vitamin', reminderTime: '09:00' });
    const c = makeTask({ id: 'c', title: 'Kitap', reminderTime: '21:00' });
    const plan = buildReminderPlan([a, b, c], TODAY);
    expect(plan.slots).toHaveLength(2);
    expect(plan.slots[0].taskIds).toEqual(['a', 'b']);
    expect(plan.dropped).toEqual([]);
  });

  it('arşivli, duraklatılmış, süresi bitmiş görevlere bildirim kurulmaz', () => {
    const tasks = [
      makeTask({ id: 'a', reminderTime: '09:00', archived: true }),
      makeTask({ id: 'b', reminderTime: '09:10', pauses: [{ from: '2026-11-20', to: null }] }),
      makeTask({ id: 'c', reminderTime: '09:20', endDate: '2026-11-24' }),
      makeTask({ id: 'd', reminderTime: '09:30', endDate: TODAY }),
      makeTask({ id: 'e', reminderTime: '09:40', pauses: [{ from: '2026-11-01', to: '2026-11-05' }] }),
    ];
    expect(buildReminderPlan(tasks, TODAY).slots.flatMap((s) => s.taskIds)).toEqual(['d', 'e']);
  });

  it('iOS 64 sınırı: bütçe aşılmaz, sığmayan görevler raporlanır', () => {
    // 100 görev, her biri farklı dakikada → 100 slot ister
    const tasks = Array.from({ length: 100 }, (_, i) =>
      makeTask({ id: `t${i}`, reminderTime: `${String(6 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}` })
    );
    const plan = buildReminderPlan(tasks, TODAY);
    expect(plan.slots.length).toBe(60);
    expect(plan.slots.length).toBeLessThan(IOS_PENDING_LIMIT);
    expect(plan.dropped).toHaveLength(40);
    // 10 görev × 7 gün ayrı saatlerde = 70 slot → bütçeye indirilir
    const weekly = Array.from({ length: 10 }, (_, i) =>
      makeTask({ id: `w${i}`, recurrenceType: 'weekdays', recurrenceDays: [1, 2, 3, 4, 5, 6], reminderTime: `1${i}:00`.slice(-5) })
    );
    expect(buildReminderPlan(weekly, TODAY).slots.length).toBe(60);
  });

  it('bütçe aşımında çok görevli slotlar korunur', () => {
    const shared = Array.from({ length: 3 }, (_, i) => makeTask({ id: `s${i}`, reminderTime: '09:00' }));
    const singles = Array.from({ length: 5 }, (_, i) => makeTask({ id: `x${i}`, reminderTime: `10:0${i}` }));
    const plan = buildReminderPlan([...singles, ...shared], TODAY, 2);
    expect(plan.slots).toHaveLength(2);
    expect(plan.slots.some((s) => s.taskIds.length === 3)).toBe(true);
    expect(plan.dropped).toHaveLength(4);
  });
});
