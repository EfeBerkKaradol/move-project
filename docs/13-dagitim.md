# 13 — Dağıtım: siteyi herkesin test edebileceği hâle getirmek

> Bugün Vercel'de yalnızca pazarlama sayfaları çalışıyor. Fiyat hesaplama ve giriş
> çalışmıyor çünkü **API ve Keycloak yalnızca senin bilgisayarında** (`localhost`).
> Vercel bir Next.js sunucusu; Java servisi ya da Keycloak çalıştıramaz.

## Neyin nerede çalışması gerekiyor

| Parça | Bugün | Test için gereken |
|---|---|---|
| Web (Next.js) | ✅ Vercel | — |
| API (Spring Boot) | ❌ localhost:8080 | Bir konteyner sağlayıcısı |
| Keycloak | ❌ localhost:8081 | Bir konteyner sağlayıcısı |
| PostgreSQL + PostGIS | ❌ Docker | Yönetilen veritabanı |
| Redis | ❌ Docker | Yönetilen Redis (ya da şimdilik atlanabilir) |

## Ücretsiz katmanla staging (önerilen sıra)

Hepsi ücretsiz başlar; kart isteyenler ücretlendirmez.

### 1. Veritabanı — Neon
`neon.tech` → yeni proje → **PostGIS eklentisini aç** (SQL Editor):
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```
"Statement executed successfully" görmen yeterli; sonuç satırı dönmez.

**Bağlantı dizesini al:** sol üstteki yeşil **Connect** düğmesi → *Connection string*.
Şuna benzer bir şey verir:
```
postgresql://neondb_owner:AbC123xyz@ep-cool-name-12345.eu-central-1.aws.neon.tech/neondb?sslmode=require
```
Parolayı yalnızca bir kez gösterir; kaybedersen Branch → **Credentials** ekranından
sıfırlarsın.

**Üç parçaya ayır.** Spring bu dizeyi olduğu gibi kabul etmez, JDBC biçimi ister:

| Değişken | Değer | Yukarıdaki örnekte |
|---|---|---|
| `DATABASE_URL` | `jdbc:postgresql://` + host + `/` + veritabanı + `?sslmode=require` | `jdbc:postgresql://ep-cool-name-12345.eu-central-1.aws.neon.tech/neondb?sslmode=require` |
| `DATABASE_USERNAME` | `://` ile `:` arasındaki kısım | `neondb_owner` |
| `DATABASE_PASSWORD` | `:` ile `@` arasındaki kısım | `AbC123xyz` |

Yani: başına `jdbc:` ekle, `kullanıcı:parola@` kısmını URL'den çıkar, ayrı değişkenlere koy.

Flyway migration'ları API ilk açıldığında kendiliğinden koşar; tabloları elle
oluşturmana gerek yok.

### 2. Redis — Upstash
`upstash.com` → Create Database → bölge olarak Avrupa seç.

Bağlantı ekranı çoğu zaman **redis-cli** komutu olarak verir:
```
redis-cli --tls -u redis://default:AbC123xyz@eu1-xxx.upstash.io:6379
```
⚠️ Bunu olduğu gibi kopyalama. `redis-cli` TLS'i ayrı bir `--tls` bayrağıyla alıyor;
bizim yapılandırmada TLS **şemanın içinde** olmalı. İki şey yap: komut kısmını at,
`redis://` yerine `rediss://` (çift s) yaz.

```
REDIS_URL=rediss://default:AbC123xyz@eu1-xxx.upstash.io:6379
```
Parola dizenin içinde geliyor, ayrıştırmana gerek yok.

Doğrulamak istersen (yerel Redis konteynerinden):
```bash
docker exec tasiyoruz-redis redis-cli --tls -u "<rediss:// adresin>" PING
```
`PONG` dönmeli.
`upstash.com` → yeni Redis → TLS'li bağlantı bilgisini not al.

### 3. Keycloak için ikinci veritabanı — Neon

Keycloak kendi tablolarını oluşturuyor ve API'nin Flyway göçleriyle **aynı şemayı
paylaşamaz**; tablo adları çakışabilir. Neon'da aynı proje içinde ikinci bir
veritabanı aç:

Neon → sol menüde **Postgres database** → **Tables** yanındaki veritabanı seçicisi →
*Create database* → adı `keycloak`. Bağlantı bilgileri aynı, yalnızca URL'in sonundaki
veritabanı adı değişiyor:
```
jdbc:postgresql://<neon-host>/keycloak?sslmode=require
```

---

### 4. Keycloak ve API — Render Blueprint

Repoda **`render.yaml`** hazır: iki servisi de tanımlıyor, aralarındaki adres
bağlantılarını Render kendisi kuruyor.

**Render → New → Blueprint → repoyu seç.** Kurulum sırasında aşağıdaki değerler
tek tek sorulur:

