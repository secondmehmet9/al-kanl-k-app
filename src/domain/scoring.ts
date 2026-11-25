/**
 * SKOR MOTORU — araştırma raporu bölüm 3 ("Görev-başına ortalama" önerilen yöntem).
 *
 *  1. Her görevin her periyodu (gün / hafta / ay) için 0–1 başarı oranı hesaplanır (3.1):
 *       - gün-bazlı (günlük, seçili günler, ayın günü): yapıldı=1, yapılmadı=0
 *       - miktar görevi: min(yapılan / hedef, 1)  → kısmi kredi
 *       - haftada N / ayda N: min(yapılan / N, 1), periyot KAPANINCA skora girer (3.3)
 *  2. Pencere (gün/hafta/ay/genel) içinde görevin oranı = o pencerede kapanan periyotlarının
 *     ortalaması (günlük görevde = yapılan / planlanan gün).
 *  3. Skor(T) = 100 × Σ(w_i × oran_i) / Σ w_i   (w = önem 1–3)  (3.3 + 3.4 önerilen yöntem)
 *
 *  Ek kurallar (3.5):
 *   - Atla / dinlenme: o gün pay ve paydadan düşer (ceza yok). Periyot görevinde hedefi 1 azaltır.
 *   - Yeni görev eklendiği günden itibaren sayılır; yarım kalan ilk/son periyotta hedef orantılanır.
 *   - Duraklatılan günler hesaba girmez.
 *   - Gelecek günler ve henüz kapanmamış hafta/ay periyotları skora girmez ("ilerleme" olarak gösterilir).
 */
import { addDays, diffDays, eachDay, maxKey, minKey, monthWindow, weekWindow } from './dates';
import {
  calendarPeriodOf,
  effectivePeriod,
  isDayBased,
  isPausedOn,
  isScheduledOn,
  nextPeriodStart,
} from './recurrence';
import type { DateKey, DateWindow, LogsByTask, Task, TaskLog } from './types';

type TaskLogs = Record<DateKey, TaskLog> | undefined;

/** Tek bir günün oranı. null = atlandı (hesaptan çıkar). Kayıt yoksa 0. */
export function dayRatio(task: Pick<Task, 'kind' | 'targetValue'>, log: TaskLog | undefined): number | null {
  if (!log) return 0;
  if (log.status === 'skipped') return null;
  if (log.status === 'missed') return 0;
  if (task.kind === 'count') {
    const target = Math.max(task.targetValue, 1);
    return Math.max(0, Math.min(log.value / target, 1));
  }
  return log.status === 'done' ? 1 : 0;
}

export interface PeriodResult {
  /** Periyodun (görev ömrüyle kesişmiş) aralığı. Gün-bazlıda start=end. */
  period: DateWindow;
  /** Yapılan (miktar görevinde kısmi kredi dahil). */
  done: number;
  /** Hedef (orantılama ve atlamalardan sonra). */
  target: number;
  ratio: number;
}

/** Yarım periyotta (görev hafta ortasında başladı/bitti/duraklatıldı) hedefi orantıla. */
export function proratedTarget(n: number, activeDays: number, fullDays: number): number {
  if (activeDays >= fullDays) return n;
  return Math.max(1, Math.round((n * activeDays) / fullDays));
}

/**
 * Periyot-bazlı görevin (haftada N / ayda N) bir takvim periyodundaki durumu.
 * Görev o periyotta hiç aktif değilse veya tüm hedef atlandıysa null (hesaptan çıkar).
 */
export function evaluatePeriod(task: Task, logs: TaskLogs, calendarPeriod: DateWindow): PeriodResult | null {
  const eff = effectivePeriod(task, calendarPeriod);
  if (!eff) return null;
  const fullDays = diffDays(calendarPeriod.start, calendarPeriod.end) + 1;
  let activeDays = 0;
  let done = 0;
  let skips = 0;
  for (const day of eachDay(eff.start, eff.end)) {
    if (isPausedOn(task, day)) continue;
    activeDays++;
    const r = dayRatio(task, logs?.[day]);
    if (r === null) skips++;
    else done += r;
  }
  if (activeDays === 0) return null;
  const target = proratedTarget(Math.max(task.periodTargetN, 1), activeDays, fullDays) - skips;
  if (target <= 0) return null;
  return { period: eff, done, target, ratio: Math.min(done / target, 1) };
}

export interface TaskWindowResult {
  /** 0–1; null = bu pencerede hesaba giren periyot yok. */
  ratio: number | null;
  /** Hesaba giren periyot sayısı (gün-bazlıda planlı gün sayısı). */
  units: number;
  /** Oranların toplamı (gün-bazlıda "yapılan gün" eşdeğeri). */
  earned: number;
}

