# Anahtarlar ve Erişimler — Not Defteri

Senin sağlaman gereken anahtarlar, hesaplar ve erişimler. **Yukarıdan aşağıya sırayla**
yapılacak şekilde dizildi. Bir maddeyi hallettiğinde söyle, kutusunu işaretleyeyim.

> ⚠️ **Bu dosyaya asla gerçek anahtar yazılmaz.** Burada yalnızca *neyin gerektiği* ve
> *nereye konacağı* yazar. Gerçek değerler `.env` dosyalarına gider, onlar da
> `.gitignore`'da — repoya hiçbir zaman girmez.

> Başlıklardaki `#17`, `#20` gibi numaralar **eski madde numaraları.** Kod yorumları
> onlara atıf yapıyor (örn. `ANAHTARLAR #18`), o yüzden değişmiyorlar. Sıralamayla
> ilgileri yok; aradığın numarayı bulmak için en alttaki [numara dizinine](#numara-dizini)
> bak ya da `#18` diye ara.

## Yerelde ne gerekiyor?

**Hiçbir şey.** `pnpm infra:up && pnpm api && pnpm dev` ile her şey çalışır: veritabanı,
Redis, Keycloak, dosya deposu (MinIO) ve e-posta (Mailhog) konteynerlerden gelir.
Aşağıdaki maddelerin tamamı **üretim ve staging** içindir.

## Özet

| Adım | İş | Neyi açar | Süre |
|---|---|---|---|
| 1 | Dağıtım hesapları | Siteyi kendi telefonundan test etmek | ~1 saat |
| 2 | Üretim sırları | 1 ile birlikte zorunlu | ~15 dk |
| 3 | SMTP | Kayıt tamamlama ve tüm bildirimler | ~1 saat |
| 4 | Alan adı | Marka, paylaşım önizlemesi, arama motoru | ~1 gün |
| 5 | Nesne deposu | Belge ve fotoğrafların kalıcı saklanması | ~1 saat |
| 6 | Google Maps | Gerçek mesafe, süre, adres arama | ~1 saat |
| 7 | SMS | Telefonla giriş | Başlık onayı günler sürer |
| 8 | Sentry | Üretimde hata görünürlüğü | ~20 dk |

Süreler kaba tahmin; hesap açma ve onay bekleme sürelerini kapsamıyor.

---

## Adım 1 — Dağıtım hesapları · madde #17

**[ ] Yapılacak**

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

**Nereye:** Sağlayıcıların kendi panellerinde, ortam değişkeni olarak. `.env` dosyası
yüklemiyorsun; Render ve Vercel'in "Environment Variables" ekranları var.

⚠️ Bu sağlayıcıların hiçbiri Türkiye'de değil. **Staging ve kendi testlerin için**
uygun; gerçek kullanıcı verisi girmeden önce ADR-0005 uyarınca Türkiye'de barındırmaya
geçilmeli (bkz. [sonraki fazlar](#sonraki-fazlar), madde #4).

---

## Adım 2 — Üretim sırları · maddeler #13 #14 #16 #15

**[ ] Yapılacak** — Adım 1 ile **birlikte**.

Bunlar dış servis değil, **senin üreteceğin** değerler. Yerel varsayılanlarıyla
üretime çıkmak, imzalama anahtarı `local-development-secret` kalmış bir sistemi
internete koymak demek.

### #13 Teklif imzalama anahtarı
Fiyat teklifi HMAC ile imzalanıyor; istemcinin fiyatı değiştirip sipariş oluşturmasını
bu engelliyor.

```bash
openssl rand -base64 48
```
`services/api/.env` → `TASIYORUZ_QUOTE_SIGNING_SECRET=<çıktı>`

### #14 CORS izinli origin listesi
API varsayılan olarak yalnızca `localhost:3000` ve `:3001`'e izin veriyor. Üretim alan
adı eklenmezse web uygulaması API'ye **hiç ulaşamaz**.

`services/api/.env` → `TASIYORUZ_CORS_ALLOWED_ORIGINS=https://tasiyoruz.com,https://admin.tasiyoruz.com`

### #16 Web oturum anahtarları (Auth.js)
Çerezleri imzalayan `AUTH_SECRET` ve Keycloak'a gizli istemci olarak bağlanmayı sağlayan
istemci sırrı. Yereldeki `tasiyoruz-web-dev-secret` herkese açık, üretimde kullanılamaz.

```bash
openssl rand -base64 32
```
Vercel → Environment Variables:
```
AUTH_SECRET=<çıktı>
AUTH_KEYCLOAK_ID=tasiyoruz-web
AUTH_KEYCLOAK_SECRET=<Keycloak → Clients → tasiyoruz-web → Credentials>
AUTH_KEYCLOAK_ISSUER=https://<keycloak adresi>/realms/tasiyoruz
AUTH_URL=https://tasiyoruz.com
```

### #15 Keycloak üretim yönetici parolası
Yerelde `admin/admin`. Üretimde değiştir ve realm ayarlarını gözden geçir. Ayrıca API'nin
yönetim istemcisi sırrını da değiştir (bkz. [tamamlananlar](#tamamlananlar), madde #19):

`services/api/.env` → `KEYCLOAK_ADMIN_CLIENT_SECRET=<güçlü bir değer>`

---

## Adım 3 — SMTP sunucusu · madde #20

**[ ] Yapılacak**

**Ne için:** İki ayrı yerde kullanılıyor.
1. **Keycloak** — kayıt sonrası e-posta doğrulama ve "şifremi unuttum".
2. **API** — uygulamanın kendi bildirimleri: teklif geldi, teklif kabul edildi, teslim
   bildirildi, iş tamamlandı, belge reddedildi, belge süresi doluyor...

**Yerelde:** Mailhog hazır, hiçbir şey gerekmiyor. Giden postalar: http://localhost:8025

**Sağlayıcı:** Türkiye'de barındırılan bir posta sağlayıcısı ya da kendi sunucun. Yurt
dışı sağlayıcılar e-posta adresini işler; ADR-0005 gereği tercih edilmiyor. Alan adını
aldıktan sonra çoğu barındırma paketi SMTP'yi birlikte veriyor — bu yüzden Adım 4 ile
birlikte halletmek kolay olur.

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
`NEXT_PUBLIC_SITE_URL` e-postadaki bağlantıların kökü; verilmezse postalar localhost'a
link verir.

**Nereye — 2) Keycloak doğrulama postaları:** Keycloak yönetim arayüzü → Realm settings
→ Email. Aynı host, port, from ve kimlik bilgileri.

**Bloke ettiği iş:** Üretimde SMTP olmadan **kimse kaydını tamamlayamaz** (doğrulama
postası gitmez) ve hiçbir bildirim ulaşmaz.

**Doğrulama:** Operasyon panelinde **Bildirimler** sayfası (`/yonetim/bildirimler`) her
gönderimi gösteriyor; gitmeyenler hata metniyle listeleniyor.

---

## Adım 4 — Alan adı · madde #5

**[ ] Yapılacak**

**Ne için:** `tasiyoruz.com` ve/veya `tasiyoruz.com.tr` — müsaitliği kontrol edilmedi.

**Not:** Marka adı geçici. Pazarlama sayfaları yayınlanmadan kesinleşmeli; sonradan
değiştirmek arama sonuçlarını ve mağaza kayıtlarını etkiler.

**Nereye:** `apps/web/.env.local` ve Vercel → Environment Variables
```
NEXT_PUBLIC_SITE_URL=https://tasiyoruz.com
NEXT_PUBLIC_ALLOW_INDEXING=true
```

Site şu an arama motorlarına **kapalı** (`robots.txt` → `Disallow: /`). Geçici adresin
indekslenmesi sonradan temizlenmesi zor bir iz bırakır. Bu iki değişken girilene kadar
paylaşım önizlemesi de localhost'u gösterir.

---

## Adım 5 — Nesne deposu · madde #18

**[ ] Yapılacak**

**Ne için:** Ehliyet, ruhsat, SRC, K belgesi gibi belgelerin ve teslim fotoğraflarının
dosyaları. Kod S3 uyumlu bir API'ye göre yazıldı; yerelde MinIO kullanılıyor, üretimde
Türkiye'de barındırılan S3 uyumlu bir kova gerekiyor (ADR-0005 — belgeler kişisel veri).

**Nereye:** `services/api/.env`
```
STORAGE_ENDPOINT=https://...
STORAGE_REGION=...
STORAGE_BUCKET=...
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_PATH_STYLE=true
STORAGE_CREATE_BUCKET=false
```

**Bloke ettiği iş:** Yerelde hiçbir şey. Anahtar verilmezse belge yükleme "depo
yapılandırılmamış" diyerek açıkça reddediyor, sessizce kaybetmiyor.

⚠️ **Kova herkese açık olmamalı.** Dosyalara yalnızca API üzerinden, sahiplik ya da
operasyon rolü kontrolüyle erişiliyor; imzalı doğrudan indirme linki yok.

---

## Adım 6 — Google Maps Platform · madde #1

**[ ] Yapılacak**

**Ne için:** Adres arama (Places Autocomplete), koordinat↔adres çevirisi (Geocoding),
mesafe ve trafikli varış süresi (Routes). **Fiyat doğruluğu doğrudan buna bağlı.**

**Nasıl alınır:**
1. console.cloud.google.com → yeni proje
2. Şu API'leri etkinleştir: *Places API (New)*, *Geocoding API*, *Routes API*, *Maps JavaScript API*
3. Kimlik Bilgileri → API anahtarı oluştur
4. **Kısıtlama ekle:** IP kısıtlaması (sunucu IP'si) + yalnızca yukarıdaki dört API
5. Faturalandırma → **bütçe alarmı kur** (aylık limit, %50 ve %90 uyarısı)

**Nereye:** `services/api/.env` → `GOOGLE_MAPS_API_KEY=...`
İstemciye **gömülmüyor** — tüm harita çağrıları backend üzerinden geçiyor (docs/03).

⚠️ **Anahtarı alman tek başına yetmiyor.** Bugün hiçbir kod onu okumuyor; Routes ve
Geocoding entegrasyonunu ayrıca yazmam gerekiyor. O gelene kadar takribî mesafe
sağlayıcısı (kuş uçuşu × yol katsayısı) devrede ve fiyatlar makul ama kesin değil.

---

## Adım 7 — SMS sağlayıcısı · madde #2

**[ ] Yapılacak**

**Ne için:** Telefon + SMS tek kullanımlık kod ile giriş. Ayrıca sipariş durumu
bildirimleri ve alıcıya gönderilen takip linki.

**Sağlayıcı adayları:** Netgsm · İleti Merkezi · Vatan SMS

**Nereye:** `services/api/.env`
```
SMS_PROVIDER=netgsm
SMS_USERNAME=...
SMS_PASSWORD=...
SMS_SENDER_HEADER=TASIYORUZ
```

⚠️ Gönderici başlığı ("TASIYORUZ") BTK onayı gerektiriyor ve **birkaç iş günü sürüyor**.
Bu adıma sıra gelmeden başvurusunu yapmak mantıklı. Maps gibi burada da entegrasyon
kodu henüz yazılmadı.

---

## Adım 8 — Sentry · madde #3

**[ ] Yapılacak**

**Ne için:** Backend, web ve ileride mobil için hata izleme. Üretimde bir şey kırıldığında
kullanıcının söylemesini beklemek yerine görürsün.

**Nereye:**
```
services/api/.env   → SENTRY_DSN=...
apps/web/.env.local → NEXT_PUBLIC_SENTRY_DSN=...
```

**Not:** KVKK gereği kişisel veri maskeleniyor (telefon, e-posta, ad, tam adres). Sentry
yurt dışında olduğu için oraya kişisel veri gönderilmiyor (ADR-0005). Ücretsiz plan
başlangıç için yeterli.

---

## Sonraki fazlar

Bunlara şimdi bakmana gerek yok; ilgili faza gelince açacağız.

### [ ] #4 Türkiye bulut sağlayıcısı hesabı
Barındırma Türkiye'de olacak (ADR-0005); Adım 1'deki sağlayıcılar geçici.
**Adaylar:** AWS Türkiye · Azure Türkiye · Vargonen · Doruk · Türk Telekom Bulut
**Seçim kriteri:** Managed PostgreSQL ve Redis desteği belirleyici — yoksa Kubernetes
içinde operatörle çalıştırmak gerekir, bakım yükü ciddi artar.
**Karar zamanı:** Gerçek kullanıcı verisi girmeden önce.

### [ ] #6 Firebase projesi (Android push)
`apps/mobile-*/google-services.json` + `services/api/.env` → `FCM_SERVICE_ACCOUNT_JSON`

### [ ] #7 Apple Developer hesabı
Yıllık 99 USD, hesap açılışı birkaç gün sürebilir. APNs `.p8` anahtarı →
`services/api/.env` → `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`

### [ ] #8 Google Play Developer hesabı
Tek seferlik 25 USD. Yeni geliştirici hesapları için kapalı test şartı var, süreci erken başlat.

### [ ] #9 iyzico üye işyeri hesabı
Tahsilat **ve taşıyıcıya ödeme aktarımı**. Basit tahsilat yetmiyor; pazaryeri
(alt üye işyeri) modeli gerekiyor.
`services/api/.env` → `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL`
⚠️ **Ön koşul: şirket kuruluşu.** Sözleşme tüzel kişilikle yapılıyor, süreç uzun.

### [ ] #10 e-Arşiv / e-Fatura / e-İrsaliye entegratörü
**Adaylar:** Logo e-Fatura · Paraşüt API · Uyumsoft
⚠️ **Ön koşul:** şirket kuruluşu + mali mühür.
**Bloke ettiği iş:** yalnızca e-irsaliye. Teslim akışının kalanı çalışıyor.

### [ ] #11 NVİ TC Kimlik Doğrulama servisi
Taşıyıcı kaydında kimlik doğrulama. Kamu servisi, başvuru gerektiriyor.

### [ ] #12 GitHub Actions secret'ları
CI şu an dış servise ihtiyaç duymuyor (Testcontainers kendi konteynerini kaldırıyor).
Deploy adımı eklendiğinde gerekecek: registry kimliği, kubeconfig, ortam anahtarları.

---

## Tamamlananlar

### [x] #19 Keycloak yönetim istemcisi
**Ne için:** Başvuru onaylandığında kullanıcıya `DRIVER` rolünün verilmesi, askıda geri
alınması ve bildirim için kullanıcı e-postasının okunması.

**Durum:** Dış anahtar değilmiş; Keycloak kendi konteynerimiz. Realm dosyasında
`tasiyoruz-api` istemcisine servis hesabı ve gizli anahtar tanımlandı, `realm-management`
altında `view-realm`, `manage-users`, `view-users`, `query-users` yetkileri verildi.
Yerelde çalışıyor. Üretimde yalnızca adresi ve gizli anahtarı değiştir:

`services/api/.env`
```
KEYCLOAK_ADMIN_BASE_URL=https://kimlik.tasiyoruz.com
KEYCLOAK_ADMIN_CLIENT_SECRET=<güçlü bir değer>
```

---

## Numara dizini

Kod yorumlarındaki `ANAHTARLAR #N` atıfları bu tabloyla eşleşiyor.

| Numara | Konu | Nerede |
|---|---|---|
| #1 | Google Maps | Adım 6 |
| #2 | SMS | Adım 7 |
| #3 | Sentry | Adım 8 |
| #4 | Türkiye bulut | Sonraki fazlar |
| #5 | Alan adı | Adım 4 |
| #6 #7 #8 | Mobil hesaplar | Sonraki fazlar |
| #9 #10 #11 | Ödeme, e-fatura, kimlik doğrulama | Sonraki fazlar |
| #12 | GitHub Actions | Sonraki fazlar |
| #13 #14 #15 #16 | Üretim sırları | Adım 2 |
| #17 | Dağıtım hesapları | Adım 1 |
| #18 | Nesne deposu | Adım 5 |
| #19 | Keycloak yönetim istemcisi | Tamamlananlar |
| #20 | SMTP | Adım 3 |

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
