-- Bildirim kaydı ve puanlama (docs/02 §3 notification, rating).

-- Gönderilen her bildirimin izi. Operasyon "posta gitti mi" sorusuna buradan bakıyor;
-- SMTP düşerse hata da burada duruyor, ileride yeniden gönderim bu tabloyu kullanacak.
CREATE TABLE notifications (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id  VARCHAR(64)   NOT NULL,
    recipient     VARCHAR(255),
    channel       VARCHAR(16)   NOT NULL,
    kind          VARCHAR(40)   NOT NULL,
    subject       VARCHAR(200)  NOT NULL,
    body          TEXT          NOT NULL,
    status        VARCHAR(16)   NOT NULL,
    error         TEXT,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    sent_at       TIMESTAMPTZ,
    CONSTRAINT chk_notification_channel CHECK (channel IN ('EMAIL')),
    CONSTRAINT chk_notification_status  CHECK (status IN ('SENT', 'FAILED', 'SKIPPED'))
);
CREATE INDEX idx_notifications_recipient ON notifications (recipient_id, created_at DESC);

-- Puanlanabilir işler: tracking'in TripCompleted olayından beslenir. Puanlama modülü
-- taşıma modülüne bağımlı olmadan "bu iş gerçekten tamamlandı mı, taraflar kim"
-- sorusunu buradan cevaplıyor. Tamamlanan iş sayısı da buradan.
CREATE TABLE completed_trips (
    trip_id       UUID          PRIMARY KEY,
    listing_id    UUID          NOT NULL,
    shipper_id    VARCHAR(64)   NOT NULL,
    carrier_id    VARCHAR(64)   NOT NULL,
    amount        NUMERIC(12,2) NOT NULL,
    completed_at  TIMESTAMPTZ   NOT NULL
);
CREATE INDEX idx_completed_trips_carrier ON completed_trips (carrier_id);

CREATE TABLE ratings (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    -- İş başına tek puan
    trip_id       UUID          NOT NULL UNIQUE REFERENCES completed_trips(trip_id),
    shipper_id    VARCHAR(64)   NOT NULL,
    carrier_id    VARCHAR(64)   NOT NULL,
    score         SMALLINT      NOT NULL,
    comment       VARCHAR(500),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_rating_score CHECK (score BETWEEN 1 AND 5)
);
CREATE INDEX idx_ratings_carrier ON ratings (carrier_id, created_at DESC);
