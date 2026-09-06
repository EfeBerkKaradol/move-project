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
`neon.tech` → yeni proje → **PostGIS eklentisini aç**:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```
Bağlantı dizesini not al. Flyway migration'ları ilk açılışta kendiliğinden koşar.

### 2. Redis — Upstash
`upstash.com` → yeni Redis → TLS'li bağlantı bilgisini not al.

### 3. Keycloak — Render (ya da Koyeb)
Docker imajı: `quay.io/keycloak/keycloak:26.0`
Komut: `start --optimized --hostname=https://<keycloak-adresi>`
Ortam:
```
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://<neon-host>/<db>?sslmode=require
KC_DB_USERNAME=…
KC_DB_PASSWORD=…
KC_BOOTSTRAP_ADMIN_USERNAME=admin
KC_BOOTSTRAP_ADMIN_PASSWORD=<güçlü bir parola>
KC_HEALTH_ENABLED=true
```
Açıldıktan sonra admin panelinden `infra/docker/keycloak/import/tasiyoruz-realm.json`
dosyasını **Realm oluştur → içe aktar** ile yükle. Sonra:
- `tasiyoruz-web` istemcisinde **Valid redirect URIs**: `https://<web-adresi>/*`
- **Web origins**: `https://<web-adresi>`
- **Credentials** sekmesinden istemci sırrını kopyala (yereldeki dev sırrını kullanma)
- Tema: `infra/docker/keycloak/themes` klasörünü imaja eklemen gerekir; Render'da
  bunun için küçük bir Dockerfile yazılır (`FROM quay.io/keycloak/keycloak:26.0` +
  `COPY themes /opt/keycloak/themes`).

### 4. API — Render
`services/api/Dockerfile` hazır. Ortam:
```
SPRING_DATASOURCE_URL=jdbc:postgresql://<neon-host>/<db>?sslmode=require
SPRING_DATASOURCE_USERNAME=…
SPRING_DATASOURCE_PASSWORD=…
SPRING_DATA_REDIS_URL=rediss://…            (Upstash)
SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI=https://<keycloak-adresi>/realms/tasiyoruz
TASIYORUZ_CORS_ALLOWED_ORIGINS=https://<web-adresi>
TASIYORUZ_QUOTE_SIGNING_SECRET=<openssl rand -base64 48>
```

### 5. Web — Vercel ortam değişkenleri
Project → Settings → Environment Variables:
```
NEXT_PUBLIC_API_URL=https://<api-adresi>
AUTH_KEYCLOAK_ISSUER=https://<keycloak-adresi>/realms/tasiyoruz
AUTH_KEYCLOAK_ID=tasiyoruz-web
AUTH_KEYCLOAK_SECRET=<Keycloak Credentials'tan>
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://<web-adresi>
```
Sonra **yeniden dağıt** — ortam değişkenleri derleme anında gömülür.

## Sıra önemli

Keycloak → API → Web. Her biri bir öncekinin adresini ister.

## ⚠️ Veri ikametgâhı

Neon, Upstash ve Render **Türkiye'de değil**. Test verisiyle sorun yok; **gerçek
kullanıcı verisi girmeden önce** [ADR-0005](adr/0005-veri-barindirma.md) uyarınca
Türkiye'de barındırmaya geçilmeli. Mimari sağlayıcıya bağımlı değil (Postgres,
Redis, S3 uyumlu depolama, konteyner) — taşıma mekanik bir iş.

## Daha basit alternatif: tek sunucu

Bir VPS (Türkiye'de: Vargonen, Doruk, Natro) kirala, `docker compose` ile aynı
yığını çalıştır. Tek fatura, veri Türkiye'de, ADR-0005 ile uyumlu. Karşılığında
sunucu bakımını sen üstlenirsin. Gerçek kullanıcıya çıkarken doğru yol muhtemelen bu.
