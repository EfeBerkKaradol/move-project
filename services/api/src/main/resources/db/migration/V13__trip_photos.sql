-- Teslim kanıtı fotoğrafları (docs/01 FR teslim kanıtı, docs/11 §5 #8).
--
-- V10'daki tek sütunluk `pod_photo_key` yerine ayrı tablo: teslimatta çoğu zaman
-- birden fazla kare gerekiyor (yükleme anı, teslim anı, hasar). Tek sütun bunların
-- yalnızca birini tutabilirdi ve uyuşmazlıkta eksik kanıt kalırdı.

CREATE TABLE trip_photos (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id      UUID          NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    kind         VARCHAR(16)   NOT NULL,
    -- Nesne deposu anahtarı; dosyanın kendisi burada değil
    storage_key  VARCHAR(255)  NOT NULL,
    content_type VARCHAR(80)   NOT NULL,
    size_bytes   BIGINT        NOT NULL,
    -- Keycloak subject; kimin çektiği uyuşmazlıkta belirleyici
    uploaded_by  VARCHAR(64)   NOT NULL,
    uploaded_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_trip_photo_kind CHECK (kind IN ('PICKUP', 'DELIVERY', 'DAMAGE')),
    CONSTRAINT chk_trip_photo_size CHECK (size_bytes > 0)
);

CREATE INDEX idx_trip_photos_trip ON trip_photos (trip_id, kind, uploaded_at);

-- Artık kullanılmıyor: aynı bilgiyi iki yerde tutmak, birinin güncellenip diğerinin
-- unutulmasına açık kapı bırakırdı. Henüz üretim verisi yok.
ALTER TABLE trips DROP COLUMN pod_photo_key;
