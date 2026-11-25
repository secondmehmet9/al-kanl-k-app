# Alışkanlık (geçici ad)

Alışkanlık takibi + arkadaşlarla challenge. Expo SDK 58 (React Native 0.88, TypeScript, expo-router).
Önce sahibin kişisel kullanımı: imzasız IPA → SideStore. Kurulum: [docs/KURULUM.md](docs/KURULUM.md)

## Komutlar
```
npm run typecheck     # tsc --noEmit
npm run lint          # expo lint
npm test              # jest: skor, tekrar, seri, check-in, hatırlatıcı planı, SQLite, liderlik tablosu
npm run test:sql      # Supabase şeması + RLS senaryoları (PGlite, bellek içi Postgres)
npm run export:web    # web önizleme → dist/
scripts/github.sh push|build|status   # GitHub'a gönder / IPA derlet / durum (token .env.github'da)
python3 scripts/demo-seed.py          # web önizleme için örnek veri (localStorage 'aliskanlik:v1')
```

## Yapı
- `src/domain/` — saf mantık: `scoring.ts` (rapor bölüm 3), `recurrence.ts`, `streaks.ts`, `checkin.ts`, şablonlar
- `src/data/` — offline-first depo: native SQLite (`persistence.ts`), web localStorage (`persistence.web.ts`)
- `src/notifications/` — yerel hatırlatıcı planı (iOS 64 sınırı) + expo-notifications
- `src/social/` — Supabase katmanı; `.env` içinde `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` boşsa kapalı
- `src/app/` — ekranlar (expo-router); `src/i18n/tr.ts` metinler (en.ts sonra)
- `supabase/migrations/` — şema + RLS (henüz gerçek projede çalıştırılmadı)
- `.github/workflows/ios-unsigned-ipa.yml` — macOS runner'da imzasız IPA

## Doğrulanmayanlar
iOS'ta gerçek cihaz/derleme henüz yapılmadı (Linux sunucuda mümkün değil): xcodebuild, SQLite'ın cihazdaki
davranışı ve bildirimler ilk IPA ile test edilecek. Sosyal katman gerçek bir Supabase projesine karşı denenmedi.
