# 05 — API Sözleşmesi

> ✅ işaretli uçlar kurulu ve çalışıyor; işaretsizler sonraki fazlarda gelecek.
>
> Bu doküman API'nin **şeklini** tanımlar. Tek doğruluk kaynağı `springdoc-openapi` ile
> koddan üretilen `openapi.json`'dır; TypeScript tipleri oradan otomatik üretilir.

## 1. Genel kurallar

| Konu | Kural |
|---|---|
| Taban yol | `/api/v1` |
| Kimlik | `Authorization: Bearer <JWT>` (Keycloak) |
| İçerik tipi | `application/json; charset=utf-8` |
| Dil | `Accept-Language: tr-TR` — hata mesajları buna göre yerelleşir |
| İzleme | `X-Request-Id` (yoksa sunucu üretir, yanıtta döner) |
| Tekrar koruması | Yazma uçlarında `Idempotency-Key` (zorunlu: sipariş, ödeme) |
| Sayfalama | `?page=0&size=20&sort=createdAt,desc` — yanıt: `{content, page, size, totalElements, totalPages}` |
| Para | `{"amount": "249.50", "currency": "TRY"}` — string, ondalık kaybı olmasın |
| Zaman | ISO-8601 UTC: `2026-09-02T14:30:00Z` |
| Koordinat | `{"lat": 41.0082, "lng": 28.9784}` |

## 2. Hata modeli — RFC 9457 (Problem Details)

```json
{
  "type": "https://api.turmove.com/errors/quote-expired",
  "title": "Fiyat teklifi süresi doldu",
  "status": 409,
  "detail": "Bu teklif 15 dakika önce geçerliliğini yitirdi. Lütfen yeni fiyat alın.",
  "instance": "/api/v1/orders",
  "code": "QUOTE_EXPIRED",
  "requestId": "01J8X...",
  "errors": [
    { "field": "stops[1].location", "code": "OUT_OF_SERVICE_AREA",
      "message": "Bu adres henüz hizmet bölgemizde değil." }
  ]
}
```

`code` alanı makine tarafından okunur ve istemci tarafında switch'lenir; `detail`
kullanıcıya gösterilebilir Türkçe metindir.

**Standart kodlar:** `VALIDATION_FAILED` · `UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` ·
`QUOTE_EXPIRED` · `ORDER_INVALID_STATE` · `DRIVER_ALREADY_ASSIGNED` ·
`OUT_OF_SERVICE_AREA` · `NO_DRIVER_AVAILABLE` · `RATE_LIMITED` · `IDEMPOTENCY_CONFLICT` ·
`DOCUMENT_EXPIRED` · `PAYMENT_FAILED` · `OFFER_BELOW_FLOOR` · `OFFER_ABOVE_CEILING` ·
`NEGOTIATION_CLOSED` · `NEGOTIATION_ROUND_LIMIT` · `VEHICLE_TOO_SMALL` · `NO_SUITABLE_VEHICLE` ·
`CONSENT_REQUIRED`

## 3. Public uçlar (kimlik gerektirmez)

```
GET  /api/v1/public/vehicle-types                 araç tipleri + kapasiteler  ✅ kuruldu
GET  /api/v1/public/cargo-categories              8 kategori + ölçek ipuçları  ✅ kuruldu
GET  /api/v1/public/cargo-items?category=         eşya kataloğu  ✅ kuruldu
GET  /api/v1/public/cargo-presets?category=       kategori bazlı hazır tahminler  ✅ kuruldu
POST /api/v1/public/vehicle-recommendation        yük beyanı → araç önerisi  ✅ kuruldu
GET  /api/v1/public/districts                     hizmet verilen ilçeler  ✅ kuruldu
GET  /api/v1/public/extra-services                ek hizmetler ve ücretleri  ✅ kuruldu
POST /api/v1/public/quotes                        fiyat hesapla (giriş gerekmez)  ✅ kuruldu
GET  /api/v1/public/quotes/{id}                   teklifi getir  ⏳ Faz 1 kalanı
GET  /api/v1/public/track/{trackingToken}         alıcı takip verisi (imzalı token)
WS   /ws/track/{trackingToken}                    alıcı canlı konum akışı
GET  /api/v1/public/content/cities/{slug}         SEO landing içeriği
POST /api/v1/public/driver-applications           nakliyeci ön başvurusu

# Güven panosu — kimlik gerektirmez, en çok trafik alan uçlar
GET  /api/v1/public/board/feed                    ?city=&category=&vehicleType=&minRating=&cursor=
GET  /api/v1/public/board/counters                canlı sayaçlar (şu an yolda, bugün tamamlanan)
GET  /api/v1/public/board/stats                   ?city=  puan dağılımı, zamanında teslim, pazarlık tasarrufu
WS   /ws/public/board                             yeni tamamlanan taşıma akışı
```

