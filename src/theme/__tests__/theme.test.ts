import { brand, contrast, dark, heatColor, light, liveScoreTone, mix, Palette, scoreTone, STREAK_GOLD_AT, streakColor } from '@/theme/tokens';

/** Yarı saydam bir tonu opak zemine bindir (alpha(c, a) ile aynı sonuç). */
const over = (bg: string, fg: string, a: number) => mix(bg, fg, a);

describe('renk-paleti.md ile birebir', () => {
  test('marka renkleri', () => {
    expect(brand).toEqual({
      action: '#FC5200', actionPressed: '#E04800', actionLight: '#FFE3D6', done: '#2BD67B',
      social: '#7B61FF', reward: '#FFC53D', missed: '#FF6B6B', skipped: '#8E8E93',
    });
    for (const p of [dark, light]) {
      expect([p.primary, p.primaryPressed, p.success, p.social, p.gold, p.missed, p.skipped]).toEqual(['#FC5200', '#E04800', '#2BD67B', '#7B61FF', '#FFC53D', '#FF6B6B', '#8E8E93']);
    }
  });

  test('koyu tema', () => {
    expect([dark.bg, dark.surface, dark.card, dark.border]).toEqual(['#0E0E11', '#18181C', '#222228', '#2E2E36']);
    expect([dark.text, dark.textDim, dark.textFaint]).toEqual(['#FFFFFF', '#A1A1AA', '#6B6B75']);
    expect(dark.heat).toEqual(['#18181C', '#5A2A12', '#9E3A0A', '#E04800', '#FC5200']);
  });

  test('açık tema', () => {
    expect([light.bg, light.surface, light.card, light.border]).toEqual(['#F6F6F4', '#FFFFFF', '#FFFFFF', '#E7E7EA']);
    expect([light.text, light.textDim, light.primarySoft]).toEqual(['#111114', '#5B5B66', '#FFE3D6']);
    expect(light.heat[1]).toBe('#FFE3D6');
    expect(light.heat[4]).toBe('#FC5200');
  });

  test('ısı haritası kademeleri', () => {
    expect([0, 1, 25, 26, 50, 51, 75, 76, 100].map((s) => heatColor(dark, s))).toEqual([
      '#18181C', '#5A2A12', '#5A2A12', '#9E3A0A', '#9E3A0A', '#E04800', '#E04800', '#FC5200', '#FC5200',
    ]);
  });
});

describe('seri alevi turuncu → altın', () => {
  test.each([dark, light])('uçlar ve geçiş (%#)', (p) => {
    expect(streakColor(p, 0).flame).toBe('#FC5200');
    expect(streakColor(p, 3).flame).toBe('#FC5200');
    expect(streakColor(p, STREAK_GOLD_AT).flame).toBe('#FFC53D');
    expect(streakColor(p, 365).flame).toBe('#FFC53D');
    const mid = streakColor(p, 16).flame;
    expect(mid).not.toBe('#FC5200');
    expect(mid).not.toBe('#FFC53D');
    // yeşil kanal seriyle birlikte tekdüze artar (turuncu → altın)
    const g = [1, 5, 10, 20, 30].map((n) => parseInt(streakColor(p, n).flame.slice(3, 5), 16));
    expect([...g].sort((a, b) => a - b)).toEqual(g);
  });
});

describe('skor tonu — agresif kırmızı yok', () => {
  test('eşikler', () => {
    expect(scoreTone(dark, 100).fill).toBe(dark.success);
    expect(scoreTone(dark, 65).fill).toBe(dark.primary);
    expect(scoreTone(dark, 10).fill).toBe(dark.missed);
    expect(scoreTone(dark, null).fill).toBe(dark.track);
    expect(liveScoreTone(dark, 10).fill).toBe(dark.primary);
    expect(liveScoreTone(dark, 90).fill).toBe(dark.success);
  });
});

describe('WCAG AA kontrast', () => {
  const AA = 4.5;
  const AA_LARGE = 3; // ≥ 18.66px kalın / ≥ 24px metin ve grafik öğeler

  const cases = (p: Palette): [string, string, string, number][] => {
    const grounds: [string, string][] = [['bg', p.bg], ['surface', p.surface], ['card', p.card], ['cardAlt', p.cardAlt]];
    const texts: [string, string][] = [
      ['text', p.text], ['textDim', p.textDim], ['primaryText', p.primaryText], ['successText', p.successText],
      ['socialText', p.socialText], ['goldText', p.goldText], ['missedText', p.missedText],
    ];
    const out: [string, string, string, number][] = [];
    for (const [gn, g] of grounds) for (const [tn, tx] of texts) out.push([`${tn} / ${gn}`, tx, g, AA]);
    out.push(['primaryText / primarySoft (küçük buton)', p.primaryText, p.primarySoft, AA]);
    out.push(['text / primarySoft (seçili gün)', p.text, p.primarySoft, AA]);
    out.push(['socialText / socialSoft (davet kodu)', p.socialText, p.socialSoft, AA]);
    out.push(['textDim / socialSoft', p.textDim, p.socialSoft, AA]);
    out.push(['missedText / missedSoft', p.missedText, over(p.card, p.missed, 0x24 / 255), AA]);
    out.push(['onSuccess / success (✓)', p.onSuccess, p.success, AA]);
    out.push(['onPrimary / primary (büyük-kalın CTA)', p.onPrimary, p.primary, AA_LARGE]);
    out.push(['onPrimary / primaryPressed', p.onPrimary, p.primaryPressed, AA_LARGE]);
    for (const n of [0, 3, 7, 14, 21, 30]) {
      const c = streakColor(p, n);
      out.push([`seri ${n} metni / kart`, c.text, p.card, AA]);
      out.push([`seri ${n} metni / hap`, c.text, over(p.card, c.flame, 0.16), AA]);
    }
    return out;
  };

  test.each(cases(dark))('koyu: %s', (_n, fg, bg, min) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });
  test.each(cases(light))('açık: %s', (_n, fg, bg, min) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  test('koyu temada aksiyon dolgusu zeminden ayrışır (grafik öğe ≥ 3:1)', () => {
    for (const c of [dark.primary, dark.success, dark.social, dark.gold]) {
      expect(contrast(c, dark.card)).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });
});
