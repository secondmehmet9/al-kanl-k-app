import {
  computeScore,
  dailyScore,
  dayRatio,
  evaluatePeriod,
  heatmapDays,
  monthlyScore,
  overallScore,
  periodProgress,
  proratedTarget,
  skipsUsedInWeek,
  taskWindowRatio,
  weeklyScore,
} from '../scoring';
import { makeLogs, makeTask } from './helpers';

// Rapor 3.4 örnek haftası: 2 Kas 2026 (Pzt) – 8 Kas 2026 (Paz)
const WEEK = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'];
const [MON, TUE, WED, THU, FRI, SAT, SUN] = WEEK;

function reportExample() {
  const A = makeTask({ id: 'A', title: 'Su', kind: 'count', targetValue: 8, unit: 'bardak', startDate: MON });
  const B = makeTask({ id: 'B', title: 'Erken kalk', startDate: MON });
  const C = makeTask({ id: 'C', title: 'Spor', recurrenceType: 'weekly_n', periodTargetN: 3, weight: 2, startDate: MON });
  const D = makeTask({ id: 'D', title: 'İş raporu', recurrenceType: 'monthly_n', periodTargetN: 1, weight: 3, startDate: '2026-11-01' });
  const logs = makeLogs(
    {
      A: { [MON]: 8, [TUE]: 4, [WED]: 8, [THU]: 8, [FRI]: 0, [SAT]: 8, [SUN]: 8 },
      B: { [MON]: true, [TUE]: true, [WED]: true, [THU]: true, [FRI]: true },
      C: { [TUE]: true, [THU]: true },
    },
    { A: 8 }
  );
  return { tasks: [A, B, C, D], logs, A, B, C, D };
}

describe('dayRatio (rapor 3.1)', () => {
  const bool = makeTask();
  const count = makeTask({ kind: 'count', targetValue: 8 });
  const log = (value: number, status: any) => ({ taskId: 'x', date: MON, value, status, note: '', updatedAt: '' });

  it('yapıldı=1, yapılmadı/kayıt yok=0', () => {
    expect(dayRatio(bool, log(1, 'done'))).toBe(1);
    expect(dayRatio(bool, log(0, 'missed'))).toBe(0);
    expect(dayRatio(bool, undefined)).toBe(0);
  });
  it('miktar görevi kısmi kredi: 5/8 = 0.625, üst sınır 1', () => {
    expect(dayRatio(count, log(5, 'partial'))).toBeCloseTo(0.625);
    expect(dayRatio(count, log(12, 'done'))).toBe(1);
    expect(dayRatio(count, log(0, 'partial'))).toBe(0);
  });
  it('atla → null (hesaptan çıkar)', () => {
    expect(dayRatio(bool, log(0, 'skipped'))).toBeNull();
    expect(dayRatio(count, log(3, 'skipped'))).toBeNull();
  });
  it('ikili görevde kısmi kredi yok', () => {
    expect(dayRatio(bool, log(0.5, 'partial'))).toBe(0);
  });
});

