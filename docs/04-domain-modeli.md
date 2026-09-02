# 04 — Domain Modeli

## 1. Varlık ilişki haritası

```
User ──1:1─► CustomerProfile ──1:N─► SavedAddress
  │                  └──1:N─► Order
  ├──1:1─► DriverProfile ──1:N─► DriverDocument
  │              │         └──N:1─► Fleet
  │              └──1:N─► Vehicle
  └──1:1─► CompanyAccount (kurumsal / nakliyat firması)

Order ──1:N─► OrderStop (alış, ara durak, teslim)
  ├──1:1─► Quote (fiyat anlık görüntüsü)
  ├──1:1─► CargoDeclaration ──1:N─► CargoDeclarationItem
  ├──1:1─► Trip ──1:N─► TripEvent (aşama geçişleri)
  │           ├──1:N─► RouteSegment
  │           └──1:1─► ProofOfDelivery
  ├──1:N─► DispatchOffer (nakliyeciye giden teklifler)
  ├──0:1─► Negotiation ──1:N─► NegotiationOffer
  ├──0:1─► PublicFeedEntry (rıza varsa, tamamlandıktan 30 dk sonra)
  ├──1:1─► Payment (Faz 6)
  └──1:N─► Rating

Katalog:  VehicleType · CargoCategory · CargoItem
Fiyat:    RateCard ──N:1─► Carrier?   ·  PlatformCommission · Zone · SurgeRule · Coupon
Pazarlık: NegotiationPolicy
Pano:     PublicFeedEntry · PublicBoardStats
```

## 2. Ana varlıklar

### User / profiller
```
User                id, keycloakId, phone(unique), email, status, locale,
                    createdAt, deletedAt
CustomerProfile     userId, fullName, type(INDIVIDUAL|CORPORATE), companyAccountId?
DriverProfile       userId, fullName, status(PENDING|APPROVED|SUSPENDED|REJECTED),
                    carrierId?, rating, acceptanceRate, cancellationRate,
                    negotiationAcceptRate, completedTripCount,
                    workingZones[], onlineStatus
CompanyAccount      id, title, taxNumber, taxOffice, billingAddress,
                    type(SHIPPER|CARRIER), creditLimit, status
Carrier             companyAccountId, contractStatus(NEGOTIATING|ACTIVE|SUSPENDED),
                    contractStartsAt, contractEndsAt, cityCodes[],
                    vehicleTypeCodes[], defaultRateCardId
```

### Araç ve belgeler
```
VehicleType         code(MOTOR|DOBLO|TRANSPORTER|TRANSIT|KAMYONET|KAMYON|TIR),
                    displayName, volumeM3, payloadKg, innerLengthCm,
                    innerWidthCm, innerHeightCm, exampleLoads[],
                    iconUrl, sortOrder, active

# Kapasiteler (bkz. doküman 08) — operasyon panelinden güncellenebilir:
#   MOTOR 0,1m³/25kg/45cm · DOBLO 3/600/170 · TRANSPORTER 6,5/1000/260
#   TRANSIT 11/1500/330 · KAMYONET 20/2700/430 · KAMYON 45/10000/720
#   TIR 90/24000/1360
Vehicle             id, driverId, carrierId?, vehicleTypeCode, plate(unique),
                    brand, model, year, hasLiftgate, hasTarpaulin, status
DriverDocument      id, driverId, type(LICENSE|REGISTRATION|SRC|K_BELGESI|
                    INSURANCE|CRIMINAL_RECORD|TAX_CERTIFICATE),
                    fileKey, status(PENDING|APPROVED|REJECTED),
                    expiresAt, reviewedBy, reviewNote
```

