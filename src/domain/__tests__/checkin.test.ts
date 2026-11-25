import { canEditDate, canSkip, logForIncrement, logForStatus, logForToggle, logForValue } from '../checkin';
import { makeLogs, makeTask } from './helpers';

const NOW = '2026-11-25T10:00:00.000Z';
const DAY = '2026-11-25';

describe('check-in kuralları', () => {
  it('geriye dönük sınır: bugün + 2 gün; gelecek yok', () => {
    expect(canEditDate('2026-11-25', DAY)).toBe(true);
    expect(canEditDate('2026-11-23', DAY)).toBe(true);
    expect(canEditDate('2026-11-22', DAY)).toBe(false);
    expect(canEditDate('2026-11-26', DAY)).toBe(false);
  });

  it('tek dokunuş: yapıldı ↔ boş', () => {
    const t = makeTask({ id: 't' });
    const done = logForToggle(t, DAY, undefined, NOW)!;
    expect(done).toMatchObject({ status: 'done', value: 1, date: DAY, taskId: 't' });
    expect(logForToggle(t, DAY, done, NOW)).toBeNull();
    // atlanmış/yapılmadı günde dokunuş → yapıldı
    expect(logForToggle(t, DAY, logForStatus(t, DAY, 'skipped', undefined, NOW), NOW)!.status).toBe('done');
  });

  it('miktar: +1 dokunuşları, hedefte "done", 0’da kayıt silinir', () => {
    const t = makeTask({ id: 't', kind: 'count', targetValue: 3 });
    let log = logForIncrement(t, DAY, 1, undefined, NOW)!;
    expect(log).toMatchObject({ value: 1, status: 'partial' });
    log = logForIncrement(t, DAY, 1, log, NOW)!;
    log = logForIncrement(t, DAY, 1, log, NOW)!;
    expect(log).toMatchObject({ value: 3, status: 'done' });
    log = logForIncrement(t, DAY, 1, log, NOW)!;
    expect(log).toMatchObject({ value: 4, status: 'done' }); // hedef üstü kaydedilir, oran 1’de kalır
    expect(logForIncrement(t, DAY, -1, logForValue(t, DAY, 1, undefined, NOW)!, NOW)).toBeNull();
    expect(logForIncrement(t, DAY, -1, undefined, NOW)).toBeNull();
  });

  it('miktar görevinde tek dokunuş hedefi doldurur', () => {
    const t = makeTask({ id: 't', kind: 'count', targetValue: 8 });
    expect(logForToggle(t, DAY, undefined, NOW)).toMatchObject({ value: 8, status: 'done' });
  });

  it('atlanmış günde +1 atlamayı kaldırıp 1’den başlar', () => {
    const t = makeTask({ id: 't', kind: 'count', targetValue: 8 });
    const skipped = logForStatus(t, DAY, 'skipped', undefined, NOW);
    expect(logForIncrement(t, DAY, 1, skipped, NOW)).toMatchObject({ value: 1, status: 'partial' });
  });

  it('haftada en fazla 2 atlama; mevcut atlamayı geri almak serbest', () => {
    const logs = makeLogs({ t: { '2026-11-23': 'skipped', '2026-11-24': 'skipped' } }).t;
    expect(canSkip(logs, DAY)).toBe(false);
    expect(canSkip(logs, '2026-11-24')).toBe(true);
    expect(canSkip(logs, '2026-11-30')).toBe(true); // yeni hafta
    expect(canSkip(undefined, DAY)).toBe(true);
  });
});
