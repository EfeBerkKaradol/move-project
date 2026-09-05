-- Taşıma yürütme (docs/04 §3.1): ilan AWARDED olunca açılan iş ve aşama geçişleri.
--
-- Aşamalar sıralı: DRIVER_ASSIGNED → EN_ROUTE_TO_PICKUP → ARRIVED_AT_PICKUP → LOADING
-- → IN_TRANSIT → ARRIVED_AT_DROPOFF → UNLOADING → DELIVERED → COMPLETED.
-- DELIVERED teslim kanıtı ister (taşıyıcı), COMPLETED müşterinin teslimatta onayıdır.
-- Her geçiş trip_events'e zaman damgasıyla yazılır; uyuşmazlıkta kaynak burasıdır.

CREATE TABLE trips (
    id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id         UUID           NOT NULL UNIQUE REFERENCES load_listings(id),
    shipper_id         VARCHAR(64)    NOT NULL,
    carrier_id         VARCHAR(64)    NOT NULL,
    carrier_display_name VARCHAR(120),
    agreed_amount      NUMERIC(12,2)  NOT NULL,
    stage              VARCHAR(24)    NOT NULL,
    started_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    delivered_at       TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,
    pod_received_by    VARCHAR(120),
    pod_note           TEXT,
    pod_photo_key      VARCHAR(255),
    version            INTEGER        NOT NULL DEFAULT 0,
    CONSTRAINT chk_trip_stage CHECK (stage IN (
        'DRIVER_ASSIGNED','EN_ROUTE_TO_PICKUP','ARRIVED_AT_PICKUP','LOADING','IN_TRANSIT',
        'ARRIVED_AT_DROPOFF','UNLOADING','DELIVERED','COMPLETED'))
);
CREATE INDEX idx_trip_carrier ON trips (carrier_id, started_at DESC);
CREATE INDEX idx_trip_shipper ON trips (shipper_id, started_at DESC);

CREATE TABLE trip_events (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id      UUID          NOT NULL REFERENCES trips(id),
    stage        VARCHAR(24)   NOT NULL,
    occurred_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    -- DRIVER | SHIPPER | SYSTEM
    source       VARCHAR(16)   NOT NULL,
    note         TEXT
);
CREATE INDEX idx_trip_events_trip ON trip_events (trip_id, occurred_at);