### `POST /public/vehicle-recommendation`
```json
// istek
{
  "categoryCode": "TEKIL_ESYA",
  "items": [
    { "cargoItemCode": "BUZDOLABI_NOFROST", "quantity": 1 },
    { "cargoItemCode": "CAMASIR_MAKINESI",  "quantity": 1 }
  ],
  "packageCount": 8,
  "stops": [ { "floor": 3, "hasElevator": false }, { "floor": 1, "hasElevator": true } ]
}

// yanıt 200
{
  "estimate": { "volumeM3": 2.64, "weightKg": 269, "longestEdgeCm": 180 },
  "primary": {
    "vehicleTypeCode": "TRANSPORTER",
    "fillRatePercent": 41,
    "reason": "Yükünüz 2,64 m³ ve en uzun parça 180 cm.",
    "whyNotSmaller": {
      "vehicleTypeCode": "DOBLO",
      "reason": "180 cm'lik buzdolabı 170 cm'lik kasaya girmiyor."
    }
  },
  "alternatives": [
    { "vehicleTypeCode": "TRANSIT", "fillRatePercent": 24,
      "reason": "Daha rahat yükleme, ek boşluk." }
  ],
  "suggestedExtras": [
    { "code": "PORTERAGE", "reason": "Buzdolabı 90 kg, alışta asansör yok." }
  ]
}
```

### `POST /public/quotes`
```json
// istek
{
  "serviceModel": "INSTANT",
  "vehicleTypeCode": "TRANSPORTER",
  "cargoDeclaration": {
    "categoryCode": "TEKIL_ESYA",
    "items": [{ "cargoItemCode": "BUZDOLABI_NOFROST", "quantity": 1 }],
    "estimatedVolumeM3": 2.64,
    "estimatedWeightKg": 269
  },
  "stops": [
    { "type": "PICKUP",  "location": {"lat": 41.0082, "lng": 28.9784}, "floor": 3, "hasElevator": false },
    { "type": "DROPOFF", "location": {"lat": 40.9923, "lng": 29.0244}, "floor": 1, "hasElevator": true }
  ],
  "extraServices": ["PORTERAGE"],
  "scheduledAt": null,
  "couponCode": "ILKTASIMA"
}

// yanıt 200
{
  "quoteId": "qt_01J8X...",
  "expiresAt": "2026-09-02T14:45:00Z",
  "distanceMeters": 14320,
  "durationSeconds": 1980,
  "routePolyline": "ku~vF...",
  "breakdown": [
    { "code": "BASE_FARE",     "label": "Taban ücret",        "amount": "180.00" },
    { "code": "DISTANCE",      "label": "Mesafe (14,3 km)",   "amount": "143.00" },
    { "code": "DURATION",      "label": "Süre (33 dk)",       "amount": "49.50" },
    { "code": "PORTERAGE",     "label": "Hamaliye",           "amount": "120.00" },
    { "code": "NO_ELEVATOR",   "label": "Asansörsüz 3. kat",  "amount": "90.00" },
    { "code": "SURGE",         "label": "Yoğunluk (x1.2)",    "amount": "116.50" },
    { "code": "COUPON",        "label": "İndirim kuponu",     "amount": "-70.00" },
    { "code": "COMMISSION",    "label": "Platform komisyonu · komisyonsuz dönem",
      "amount": "0.00", "note": "2027 ilk çeyreğine kadar komisyon alınmıyor." }
  ],
  "negotiable": true,
  "floorPrice": { "amount": "440.30", "currency": "TRY" },
  "totalAmount": { "amount": "629.00", "currency": "TRY" },
  "surgeMultiplier": "1.2",
  "signature": "v1:hmac..."
}
```

## 4. Müşteri uçları

