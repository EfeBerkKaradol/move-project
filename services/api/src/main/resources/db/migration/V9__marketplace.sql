-- Teklif pazarı çekirdeği (docs/11 §2): yük ilanı ve araç sahibi teklifi.
--
-- Model tek turlu: bir araç sahibi bir ilana bir fiyat verir, karşı teklif yok
-- ("işi almak için pazarlığa girmenize gerek yok"). Müşteri teklifleri puan ve
-- araç bilgisiyle yan yana görüp seçer. Tek tur, (listing, carrier) benzersizliğiyle
-- veritabanı düzeyinde zorlanıyor.

CREATE SEQUENCE listing_number_seq START 1;

CREATE TABLE load_listings (
    id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    -- İnsan okunur numara: TS-2026-000123
    listing_number         VARCHAR(20)    NOT NULL UNIQUE,
    -- Keycloak subject; kullanıcı tablosu gelene kadar kimlik bu
    shipper_id             VARCHAR(64)    NOT NULL,
    service_model          VARCHAR(16)    NOT NULL,
    vehicle_type_code      VARCHAR(32)    NOT NULL REFERENCES vehicle_types(code),
    pickup_district_id     UUID           NOT NULL REFERENCES districts(id),
    dropoff_district_id    UUID           NOT NULL REFERENCES districts(id),
    pickup_floor           INTEGER,
    pickup_has_elevator    BOOLEAN,
    dropoff_floor          INTEGER,
    dropoff_has_elevator   BOOLEAN,
    extra_services         JSONB          NOT NULL DEFAULT '[]'::jsonb,
    cargo_description      TEXT,
    pickup_window_start    TIMESTAMPTZ,
    pickup_window_end      TIMESTAMPTZ,
    -- Yayın anındaki tarife tahmini olduğu gibi saklanır; tarife değişse de ilanın
    -- referans fiyatı değişmez (docs/04 quote snapshot kuralı)
    estimate_snapshot      JSONB          NOT NULL,
    estimated_amount       NUMERIC(12,2)  NOT NULL,
    status                 VARCHAR(16)    NOT NULL,
    awarded_offer_id       UUID,
    published_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
    expires_at             TIMESTAMPTZ    NOT NULL,
    cancelled_at           TIMESTAMPTZ,
    cancel_reason          TEXT,
    version                INTEGER        NOT NULL DEFAULT 0,
    CONSTRAINT chk_listing_status CHECK (status IN ('OPEN', 'AWARDED', 'EXPIRED', 'CANCELLED')),
    CONSTRAINT chk_listing_model  CHECK (service_model IN ('INSTANT', 'SCHEDULED'))
);

CREATE INDEX idx_listing_shipper ON load_listings (shipper_id, published_at DESC);
-- Açık ilan akışı: araç sahibinin gördüğü liste
CREATE INDEX idx_listing_open    ON load_listings (vehicle_type_code, expires_at)
    WHERE status = 'OPEN';

CREATE TABLE carrier_offers (
    id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id             UUID           NOT NULL REFERENCES load_listings(id),
    carrier_id             VARCHAR(64)    NOT NULL,
    -- Karşılaştırma ekranı için teklif anındaki ad; profil gelince oradan okunur
    carrier_display_name   VARCHAR(120),
    amount                 NUMERIC(12,2)  NOT NULL,
    note                   TEXT,
    estimated_pickup_at    TIMESTAMPTZ,
    status                 VARCHAR(16)    NOT NULL,
    submitted_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
    responded_at           TIMESTAMPTZ,
    CONSTRAINT chk_offer_status CHECK (status IN ('SUBMITTED', 'WITHDRAWN', 'ACCEPTED', 'REJECTED')),
    CONSTRAINT chk_offer_amount CHECK (amount > 0),
    -- Tek tur: bir taşıyıcı bir ilana tek teklif
    CONSTRAINT uq_offer_per_carrier UNIQUE (listing_id, carrier_id)
);

CREATE INDEX idx_offer_listing ON carrier_offers (listing_id, submitted_at);
CREATE INDEX idx_offer_carrier ON carrier_offers (carrier_id, submitted_at DESC);
