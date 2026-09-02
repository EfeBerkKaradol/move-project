# 02 — Sistem Mimarisi

## 1. Genel bakış

```
┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐
│  web        │  │ admin-web    │  │ mobile-      │  │ mobile-     │
│  (Next.js)  │  │ (Next.js)    │  │ customer     │  │ driver      │
│             │  │              │  │ (Expo RN)    │  │ (Expo RN)   │
└──────┬──────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘
       │  HTTPS/REST + WebSocket          │                 │
       └────────────────┬─────────────────┴─────────────────┘
                        │
                ┌───────▼────────┐        ┌──────────────┐
                │  API Gateway   │◄──────►│  Keycloak    │
                │  (Ingress/NGINX)│  OIDC  │  (kimlik)    │
                └───────┬────────┘        └──────────────┘
                        │
        ┌───────────────▼────────────────────────────┐
        │      services/api — Spring Boot 4          │
        │      (Spring Modulith · modüler monolit)   │
        │ identity │ catalog │ pricing  │ ordering  │
        │ dispatch │ tracking│ negotiation│ trustboard│
        │ fleet    │ rating  │ notify   │ payment    │
        │ geo      │ admin   │          │            │
        └───┬─────────────┬──────────────┬───────────┘
            │             │              │
    ┌───────▼──────┐ ┌────▼─────┐ ┌──────▼────────┐
    │ PostgreSQL16 │ │ Redis 7  │ │ Object Storage│
    │  + PostGIS   │ │ GEO/PubSub│ │ (S3 uyumlu)  │
    └──────────────┘ └──────────┘ └───────────────┘
            │
     ┌──────▼──────────────────────────────────┐
     │ Dış servisler                            │
     │ Google Maps · SMS (Netgsm/İleti Merkezi) │
     │ FCM/APNs · iyzico (Faz 6) · e-Arşiv      │
     └──────────────────────────────────────────┘
```

## 2. Neden modüler monolit?

Tek geliştiriciyle başlayan, domain sınırları henüz oturmamış bir üründe mikroservis
erken karmaşıklıktır: dağıtık transaction, servis keşfi, ayrı CI/CD hattı, debug zorluğu.

**Spring Modulith** ile tek deploy edilebilir uygulama içinde sert modül sınırları çiziyoruz:
- Her modül kendi paketinde, `package-info.java` ile bağımlılıkları deklare edilmiş
- Modüller arası iletişim **yalnızca** açık API arayüzü veya domain event üzerinden
- `ArchUnit` + Modulith testleri sınır ihlallerini CI'da yakalar
- Bir modül gerçekten ayrı ölçeklenmesi gerektiğinde (ilk aday: `tracking`) sınırı zaten
  hazır olduğu için ayrı servise çıkarmak mekanik bir iş olur

Bkz. [ADR-0002](adr/0002-moduler-monolit.md).

## 3. Modüller ve sorumlulukları

| Modül | Sorumluluk | Dışa açtığı olaylar |
|---|---|---|
| `identity` | Kullanıcı, hesap, rol, OTP, KVKK rıza kayıtları | `UserRegistered`, `AccountDeleted` |
| `fleet` | Sürücü, araç, belge, filo, onay durumu, çalışma bölgesi | `DriverApproved`, `DriverSuspended` |
| `geo` | Adres çözümleme, geocoding, mesafe/rota, bölge (zone) tanımları | — |
| `catalog` | Araç tipleri, yük kategorileri, eşya kataloğu, **araç öneri motoru** | — |
| `pricing` | Birim fiyat kartları, komisyon oranı, quote hesaplama, surge, kupon | `QuoteIssued` |
| `ordering` | Sipariş yaşam döngüsü, durum makinesi, iptal politikası | `OrderPlaced`, `OrderCancelled`, `OrderCompleted` |
| `dispatch` | Sürücü havuzu, aday skorlama, teklif dalgaları, atama | `DriverAssigned`, `DispatchFailed` |
| `tracking` | Konum ingest, canlı yayın, ETA, rota kaydı, POD | `TripStageChanged`, `TripDelivered` |
| `negotiation` | Pazarlık oturumu, teklif turları, taban/tavan politikası, kabul | `NegotiationAccepted`, `NegotiationFailed` |
| `trustboard` | Güven panosu projeksiyonu, gizlilik filtresi, moderasyon, toplu sayaçlar | — |
| `rating` | Puanlama, sürücü kalite metrikleri, uyuşmazlık | `RatingSubmitted` |
| `notification` | Push/SMS/e-posta gönderimi, şablonlar, tercihler | — |
| `payment` | Ödeme, cüzdan, hakediş, fatura (**Faz 6**) | `PaymentCaptured`, `PayoutIssued` |
| `admin` | Operasyon işlemleri, audit log, raporlama | — |