```
# Kimlik
POST /api/v1/auth/otp/request                     { phone }  → rate limited
POST /api/v1/auth/otp/verify                      { phone, code } → token seti
POST /api/v1/auth/refresh
POST /api/v1/auth/logout

# Profil
GET    /api/v1/me
PATCH  /api/v1/me
DELETE /api/v1/me                                 KVKK silme talebi
GET    /api/v1/me/export                          KVKK veri indirme
GET    /api/v1/me/addresses
POST   /api/v1/me/addresses
PATCH  /api/v1/me/addresses/{id}
DELETE /api/v1/me/addresses/{id}
GET    /api/v1/me/notification-preferences
PUT    /api/v1/me/notification-preferences

# Sipariş
POST /api/v1/orders                               { quoteId, ... }  Idempotency-Key zorunlu
GET  /api/v1/orders                                ?status=&page=
GET  /api/v1/orders/{id}
POST /api/v1/orders/{id}/cancel                   { reason }
GET  /api/v1/orders/{id}/tracking                  anlık durum + son konum
POST /api/v1/orders/{id}/rating                   { score, tags, comment, publishComment }
POST /api/v1/orders/{id}/disputes
GET  /api/v1/orders/{id}/invoice                   (Faz 6)

# Pazarlık
POST /api/v1/orders/{id}/negotiation              pazarlık başlat { amount }  Idempotency-Key
GET  /api/v1/orders/{id}/negotiation              durum + gelen teklifler
POST /api/v1/orders/{id}/negotiation/offers       son teklif ver { amount }
POST /api/v1/orders/{id}/negotiation/offers/{offerId}/accept
POST /api/v1/orders/{id}/negotiation/fallback     önerilen fiyata dön → SEARCHING_DRIVER
POST /api/v1/orders/{id}/negotiation/cancel

# Gizlilik ve güven panosu
GET    /api/v1/me/board-entries                   panoda görünen kendi kayıtlarım
DELETE /api/v1/me/board-entries/{id}              kaydımı panodan kaldır
GET    /api/v1/me/consents                        rıza geçmişi
PUT    /api/v1/me/consents/{type}                 { granted: true|false }

# Dosya yükleme (POD, eşya fotoğrafı, belge)
POST /api/v1/uploads/presign                      { fileName, contentType, purpose }
                                                  → { uploadUrl, fileKey, expiresAt }
```

### `POST /orders`
```json
// istek
{
  "quoteId": "qt_01J8X...",
  "signature": "v1:hmac...",
  "stops": [
    { "type": "PICKUP", "formattedAddress": "Kadıköy, İstanbul", "buildingNo": "12",
      "floor": 3, "apartmentNo": "7", "contactName": "Efe K.", "contactPhone": "+905...",
      "note": "Zil çalışmıyor, arayın" }
  ],
  "items": [ { "category": "FURNITURE", "description": "3'lü koltuk", "quantity": 1 } ],
  "recipientName": "Ayşe Y.",
  "recipientPhone": "+905...",
  "note": "Ürün kırılgan"
}

// yanıt 201
{
  "orderId": "ord_01J8X...",
  "orderNumber": "MV-2026-000123",
  "status": "SEARCHING_DRIVER",
  "trackingUrl": "https://turmove.com/t/8fK2...",
  "estimatedPickupAt": "2026-09-02T15:05:00Z"
}
```

## 5. Sürücü uçları

```
GET  /api/v1/driver/me                            profil + onay durumu + metrikler
POST /api/v1/driver/documents                     belge yükleme
GET  /api/v1/driver/documents
POST /api/v1/driver/status                        { status: ONLINE|OFFLINE }
POST /api/v1/driver/location                      toplu konum (offline kuyruk boşaltma)
GET  /api/v1/driver/offers                        bekleyen iş teklifleri (anlık dispatch)
POST /api/v1/driver/offers/{id}/accept            → 409 DRIVER_ALREADY_ASSIGNED olabilir
POST /api/v1/driver/offers/{id}/reject

# Pazarlık (ayrı sekme — dispatch teklifiyle karıştırılmamalı)
GET  /api/v1/driver/negotiations                  açık pazarlık teklifleri
GET  /api/v1/driver/negotiations/{id}             detay + kendi ortalama kazancı + rakip sayısı
POST /api/v1/driver/negotiations/{id}/accept      müşteri teklifini kabul et
POST /api/v1/driver/negotiations/{id}/counter     { amount, reasonCode }
POST /api/v1/driver/negotiations/{id}/pass
GET  /api/v1/driver/trips/active
POST /api/v1/driver/trips/{id}/advance            { stage, occurredAt, location }
POST /api/v1/driver/trips/{id}/proof-of-delivery  { photoKeys, signatureKey, receivedByName }
POST /api/v1/driver/trips/{id}/cancel             { reason }
POST /api/v1/driver/trips/{id}/cargo-feedback     { verdict, note }  öneri kalibrasyonu
GET  /api/v1/driver/earnings                      ?period=  (Faz 6)
GET  /api/v1/driver/trips                         geçmiş
```

