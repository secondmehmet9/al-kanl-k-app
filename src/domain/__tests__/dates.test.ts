import {
  addDays,
  dayNum,
  diffDays,
  eachDay,
  endOfMonth,
  endOfWeek,
  isoWeekday,
  startOfMonth,
  startOfWeek,
  toKey,
} from '../dates';

describe('dates', () => {
  it('ISO hafta günü: Pazartesi=1 … Pazar=7', () => {
    expect(isoWeekday('2026-11-02')).toBe(1); // Pazartesi
    expect(isoWeekday('2026-11-25')).toBe(3); // Çarşamba
    expect(isoWeekday('2026-11-08')).toBe(7); // Pazar
    expect(isoWeekday('1970-01-01')).toBe(4); // Perşembe
    expect(isoWeekday('1969-12-28')).toBe(7); // epoch öncesi Pazar
  });

  it('Date nesnesiyle tutarlı', () => {
    for (const k of ['2024-02-29', '2026-03-29', '2026-10-25', '2027-01-01']) {
      const [y, m, d] = k.split('-').map(Number);
      const js = new Date(y, m - 1, d, 12).getDay(); // 0=Paz
      expect(isoWeekday(k)).toBe(js === 0 ? 7 : js);
      expect(toKey(new Date(y, m - 1, d, 12))).toBe(k);
    }
  });

  it('hafta Pazartesi başlar', () => {
    expect(startOfWeek('2026-11-25')).toBe('2026-11-23');
    expect(endOfWeek('2026-11-25')).toBe('2026-11-29');
    expect(startOfWeek('2026-11-23')).toBe('2026-11-23');
    expect(endOfWeek('2026-11-29')).toBe('2026-11-29');
  });

  it('ay sınırları ve artık yıl', () => {
    expect(startOfMonth('2024-02-15')).toBe('2024-02-01');
    expect(endOfMonth('2024-02-15')).toBe('2024-02-29');
    expect(endOfMonth('2026-02-15')).toBe('2026-02-28');
    expect(endOfMonth('2026-12-05')).toBe('2026-12-31');
  });

  it('gün ekleme yıl/ay/DST sınırlarını aşar', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30'); // AB yaz saati geçişi
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26'); // kış saati geçişi
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
    expect(dayNum('1970-01-02')).toBe(1);
  });

  it('eachDay uçlar dahil', () => {
    expect(eachDay('2026-11-29', '2026-12-01')).toEqual(['2026-11-29', '2026-11-30', '2026-12-01']);
    expect(eachDay('2026-11-29', '2026-11-28')).toEqual([]);
  });
});
