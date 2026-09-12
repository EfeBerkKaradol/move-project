-- Taşıma sırasında sürücünün konum izi.
--
-- Neden gerekiyor: yük sahibi aracın nerede olduğunu göremiyordu; tek bildiği
-- sürücünün elle ilerlettiği aşamaydı. "Yola çıktım" diyen ama saatlerce
-- hareket etmeyen bir işi ne yük sahibi ne operasyon fark edebiliyordu.
--
-- ⚠️ KİŞİSEL VERİ. Bu tablo bir kişinin nerede olduğunu tutuyor:
--   * Yalnızca işin tarafları okuyabilir (yük sahibi, taşıyıcı, operasyon).
--   * Yalnızca iş sürerken yazılır; teslim edilince yazma durur.
--   * İş kapandığında iz SİLİNİR (uygulama tarafında; bkz. TripAccess.complete
--     çağrısının yanındaki temizlik). Saklama süresi boyunca da amaç dışı
--     kullanılmaz — ADR-0005: veri Türkiye'de kalır.
--   * Güven panosuna HİÇ akmıyor. ADR-0008 canlı siparişin yerini herkese açık
--     göstermeyi reddediyor; bu tablo o kararın istisnası değil, tam tersine
--     neden kapalı tutulduğunun kaydı.
CREATE TABLE trip_locations (
    id          UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id     UUID                     NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    lat         DOUBLE PRECISION         NOT NULL,
    lng         DOUBLE PRECISION         NOT NULL,
    -- Cihazın bildirdiği yatay doğruluk (metre). Kötü sinyalde yüz metreyi
    -- aşabiliyor; arayüz buna bakıp "yaklaşık" diyebilsin diye saklanıyor.
    accuracy_m  DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ              NOT NULL,
    CONSTRAINT chk_trip_location_lat CHECK (lat BETWEEN -90 AND 90),
    CONSTRAINT chk_trip_location_lng CHECK (lng BETWEEN -180 AND 180)
);

-- Tek sorgu var ve hep aynı: "bu işin son konumları". Sıralama indeksin içinde.
CREATE INDEX idx_trip_location_trip ON trip_locations (trip_id, recorded_at DESC);