### Yük kataloğu ve beyanı
```
CargoCategory       code(BELGE_PAKET|KOLI|TEKIL_ESYA|ODA|EV|TICARI|INSAAT|OZEL),
                    displayName, scaleHint, typicalVolumeMinM3, typicalVolumeMaxM3,
                    defaultVehicleTypeCode, detailFormType, iconUrl, sortOrder, active
CargoItem           code, categoryCode, displayName, volumeM3, weightKg,
                    longestEdgeCm, iconUrl, sortOrder, active
CargoPreset         code, categoryCode, displayName,   # "2+1, orta yoğunluk"
                    estimatedVolumeM3, estimatedWeightKg, sortOrder

CargoDeclaration    id, orderId, categoryCode, presetCode?,
                    estimatedVolumeM3, estimatedWeightKg, longestEdgeCm,
                    recommendedVehicleTypeCode, selectedVehicleTypeCode,
                    overrodeRecommendation(bool), fillRatePercent,
                    freeText?, photoKeys[]
CargoDeclarationItem id, declarationId, cargoItemCode, quantity
CargoFeedback       id, orderId, driverId,
                    verdict(ACCURATE|VEHICLE_TOO_LARGE|DID_NOT_FIT),
                    note?, createdAt      # öneri motoru kalibrasyon verisi
```

> `CargoDeclaration.selectedVehicleTypeCode` ile `recommendedVehicleTypeCode` ayrı
> tutuluyor. Kullanıcının öneriyi ne sıklıkla ezdiği, motorun güvenilirliğinin
> doğrudan ölçüsü.

### Fiyatlandırma
```
RateCard            id, carrierId?,          # null → şehir varsayılan tarifesi
                    cityCode, vehicleTypeCode, serviceModel(INSTANT|SCHEDULED),
                    baseFare, includedKm, perKmRate, perMinuteRate,
                    minimumFare, waitingFreeMinutes, waitingPerMinuteRate,
                    distanceTiers(JSONB),    # Hatay il içi kademeli mesafe için
                    version, validFrom, validTo, active
PlatformCommission  id, cityCode?, percent, version, validFrom, validTo,
                    announcementSentAt      # değişiklik 30 gün önceden duyurulur
                    # Şu an: percent = 0, validTo = 2027-03-31
SurgeRule           id, zoneId, dayOfWeek, timeRange, multiplier, active
Zone                id, cityCode, name, geometry(POLYGON, PostGIS), type
ExtraService        code(PORTERAGE|FLOOR_CARRY|NO_ELEVATOR|EXTRA_STOP|PACKAGING|
                    INSURANCE|ASSEMBLY|WAITING|TARPAULIN|STRAPPING),
                    pricingType(FIXED|PER_UNIT|PERCENT), rate
Coupon              code, discountType(PERCENT|AMOUNT), value, maxDiscount,
                    minOrderAmount, validFrom, validTo, usageLimit, perUserLimit
Quote               id, userId?, serviceModel, vehicleTypeCode, stops[],
                    cargoCategoryCode, estimatedVolumeM3, estimatedWeightKg,
                    distanceMeters, durationSeconds, routePolyline,
                    breakdown(JSONB), totalAmount, currency,
                    rateCardId, rateCardVersion, commissionVersion,
                    surgeMultiplier, couponCode?,
                    expiresAt, signature, createdAt
```

> **Kritik kural:** `Quote.breakdown` bir **anlık görüntüdür (snapshot)**. Sipariş oluşunca
> bu JSONB olduğu gibi `Order`'a kopyalanır. Tarife değişse bile geçmiş siparişin fiyatı
> asla yeniden hesaplanmaz — muhasebe ve uyuşmazlık için zorunlu.

