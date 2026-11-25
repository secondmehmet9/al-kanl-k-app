# Alışkanlık — Kurulum Rehberi (adım adım)

Bu rehber teknik bilgi gerektirmez. Sırayla git; her adım 1–3 dakika.
Toplam süre: ilk seferde ~30 dakika (bunun 15–20 dakikası GitHub'ın uygulamayı derlemesini beklemek).

> **Dürüst not:** Uygulamanın kodu sunucuda test edildi (testler + web önizleme). iPhone dosyası (.ipa)
> ise yalnızca GitHub'ın Mac bilgisayarlarında üretilebiliyor ve **henüz hiç üretilmedi** — ilk derlemede
> ufak bir ayar gerekebilir; olursa Müdür'e haber ver, düzeltip yeniden derletir.

---

## Büyük resim

```
Sen: GitHub hesabı + boş depo + token   →   Müdür: kodu GitHub'a gönderir, derlemeyi başlatır
GitHub (Mac sunucusu): .ipa dosyasını üretir (15–20 dk)
Sen: iPhone'da .ipa'yı indir → SideStore ile kur
```

Senin zaten kurulu olanlar: **SideStore** ve **LocalDevVPN** ("Memo" uygulamasını böyle kurmuştun). Aynı yol.

---

## 1) Ücretsiz GitHub hesabı aç (bilgisayardan)

1. Tarayıcıda **https://github.com/signup** adresini aç.
2. **Email** kutusuna e-postanı yaz → **Continue**.
3. **Password** (şifre) belirle → **Continue**.
4. **Username** (kullanıcı adı) yaz, ör. `mehmetdonmez` → **Continue**. *(Bu adı bir yere not et, 4. adımda lazım.)*
5. Robot olmadığını doğrula (bulmaca) → **Create account**.
6. E-postana gelen **8 haneli kodu** gir.
7. Sorular çıkarsa en alttaki **Skip personalization**'a tıkla. Ücretsiz plan (**Free**) yeterli.

## 2) Boş bir depo (repository) oluştur

1. Sağ üstte **+** işaretine tıkla → **New repository**.
2. **Repository name**: `aliskanlik-app`
3. Görünürlük seç:
   - **Private** (önerilen): kodu sadece sen görürsün. Ücretsiz planda ayda yaklaşık **8–10 iPhone derlemesi** hakkın olur¹.
   - **Public**: kod herkese açık olur ama derleme sınırsız/ücretsizdir¹.
4. **"Add a README file" kutusunu İŞARETLEME** (boş kalsın). Diğer kutulara dokunma.
5. Yeşil **Create repository** düğmesine tıkla.

¹ GitHub ücretsiz plan: özel depolarda ayda 2.000 dakika, macOS dakikaları 10 katı sayılır (≈200 Mac dakikası; bir derleme ~15–20 dk).
Güncel rakam: https://docs.github.com/billing → "GitHub Actions". Bu rakamları bu oturumda resmi sayfadan doğrulamadım.

## 3) Müdür için erişim anahtarı (token) üret

Token = Müdür'ün **sadece bu depoya** kod gönderebilmesi için bir anahtar. Şifren değildir, istediğin an silebilirsin.

1. **https://github.com/settings/personal-access-tokens/new** adresini aç.
2. **Token name**: `mudur-aliskanlik`
3. **Expiration**: `90 days` seç.
4. **Repository access** → **Only select repositories** → listeden **aliskanlik-app**'i seç.
5. **Permissions** → **Repository permissions** bölümünü aç ve şu üçünü **Read and write** yap:
   - **Contents**
   - **Actions**
   - **Workflows**
   *(Diğerleri "No access" kalsın. "Metadata" kendiliğinden "Read-only" olur, normal.)*
6. En altta **Generate token** → çıkan pencerede tekrar **Generate token**.
7. `github_pat_...` ile başlayan uzun yazının yanındaki **kopyala** simgesine tıkla.
   ⚠️ Bu yazı **bir kez** gösterilir. **Sohbete / Telegram'a yapıştırma.** Sadece 4. adımdaki komuta yapıştıracaksın.

## 4) Token'ı sunucuya gir (sohbete değil, terminale)

VPS terminalinde (her zaman komut çalıştırdığın siyah ekran) şunu **aynen** yapıştır ve Enter'a bas:

```
docker exec -it -u hermes hermes-agent-epjx-hermes-agent-1 /opt/data/tools/github-token-ekle.sh
```

Üç şey soracak:

1. `GitHub kullanici adin:` → 1. adımdaki kullanıcı adını yaz, Enter.
2. `Repo adi [aliskanlik-app]:` → hiçbir şey yazma, sadece Enter.
3. `Token (...)` → kopyaladığın token'ı yapıştır (**ekranda görünmez, normal**), Enter.

`kaydedildi - token calisiyor, repo bulundu` yazısını görmelisin.
Başka bir şey yazarsa (ör. "repo bulunamadi") o satırı Müdür'e gönder — token'ı değil, sadece o satırı.

## 5) Müdür'e yaz

Telegram'dan Müdür'e şunu yaz: **"GitHub hazır, uygulamayı gönder ve derle."**

Müdür şunları yapar (senin bir şey yapmana gerek yok):

- Kodu GitHub'a gönderir → `scripts/github.sh push`
- Derlemeyi başlatır → `scripts/github.sh build`
- 15–20 dakika sonra sana **.ipa indirme adresini** gönderir → `scripts/github.sh status`

Kendin izlemek istersen: GitHub'da depon → üstte **Actions** sekmesi → **iOS imzasız IPA**. Sarı nokta = derleniyor, yeşil tik = hazır, kırmızı çarpı = hata (Müdür'e haber ver).

