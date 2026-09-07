# Anahtarlar ve Erişimler — Not Defteri

Projenin ilerlemesi için **senin sağlaman gereken** anahtarlar, hesaplar ve erişimler.
Bir maddeyi hallettiğinde söyle, kutusunu işaretleyeyim.

> ⚠️ **Bu dosyaya asla gerçek anahtar yazılmaz.** Burada yalnızca *neyin gerektiği*
> ve *nereye konacağı* yazar. Gerçek değerler `.env` dosyalarına gider ve bunlar
> `.gitignore`'da — repoya hiçbir zaman girmez.

## Yerelde ne gerekiyor?

**Hiçbir şey.** `pnpm infra:up && pnpm api && pnpm dev` ile her şey çalışır:
veritabanı, Redis, Keycloak, dosya deposu (MinIO) ve e-posta (Mailhog) konteynerlerden
gelir. Aşağıdaki maddelerin tamamı **üretim/staging** içindir.

## Sıra — hangisini önce yapmalısın

| # | İş | Neyi açar | Süre |
|---|---|---|---|
| 1 | [#17 Dağıtım hesapları](#-17-konteyner-ve-veritabanı-sağlayıcıları) | Siteyi kendi telefonundan test etmek | 1 saat |
| 2 | [#13 · #14 · #16 · #15 Üretim sırları](#üretime-çıkarken-ayarlanması-zorunlu) | #17 ile birlikte zorunlu | 15 dk |
| 3 | [#20 SMTP](#-20-smtp-sunucusu-e-posta-doğrulama-ve-bildirimler) | Kayıt tamamlama + tüm bildirimler | 1 saat |
| 4 | [#5 Alan adı](#-5-alan-adı) | Marka, paylaşım önizlemesi, arama motoru | 1 gün |
| 5 | [#18 Nesne deposu](#-18-nesne-deposu-taşıyıcı-belgeleri) | Belge ve fotoğrafların kalıcı saklanması | 1 saat |
| 6 | [#1 Google Maps](#-1-google-maps-platform-api-anahtarı) | Gerçek mesafe, süre, adres arama | 1 saat |
| 7 | [#2 SMS](#-2-sms-sağlayıcısı-otp-girişi-için) | Telefonla giriş | Başlık onayı günler sürer |
| 8 | [#3 Sentry](#-3-sentry-projesi-hata-takibi) | Üretimde hata görünürlüğü | 20 dk |
| — | #4 · #6 · #7 · #8 · #9 · #10 · #11 | Sonraki fazlar | — |

⚠️ **1 ve 2 birlikte yapılır.** Dağıtımı üretim sırları olmadan açmak, imzalama
anahtarı `local-development-secret` kalmış bir sistemi internete koymak demek.

## Durum özeti

| | Faz 1 | Altyapı | Üretim | Faz 3–4 | Faz 5 | Toplam |
|---|---|---|---|---|---|---|
| Bekleyen | 3 | 4 | 4 | 3 | 3 | 17 |
| Tamamlanan | 0 | 1 | 0 | 0 | 0 | 1 |

---

## Faz 1 — Web MVP (şu an burasıyla uğraşıyoruz)

### [ ] 1. Google Maps Platform API anahtarı
**Ne için:** Adres arama (Places Autocomplete), koordinat↔adres çevirisi (Geocoding),
mesafe ve trafikli varış süresi (Routes). **Fiyat doğruluğu doğrudan buna bağlı.**

**Nereye:** `services/api/.env` → `GOOGLE_MAPS_API_KEY=...`
İstemciye **gömülmüyor** — tüm harita çağrıları backend üzerinden geçiyor (docs/03).

**Nasıl alınır:**
1. console.cloud.google.com → yeni proje
2. Şu API'leri etkinleştir: *Places API (New)*, *Geocoding API*, *Routes API*, *Maps JavaScript API*
3. Kimlik Bilgileri → API anahtarı oluştur
4. **Kısıtlama ekle:** IP kısıtlaması (sunucu IP'si) + yalnızca yukarıdaki 4 API
5. Faturalandırma → **bütçe alarmı kur** (aylık limit + %50/%90 uyarısı)

**Bloke ettiği iş:** Gerçek mesafe/süre hesabı ve adres arama. O gelene kadar
takribî mesafe sağlayıcısıyla (kuş uçuşu × şehir katsayısı) devam ediyorum;
geçiş tek sınıflık bir değişiklik olacak.

---

### [ ] 2. SMS sağlayıcısı (OTP girişi için)
**Ne için:** Telefon + SMS OTP birincil giriş yöntemi. Ayrıca sipariş durumu bildirimleri
ve alıcıya gönderilen takip linki.

**Nereye:** `services/api/.env`
```
SMS_PROVIDER=netgsm
SMS_USERNAME=...
SMS_PASSWORD=...
SMS_SENDER_HEADER=...     # onaylı başlık, örn. TASIYORUZ
```

**Sağlayıcı adayları:** Netgsm · İleti Merkezi · Vatan SMS
**Not:** Gönderici başlığı ("TASIYORUZ") BTK onayı gerektiriyor ve **birkaç iş günü sürüyor** —
erken başlat. Onay gelene kadar local geliştirmede SMS konsola yazılıyor.

---

### [ ] 3. Sentry projesi (hata takibi)
**Ne için:** Backend, web ve ileride mobil için hata izleme.

**Nereye:**
```
services/api/.env  → SENTRY_DSN=...
apps/web/.env.local → NEXT_PUBLIC_SENTRY_DSN=...
```

**Not:** KVKK gereği PII maskeleniyor (telefon, e-posta, ad, tam adres). Sentry
yurt dışında olduğu için oraya kişisel veri gönderilmiyor (ADR-0005).
Ücretsiz plan başlangıç için yeterli.

---

## Faz 0–1 arası — Altyapı kararları (kod bloke değil, ama planlama gerekiyor)

### [ ] 4. Türkiye bulut sağlayıcısı hesabı
**Ne için:** Barındırma Türkiye'de olacak (ADR-0005). Vercel kullanılamıyor.

**Adaylar:** AWS Türkiye · Azure Türkiye · Vargonen · Doruk · Türk Telekom Bulut
**Seçim kriteri:** Managed PostgreSQL ve Redis desteği belirleyici — yoksa Kubernetes
içinde operatörle çalıştırmak gerekir ve bakım yükü ciddi artar.

**Karar zamanı:** Faz 1 bitmeden, gerçek kullanıcı verisi girmeden.

---

### [ ] 18. Nesne deposu (taşıyıcı belgeleri)
**Ne için:** Ehliyet, ruhsat, SRC, K belgesi gibi belgelerin dosyaları. Kod S3 uyumlu
bir API'ye göre yazıldı; yerelde `docker-compose`'daki MinIO kullanılıyor, üretimde
Türkiye'de barındırılan S3 uyumlu bir kova gerekiyor (ADR-0005 — belgeler kişisel veri).

**Nereye:** `services/api/.env`
```
STORAGE_ENDPOINT=https://...
STORAGE_BUCKET=...
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_PATH_STYLE=true
STORAGE_CREATE_BUCKET=false
```

**Şu an bloke olan:** Hiçbir şey — yerel MinIO ile çalışıyor. Anahtar verilmezse belge
yükleme "depo yapılandırılmamış" diyerek açıkça reddediyor, sessizce kaybetmiyor.

**Not:** Kova **herkese açık olmamalı.** Dosyalara yalnızca API üzerinden, sahiplik ya
da operasyon rolü kontrolüyle erişiliyor; imzalı doğrudan indirme linki yok.

---

### [x] 19. Keycloak yönetim istemcisi (taşıyıcı rolü atamak için)
**Ne için:** Başvuru onaylandığında kullanıcıya `DRIVER` rolünün verilmesi, askıda geri
alınması ve bildirim için kullanıcı e-postasının okunması.

**Durum:** Dış anahtar değilmiş; Keycloak kendi konteynerimiz. Realm dosyasında
`tasiyoruz-api` istemcisine servis hesabı ve gizli anahtar tanımlandı, `realm-management`
altında `view-realm`, `manage-users`, `view-users`, `query-users` yetkileri verildi.
Yerelde çalışıyor. Üretimde yalnızca gizli anahtarı değiştir:

`services/api/.env`
```
KEYCLOAK_ADMIN_BASE_URL=https://kimlik.tasiyoruz.com
KEYCLOAK_ADMIN_CLIENT_SECRET=<güçlü-bir-değer>
```

---

### [ ] 20. SMTP sunucusu (e-posta doğrulama ve bildirimler)
**Ne için:** İki ayrı yerde kullanılıyor.
1. **Keycloak** — kayıt sonrası e-posta doğrulama ve "şifremi unuttum".
2. **API** — uygulamanın kendi bildirimleri: teklif geldi, teklif kabul edildi,
   teslim bildirildi, iş tamamlandı, belge reddedildi, belge süresi doluyor...

**Yerelde:** Mailhog hazır, hiçbir şey gerekmiyor. Giden postaları gör:
http://localhost:8025

**Sağlayıcı:** Türkiye'de barındırılan bir posta sağlayıcısı ya da kendi sunucun.
Yurt dışı sağlayıcılar e-posta adresini işler; ADR-0005 gereği tercih edilmiyor.
Alan adını aldıktan sonra çoğu barındırma paketi SMTP'yi birlikte veriyor.

**Nereye — 1) API bildirimleri:** `services/api/.env`
```
SMTP_HOST=mail.tasiyoruz.com
SMTP_PORT=587
SMTP_USERNAME=no-reply@tasiyoruz.com
SMTP_PASSWORD=...
SMTP_AUTH=true
SMTP_STARTTLS=true
NOTIFICATION_FROM=no-reply@tasiyoruz.com
NEXT_PUBLIC_SITE_URL=https://tasiyoruz.com
```
`NEXT_PUBLIC_SITE_URL` e-postadaki bağlantıların kökü; verilmezse postalar
localhost'a link verir.

**Nereye — 2) Keycloak doğrulama postaları:** Keycloak yönetim arayüzü →
Realm settings → Email. Aynı host, port, from ve kimlik bilgileri.

**Şu an bloke olan:** Üretimde SMTP olmadan **kimse kaydını tamamlayamaz** (doğrulama
postası gitmez) ve hiçbir bildirim ulaşmaz. Yerelde her şey uçtan uca çalışıyor.

**Doğrulama:** Panelde **Bildirimler** sayfası (`/yonetim/bildirimler`) her gönderimi
gösteriyor; gitmeyenler hata metniyle listeleniyor.

---

### [ ] 5. Alan adı
**Ne için:** `tasiyoruz.com` ve/veya `tasiyoruz.com.tr` — müsaitliği kontrol edilmedi.

**Not:** Marka adı geçici. Faz 1'de pazarlama sayfaları yazılmadan kesinleşmeli;
sonradan değiştirmek SEO ve mağaza kayıtlarını etkiler.

**Nereye (alan adı belli olunca):** `apps/web/.env`
```
NEXT_PUBLIC_SITE_URL=https://tasiyoruz.com
NEXT_PUBLIC_ALLOW_INDEXING=true
```
Site şu an arama motorlarına **kapalı** (`robots.txt` → `Disallow: /`). Geçici adresin
indekslenmesi sonradan temizlenmesi zor bir iz bırakır. Bu iki değişken verilene kadar
paylaşım önizlemesi de localhost'u gösterir.

---

## Faz 3–4 — Mobil uygulamalar

### [ ] 6. Firebase projesi (Android push bildirimi)
**Ne için:** FCM üzerinden sipariş durumu ve iş teklifi bildirimleri.
**Nereye:** `apps/mobile-*/google-services.json` (gitignore'da) + `services/api/.env` → `FCM_SERVICE_ACCOUNT_JSON`

### [ ] 7. Apple Developer hesabı (iOS)
**Ne için:** APNs push anahtarı, TestFlight dağıtımı, App Store yayını.
**Maliyet:** Yıllık 99 USD. **Hesap açılışı birkaç gün sürebilir**, Faz 3'ten önce başlat.
**Nereye:** APNs `.p8` anahtarı → `services/api/.env` → `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`

### [ ] 8. Google Play Developer hesabı
**Ne için:** Android yayını. **Maliyet:** Tek seferlik 25 USD.
**Not:** Yeni geliştirici hesapları için kapalı test şartı var — Faz 3'te süreci erken başlat.

---

## Faz 5 — Ödeme

### [ ] 9. iyzico üye işyeri hesabı
**Ne için:** Tahsilat **ve nakliyeciye ödeme aktarımı**. Basit tahsilat yetmiyor —
pazaryeri (alt üye işyeri / submerchant) modeli gerekiyor.

**Nereye:** `services/api/.env` → `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL`

**Ön koşul:** ⚠️ **Şirket kuruluşu.** Sözleşme tüzel kişilikle yapılıyor.
Süreç uzun — Faz 5'ten çok önce başlatılmalı. Söyle, planlayalım.

### [ ] 10. e-Arşiv / e-Fatura / e-İrsaliye entegratörü
**Ne için:** Her sipariş için otomatik fatura ve **teslim sırasında e-irsaliye** üretimi.
**Adaylar:** Logo e-Fatura · Paraşüt API · Uyumsoft
**Ön koşul:** Şirket kuruluşu + mali mühür.

**Şu an bloke olan:** Yalnızca e-irsaliye. Teslim akışının kalanı çalışıyor: aşama
makinesi, teslim kanıtı fotoğrafları ve müşterinin teslimatta onayı hazır. e-irsaliye
mali mühür olmadan üretilemez, o yüzden taklidi yapılmadı.

### [ ] 11. NVİ TC Kimlik Doğrulama servisi
**Ne için:** Nakliyeci onboarding'inde kimlik doğrulama (Faz 3).
**Not:** Kamu servisi, başvuru gerektiriyor.

---

## Staging / dağıtım hesapları

### [ ] 17. Konteyner ve veritabanı sağlayıcıları
**Ne için:** API ve Keycloak'ın herkese açık bir adreste çalışması. Vercel'e attığın
sürümde giriş ve fiyat hesaplamanın çalışmamasının **tek sebebi** bu: Vercel yalnızca
web arayüzünü çalıştırıyor, arkasında API yok.

**Ücretsiz başlangıç paketi** (kredi kartı istemez, staging için yeterli):

| Servis | Sağlayıcı | Ne alacaksın |
|---|---|---|
| PostgreSQL + PostGIS | [Neon](https://neon.tech) | Bağlantı dizesi (`postgresql://...`) |
| Redis | [Upstash](https://upstash.com) | Redis URL'i (`rediss://...`) |
| API + Keycloak | [Render](https://render.com) | İki servis, iki herkese açık adres |
| Web | [Vercel](https://vercel.com) | Zaten var |

**Adım adım:** [docs/13-dagitim.md](docs/13-dagitim.md) — sırayla Neon, Upstash,
Render (Keycloak), Render (API), Vercel. Her adımda hangi değeri nereye yapıştıracağın
yazıyor.

**Nereye:** Bu sağlayıcıların panelinde, ortam değişkeni olarak. `.env` dosyası
yüklemiyorsun; Render ve Vercel'in kendi "Environment Variables" ekranları var.

⚠️ Bu sağlayıcıların hiçbiri Türkiye'de değil. **Staging ve kendi testlerin için**
uygun; gerçek kullanıcı verisi girmeden önce ADR-0005 uyarınca #4'e geçilmeli.

---

## Üretime çıkarken ayarlanması zorunlu

Bunlar dış servis değil, **bizim ürettiğimiz** değerler — ama local varsayılanlarıyla
üretime çıkılırsa güvenlik açığı olur.

### [ ] 13. Teklif imzalama anahtarı
**Ne için:** Fiyat teklifi HMAC ile imzalanıyor; istemcinin fiyatı değiştirip sipariş
oluşturmasını bu engelliyor. Local varsayılanı `local-development-secret` — üretimde
kalırsa herkes kendi fiyatını imzalayabilir.

**Nereye:** `services/api/.env` → `TASIYORUZ_QUOTE_SIGNING_SECRET=<rastgele 32+ karakter>`
Üretmek için: `openssl rand -base64 48`

### [ ] 14. CORS izinli origin listesi
**Ne için:** API varsayılan olarak yalnızca `localhost:3000/3001`'e izin veriyor.
Üretim alan adı eklenmezse web uygulaması API'ye hiç ulaşamaz.

**Nereye:** `services/api/.env` → `TASIYORUZ_CORS_ALLOWED_ORIGINS=https://tasiyoruz.com,https://admin.tasiyoruz.com`

### [ ] 16. Web oturum anahtarları (Auth.js)
**Ne için:** Web uygulaması oturumu sunucu tarafında tutuyor. Çerezleri imzalayan
`AUTH_SECRET` ve Keycloak'a gizli istemci olarak bağlanmayı sağlayan istemci sırrı.
Yereldeki değerler (`tasiyoruz-web-dev-secret`) herkese açık, üretimde kullanılamaz.

**Nereye:** Vercel/sunucu ortam değişkenleri
```
AUTH_SECRET=<openssl rand -base64 32>
AUTH_KEYCLOAK_ID=tasiyoruz-web
AUTH_KEYCLOAK_SECRET=<Keycloak > Clients > tasiyoruz-web > Credentials>
AUTH_KEYCLOAK_ISSUER=https://<keycloak alan adı>/realms/tasiyoruz
AUTH_URL=https://tasiyoruz.com
```

### [ ] 15. Keycloak üretim yönetici parolası
Local'de `admin/admin`. Üretimde değiştirilmeli ve realm ayarları gözden geçirilmeli.

---

## GitHub / CI

### [ ] 12. GitHub Actions secret'ları
CI şu an dış servise ihtiyaç duymuyor (Testcontainers kendi konteynerini kaldırıyor).
Deploy adımı eklendiğinde gerekecek: registry kimliği, kubeconfig, ortam anahtarları.

---

## Nereye ne konur

| Dosya / yer | İçine ne girer |
|---|---|
| `services/api/.env` | #13 imzalama anahtarı · #14 CORS · #19 Keycloak yönetim sırrı · #20 SMTP · #18 depo · (#1 Maps, #2 SMS, #3 Sentry, #9 iyzico entegrasyon gelince) |
| `apps/web/.env.local` | `NEXT_PUBLIC_API_URL` · #16 AUTH_* · #5 site adresi |
| Vercel → Environment Variables | `apps/web/.env.local`'ın aynısı; `AUTH_TRUST_HOST` yerine `AUTH_URL` |
| Render → Environment | `services/api/.env`'in aynısı + veritabanı ve Redis bağlantıları |
| Keycloak → Realm settings → Email | #20 SMTP (doğrulama postaları için ayrıca) |

Şablonlar `.env.example` dosyalarında; repoda duruyorlar ama içleri boş. Kopyala:

```bash
cp services/api/.env.example services/api/.env
cp apps/web/.env.example apps/web/.env.local
```

**Yerelde neyi doldurman gerekiyor? Hiçbirini.** `apps/web/.env.local` zaten hazır ve
dolu; `services/api/.env` yerelde hiç gerekmiyor, her ayarın çalışan varsayılanı var.
Spring `.env`'i `spring.config.import` ile okur, Next `.env.local`'ı kendiliğinden yükler.

Yerel geliştirmede dış servislerin hiçbiri gerekmiyor: mesafe takribî hesaplanıyor,
e-posta Mailhog'a düşüyor, dosyalar MinIO'ya yazılıyor, ödeme henüz yok.