### Sipariş ve taşıma
```
Order               id, orderNumber(insan-okunur, örn. MV-2026-000123),
                    customerId, companyAccountId?, serviceModel,
                    vehicleTypeCode, status, quoteSnapshot(JSONB),
                    totalAmount, negotiatedAmount?, negotiationId?,
                    extraServices[], note,
                    scheduledAt?, driverId?, carrierId?, vehicleId?,
                    publicBoardConsent(bool, default false),
                    recipientName, recipientPhone, trackingToken,
                    cancelledBy?, cancellationReason?, cancellationFee?,
                    version(optimistic lock), createdAt, completedAt
OrderStop           id, orderId, sequence, type(PICKUP|WAYPOINT|DROPOFF),
                    location(POINT, PostGIS), formattedAddress,
                    buildingNo, floor, apartmentNo, hasElevator,
                    contactName, contactPhone, note,
                    arrivedAt?, completedAt?
Trip                id, orderId, driverId, vehicleId, stage,
                    startedAt, deliveredAt, actualDistanceMeters,
                    actualDurationSeconds, waitingMinutes
TripEvent           id, tripId, stage, occurredAt, location(POINT),
                    source(DRIVER_APP|SYSTEM|OPS), metadata(JSONB)
RouteSegment        id, tripId, geometry(LINESTRING, PostGIS),
                    startedAt, endedAt, pointCount
ProofOfDelivery     id, tripId, photoKeys[], signatureKey?, receivedByName,
                    deliveredAt, location(POINT), note
```

### Dispatch
```
DispatchSession     id, orderId, status(RUNNING|ASSIGNED|FAILED|CANCELLED),
                    currentWave, startedAt, endedAt, failureReason?
DispatchOffer       id, sessionId, driverId, wave, score, distanceMeters,
                    etaSeconds, sentAt, expiresAt,
                    response(PENDING|ACCEPTED|REJECTED|TIMEOUT), respondedAt
DriverLocation      driverId, location(POINT), heading, speed, accuracy,
                    recordedAt, batteryLevel        # sıcak veri Redis'te,
                                                     # burası periyodik flush
```

### Pazarlık
```
Negotiation         id, orderId, status(OPEN|ACCEPTED|FAILED|CANCELLED),
                    referencePrice, floorPrice, ceilingPrice,
                    currentRound, maxRounds, expiresAt,
                    acceptedOfferId?, broadcastDriverCount,
                    createdAt, closedAt
NegotiationOffer    id, negotiationId, round,
                    party(CUSTOMER|DRIVER), driverId?,
                    amount, reasonCode?,   # NO_ELEVATOR|TRAFFIC|EMPTY_RETURN|PORTERAGE
                    status(ACTIVE|ACCEPTED|SUPERSEDED|REJECTED|EXPIRED),
                    createdAt
NegotiationPolicy   id, cityCode, vehicleTypeCode, serviceModel,
                    floorPercent, ceilingPercent, minStepAmount,
                    maxRounds, windowSeconds, version, validFrom, validTo
```

> `NegotiationOffer` içinde **serbest metin alanı yok** — yalnızca tutar ve gerekçe kodu.
> Taraflar pazarlık aşamasında iletişim bilgisi paylaşamaz, platform dışına çıkamaz.

### Güven panosu
```
PublicFeedEntry     id, orderId,            # yalnızca iç kullanım, API'de dönmez
                    fromDistrict, toDistrict, cityCode, granularity(DISTRICT|CITY),
                    vehicleTypeCode, cargoCategoryCode,
                    distanceMeters, durationMinutes,
                    rating, ratingTags[], comment?, operatorReply?,
                    customerDisplayName,    # "E** K."
                    driverDisplayName,      # "Mehmet A."
                    publishedAt,            # completedAt + 30 dk
                    status(PENDING_MODERATION|PUBLISHED|HIDDEN|WITHDRAWN),
                    hiddenReason?
PublicBoardStats    cityCode, date, totalTrips, avgRating,
                    ratingDistribution(JSONB), avgMatchSeconds,
                    onTimeRate, cancellationRate,
                    negotiationCount, avgNegotiationSavingPercent
```

> `PublicFeedEntry` müşteri `userId`'sini **tutmaz**. `orderId` yalnızca kullanıcının
> "kaydımı kaldır" talebini eşleştirmek için var ve API yanıtlarında hiç yer almaz.

