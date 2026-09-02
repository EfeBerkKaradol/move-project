# TurMove — geliştirici notları

Yük taşıma ve teslimat pazaryeri. Ürün ve mimari kararların tamamı `docs/` altında —
**kod yazmadan önce ilgili dokümanı oku**, özellikle `docs/adr/`.

## Hızlı başlangıç

```bash
pnpm install
pnpm infra:up          # postgres+postgis, redis, keycloak, minio, mailhog
pnpm api               # Spring Boot → localhost:8080
pnpm dev               # Next.js  → localhost:3000
```

| Servis | Adres | Giriş |
|---|---|---|
| API | http://localhost:8080 | — |
| Swagger | http://localhost:8080/swagger-ui.html | — |
| Web | http://localhost:3000 | — |
| Keycloak | http://localhost:8081 | admin / admin |
| MinIO | http://localhost:9001 | turmove / turmove123 |
| Mailhog | http://localhost:8025 | — |

Test kullanıcıları (şifre `turmove`): `musteri@`, `nakliyeci@`, `operasyon@turmove.local`

**Eksik anahtarlar:** [ANAHTARLAR.md](ANAHTARLAR.md) — hangi dış servisin beklendiği ve
neyin bloke olduğu orada. Gerçek değerler `.env` dosyalarında, repoya girmez.

## Uymak zorunda olduğun kurallar

**Şemayı Flyway yönetir.** `ddl-auto: validate`. Yeni tablo/sütun = yeni migration.
Yayınlanmış bir migration asla düzenlenmez.

**Modül sınırları serttir.** `services/api` bir modüler monolit (ADR-0002). Bir modülün
`internal` paketine dışarıdan erişilemez; bağımlılıklar `package-info.java` içinde
deklare edilir. `ModularityTests` bunu CI'da kırar — testi devre dışı bırakma, tasarımı düzelt.

**Modüller arası çağrı yok, olay var.** Yan etkiler outbox üzerinden (ADR-0003).
`ordering`, `dispatch`/`tracking`/`negotiation`'a bağımlı olamaz.

**Güven panosuna ham veri yazılmaz.** `public_feed_entries` gizlilik filtresinden geçmiş
projeksiyondur (ADR-0008): 30 dk gecikme, ilçe düzeyi, k-anonimlik, rıza kontrolü.
`public:board` WS kanalına yalnızca `trustboard` modülü yayın yapar.

**Fiyat anlık görüntüsü değişmez.** `Quote.breakdown` siparişe kopyalanır; tarife
değişse bile geçmiş fiyat yeniden hesaplanmaz.

**Harita çağrıları backend'den geçer.** Google Maps anahtarı istemciye gömülmez —
maliyet kontrolü ve anahtar güvenliği (docs/03).

**Kişisel veri Türkiye'de kalır** (ADR-0005). Yurt dışı servislere (Maps, Sentry, FCM)
kişisel veri gönderilmez.

## Yapı

```
apps/web            Next.js 15 — pazarlama + güven panosu + müşteri portalı
services/api        Spring Boot 3.4 / Java 21 — modüler monolit
packages/contracts  OpenAPI'dan üretilen TS tipleri
packages/shared     Ortak sabitler ve yardımcılar
infra/docker        Local geliştirme yığını
docs/               Gereksinimler, mimari, ADR'ler
```

## Bilinen ortam sorunları

**macOS + Docker Desktop 29:** Testcontainers'ın kullandığı docker-java varsayılan olarak
API 1.32 gönderiyor, Docker Engine 29 ise minimum 1.44 istiyor ve 400 dönüyor.
`services/api/build.gradle.kts` içindeki test task'ı `api.version` sistem özelliğini ve
soket yolunu ayarlayarak bunu çözüyor. Linux CI'da bu blok devre dışı kalır.

**`next build` ile `next dev` aynı anda çalıştırılmaz.** İkisi de `apps/web/.next`
dizinini kullanıyor; eşzamanlı çalıştırınca Turbopack panic atıp dev sunucuyu 500'e
düşürüyor. Build almadan önce dev sunucuyu durdur.

**Spring Boot sürümü:** Plan Boot 4 diyordu; Faz 0 uyumluluk doğrulamasında springdoc,
Modulith ve Redisson için Boot 4 uyumlu sürümler henüz stabil olmadığından **3.4 LTS**
ile başlandı (docs/07, Faz 0 çıkış kriteri). Ekosistem olgunlaşınca yükseltilecek.
