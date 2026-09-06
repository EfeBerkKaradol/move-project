-- Boş dönüş (koridor) eşleştirme — docs/11 §3.
--
-- Araç sahibi yükünü bıraktığı şehirden dönerken boş gitmesin diye dönüş rotasını
-- "koridor" olarak tanımlar. Yeni bir ilan yayınlandığında koridoruna düşen ilanlar
-- ona getirilir. Boş dönüş taşıyıcı için sıfır gelirli maliyettir; onu doldurmak
-- hem taşıyıcının sefer kârını hem yük sahibinin fiyatını iyileştirir.

CREATE TABLE corridors (
    id                       UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Keycloak subject; kullanıcı tablosu gelene kadar kimlik bu (load_listings ile aynı)
    carrier_id               VARCHAR(64)    NOT NULL,
    vehicle_type_code        VARCHAR(32)    NOT NULL REFERENCES vehicle_types(code),
    origin_district_id       UUID           NOT NULL REFERENCES districts(id),
    destination_district_id  UUID           NOT NULL REFERENCES districts(id),
    departure_from           TIMESTAMPTZ    NOT NULL,
    departure_to             TIMESTAMPTZ    NOT NULL,
    -- Rotadan ne kadar sapmayı kabul ediyor
    detour_tolerance_km      INTEGER        NOT NULL,
    -- Altına düşen ilanlar hiç gösterilmesin
    min_amount               NUMERIC(12,2),
    status                   VARCHAR(16)    NOT NULL,
    created_at               TIMESTAMPTZ    NOT NULL DEFAULT now(),
    version                  INTEGER        NOT NULL DEFAULT 0,
    CONSTRAINT chk_corridor_status    CHECK (status IN ('ACTIVE', 'PAUSED', 'EXPIRED')),
    CONSTRAINT chk_corridor_window    CHECK (departure_to >= departure_from),
    CONSTRAINT chk_corridor_detour    CHECK (detour_tolerance_km BETWEEN 0 AND 500),
    CONSTRAINT chk_corridor_min       CHECK (min_amount IS NULL OR min_amount > 0),
    -- Aynı ilçeden aynı ilçeye koridor anlamsız
    CONSTRAINT chk_corridor_endpoints CHECK (origin_district_id <> destination_district_id)
);

CREATE INDEX idx_corridor_carrier ON corridors (carrier_id, created_at DESC);
-- Eşleştirme taraması: yalnızca süresi dolmamış aktif koridorlar
CREATE INDEX idx_corridor_active  ON corridors (departure_to) WHERE status = 'ACTIVE';

CREATE TABLE corridor_matches (
    id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    corridor_id   UUID           NOT NULL REFERENCES corridors(id) ON DELETE CASCADE,
    listing_id    UUID           NOT NULL REFERENCES load_listings(id),
    -- Koridordan kopyalanır: taşıyıcının tüm eşleşmelerini tek indeksle okumak için
    carrier_id    VARCHAR(64)    NOT NULL,
    score         NUMERIC(6,4)   NOT NULL,
    detour_km     NUMERIC(8,2)   NOT NULL,
    matched_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    responded_at  TIMESTAMPTZ,
    outcome       VARCHAR(16)    NOT NULL,
    CONSTRAINT chk_match_outcome CHECK (outcome IN ('PENDING', 'OFFERED', 'IGNORED', 'EXPIRED')),
    CONSTRAINT chk_match_score   CHECK (score >= 0 AND score <= 1),
    -- Eşleştirme dinleyicisi olay yeniden teslim edildiğinde ikinci kez yazmasın.
    -- Modulith olayı yeniden dener; bu kısıt dinleyiciyi idempotent yapıyor.
    CONSTRAINT uq_corridor_match UNIQUE (corridor_id, listing_id)
);

CREATE INDEX idx_match_carrier ON corridor_matches (carrier_id, score DESC);
CREATE INDEX idx_match_listing ON corridor_matches (listing_id);