**Bağımlılık yönü kuralı:** `dispatch`, `tracking` ve `negotiation`, `ordering`'in
olaylarını dinler ama `ordering` bunlara doğrudan bağımlı olamaz. `notification` ve
`trustboard` hiçbir modüle bağımlı değildir, sadece olay tüketir. `catalog` yalnızca
okunur — hiçbir modülün durumunu değiştirmez, bu yüzden herkes ona bağımlı olabilir.
Bu yön kuralı, ileride ayrıştırmayı garanti eder.

**`trustboard` özel bir konumda:** Herkese açık trafiği karşılıyor ama çekirdek işlem
tablolarına hiç dokunmuyor. Kendi denormalize projeksiyonundan okuyor. Ana sayfa
trafiği artsa bile sipariş akışını etkilemiyor — bu, modülün varlık sebebi.

## 4. Modüller arası iletişim: Transactional Outbox

Sipariş oluşturma gibi bir işlem hem veritabanına yazmalı hem de dispatch'i tetiklemeli.
Bunu aynı transaction içinde güvence altına almak için **outbox** kalıbı:

1. `ordering` modülü `orders` satırını ve `outbox_event` satırını **tek transaction'da** yazar
2. Bir relay (Spring Modulith Event Publication Registry veya kendi scheduler'ımız) outbox'ı
   okur ve olayı yayınlar
3. Tüketici modül işini yapar; başarısızsa yeniden denenir (exponential backoff, DLQ)

MVP'de olay taşıyıcısı **veritabanı + in-process publisher**. Hacim arttığında aynı outbox
satırlarını Kafka'ya iten bir relay eklenir — üretici kod değişmez. Bkz. [ADR-0003](adr/0003-mesajlasma.md).

## 5. Dispatch (eşleştirme) tasarımı

### Sürücü konum indeksi
Aktif sürücülerin canlı konumu **Redis GEO** yapısında tutulur:

```
GEOADD drivers:active:<vehicleType> <lon> <lat> <driverId>
EXPIRE ile 60 sn TTL — heartbeat kesilirse sürücü otomatik havuzdan düşer
HSET driver:state:<driverId> status IDLE|ON_TRIP rating 4.8 acceptRate 0.72
```

Postgres/PostGIS kalıcı ve analitik sorgular için; **sıcak yol Redis** üzerinden gider.
Sebep: saniyede binlerce yazma Postgres'i gereksiz yorar, GEOSEARCH sub-milisaniye döner.

### Aday seçimi ve skorlama
```
adaylar = GEOSEARCH(merkez=alışNoktası, yarıçap=R, aracTipi)
        ∩ status == IDLE
        ∩ belgeler geçerli ∧ puan ≥ eşik ∧ bölge uyumlu

skor = w1·(1/ETA) + w2·rating + w3·acceptRate + w4·bosBeklemeSuresi
       (w4 adalet bileşeni: uzun süre iş almamış sürücüyü öne alır)
```

ETA için Google Routes API'ye toplu (matrix) çağrı — yalnızca ilk 10 aday için,
maliyet kontrolü amacıyla. Daha uzak adaylarda kuş uçuşu mesafe yeterli.

### Teklif dalgaları
```
Dalga 1: en iyi 3 aday, 2 km yarıçap, 15 sn
Dalga 2: sonraki 5 aday, 5 km, 15 sn
Dalga 3: 10 km, 20 sn
Dalga 4: 20 km, 20 sn
→ 5 dk sonunda atama yoksa DISPATCH_FAILED, kullanıcıya seçenek sunulur
```

### Çift atama koruması
Sürücü "kabul et" dediğinde:
1. Redisson distributed lock: `lock:order:<orderId>` (kısa TTL)
2. `UPDATE orders SET driver_id=?, status='DRIVER_ASSIGNED', version=version+1
   WHERE id=? AND status='SEARCHING_DRIVER' AND version=?`
3. Etkilenen satır 0 ise → sürücüye "iş başkası tarafından alındı" döner

Optimistic locking + lock kombinasyonu; ikisi de tek başına yeterli değil.

## 6. Canlı takip (tracking) tasarımı

### Konum akışı
```
Sürücü app                Backend                    Müşteri
   │                         │                          │
   ├─ konum batch (WS) ─────►│                          │
   │  (3-5 sn, hareket hâlinde;                         │
   │   15-30 sn duraklamada;                            │
   │   çevrimdışıysa kuyrukta)                          │
   │                         ├─ doğrula (hız/sıçrama    │
   │                         │  filtresi, mock GPS)     │
   │                         ├─ Redis: son konum + TTL  │
   │                         ├─ Redis Pub/Sub yayın ────┼──► WS abonelerine
   │                         ├─ ETA yeniden hesapla     │
   │                         └─ rota tamponu → periyodik │
   │                            Postgres/PostGIS flush   │
```

**Neden Redis Pub/Sub:** API birden çok pod'da çalıştığında sürücünün bağlandığı pod ile
müşterinin bağlandığı pod farklı olabilir. Pub/Sub bu fan-out'u çözer.

**Yazma yükü kontrolü:** Her konum Postgres'e yazılmaz. Redis'te halka tampon tutulur,
30 saniyede bir veya taşıma bitiminde PostGIS `LINESTRING` olarak tek satırda kaydedilir.

**Transport kararı:** MVP'de WebSocket (STOMP değil, düz WS + JSON — mobil tarafta daha basit).
Fallback: SSE, en son 5 sn polling. Bkz. [ADR-0004](adr/0004-realtime-transport.md).

**Alıcı takip linki:** `GET /t/{signedToken}` — HMAC imzalı, siparişe bağlı, teslimden 2 saat
sonra geçersiz. Hiçbir kişisel veri göstermez: sadece sürücü konumu, ETA, araç tipi, ad-baş harfi.

### ETA hesabı
- İlk ETA: Google Routes API (trafik dahil)
- Güncelleme: her 60 sn'de bir Routes çağrısı **değil** — maliyet patlar.
  Bunun yerine kalan rota üzerinde konum ilerlemesine göre lokal interpolasyon,
  rotadan sapma veya %20'den fazla sapma tespitinde yeniden Routes çağrısı.

## 7. Monorepo yapısı

```
move-project/
├── apps/
│   ├── web/                 # Next.js 15 — pazarlama + müşteri portalı
│   ├── admin-web/           # Next.js 15 — operasyon paneli
│   ├── mobile-customer/     # Expo RN
│   └── mobile-driver/       # Expo RN
├── services/
│   └── api/                 # Spring Boot 4 (Gradle, Java 21)
│       └── src/main/java/com/move/api/
│           ├── identity/  fleet/  geo/  catalog/  pricing/
│           ├── ordering/  dispatch/  tracking/  negotiation/
│           ├── trustboard/  rating/  notification/  payment/  admin/
│           └── shared/      # ortak value object, hata, config
├── packages/
│   ├── contracts/           # OpenAPI'dan üretilen TS tipleri + Zod şemaları
│   ├── ui/                  # web tasarım sistemi (shadcn tabanlı)
│   └── shared/              # ortak sabitler, i18n mesajları, yardımcılar
├── infra/
│   ├── docker/              # local compose: postgres+postgis, redis, keycloak, minio, mailhog
│   ├── k8s/                 # prod manifestleri / Helm
│   └── terraform/           # bulut kaynakları
└── docs/
```

**Tip güvenliği zinciri:** Spring `springdoc-openapi` → `openapi.json` → `openapi-typescript`
→ `packages/contracts` → web + mobil. Backend bir alanı değiştirdiğinde frontend **derleme
zamanında** kırılır. Bu üretim aşaması CI'da otomatik, üretilen dosyalar commit edilir.

## 8. Ortamlar

| Ortam | Amaç | Veri |
|---|---|---|
| `local` | Docker Compose ile tam yığın | Seed veri, sahte SMS/ödeme |
| `staging` | Entegrasyon + QA | Anonim veri, sağlayıcıların test modu |
| `production` | Canlı | — |

Local'de dış servisler için sahte (stub) adaptörler: SMS konsola yazar, ödeme her zaman başarılı,
Google Maps yanıtları önbelleklenmiş fixture'lardan gelir (kota yakmamak için).

## 9. Ölçekleme yolu

| Aşama | Tetikleyici | Aksiyon |
|---|---|---|
| 1 | Başlangıç | Tek API pod'u, tek Postgres, tek Redis |
| 2 | > 500 eşzamanlı takip | API yatay ölçek (3+ pod), Redis Pub/Sub zaten hazır |
| 3 | > 5.000 eşzamanlı takip | `tracking` modülünü ayrı servise çıkar |
| 4 | Konum tablosu şişer | TimescaleDB hypertable veya ayrı zaman serisi deposu |
| 5 | Olay hacmi artar | Outbox relay'i Kafka'ya yönlendir |
| 6 | Çok bölgeli operasyon | Postgres read replica + bölgesel Redis |
