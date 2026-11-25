import { bestStreak, currentStreak, totalCompletions } from '../streaks';
import { makeLogs, makeTask } from './helpers';

const D = (n: number) => `2026-11-${n < 10 ? '0' + n : n}`;

describe('streak — gün-bazlı', () => {
  it('ardışık başarılı günler; bugün yapılmadıysa seri bozulmaz', () => {
    const t = makeTask({ id: 't', startDate: D(1) });
    const logs = makeLogs({ t: { [D(3)]: true, [D(4)]: true, [D(5)]: true } });
    expect(currentStreak(t, logs.t, D(5))).toBe(3);
    expect(currentStreak(t, logs.t, D(6))).toBe(3); // 6'sı henüz bitmedi
    expect(currentStreak(t, logs.t, D(7))).toBe(0); // 6'sı kaçtı
    expect(bestStreak(t, logs.t, D(20))).toBe(3);
  });

  it('atlanan gün seriyi korur ama saymaz', () => {
    const t = makeTask({ id: 't', startDate: D(1) });
    const logs = makeLogs({ t: { [D(1)]: true, [D(2)]: 'skipped', [D(3)]: true } });
    expect(currentStreak(t, logs.t, D(3))).toBe(2);
  });

  it('planlı olmayan günler seriyi bozmaz (Pzt-Çar-Cum)', () => {
    const t = makeTask({ id: 't', recurrenceType: 'weekdays', recurrenceDays: [1, 3, 5], startDate: D(2) });
    const logs = makeLogs({ t: { [D(2)]: true, [D(4)]: true, [D(6)]: true, [D(9)]: true } });
    expect(currentStreak(t, logs.t, D(10))).toBe(4);
  });

  it('miktar görevinde yalnız hedefe ulaşan gün sayılır', () => {
    const t = makeTask({ id: 't', kind: 'count', targetValue: 8, startDate: D(1) });
    const logs = makeLogs({ t: { [D(1)]: 8, [D(2)]: 7, [D(3)]: 8, [D(4)]: 9 } }, { t: 8 });
    expect(currentStreak(t, logs.t, D(4))).toBe(2);
    expect(bestStreak(t, logs.t, D(4))).toBe(2);
    expect(totalCompletions(t, logs.t)).toBe(3);
  });

  it('duraklatma seriyi korur', () => {
    const t = makeTask({ id: 't', startDate: D(1), pauses: [{ from: D(3), to: D(5) }] });
    const logs = makeLogs({ t: { [D(1)]: true, [D(2)]: true, [D(6)]: true } });
    expect(currentStreak(t, logs.t, D(6))).toBe(3);
  });

  it('en iyi seri güncel seriden uzun olabilir', () => {
    const t = makeTask({ id: 't', startDate: D(1) });
    const logs = makeLogs({ t: { [D(1)]: true, [D(2)]: true, [D(3)]: true, [D(4)]: true, [D(6)]: true } });
    expect(currentStreak(t, logs.t, D(6))).toBe(1);
    expect(bestStreak(t, logs.t, D(6))).toBe(4);
  });
});

describe('streak — haftada N', () => {
  // Haftalar: 2–8, 9–15, 16–22, 23–29 Kasım 2026
  const t = makeTask({ id: 't', recurrenceType: 'weekly_n', periodTargetN: 2, startDate: D(2) });

  it('ardışık hedefi tutan haftalar; açık hafta tutmadıysa nötr', () => {
    const logs = makeLogs({ t: { [D(2)]: true, [D(3)]: true, [D(9)]: true, [D(12)]: true, [D(16)]: true } });
    expect(currentStreak(t, logs.t, D(18))).toBe(2);
    expect(currentStreak(t, logs.t, D(23))).toBe(0); // 16–22 haftası tutmadı
    expect(bestStreak(t, logs.t, D(23))).toBe(2);
  });

  it('açık hafta hedefi tuttuysa hemen sayılır', () => {
    const logs = makeLogs({ t: { [D(2)]: true, [D(3)]: true, [D(9)]: true, [D(10)]: true } });
    expect(currentStreak(t, logs.t, D(10))).toBe(2);
  });
});