### Puanlama ve destek
```
Rating              id, orderId, raterUserId, ratedUserId,
                    direction(CUSTOMER_TO_DRIVER|DRIVER_TO_CUSTOMER),
                    score(1-5), tags[], comment, createdAt
Dispute             id, orderId, openedBy, category(DAMAGE|DELAY|OVERCHARGE|
                    BEHAVIOR|OTHER), description, evidenceKeys[],
                    status(OPEN|IN_REVIEW|RESOLVED|REJECTED),
                    resolution, resolvedBy, resolvedAt
```

### Ödeme (Faz 6)
```
Payment             id, orderId, provider, providerRef, method(CARD|CASH|
                    CORPORATE_ACCOUNT), amount, status(PENDING|AUTHORIZED|
                    CAPTURED|FAILED|REFUNDED), authorizedAt, capturedAt
SavedCard           id, userId, providerToken, maskedPan, brand, isDefault
DriverWallet        driverId, availableBalance, pendingBalance, currency
WalletTransaction   id, walletId, type(EARNING|COMMISSION|PAYOUT|ADJUSTMENT|
                    PENALTY), amount, orderId?, description, createdAt
Payout              id, driverId, amount, iban, status, periodStart,
                    periodEnd, executedAt, providerRef
Invoice             id, orderId, type(EARCHIVE|EFATURA), providerRef,
                    pdfKey, issuedAt, totalAmount, taxAmount
```

### Sistem
```
OutboxEvent         id, aggregateType, aggregateId, eventType, payload(JSONB),
                    createdAt, publishedAt?, attemptCount, lastError?
AuditLog            id, actorUserId, action, targetType, targetId,
                    beforeState(JSONB), afterState(JSONB), ip, userAgent, createdAt
ConsentRecord       id, userId, consentType(KVKK_NOTICE|MARKETING|PUBLIC_BOARD|
                    PUBLIC_BOARD_COMMENT), version, granted,
                    grantedAt, revokedAt?, ip
NotificationLog     id, userId, channel, template, status, providerRef, sentAt
```

---

## 3. Durum makineleri

### 3.1 Order (anlık ve planlı)

```
                    ┌──────────┐
                    │  DRAFT   │  (sepet — sunucuda tutulmaz, quote ile başlar)
                    └────┬─────┘
                         ▼
                    ┌──────────┐
                    │  PLACED  │  sipariş kaydedildi
                    └────┬─────┘
        ┌────────────────┼────────────────┐
 planlı │          anlık │       pazarlık │
        ▼                ▼                ▼
 ┌────────────┐  ┌──────────────────┐  ┌──────────────┐
 │ SCHEDULED  │─►│ SEARCHING_DRIVER │  │ NEGOTIATING  │
 └────────────┘  └──────┬───────────┘  └──────┬───────┘
  (T-45dk'da            ▲                     │
   dispatch)            │      ┌──────────────┼──────────────┐
                        │      │ teklif       │ süre doldu   │ iptal
                        │      │ kabul edildi │ /anlaşma yok │
                        │      ▼              ▼              ▼
                        │  (atama)   NEGOTIATION_FAILED  CANCELLED
                        │                     │
                        └─── önerilen fiyata ─┘
                             dön
                                 ▼
                        ┌──────────────────┐
                        │ DRIVER_ASSIGNED  │◄── nakliyeci iptalinde
                        └──────┬───────────┘    SEARCHING_DRIVER'a döner
                               ▼
                        ┌──────────────────────┐
                        │ EN_ROUTE_TO_PICKUP   │
                        ├──────────────────────┤
                        │ ARRIVED_AT_PICKUP    │
                        ├──────────────────────┤
                        │ LOADING              │
                        ├──────────────────────┤
                        │ IN_TRANSIT           │ ◄─ ara duraklarda döngü
                        ├──────────────────────┤
                        │ ARRIVED_AT_DROPOFF   │
                        ├──────────────────────┤
                        │ UNLOADING            │
                        ├──────────────────────┤
                        │ DELIVERED            │  POD kaydedildi
                        └──────┬───────────────┘
                               ▼
                        ┌──────────────┐
                        │  COMPLETED   │  ödeme tamam (Faz 6), puanlama açık
                        └──────────────┘

Sonlanma durumları (her aşamadan erişilebilir, kurallara tabi):
  CANCELLED_BY_CUSTOMER · CANCELLED_BY_DRIVER · CANCELLED_BY_OPS
  DISPATCH_FAILED · NEGOTIATION_FAILED · EXPIRED · FAILED
```