describe('rapor 3.4 örneği', () => {
  it('görev oranları: A=%78.6, B=%71.4, C=%66.7', () => {
    const { A, B, C, logs } = reportExample();
    const win = { start: MON, end: SUN };
    expect(taskWindowRatio(A, logs.A, win, SUN).ratio! * 100).toBeCloseTo(78.57, 1);
    expect(taskWindowRatio(A, logs.A, win, SUN).earned).toBeCloseTo(5.5);
    expect(taskWindowRatio(B, logs.B, win, SUN).ratio! * 100).toBeCloseTo(71.43, 1);
    expect(taskWindowRatio(C, logs.C, win, SUN).ratio! * 100).toBeCloseTo(66.67, 1);
  });

  it('haftalık skor = %70.8 (görev-başına ağırlıklı ortalama); aylık görev D haftaya girmez', () => {
    const { tasks, logs } = reportExample();
    const res = weeklyScore(tasks, logs, WED, SUN);
    expect(res.score).toBeCloseTo(70.83, 1);
    expect(res.items.map((i) => i.taskId)).toEqual(['A', 'B', 'C']);
    // elle: (1×.7857 + 1×.7143 + 2×.6667) / 4
    expect(res.score).toBeCloseTo((100 * (5.5 / 7 + 5 / 7 + 2 * (2 / 3))) / 4, 6);
  });

  it('aylık skor: D ay sonunda kapanınca w=3 ile girer', () => {
    const { tasks, logs } = reportExample();
    // Sadece örnek haftanın verisi var; ay sonu 30 Kas.
    const before = monthlyScore(tasks, logs, SUN, '2026-11-29');
    expect(before.items.find((i) => i.taskId === 'D')).toBeUndefined();
    const after = monthlyScore(tasks, logs, SUN, '2026-11-30');
    const d = after.items.find((i) => i.taskId === 'D')!;
    expect(d.weight).toBe(3);
    expect(d.ratio).toBe(0);
    const logs2 = { ...logs, ...makeLogs({ D: { '2026-11-27': true } }) };
    const done = monthlyScore(tasks, logs2, SUN, '2026-11-30');
    expect(done.items.find((i) => i.taskId === 'D')!.ratio).toBe(1);
  });

  it('günlük skor: Salı = (A .5 + B 1) / 2 = %75; Cuma = (0 + 1)/2 = %50', () => {
    const { tasks, logs } = reportExample();
    expect(dailyScore(tasks, logs, TUE, SUN).score).toBeCloseTo(75);
    expect(dailyScore(tasks, logs, FRI, SUN).score).toBeCloseTo(50);
  });

  it('günlük skor Pazar: o gün KAPANAN haftalık periyot da girer (3.3)', () => {
    const { tasks, logs } = reportExample();
    // A=1 (w1), B=0 (w1), C=2/3 (w2) → (1 + 0 + 1.333)/4
    expect(dailyScore(tasks, logs, SUN, SUN).score).toBeCloseTo((100 * (1 + 0 + (2 * 2) / 3)) / 4, 6);
    // Cumartesi: C henüz kapanmadı → sadece A,B
    expect(dailyScore(tasks, logs, SAT, SUN).items.map((i) => i.taskId)).toEqual(['A', 'B']);
  });
});

describe('adalet: günlük görev haftalık görevi ezmez', () => {
  it('7 kez kaçan günlük görev ile 1 kez kaçan haftalık görev aynı ağırlıkta etkiler', () => {
    const daily = makeTask({ id: 'd', startDate: MON });
    const weekly = makeTask({ id: 'w', recurrenceType: 'weekly_n', periodTargetN: 1, startDate: MON });
    const allDaily = makeLogs({ d: Object.fromEntries(WEEK.map((k) => [k, true])) });
    const onlyWeekly = makeLogs({ w: { [WED]: true } });
    expect(weeklyScore([daily, weekly], allDaily, WED, SUN).score).toBeCloseTo(50);
    expect(weeklyScore([daily, weekly], onlyWeekly, WED, SUN).score).toBeCloseTo(50);
  });

  it('önem (w) 1–3: w=3 görev 3 kat söz hakkı', () => {
    const a = makeTask({ id: 'a', weight: 3, startDate: MON });
    const b = makeTask({ id: 'b', weight: 1, startDate: MON });
    const logs = makeLogs({ a: { [MON]: true } });
    expect(dailyScore([a, b], logs, MON, MON).score).toBeCloseTo(75);
  });

  it('geçersiz ağırlık 1–3 aralığına sıkıştırılır', () => {
    const a = makeTask({ id: 'a', weight: 99, startDate: MON });
    const b = makeTask({ id: 'b', weight: 0, startDate: MON });
    const res = dailyScore([a, b], makeLogs({ a: { [MON]: true } }), MON, MON);
    expect(res.items.map((i) => i.weight)).toEqual([3, 1]);
  });
});