## 6) iPhone'a indir

1. iPhone'da **Safari**'yi aç, **github.com**'a gir ve 1. adımdaki hesapla **giriş yap** (özel depoda dosyayı indirebilmek için şart).
2. Müdür'ün gönderdiği adresi aç. Ya da: depon → sağda **Releases** → en üstteki **"Alışkanlık — derleme N"**.
3. **Assets** başlığı altındaki **`Aliskanlik-N.ipa`** dosyasına dokun → **İndir**.
4. İndirme bitince dosya **Dosyalar → İndirilenler** klasöründedir.

*(Yedek yol: **Actions** → son yeşil çalışma → en altta **Artifacts** → indirilen `.zip`'e Dosyalar'da dokununca içinden `.ipa` çıkar.)*

## 7) SideStore ile kur

1. **LocalDevVPN** uygulamasını aç → **Connect** (Memo'yu kurarken yaptığın gibi). Wi-Fi açık olsun.
2. **SideStore**'u aç → altta **My Apps** sekmesi.
3. Sol üstteki **+** işaretine dokun.
4. **İndirilenler** klasöründen **`Aliskanlik-N.ipa`** dosyasını seç.
5. Apple ID sorarsa Memo'da kullandığın Apple ID ile giriş yap.
6. Yükleme çubuğu bitince ana ekranda **Alışkanlık** simgesi belirir. Aç.

> **3 uygulama sınırı:** Ücretsiz Apple ID ile aynı anda en fazla 3 uygulama kurulabilir (SideStore dahil)².
> SideStore + Memo + Alışkanlık = tam 3. "Maximum number of apps" uyarısı çıkarsa SideStore'da kullanmadığın bir uygulamayı kaldır.
>
> **7 gün kuralı:** Ücretsiz imza 7 günde dolar. SideStore'u haftada en az bir kez (LocalDevVPN açıkken) aç →
> **My Apps → Refresh All**. Yenileme veriyi SİLMEZ.

² Araştırma raporundaki ikincil kaynağa göre; SideStore'un resmi sayfasından doğrulanmadı.

## 8) İlk açılışta 2 dakikalık kontrol

1. **Bugün** sekmesi → **Şablonlardan seç** → birkaç görev işaretle → **N görevi ekle**.
2. Bir görevin sağındaki yuvarlağa dokun → ✓ olmalı, üstteki yüzde değişmeli.
3. **Ayarlar** sekmesi → **Bildirimler** → **İzin ver** → çıkan iOS penceresinde **İzin Ver**.
4. **Deneme bildirimi gönder**'e dokun, uygulamayı kapat (ana ekrana dön) → 5 saniye içinde bildirim gelmeli.
   Gelirse hatırlatıcılar çalışıyor demektir (Memo'daki gibi yerel bildirim; internet gerekmez).
5. Bir göreve hatırlatma saati vermek için: göreve dokun → **Düzenle** → **Hatırlatıcı**'yı aç → saati yaz → **Kaydet**.

Bir şey çalışmazsa ekran görüntüsünü Müdür'e gönder.

---

## Güncelleme nasıl kurulur?

Müdür yeni sürüm derleyince 6. ve 7. adımı tekrarla (yeni `.ipa`'yı indir → SideStore **+**).
Eski sürümün **üzerine** kurulur; görevlerin ve geçmişin kalır.

## Verim kaybolur mu? (önemli)

- Tüm görevlerin ve işaretlemelerin **sadece telefonunda** durur (internet yok, hesap yok).
- **Güncelleme ve 7 günlük yenileme veriyi silmez.**
- Uygulamayı **silersen** (ana ekrandan kaldırırsan) veri de silinir. Silmeden önce:
  **Ayarlar → Veri ve yedek → Yedeği kopyala** → **Notlar** uygulamasına yapıştır.
  Geri yüklemek için: **Yedekten geri yükle → Panodan yapıştır → Geri yükle**.

## Bilinen sınırlar (bu sürüm)

- Hatırlatıcı her gün/hafta aynı saatte tekrarlar; görevi o gün zaten yaptıysan da bildirim gelir (iOS tekrarlı bildirimlerde koşul koymaya izin vermiyor).
- iOS aynı anda en fazla 64 bekleyen bildirime izin verir. Uygulama aynı saate denk gelen görevleri tek bildirimde birleştirir; sınır aşılırsa Ayarlar'da uyarı görürsün.
- Arkadaş/challenge özellikleri kodlandı ama **kapalı** (hesap altyapısı bağlanmadı). Challenge sekmesinde **Örnek challenge'ı gör** ile nasıl görüneceğine bakabilirsin.
- "Arkadaşın bir şey yaptı" gibi **uzaktan** bildirimler ücretsiz Apple ID ile mümkün değil (yalnızca yerel hatırlatıcı).
- Uygulama adı şimdilik "Alışkanlık" — son adı sen seçeceksin.

---

## Sonra: arkadaş + challenge özelliklerini açmak (isteğe bağlı, ~15 dk)

Hazır olduğunda Müdür'e **"sosyal özellikleri açalım"** yaz. Senden istenecekler:

1. **https://supabase.com** → **Start your project** → GitHub hesabınla giriş (ücretsiz plan).
2. **New project** → ad: `aliskanlik` → bölge: **Central EU (Frankfurt)** → veritabanı şifresini **kendin sakla** (kimseye verme) → **Create new project**.
3. Sol menü **SQL Editor** → **New query** → Müdür'ün göndereceği `supabase/migrations/0001_init.sql` içeriğini yapıştır → **Run**. ("Success" yazmalı.)
4. Sol menü **Authentication → Emails → Magic Link** şablonu → metne `{{ .Token }}` ekle (ör. "Giriş kodun: {{ .Token }}") → **Save**. *(Uygulama linkle değil 6 haneli kodla giriş yapar.)*
5. Sol menü **Project Settings → API**: **Project URL** ve **anon public** anahtarını kopyala.
6. GitHub'da depon → **Settings → Secrets and variables → Actions → Variables** sekmesi → **New repository variable** ile iki değişken ekle:
   - `EXPO_PUBLIC_SUPABASE_URL` = Project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = anon public anahtarı
   *(Bu ikisi gizli değildir; uygulamanın içine gömülür. **service_role** anahtarını ASLA hiçbir yere yapıştırma.)*
7. Müdür'e "değişkenleri ekledim, yeniden derle" yaz → yeni `.ipa`'yı kur.

Ücretsiz Supabase projesi 1 hafta hiç kullanılmazsa uykuya alınır (panelden tek tıkla uyanır).

---

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| 4. adımda `token gecersiz (HTTP 401)` | Token yanlış kopyalanmış. 3. adımı tekrarla, yeni token üret, 4. adımdaki komutu yeniden çalıştır. |
| 4. adımda `repo bulunamadi (HTTP 404)` | Kullanıcı adı/repo adı yanlış ya da token'da **aliskanlik-app** seçilmemiş (3. adım, madde 4). |
| Actions'ta kırmızı çarpı | Müdür'e "derleme hata verdi" yaz; günlükten sebebini bulup düzeltir. |
| iPhone'da `.ipa` linki "404" veriyor | Safari'de GitHub'a giriş yapmamışsın (6. adım, madde 1). |
| SideStore: "Could not find device / pairing" | LocalDevVPN bağlı değil. Aç → Connect → tekrar dene. |
| SideStore: "Maximum number of apps" | 3 uygulama sınırı. Kullanmadığın sideload uygulamasını kaldır. |
| Uygulama açılmıyor ("no longer available") | 7 günlük imza dolmuş. SideStore → My Apps → Refresh All. |
| Bildirim gelmiyor | iPhone **Ayarlar → Bildirimler → Alışkanlık** açık mı? Odak/Rahatsız Etme kapalı mı? Sonra uygulamada **Deneme bildirimi gönder**. |