**Geçiş kuralları:**
- Yalnızca atanmış sürücü veya operasyon ajanı `Trip` aşamalarını ilerletebilir
- Aşamalar atlanamaz; her geçiş `TripEvent` olarak konum ve zaman damgasıyla kaydedilir
- `DELIVERED`'a geçiş için POD (fotoğraf + alıcı adı) **zorunlu**
- İptal ücreti: `SEARCHING_DRIVER`'a kadar 0; `DRIVER_ASSIGNED` sonrası kademeli
  (atamadan sonraki ilk 2 dk ücretsiz, sonra taban ücretin %25'i,
  `ARRIVED_AT_PICKUP` sonrası %50)
- `CANCELLED_BY_DRIVER` → sipariş `SEARCHING_DRIVER`'a döner, nakliyeciye ceza puanı işlenir
- `NEGOTIATING` durumunda dispatch **başlatılmaz**; pazarlık kabul edilince doğrudan
  `DRIVER_ASSIGNED`'a geçilir (kabul eden nakliyeci zaten belli)
- Pazarlıkla anlaşılan tutar `negotiatedAmount` olarak yazılır; `quoteSnapshot` içindeki
  referans fiyat **değiştirilmez** — ikisi de muhasebe ve uyuşmazlık için gerekli

### 3.2 DispatchSession
```
RUNNING ──(sürücü kabul)──► ASSIGNED
   │
   ├──(tüm dalgalar bitti, 5 dk doldu)──► FAILED
   └──(müşteri iptal etti)──► CANCELLED
```

### 3.3 Negotiation (pazarlık)
```
                    ┌────────┐
                    │  OPEN  │  müşteri teklifi yayınlandı
                    └───┬────┘
        ┌───────────────┼───────────────┬──────────────┐
        │ müşteri bir   │ tur limiti    │ süre doldu   │ müşteri
        │ teklifi kabul │ doldu         │              │ iptal etti
        ▼               ▼               ▼              ▼
   ┌──────────┐    ┌────────┐      ┌────────┐    ┌───────────┐
   │ ACCEPTED │    │ FAILED │      │ FAILED │    │ CANCELLED │
   └──────────┘    └────────┘      └────────┘    └───────────┘
        │
        └──► Order.DRIVER_ASSIGNED
```
Tur sayacı `currentRound`; her `NegotiationOffer` bir tura ait. Aynı turda aynı
nakliyeci tek teklif verebilir. Kabul işlemi Redisson lock + optimistic locking ile
korunur — dispatch ile aynı yarış koşulu koruması.

### 3.4 PublicFeedEntry (güven panosu kaydı)
```
Order.COMPLETED ∧ publicBoardConsent
        │
        ▼
┌──────────────────────┐   moderasyon reddi   ┌────────┐
│ PENDING_MODERATION   │─────────────────────►│ HIDDEN │
└──────────┬───────────┘                      └────────┘
           │ onay ∧ publishedAt geçti (completedAt + 30 dk)
           ▼
    ┌───────────┐   kullanıcı rızasını geri çekti   ┌───────────┐
    │ PUBLISHED │─────────────────────────────────►│ WITHDRAWN │
    └───────────┘                                  └───────────┘
```