| Sorulan | Ne gireceksin |
|---|---|
| `KC_DB_URL` | `jdbc:postgresql://<neon-host>/keycloak?sslmode=require` |
| `KC_DB_USERNAME` · `KC_DB_PASSWORD` | Neon kullanıcı adı ve parolası |
| `DATABASE_URL` | `jdbc:postgresql://<neon-host>/neondb?sslmode=require` |
| `DATABASE_USERNAME` · `DATABASE_PASSWORD` | Aynı Neon bilgileri |
| `REDIS_URL` | Upstash `rediss://...` adresi |
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | **Şimdilik boş bırak** — Keycloak açıldıktan sonra dolduracaksın |
| `TASIYORUZ_CORS_ALLOWED_ORIGINS` | Vercel adresin, örn. `https://move-project-web.vercel.app` |
| `NEXT_PUBLIC_SITE_URL` | Aynı Vercel adresi |
| `STORAGE_*` · `SMTP_*` | Boş bırak — henüz yok, uygulama yine açılır |

Keycloak yönetici parolasını Render üretiyor: servis açıldıktan sonra
**tasiyoruz-keycloak → Environment → `KC_BOOTSTRAP_ADMIN_PASSWORD`** altından oku.

⚠️ **Ücretsiz plan 15 dakika istek gelmezse servisi uyutuyor.** Uyanması yaklaşık bir
dakika sürüyor, yani ilk giriş yavaş olacak. İki servis ayrı ayrı uyuduğu için bazen
iki kez beklersin. Bu bir hata değil.

---

### 5. Keycloak açıldıktan sonra — 4 ayar

Dağıtım imajındaki realm, geliştirme kolaylıklarından arındırılmış hâli:
test kullanıcıları ve repoda yazılı istemci sırları **yok**, HTTPS zorunlu.
Aşağıdakileri bir kez yapman gerekiyor.

**a) Web istemcisinin adreslerini gir.**
Clients → `tasiyoruz-web` → Settings:
- *Valid redirect URIs*: `https://<vercel-adresin>/*`
- *Valid post logout redirect URIs*: `https://<vercel-adresin>/*`
- *Web origins*: `https://<vercel-adresin>`

**b) İki istemci sırrını al.**
- Clients → `tasiyoruz-web` → **Credentials** → sırrı kopyala → Vercel'de
  `AUTH_KEYCLOAK_SECRET`
- Clients → `tasiyoruz-api` → **Credentials** → sırrı kopyala → Render'da
  `KEYCLOAK_ADMIN_CLIENT_SECRET` (API'yi yeniden başlatmayı unutma)

**c) Kendi hesabını aç.**
Test kullanıcıları imajda yok. Siteden normal şekilde kayıt ol
(`https://<vercel-adresin>/giris` → Hesap oluştur). Kayıt olan herkes yük veren
olarak başlıyor.

**d) Kendine operasyon yetkisi ver.**
Keycloak → Users → kendi hesabın → Role mapping → Assign role → `OPS_AGENT`
(ve istersen `ADMIN`). Çıkış yapıp tekrar gir; `/yonetim` paneli açılır.

---

### 6. Web — Vercel ortam değişkenleri
Project → Settings → Environment Variables:
```
NEXT_PUBLIC_API_URL=https://<api-adresi>
NEXT_PUBLIC_SITE_URL=https://<vercel-adresin>
AUTH_KEYCLOAK_ISSUER=https://<keycloak-adresi>/realms/tasiyoruz
AUTH_KEYCLOAK_ID=tasiyoruz-web
AUTH_KEYCLOAK_SECRET=<5b adımında kopyaladığın>
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://<vercel-adresin>
```
Sonra **yeniden dağıt** — `NEXT_PUBLIC_` ile başlayanlar derleme anında gömülüyor.

---

### 7. SMTP gelince açılacak ayar

Dağıtım realm'inde e-posta doğrulama **kapalı**; SMTP olmadan açık olsaydı kimse
kaydını tamamlayamazdı. SMTP'yi ayarladığında (ANAHTARLAR Adım 3):
Realm settings → **Email** sekmesini doldur, sonra **Login** sekmesinde
*Verify email* seçeneğini aç.

## Sıra önemli

Neon → Upstash → Blueprint (Keycloak + API) → Keycloak ayarları → Vercel.
Her adım bir öncekinin adresini ya da sırrını istiyor.

## ⚠️ Veri ikametgâhı

Neon, Upstash ve Render **Türkiye'de değil**. Test verisiyle sorun yok; **gerçek
kullanıcı verisi girmeden önce** [ADR-0005](adr/0005-veri-barindirma.md) uyarınca
Türkiye'de barındırmaya geçilmeli. Mimari sağlayıcıya bağımlı değil (Postgres,
Redis, S3 uyumlu depolama, konteyner) — taşıma mekanik bir iş.

## Daha basit alternatif: tek sunucu

Bir VPS (Türkiye'de: Vargonen, Doruk, Natro) kirala, `docker compose` ile aynı
yığını çalıştır. Tek fatura, veri Türkiye'de, ADR-0005 ile uyumlu. Karşılığında
sunucu bakımını sen üstlenirsin. Gerçek kullanıcıya çıkarken doğru yol muhtemelen bu.