### `POST /driver/location` — toplu gönderim
```json
{
  "points": [
    { "lat": 41.0082, "lng": 28.9784, "heading": 145, "speed": 12.4,
      "accuracy": 8, "recordedAt": "2026-09-02T14:30:05Z" },
    { "lat": 41.0079, "lng": 28.9791, "heading": 148, "speed": 13.1,
      "accuracy": 6, "recordedAt": "2026-09-02T14:30:10Z" }
  ],
  "tripId": "trp_01J8X...",
  "batteryLevel": 62
}
```
Sunucu tarafı doğrulama: zaman damgası sırası, imkânsız hız (>200 km/h), doğruluk eşiği
(>100 m ise reddet), sahte GPS heuristikleri. Geçersiz noktalar sessizce atılır, loglanır.

## 6. Filo / firma uçları

```
GET  /api/v1/fleet/drivers
POST /api/v1/fleet/drivers/invite
GET  /api/v1/fleet/vehicles
POST /api/v1/fleet/vehicles
GET  /api/v1/fleet/orders                         filoya atanmış işler
GET  /api/v1/fleet/rate-cards                     birim fiyat sözleşmesi (salt okunur)
GET  /api/v1/fleet/reports
```

## 7. Admin uçları

```
GET   /api/v1/admin/orders                        gelişmiş filtre
POST  /api/v1/admin/orders/{id}/assign-driver     manuel atama
POST  /api/v1/admin/orders/{id}/cancel
GET   /api/v1/admin/live-map                      aktif sürücü + sipariş anlık görüntüsü
GET   /api/v1/admin/drivers?status=PENDING        onay kuyruğu
POST  /api/v1/admin/drivers/{id}/approve
POST  /api/v1/admin/drivers/{id}/reject           { reason }
POST  /api/v1/admin/drivers/{id}/suspend
GET   /api/v1/admin/rate-cards                    ?carrier=&city=&vehicleType=
POST  /api/v1/admin/rate-cards                    yeni versiyon oluşturur
GET   /api/v1/admin/commission
POST  /api/v1/admin/commission                    yeni oran — 30 gün duyuru zorunlu
GET   /api/v1/admin/negotiation-policies
POST  /api/v1/admin/negotiation-policies          taban/tavan/tur/süre
GET   /api/v1/admin/catalog/vehicle-types
PUT   /api/v1/admin/catalog/vehicle-types/{code}  kapasite güncelleme
GET   /api/v1/admin/catalog/cargo-items
POST  /api/v1/admin/catalog/cargo-items
GET   /api/v1/admin/board/moderation-queue        yayın bekleyen pano kayıtları
POST  /api/v1/admin/board/entries/{id}/approve
POST  /api/v1/admin/board/entries/{id}/hide       { reason }
POST  /api/v1/admin/board/entries/{id}/reply      { text }  düşük puana operasyon yanıtı
GET   /api/v1/admin/zones
POST  /api/v1/admin/zones
GET   /api/v1/admin/surge-rules
POST  /api/v1/admin/coupons
GET   /api/v1/admin/disputes
POST  /api/v1/admin/disputes/{id}/resolve
GET   /api/v1/admin/reports/{reportType}          hacim · GMV · öneri doğruluğu · pazarlık dönüşümü
GET   /api/v1/admin/audit-log
```

## 8. WebSocket kanalları

Bağlantı: `wss://api.turmove.com/ws?token=<JWT>`
Alıcı takibi için: `wss://api.turmove.com/ws/track/{trackingToken}` (JWT gerekmez)

### Mesaj zarfı
```json
{ "type": "location.update", "channel": "order:ord_01J8X...",
  "ts": "2026-09-02T14:30:10Z", "payload": { } }
```

