/**
 * Renk sistemi — kaynak: renk-paleti.md (Müdür kararı, 25.11).
 * Tek baskın renk turuncu (aksiyon); diğerleri anlam taşır: yeşil = bitti, mor = sosyal, altın = ödül.
 * `*Text` token'ları aynı rengin küçük metinde WCAG AA (≥ 4.5:1) sağlayan tonudur;
 * dolgu/ikon için ham marka rengi, yazı için `*Text` kullan. Kontrastlar testte doğrulanır.
 */
export const brand = {
  action: '#FC5200',
  actionPressed: '#E04800',
  actionLight: '#FFE3D6',
  done: '#2BD67B',
  social: '#7B61FF',
  reward: '#FFC53D',
  missed: '#FF6B6B',
  skipped: '#8E8E93',
} as const;

export interface Palette {
  dark: boolean;
  bg: string;
  /** Yüzey: sekme çubuğu, kart içi gömük alanlar (girdi, pasif çip). */
  surface: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textDim: string;
  /** Üçüncül: yalnızca dekoratif / pasif öğeler (yer tutucu, devre dışı) — bilgi taşıyan metinde kullanma. */
  textFaint: string;
  /** Aksiyon / marka (dolgu, ikon, ilerleme). */
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  primaryText: string;
  /** Turuncu dolgu üstü metin: beyaz — yalnızca büyük/kalın (≥ 19px 800) kullan. */
  onPrimary: string;
  /** Tamamlandı. */
  success: string;
  successText: string;
  onSuccess: string;
  /** Challenge / sosyal. */
  social: string;
  socialSoft: string;
  socialText: string;
  /** Ödül / rozet / 1. sıra. */
  gold: string;
  goldText: string;
  /** Kaçırıldı — yumuşak; dolgu olarak yalnızca düşük opaklıkta (missedSoft). */
  missed: string;
  missedSoft: string;
  missedText: string;
  skipped: string;
  track: string;
  /** Isı haritası: [0, %1–25, %26–50, %51–75, %76–100]. */
  heat: readonly [string, string, string, string, string];
}

export const dark: Palette = {
  dark: true,
  bg: '#0E0E11',
  surface: '#18181C',
  card: '#222228',
  cardAlt: '#18181C',
  border: '#2E2E36',
  text: '#FFFFFF',
  textDim: '#A1A1AA',
  textFaint: '#6B6B75',
  primary: brand.action,
  primaryPressed: brand.actionPressed,
  primarySoft: '#452A22',
  primaryText: '#FF7A3D',
  onPrimary: '#FFFFFF',
  success: brand.done,
  successText: brand.done,
  onSuccess: '#06281A',
  social: brand.social,
  socialSoft: '#322D4F',
  socialText: '#A898FF',
  gold: brand.reward,
  goldText: brand.reward,
  missed: brand.missed,
  missedSoft: '#FF6B6B24',
  missedText: brand.missed,
  skipped: brand.skipped,
  track: '#2E2E36',
  heat: ['#18181C', '#5A2A12', '#9E3A0A', '#E04800', '#FC5200'],
};

export const light: Palette = {
  dark: false,
  bg: '#F6F6F4',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardAlt: '#F6F6F4',
  border: '#E7E7EA',
  text: '#111114',
  textDim: '#5B5B66',
  textFaint: '#8E8E93',
  primary: brand.action,
  primaryPressed: brand.actionPressed,
  primarySoft: brand.actionLight,
  primaryText: '#B83C00',
  onPrimary: '#FFFFFF',
  success: brand.done,
  successText: '#0A7A42',
  onSuccess: '#06281A',
  social: brand.social,
  socialSoft: '#EFECFF',
  socialText: '#5B3FE0',
  gold: brand.reward,
  goldText: '#8A5A00',
  missed: brand.missed,
  missedSoft: '#FF6B6B24',
  missedText: '#B93A3A',
  skipped: brand.skipped,
  track: '#E7E7EA',
  heat: ['#E7E7EA', '#FFE3D6', '#FEB38F', '#FD8247', '#FC5200'],
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

/** Hex renge alfa ekle (#RRGGBB → #RRGGBBAA). */
export function alpha(hex: string, a: number): string {
  const v = Math.round(Math.min(1, Math.max(0, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex.length === 7 ? `${hex}${v}` : hex;
}

const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);

/** İki #RRGGBB rengi doğrusal karıştır (t = 0 → a, t = 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const out = [0, 1, 2].map((i) =>
    Math.round(channel(a, i) * (1 - k) + channel(b, i) * k)
      .toString(16)
      .padStart(2, '0')
  );
  return `#${out.join('')}`.toUpperCase();
}

/** Seri alevinin tamamen altına döndüğü gün sayısı. */
export const STREAK_GOLD_AT = 30;
const STREAK_ORANGE_UNTIL = 3;

/** Seri büyüdükçe alev turuncudan altına geçer: ≤ 3 turuncu, 30+ altın. */
export function streakColor(p: Palette, streak: number): { flame: string; text: string } {
  const t = (streak - STREAK_ORANGE_UNTIL) / (STREAK_GOLD_AT - STREAK_ORANGE_UNTIL);
  return { flame: mix(p.primary, p.gold, t), text: mix(p.primaryText, p.goldText, t) };
}

/** Isı haritası hücre rengi (0–100 skor → 5 kademeli turuncu ölçek). */
export function heatColor(p: Palette, score: number): string {
  if (score <= 0) return p.heat[0];
  if (score <= 25) return p.heat[1];
  if (score <= 50) return p.heat[2];
  if (score <= 75) return p.heat[3];
  return p.heat[4];
}

export interface ScoreTone {
  /** Çubuk / dolgu rengi. */
  fill: string;
  /** Aynı anlamın metin için AA uyumlu tonu. */
  text: string;
}

/**
 * Skor tonu: yüksek = yeşil (bitti), orta = turuncu (yolda), düşük = yumuşak "kaçırıldı" tonu.
 * Agresif kırmızı yok.
 */
export function scoreTone(p: Palette, score: number | null): ScoreTone {
  if (score === null) return { fill: p.track, text: p.textDim };
  if (score >= 80) return { fill: p.success, text: p.successText };
  if (score >= 50) return { fill: p.primary, text: p.primaryText };
  return { fill: p.missed, text: p.missedText };
}

/** Devam eden gün: gün bitmeden "kaçırıldı" göstermeyelim (baskısız) — hedefe yaklaşınca yeşil. */
export function liveScoreTone(p: Palette, score: number | null): ScoreTone {
  if (score === null) return { fill: p.track, text: p.textDim };
  return score >= 80 ? { fill: p.success, text: p.successText } : { fill: p.primary, text: p.primaryText };
}

/** WCAG kontrast oranı (#RRGGBB, #RRGGBB). */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = [0, 1, 2].map((i) => {
      const v = channel(hex, i) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
