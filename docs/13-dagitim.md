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

### 3b. Keycloak şemasını önceden kur (ücretsiz planda zorunlu)

Keycloak ilk açılışında Liquibase ile ~100 tablo kuruyor. Ücretsiz planın 0.1
CPU'sunda bu iş açılışı çok uzatıyor; ölçüldü (0.1 CPU / 512 MB):

| Açılış | Süre |
|---|---|
| İlk (boş veritabanı, şema kuruluyor) | **335 s** |
| İkinci (şema hazır) | **113 s** |

Render'ın port tarama penceresi ~5 dakika. İlk açılış onu aşıyor ve dağıtım
"no open ports detected" ile düşüyor — üstelik uygulama aslında çalışıyor.
Sonraki her açılış rahatça sığıyor.

Çözüm: şemayı bir kez kendi bilgisayarından kur, Render'ın gördüğü ilk açılış
zaten "ikinci açılış" olsun. Aynı imaj, aynı veritabanı:

```bash
docker build -t tasiyoruz-keycloak-seed infra/docker/keycloak
```

```bash
docker run --rm \
  -e KC_DB_URL="<Render'daki KC_DB_URL ile aynı>" \
  -e KC_DB_USERNAME=neondb_owner \
  -e KC_DB_PASSWORD='<Neon parolan>' \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD='<Render'daki KC_BOOTSTRAP_ADMIN_PASSWORD>' \
  -e KC_HOSTNAME=tasiyoruz-keycloak.onrender.com \
  -e KC_HOSTNAME_STRICT=false -e KC_HTTP_ENABLED=true \
  tasiyoruz-keycloak-seed
```

`started in ...s` satırını görünce Ctrl-C ile durdur. Şema ve realm artık Neon'da.

**Yönetici parolası burada belirleniyor.** `KC_BOOTSTRAP_ADMIN_PASSWORD` yalnızca
veritabanı boşken hesabı oluşturur; sonradan değişmez. Bu yüzden Render'ın ürettiği
parolayı (Dashboard → tasiyoruz-keycloak → Environment) kopyalayıp burada kullan —
yoksa panele Render'daki parolayla giremezsin.

**Parolayı kaybettiysen** yeni bir yönetici ekleyebilirsin; veritabanına doğrudan
dokunmaya gerek yok:

```bash
docker run --rm \
  -e KC_DB_URL="<Render'daki KC_DB_URL>" \
  -e KC_DB_USERNAME=neondb_owner \
  -e KC_DB_PASSWORD='<Neon parolan>' \
  -e YENI_PAROLA='<belirlediğin parola>' \
  --entrypoint /opt/keycloak/bin/kc.sh \
  tasiyoruz-keycloak-seed \
  bootstrap-admin user --username kurtarma --password:env YENI_PAROLA --no-prompt --optimized
```

`admin` zaten var olduğu için yeni bir kullanıcı adı veriliyor. Bununla girip
`admin` hesabının parolasını panelden yenileyebilir, sonra `kurtarma` kullanıcısını
silebilirsin.

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

## Bir şey çalışmıyorsa: değer denetim listesi

Çoğu arıza yanlış *değer* değil, yanlış *biçim* ya da eksik kalan ikinci kopyadır.
Sırayla kontrol et.

### Aynı parola iki serviste birden duruyor

Neon rolünün (`neondb_owner`) parolası **iki yerde** kayıtlı. Parolayı yenilediğinde
ikisini birden güncellemezsen, güncellemediğin servis açılmaz:

| Servis | Değişken |
|---|---|
| `tasiyoruz-api` | `DATABASE_PASSWORD` |
| `tasiyoruz-keycloak` | `KC_DB_PASSWORD` |

Aynı şey kullanıcı adı için de geçerli (`DATABASE_USERNAME` / `KC_DB_USERNAME`).
İki servis farklı veritabanlarına bağlanır ama rol aynıdır.

### Biçim tuzakları

**`jdbc:` öneki zorunlu.** Neon panelden `postgresql://...` verir; JDBC sürücüsü bunu
tanımaz ve `No suitable driver found` der. Doğrusu `jdbc:postgresql://...`.

**Kullanıcı adı ve parola URL'den çıkarılır.** Neon'un verdiği dizede ikisi de gömülü
gelir; ayrı değişkenlere taşınır ve URL'de bırakılmaz:

    Neon'un verdiği : postgresql://neondb_owner:PAROLA@ep-xxx.neon.tech/neondb?sslmode=require
    DATABASE_URL    : jdbc:postgresql://ep-xxx.neon.tech/neondb?sslmode=require
    DATABASE_USERNAME: neondb_owner
    DATABASE_PASSWORD: PAROLA

`channel_binding=require` kalabilir, sürücü onu yok sayıyor (denendi).

**Redis şeması çift s olmalı.** Upstash panelden bir `redis-cli` komutu verir; komut
kısmı ve tırnaklar atılır, şema `rediss://` yapılır. TLS şemadan okunuyor —
`redis://` bırakılırsa uygulama açılışta Redis'e bağlanamadan takılır:

    panelin verdiği : redis-cli --tls -u redis://default:TOKEN@xxx.upstash.io:6379
    REDIS_URL       : rediss://default:TOKEN@xxx.upstash.io:6379

**Keycloak veritabanı ayrı olmalı.** `KC_DB_URL` API'ninkiyle aynı veritabanını
göstermemeli; Keycloak kendi tablolarını kurar, Flyway'in yönettiği şemayla
karışırlar.

### Günlükteki imzasından tanı

Render → servis → Logs. Aradığın satır genelde en sonda değil, ortada:

| Günlükte gördüğün | Anlamı |
|---|---|
| `No suitable driver found` | `jdbc:` öneki eksik |
| `password authentication failed` | Parola eski ya da yanlış serviste güncellenmiş |
| `FATAL: database "..." does not exist` | Veritabanı adı yanlış |
| `The server does not support SSL` | Neon dışı bir adrese `sslmode=require` gitmiş |
| `Multiple garbage collectors selected` | `JAVA_OPTS_APPEND` imajın kendi ayarıyla çakışıyor |
| `no open HTTP ports detected` | Uygulama açıldı ama Render beklemeyi bıraktı (açılış çok yavaş) |
| `Nesne deposu anahtarları yok` | Uyarı, hata değil — belge yükleme kapalı, uygulama çalışır |
| `SMTP yapılandırılmamış` | Uyarı, hata değil — bildirimler yalnızca kayda yazılır |

Son iki satır **sorun değil**; anahtarlar girilene kadar öyle kalması bekleniyor.

### Boş bırakılabilecekler

Bunlar girilmediğinde ilgili işlev kapalı çalışır, servis yine açılır:
`STORAGE_*`, `SMTP_*`, `KEYCLOAK_ADMIN_CLIENT_SECRET`. Yani bir servis hiç
açılmıyorsa suçlu bunlar değil — veritabanı ya da Redis değerlerine bak.