### Sunucu → İstemci
| `type` | Kime | İçerik |
|---|---|---|
| `order.status_changed` | müşteri | yeni durum, zaman |
| `driver.assigned` | müşteri | sürücü adı, foto, puan, araç, plaka, maskeli telefon |
| `location.update` | müşteri, alıcı | lat/lng, heading, ETA saniye |
| `eta.updated` | müşteri, alıcı | yeni ETA + gecikme nedeni |
| `trip.stage_changed` | müşteri, alıcı | aşama |
| `dispatch.searching` | müşteri | dalga no, aranan sürücü sayısı |
| `dispatch.failed` | müşteri | neden + öneriler |
| `offer.new` | sürücü | sipariş özeti, mesafe, kazanç, kalan süre |
| `offer.expired` | sürücü | teklif id |
| `negotiation.offer` | sürücü | müşteri teklifi, referans fiyat, rakip sayısı, kalan süre |
| `negotiation.counter` | müşteri | nakliyeci karşı teklifi (fiyat, puan, ETA, gerekçe) |
| `negotiation.closed` | ikisi | sonuç: kabul / süre doldu / iptal |
| `board.entry` | herkes (public) | panoya yeni düşen tamamlanmış taşıma |
| `board.counters` | herkes (public) | canlı sayaç güncellemesi |
| `chat.message` | ikisi | mesaj |

### İstemci → Sunucu
| `type` | Kimden | İçerik |
|---|---|---|
| `subscribe` / `unsubscribe` | hepsi | kanal adı |
| `location.batch` | sürücü | konum dizisi |
| `heartbeat` | hepsi | 30 sn'de bir; yanıtsız kalırsa bağlantı kapatılır |
| `chat.message` | ikisi | metin |

**Yetkilendirme:** `subscribe` isteğinde sunucu kaynağın sahipliğini doğrular — kullanıcı
yalnızca kendi siparişinin kanalına abone olabilir. Bu kontrol atlanırsa herkes herkesin
konumunu izler; bu uçtaki en kritik güvenlik kontrolüdür.

`public:board` kanalları bilinçli olarak **kimliksizdir** ve yalnızca gizlilik filtresinden
geçmiş, yayınlanmış kayıtları taşır. Bu kanala ham sipariş verisi **hiçbir koşulda** yazılmaz —
`trustboard` modülü dışında hiçbir modülün bu kanala yayın yapma yetkisi yoktur.

**Yeniden bağlanma:** İstemci exponential backoff (1s, 2s, 4s, 8s… max 30s) + jitter ile
yeniden bağlanır, bağlanınca son bilinen durumu REST'ten çeker (`GET /orders/{id}/tracking`)
ve kanala yeniden abone olur.

## 9. Hız sınırları (rate limit)

| Uç | Limit |
|---|---|
| `POST /auth/otp/request` | 3 / 15 dk / telefon · 20 / saat / IP |
| `POST /auth/otp/verify` | 5 deneme / kod |
| `POST /public/quotes` | 30 / dk / IP · 120 / dk / kullanıcı |
| `POST /orders` | 10 / dk / kullanıcı |
| `POST /orders/{id}/negotiation` | 5 / saat / kullanıcı |
| `POST /public/vehicle-recommendation` | 60 / dk / IP |
| `GET /public/board/*` | 120 / dk / IP (önbellekli, ucuz) |
| `POST /driver/location` | 60 / dk / sürücü (toplu gönderim zaten seyreltiyor) |
| Genel API | 600 / dk / kullanıcı |

Aşımda `429` + `Retry-After` başlığı + `RATE_LIMITED` kodu döner.

## 10. Sürümleme

- URL'de major sürüm (`/api/v1`). Kırıcı değişiklik = `/api/v2`.
- Geriye uyumlu eklemeler (yeni opsiyonel alan) sürüm artırmaz.
- Bir alan kaldırılacaksa: önce `deprecated` işaretle, OpenAPI'de belirt,
  en az 2 mobil sürüm boyunca desteklemeye devam et. **Mobil istemciler anında
  güncellenmez** — bu kural ihlal edilirse kullanıcıların uygulaması kırılır.
- Zorunlu güncelleme için: `GET /api/v1/public/app-config` → `minSupportedVersion`