describe('ek kurallar (rapor 3.5)', () => {
  it('atla: gün pay ve paydadan düşer', () => {
    const t = makeTask({ id: 't', startDate: MON });
    const logs = makeLogs({ t: { [MON]: true, [TUE]: 'skipped', [WED]: true, [THU]: false } });
    const r = taskWindowRatio(t, logs.t, { start: MON, end: THU }, THU);
    expect(r.units).toBe(3);
    expect(r.ratio).toBeCloseTo(2 / 3);
  });

  it('tüm günler atlandıysa görev skora hiç girmez (null)', () => {
    const t = makeTask({ id: 't', startDate: MON });
    const logs = makeLogs({ t: { [MON]: 'skipped' } });
    expect(dailyScore([t], logs, MON, MON).score).toBeNull();
  });

  it('yeni görev eklendiği günden itibaren sayılır', () => {
    const t = makeTask({ id: 't', startDate: THU });
    const logs = makeLogs({ t: { [THU]: true, [FRI]: true, [SAT]: true, [SUN]: true } });
    const res = weeklyScore([t], logs, THU, SUN);
    expect(res.score).toBe(100);
    expect(res.items[0].units).toBe(4);
  });

  it('gelecek günler sayılmaz', () => {
    const t = makeTask({ id: 't', startDate: MON });
    const logs = makeLogs({ t: { [MON]: true, [TUE]: true } });
    expect(weeklyScore([t], logs, MON, TUE).score).toBe(100);
    expect(weeklyScore([t], logs, MON, WED).score).toBeCloseTo(66.67, 1);
  });

  it('duraklatılan günler hesaba girmez', () => {
    const t = makeTask({ id: 't', startDate: MON, pauses: [{ from: WED, to: FRI }] });
    const logs = makeLogs({ t: { [MON]: true, [TUE]: true, [SAT]: true, [SUN]: true } });
    const res = weeklyScore([t], logs, MON, SUN);
    expect(res.items[0].units).toBe(4);
    expect(res.score).toBe(100);
  });

  it('seçili günler: sadece planlı günler sayılır', () => {
    const t = makeTask({ id: 't', recurrenceType: 'weekdays', recurrenceDays: [1, 3, 5], startDate: MON });
    const logs = makeLogs({ t: { [MON]: true, [WED]: true, [TUE]: true } }); // Salı planlı değil → yok sayılır
    const res = weeklyScore([t], logs, MON, SUN);
    expect(res.items[0].units).toBe(3);
    expect(res.score).toBeCloseTo(66.67, 1);
  });

  it('hiç görev yoksa skor null', () => {
    expect(dailyScore([], {}, MON, MON).score).toBeNull();
    expect(overallScore([], {}, MON).score).toBeNull();
  });
});

describe('haftada N / ayda N periyotları', () => {
  it('hedef aşılırsa oran 1’de kalır', () => {
    const t = makeTask({ id: 't', recurrenceType: 'weekly_n', periodTargetN: 2, startDate: MON });
    const logs = makeLogs({ t: { [MON]: true, [TUE]: true, [WED]: true } });
    expect(evaluatePeriod(t, logs.t, { start: MON, end: SUN })).toMatchObject({ done: 3, target: 2, ratio: 1 });
  });

  it('açık hafta skora girmez; Pazar günü (kapanış) girer', () => {
    const t = makeTask({ id: 't', recurrenceType: 'weekly_n', periodTargetN: 3, startDate: MON });
    const logs = makeLogs({ t: { [MON]: true } });
    expect(weeklyScore([t], logs, MON, SAT).score).toBeNull();
    expect(weeklyScore([t], logs, MON, SUN).score).toBeCloseTo(33.33, 1);
  });

  it('hafta ortasında başlayan görevde hedef orantılanır', () => {
    expect(proratedTarget(3, 7, 7)).toBe(3);
    expect(proratedTarget(3, 2, 7)).toBe(1); // Cmt başladı → 0.86 → 1
    expect(proratedTarget(5, 4, 7)).toBe(3); // 2.86 → 3
    expect(proratedTarget(1, 1, 7)).toBe(1); // en az 1
    const t = makeTask({ id: 't', recurrenceType: 'weekly_n', periodTargetN: 3, startDate: SAT });
    const logs = makeLogs({ t: { [SAT]: true } });
    expect(weeklyScore([t], logs, SAT, SUN).score).toBe(100);
  });

  it('periyotta atla hedefi 1 azaltır; hedef 0 olursa periyot sayılmaz', () => {
    const t = makeTask({ id: 't', recurrenceType: 'weekly_n', periodTargetN: 3, startDate: MON });
    const logs = makeLogs({ t: { [MON]: true, [TUE]: true, [WED]: 'skipped' } });
    expect(evaluatePeriod(t, logs.t, { start: MON, end: SUN })).toMatchObject({ done: 2, target: 2, ratio: 1 });
    const one = makeTask({ id: 'o', recurrenceType: 'weekly_n', periodTargetN: 1, startDate: MON });
    expect(evaluatePeriod(one, makeLogs({ o: { [MON]: 'skipped' } }).o, { start: MON, end: SUN })).toBeNull();
  });

  it('miktar + haftada N: kısmi günler kesirli sayılır', () => {
    const t = makeTask({ id: 't', kind: 'count', targetValue: 10, recurrenceType: 'weekly_n', periodTargetN: 2, startDate: MON });
    const logs = makeLogs({ t: { [MON]: 10, [TUE]: 5 } }, { t: 10 });
    expect(evaluatePeriod(t, logs.t, { start: MON, end: SUN })!.ratio).toBeCloseTo(0.75);
  });

  it('birden çok hafta: görev oranı kapanan haftaların ortalaması', () => {
    const t = makeTask({ id: 't', recurrenceType: 'weekly_n', periodTargetN: 2, startDate: MON });
    const logs = makeLogs({ t: { [MON]: true, [TUE]: true, '2026-11-10': true } });
    // hafta1 = 1.0, hafta2 = 0.5, hafta3 açık
    const r = taskWindowRatio(t, logs.t, { start: MON, end: '2026-11-30' }, '2026-11-18');
    expect(r.units).toBe(2);
    expect(r.ratio).toBeCloseTo(0.75);
  });

  it('ay penceresi: yalnızca ay içinde KAPANAN haftalar girer', () => {
    const t = makeTask({ id: 't', recurrenceType: 'weekly_n', periodTargetN: 1, startDate: '2026-10-26' });
    // 26 Eki–1 Kas haftası Kasım'da kapanır → Kasım'a girer. 30 Kas–6 Ara haftası Aralık'ta kapanır.
    const r = taskWindowRatio(t, undefined, { start: '2026-11-01', end: '2026-11-30' }, '2026-12-31');
    expect(r.units).toBe(5);
  });

  it('bitiş tarihi periyodu erken kapatır', () => {
    const t = makeTask({ id: 't', recurrenceType: 'monthly_n', periodTargetN: 4, startDate: '2026-11-01', endDate: '2026-11-15' });
    const logs = makeLogs({ t: { '2026-11-03': true } });
    // 15/30 gün → hedef 2; 15 Kas'ta kapanır
    expect(monthlyScore([t], logs, '2026-11-10', '2026-11-14').score).toBeNull();
    expect(monthlyScore([t], logs, '2026-11-10', '2026-11-15').score).toBeCloseTo(50);
  });

  it('ilerleme göstergesi: beklenen = N × geçen gün / periyot günü', () => {
    const t = makeTask({ id: 't', recurrenceType: 'weekly_n', periodTargetN: 3, startDate: MON });
    const logs = makeLogs({ t: { [MON]: true, [TUE]: true } });
    const p = periodProgress(t, logs.t, THU)!;
    expect(p.done).toBe(2);
    expect(p.target).toBe(3);
    expect(p.expected).toBeCloseTo((3 * 4) / 7);
    expect(p.onTrack).toBe(true);
    expect(p.met).toBe(false);
    expect(periodProgress(t, logs.t, SUN)!.onTrack).toBe(false);
    expect(periodProgress(makeTask(), undefined, MON)).toBeNull();
  });
});

