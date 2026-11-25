import { calendarPeriodOf, effectivePeriod, isActiveOn, isScheduledOn, isVisibleOn } from '../recurrence';
import { makeTask } from './helpers';

describe('recurrence', () => {
  it('günlük: başlangıçtan itibaren her gün', () => {
    const t = makeTask({ startDate: '2026-11-10' });
    expect(isScheduledOn(t, '2026-11-09')).toBe(false);
    expect(isScheduledOn(t, '2026-11-10')).toBe(true);
    expect(isScheduledOn(t, '2027-03-01')).toBe(true);
  });

  it('bitiş tarihi dahil, sonrası planlı değil', () => {
    const t = makeTask({ endDate: '2026-11-20' });
    expect(isScheduledOn(t, '2026-11-20')).toBe(true);
    expect(isScheduledOn(t, '2026-11-21')).toBe(false);
  });

  it('seçili günler: Pzt-Çar-Cum', () => {
    const t = makeTask({ recurrenceType: 'weekdays', recurrenceDays: [1, 3, 5] });
    expect(isScheduledOn(t, '2026-11-23')).toBe(true); // Pzt
    expect(isScheduledOn(t, '2026-11-24')).toBe(false); // Sal
    expect(isScheduledOn(t, '2026-11-25')).toBe(true); // Çar
    expect(isScheduledOn(t, '2026-11-27')).toBe(true); // Cum
    expect(isScheduledOn(t, '2026-11-29')).toBe(false); // Paz
  });

  it('ayın günü: 1 ve 15', () => {
    const t = makeTask({ recurrenceType: 'monthly_day', recurrenceDays: [1, 15] });
    expect(isScheduledOn(t, '2026-11-01')).toBe(true);
    expect(isScheduledOn(t, '2026-11-15')).toBe(true);
    expect(isScheduledOn(t, '2026-11-16')).toBe(false);
  });

  it('ayın 31’i kısa ayda son güne kayar', () => {
    const t = makeTask({ recurrenceType: 'monthly_day', recurrenceDays: [31] });
    expect(isScheduledOn(t, '2026-01-31')).toBe(true);
    expect(isScheduledOn(t, '2026-02-28')).toBe(true);
    expect(isScheduledOn(t, '2026-02-27')).toBe(false);
    expect(isScheduledOn(t, '2026-04-30')).toBe(true);
    expect(isScheduledOn(t, '2026-01-30')).toBe(false);
  });

  it('duraklatma aralığı planı kaldırır (açık uçlu dahil)', () => {
    const t = makeTask({ pauses: [{ from: '2026-11-10', to: '2026-11-12' }, { from: '2026-11-20', to: null }] });
    expect(isScheduledOn(t, '2026-11-09')).toBe(true);
    expect(isScheduledOn(t, '2026-11-10')).toBe(false);
    expect(isScheduledOn(t, '2026-11-12')).toBe(false);
    expect(isScheduledOn(t, '2026-11-13')).toBe(true);
    expect(isScheduledOn(t, '2026-11-25')).toBe(false);
    expect(isActiveOn(t, '2026-11-25')).toBe(false);
  });

  it('haftada N: gün planı yok ama aktifken her gün listede görünür', () => {
    const t = makeTask({ recurrenceType: 'weekly_n', periodTargetN: 3, startDate: '2026-11-10' });
    expect(isScheduledOn(t, '2026-11-11')).toBe(false);
    expect(isVisibleOn(t, '2026-11-11')).toBe(true);
    expect(isVisibleOn(t, '2026-11-09')).toBe(false);
  });

  it('takvim periyodu ve görev ömrüyle kesişimi', () => {
    const w = makeTask({ recurrenceType: 'weekly_n', startDate: '2026-11-25', endDate: '2026-12-02' });
    expect(calendarPeriodOf(w, '2026-11-25')).toEqual({ start: '2026-11-23', end: '2026-11-29' });
    expect(effectivePeriod(w, { start: '2026-11-23', end: '2026-11-29' })).toEqual({
      start: '2026-11-25',
      end: '2026-11-29',
    });
    expect(effectivePeriod(w, { start: '2026-11-30', end: '2026-12-06' })).toEqual({
      start: '2026-11-30',
      end: '2026-12-02',
    });
    expect(effectivePeriod(w, { start: '2026-12-07', end: '2026-12-13' })).toBeNull();
    const m = makeTask({ recurrenceType: 'monthly_n' });
    expect(calendarPeriodOf(m, '2026-02-10')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });
});