### 3.5 DriverProfile
```
PENDING ──(belgeler onaylandı)──► APPROVED ⇄ SUSPENDED
   └──(red)──► REJECTED

APPROVED içinde çevrimiçi durumu:  OFFLINE ⇄ ONLINE_IDLE ⇄ ON_TRIP
```

---

## 4. Şema ve indeks notları

**Coğrafi alanlar:** `GEOGRAPHY(POINT, 4326)` kullanılır (metre cinsinden gerçek mesafe),
`GEOMETRY` değil. Bölge poligonları için `GEOGRAPHY(POLYGON, 4326)` + GiST indeksi.

**Kritik indeksler:**
```sql
CREATE INDEX idx_order_status_created  ON orders (status, created_at DESC);
CREATE INDEX idx_order_customer        ON orders (customer_id, created_at DESC);
CREATE INDEX idx_order_driver_active   ON orders (driver_id)
       WHERE status NOT IN ('COMPLETED','CANCELLED_BY_CUSTOMER',
                            'CANCELLED_BY_DRIVER','CANCELLED_BY_OPS');
CREATE INDEX idx_order_scheduled       ON orders (scheduled_at)
       WHERE status = 'SCHEDULED';
CREATE INDEX idx_stop_location         ON order_stops USING GIST (location);
CREATE INDEX idx_zone_geometry         ON zones USING GIST (geometry);
CREATE INDEX idx_route_geometry        ON route_segments USING GIST (geometry);
CREATE INDEX idx_outbox_unpublished    ON outbox_events (created_at)
       WHERE published_at IS NULL;
CREATE UNIQUE INDEX idx_offer_unique   ON dispatch_offers (session_id, driver_id, wave);

-- pazarlık
CREATE INDEX idx_negotiation_open      ON negotiations (expires_at)
       WHERE status = 'OPEN';
CREATE UNIQUE INDEX idx_negoffer_uniq  ON negotiation_offers (negotiation_id, round, driver_id)
       WHERE party = 'DRIVER';

-- güven panosu (herkese açık, en çok okunan sorgu)
CREATE INDEX idx_feed_published        ON public_feed_entries (city_code, published_at DESC)
       WHERE status = 'PUBLISHED';
CREATE INDEX idx_feed_moderation       ON public_feed_entries (published_at)
       WHERE status = 'PENDING_MODERATION';
CREATE UNIQUE INDEX idx_feed_order     ON public_feed_entries (order_id);

-- fiyat kartı çözümleme (quote sıcak yolu)
CREATE INDEX idx_ratecard_lookup       ON rate_cards (city_code, vehicle_type_code, service_model, carrier_id)
       WHERE active;
```

**Parasal alanlar:** `NUMERIC(12,2)`, asla `float`. Para birimi ayrı sütun (`currency CHAR(3)`),
şimdilik hep `TRY` ama şema ileriye açık.

**Zaman:** Tüm zaman damgaları `TIMESTAMPTZ`, sunucuda UTC saklanır, istemcide
`Europe/Istanbul` gösterilir.

**Yumuşak silme:** `User` ve `CompanyAccount` için `deletedAt`; sipariş ve fatura kayıtları
yasal saklama süresi boyunca **silinmez**, kişisel alanlar anonimleştirilir.

**Katalog verisi:** `vehicle_types`, `cargo_categories`, `cargo_items` ve `cargo_presets`
seed migration ile gelir ve operasyon panelinden düzenlenir. Bu tablolar çok okunup az
yazıldığı için tamamı uygulama başlangıcında belleğe alınır (Caffeine cache),
değişiklikte olay ile invalidate edilir. Araç öneri motorunun < 100 ms hedefi buna dayanıyor.

**Konum verisi hacmi:** Aktif taşıma başına ~5 sn'de 1 nokta → 1 saatlik taşıma = 720 nokta.
Bunlar `location_points` tablosuna satır satır **yazılmaz**; `route_segments` içinde
LINESTRING olarak toplulaştırılır. 90 gün sonra geometri basitleştirilir (ST_Simplify)
ve ham noktalar silinir.