describe('genel skor, atlama sayacı, ısı haritası', () => {
  it('genel skor en eski görev başlangıcından bugüne', () => {
    const a = makeTask({ id: 'a', startDate: MON });
    const b = makeTask({ id: 'b', startDate: SAT });
    const logs = makeLogs({ a: { [MON]: true, [TUE]: true }, b: { [SAT]: true, [SUN]: true } });
    // a: 2/7, b: 2/2
    expect(overallScore([a, b], logs, SUN).score).toBeCloseTo((100 * (2 / 7 + 1)) / 2, 6);
  });

  it('computeScore keyfi pencere', () => {
    const a = makeTask({ id: 'a', startDate: MON });
    const logs = makeLogs({ a: { [MON]: true, [TUE]: false, [WED]: true } });
    expect(computeScore([a], logs, { start: MON, end: WED }, SUN).score).toBeCloseTo(66.67, 1);
  });

  it('haftalık atlama sayacı', () => {
    const logs = makeLogs({ t: { [MON]: 'skipped', [SUN]: 'skipped', '2026-11-09': 'skipped' } });
    expect(skipsUsedInWeek(logs.t, WED)).toBe(2);
    expect(skipsUsedInWeek(undefined, WED)).toBe(0);
  });

  it('ısı haritası: tam haftalar, gelecek günler boş', () => {
    const a = makeTask({ id: 'a', startDate: MON });
    const logs = makeLogs({ a: { [MON]: true } });
    const cells = heatmapDays([a], logs, TUE, 2);
    expect(cells).toHaveLength(14);
    expect(cells[0].date).toBe('2026-10-26');
    expect(cells[13].date).toBe(SUN);
    expect(cells.find((c) => c.date === MON)!.score).toBe(100);
    expect(cells.find((c) => c.date === TUE)!.score).toBe(0);
    expect(cells.find((c) => c.date === WED)).toMatchObject({ future: true, score: null });
    expect(cells.find((c) => c.date === '2026-10-30')!.score).toBeNull(); // görev yokken
  });
});
