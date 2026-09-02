-- TurMove — temel şema (Faz 0)
-- Coğrafi sorgular ve rota geometrisi için PostGIS (bkz. docs/04)

CREATE EXTENSION IF NOT EXISTS postgis;

-- ─────────────────────────────────────────────────────────────
-- Katalog: araç filosu ve yük kategorileri
-- ─────────────────────────────────────────────────────────────

CREATE TABLE vehicle_types (
    code              VARCHAR(32)   PRIMARY KEY,
    display_name      VARCHAR(64)   NOT NULL,
    volume_m3         NUMERIC(8,2)  NOT NULL,
    payload_kg        INTEGER       NOT NULL,
    inner_length_cm   INTEGER       NOT NULL,
    inner_width_cm    INTEGER,
    inner_height_cm   INTEGER,
    example_loads     TEXT,
    sort_order        INTEGER       NOT NULL,
    active            BOOLEAN       NOT NULL DEFAULT TRUE
);

CREATE TABLE cargo_categories (
    code                     VARCHAR(32)   PRIMARY KEY,
    display_name             VARCHAR(64)   NOT NULL,
    scale_hint               VARCHAR(128)  NOT NULL,
    typical_volume_min_m3    NUMERIC(8,2),
    typical_volume_max_m3    NUMERIC(8,2),
    default_vehicle_type_code VARCHAR(32)  REFERENCES vehicle_types(code),
    -- "kaç paket?" sorusunun karşılığı kategoriye göre değişir: zarf ile
    -- taşınma kolisi aynı hacimde değil (bkz. docs/08)
    default_package_item_code VARCHAR(48),
    detail_form_type         VARCHAR(32)   NOT NULL,
    sort_order               INTEGER       NOT NULL,
    active                   BOOLEAN       NOT NULL DEFAULT TRUE
);

CREATE TABLE cargo_items (
    code             VARCHAR(48)   PRIMARY KEY,
    category_code    VARCHAR(32)   NOT NULL REFERENCES cargo_categories(code),
    display_name     VARCHAR(96)   NOT NULL,
    volume_m3        NUMERIC(8,2)  NOT NULL,
    weight_kg        INTEGER       NOT NULL,
    -- En uzun kenar: hacim yeterli olsa bile bu kısıt sağlanmazsa yük sığmaz
    longest_edge_cm  INTEGER       NOT NULL,
    sort_order       INTEGER       NOT NULL,
    active           BOOLEAN       NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_cargo_items_category ON cargo_items (category_code) WHERE active;

CREATE TABLE cargo_presets (
    code                      VARCHAR(48)   PRIMARY KEY,
    category_code             VARCHAR(32)   NOT NULL REFERENCES cargo_categories(code),
    display_name              VARCHAR(96)   NOT NULL,
    estimated_volume_m3       NUMERIC(8,2)  NOT NULL,
    estimated_weight_kg       INTEGER       NOT NULL,
    estimated_longest_edge_cm INTEGER       NOT NULL,
    sort_order                INTEGER       NOT NULL
);

-- ─────────────────────────────────────────────────────────────
-- Coğrafya: hizmet bölgeleri (İstanbul, Ankara, Hatay)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE zones (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    city_code   VARCHAR(8)    NOT NULL,
    district    VARCHAR(64),
    name        VARCHAR(96)   NOT NULL,
    geometry    GEOGRAPHY(POLYGON, 4326),
    type        VARCHAR(24)   NOT NULL DEFAULT 'SERVICE_AREA',
    active      BOOLEAN       NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_zone_geometry ON zones USING GIST (geometry);
CREATE INDEX idx_zone_city     ON zones (city_code) WHERE active;

-- ─────────────────────────────────────────────────────────────
-- Fiyatlandırma: birim fiyat kartları ve platform komisyonu
-- ─────────────────────────────────────────────────────────────

CREATE TABLE rate_cards (
    id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    -- NULL → şehir varsayılan tarifesi; dolu → firmaya özel sözleşme fiyatı
    carrier_id                UUID,
    city_code                 VARCHAR(8)    NOT NULL,
    vehicle_type_code         VARCHAR(32)   NOT NULL REFERENCES vehicle_types(code),
    service_model             VARCHAR(16)   NOT NULL,
    base_fare                 NUMERIC(12,2) NOT NULL,
    included_km               NUMERIC(6,2)  NOT NULL DEFAULT 0,
    per_km_rate               NUMERIC(12,2) NOT NULL,
    per_minute_rate           NUMERIC(12,2) NOT NULL DEFAULT 0,
    minimum_fare              NUMERIC(12,2) NOT NULL,
    waiting_free_minutes      INTEGER       NOT NULL DEFAULT 15,
    waiting_per_minute_rate   NUMERIC(12,2) NOT NULL DEFAULT 0,
    -- Hatay il içi kademeli mesafe için: [{"fromKm":0,"toKm":20,"perKmRate":"18.00"}, ...]
    distance_tiers            JSONB,
    version                   INTEGER       NOT NULL DEFAULT 1,
    valid_from                TIMESTAMPTZ   NOT NULL DEFAULT now(),
    valid_to                  TIMESTAMPTZ,
    active                    BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_service_model CHECK (service_model IN ('INSTANT', 'SCHEDULED'))
);

CREATE INDEX idx_ratecard_lookup ON rate_cards (city_code, vehicle_type_code, service_model, carrier_id)
    WHERE active;

CREATE TABLE platform_commission (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    city_code           VARCHAR(8),
    percent             NUMERIC(5,2)  NOT NULL,
    version             INTEGER       NOT NULL DEFAULT 1,
    valid_from          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    valid_to            TIMESTAMPTZ,
    -- Komisyon değişimi en az 30 gün önceden duyurulur (FR-14.9)
    announcement_sent_at TIMESTAMPTZ,
    CONSTRAINT chk_percent CHECK (percent >= 0 AND percent <= 100)
);

-- ─────────────────────────────────────────────────────────────
-- Sistem: outbox ve denetim
-- ─────────────────────────────────────────────────────────────

CREATE TABLE outbox_events (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(64)   NOT NULL,
    aggregate_id   VARCHAR(64)   NOT NULL,
    event_type     VARCHAR(96)   NOT NULL,
    payload        JSONB         NOT NULL,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    published_at   TIMESTAMPTZ,
    attempt_count  INTEGER       NOT NULL DEFAULT 0,
    last_error     TEXT
);

CREATE INDEX idx_outbox_unpublished ON outbox_events (created_at) WHERE published_at IS NULL;

CREATE TABLE audit_log (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID,
    action        VARCHAR(96)   NOT NULL,
    target_type   VARCHAR(64),
    target_id     VARCHAR(64),
    before_state  JSONB,
    after_state   JSONB,
    ip            INET,
    user_agent    TEXT,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_actor ON audit_log (actor_user_id, created_at DESC);