/** Bir görevin verilen penceredeki oranı. `today` sonrası günler ve açık periyotlar sayılmaz. */
export function taskWindowRatio(task: Task, logs: TaskLogs, window: DateWindow, today: DateKey): TaskWindowResult {
  let units = 0;
  let earned = 0;

  if (isDayBased(task)) {
    const start = maxKey(window.start, task.startDate);
    let end = minKey(window.end, today);
    if (task.endDate) end = minKey(end, task.endDate);
    if (start <= end) {
      for (const day of eachDay(start, end)) {
        if (!isScheduledOn(task, day)) continue;
        const r = dayRatio(task, logs?.[day]);
        if (r === null) continue; // atlandı → pay ve paydadan düşer
        units++;
        earned += r;
      }
    }
  } else {
    let cursor = maxKey(window.start, task.startDate);
    const last = minKey(window.end, today);
    while (cursor <= last) {
      const cal = calendarPeriodOf(task, cursor);
      const eff = effectivePeriod(task, cal);
      // Periyot, (görev bitiş tarihi dahil) kapanış günü pencere içinde ve bugün/öncesindeyse sayılır.
      if (eff && eff.end >= window.start && eff.end <= last) {
        const res = evaluatePeriod(task, logs, cal);
        if (res) {
          units++;
          earned += res.ratio;
        }
      }
      cursor = nextPeriodStart(cal);
    }
  }
  return { ratio: units > 0 ? earned / units : null, units, earned };
}

export interface ScoreBreakdownItem {
  taskId: string;
  ratio: number;
  weight: number;
  units: number;
  earned: number;
}

export interface ScoreResult {
  /** 0–100; null = pencerede skorlanacak bir şey yok. */
  score: number | null;
  items: ScoreBreakdownItem[];
}

/** Skor(T) = 100 × Σ(w × oran) / Σ w — görev-başına ağırlıklı ortalama. */
export function computeScore(tasks: Task[], logs: LogsByTask, window: DateWindow, today: DateKey): ScoreResult {
  const items: ScoreBreakdownItem[] = [];
  let num = 0;
  let den = 0;
  for (const task of tasks) {
    const r = taskWindowRatio(task, logs[task.id], window, today);
    if (r.ratio === null) continue;
    const weight = clampWeight(task.weight);
    items.push({ taskId: task.id, ratio: r.ratio, weight, units: r.units, earned: r.earned });
    num += weight * r.ratio;
    den += weight;
  }
  return { score: den > 0 ? (100 * num) / den : null, items };
}

export function clampWeight(w: number): number {
  if (!Number.isFinite(w)) return 1;
  return Math.min(3, Math.max(1, Math.round(w)));
}

export const dailyScore = (tasks: Task[], logs: LogsByTask, date: DateKey, today: DateKey) =>
  computeScore(tasks, logs, { start: date, end: date }, today);

export const weeklyScore = (tasks: Task[], logs: LogsByTask, date: DateKey, today: DateKey) =>
  computeScore(tasks, logs, weekWindow(date), today);

export const monthlyScore = (tasks: Task[], logs: LogsByTask, date: DateKey, today: DateKey) =>
  computeScore(tasks, logs, monthWindow(date), today);

/** Genel skor: en eski görevin başlangıcından bugüne. */
export function overallScore(tasks: Task[], logs: LogsByTask, today: DateKey): ScoreResult {
  if (tasks.length === 0) return { score: null, items: [] };
  const start = tasks.reduce((min, t) => minKey(min, t.startDate), tasks[0].startDate);
  return computeScore(tasks, logs, { start: minKey(start, today), end: today }, today);
}

export interface PeriodProgress {
  period: DateWindow;
  done: number;
  target: number;
  /** Bugüne kadar beklenen (rapor 3.5 "erken ilerleme"): N × geçen_gün / periyot_gün_sayısı */
  expected: number;
  onTrack: boolean;
  met: boolean;
}

/** Açık haftalık/aylık periyot için ilerleme göstergesi (skora girmez, sadece gösterim). */
export function periodProgress(task: Task, logs: TaskLogs, date: DateKey): PeriodProgress | null {
  if (isDayBased(task)) return null;
  const cal = calendarPeriodOf(task, date);
  const res = evaluatePeriod(task, logs, cal);
  if (!res) return null;
  const total = diffDays(res.period.start, res.period.end) + 1;
  const elapsed = Math.min(Math.max(diffDays(res.period.start, date) + 1, 0), total);
  const expected = (res.target * elapsed) / total;
  return {
    period: res.period,
    done: res.done,
    target: res.target,
    expected,
    onTrack: res.done + 1e-9 >= expected,
    met: res.done + 1e-9 >= res.target,
  };
}

/** Görev o hafta kaç kez "atla" kullandı (haftada en çok MAX_SKIPS_PER_WEEK). */
export function skipsUsedInWeek(logs: TaskLogs, date: DateKey): number {
  if (!logs) return 0;
  const w = weekWindow(date);
  let n = 0;
  for (const day of eachDay(w.start, w.end)) if (logs[day]?.status === 'skipped') n++;
  return n;
}

/** Isı haritası: son `weeks` haftanın (Pzt→Paz sütunları) günlük skorları. */
export function heatmapDays(
  tasks: Task[],
  logs: LogsByTask,
  today: DateKey,
  weeks: number
): { date: DateKey; score: number | null; future: boolean }[] {
  const end = weekWindow(today).end;
  const start = addDays(end, -(weeks * 7 - 1));
  return eachDay(start, end).map((date) => ({
    date,
    future: date > today,
    score: date > today ? null : dailyScore(tasks, logs, date, today).score,
  }));
}
