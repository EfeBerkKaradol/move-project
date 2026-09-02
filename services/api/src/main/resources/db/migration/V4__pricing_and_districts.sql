-- Fiyatlandırma: birim fiyat kartları, ek hizmetler ve ilçe merkezleri
--
-- ⚠️ Buradaki tarifeler GEÇİCİ yer tutucudur. Gerçek değerler nakliye firmalarıyla
-- yürüyen birim fiyat görüşmeleri sonuçlanınca operasyon panelinden girilecek.
-- Tarifeler versiyonlu olduğu için değişiklik geçmiş siparişleri etkilemez.

-- ─────────────────────────────────────────────────────────────
-- İlçe merkezleri
-- ─────────────────────────────────────────────────────────────
-- Google Maps anahtarı gelene kadar mesafe bu merkezler arasından tahmin ediliyor.
-- Koordinatlar yaklaşıktır ve yalnızca geçici tahmin için kullanılır; Geocoding
-- devreye girdiğinde gerçek adres koordinatları bunların yerini alacak.

CREATE TABLE districts (
    id          UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
    city_code   VARCHAR(8)               NOT NULL,
    city_name   VARCHAR(32)              NOT NULL,
    name        VARCHAR(64)              NOT NULL,
    slug        VARCHAR(64)              NOT NULL,
    centroid    GEOGRAPHY(POINT, 4326)   NOT NULL,
    active      BOOLEAN                  NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_district_slug UNIQUE (city_code, slug)
);

CREATE INDEX idx_district_city     ON districts (city_code) WHERE active;
CREATE INDEX idx_district_centroid ON districts USING GIST (centroid);

-- ─────────────────────────────────────────────────────────────
-- Ek hizmetler
-- ─────────────────────────────────────────────────────────────

CREATE TABLE extra_services (
    code          VARCHAR(32)   PRIMARY KEY,
    display_name  VARCHAR(64)   NOT NULL,
    description   TEXT,
    pricing_type  VARCHAR(16)   NOT NULL,   -- FIXED | PER_UNIT | PERCENT
    rate          NUMERIC(12,2) NOT NULL,
    unit_label    VARCHAR(32),              -- PER_UNIT için: "kat", "durak", "dakika"
    sort_order    INTEGER       NOT NULL,
    active        BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_pricing_type CHECK (pricing_type IN ('FIXED', 'PER_UNIT', 'PERCENT'))
);

INSERT INTO extra_services (code, display_name, description, pricing_type, rate, unit_label, sort_order) VALUES
('PORTERAGE',  'Hamaliye',           'Yükleme ve boşaltmada ekip desteği',        'FIXED',    150.00, NULL,      1),
('NO_ELEVATOR','Asansörsüz kat',     'Asansör olmayan katlarda taşıma ücreti',    'PER_UNIT',  30.00, 'kat',     2),
('EXTRA_STOP', 'Ek durak',           'Alış ve teslim dışında ek durak',           'PER_UNIT',  80.00, 'durak',   3),
('PACKAGING',  'Ambalaj',            'Balonlu naylon, koli, streç ve işçiliği',   'FIXED',    200.00, NULL,      4),
('ASSEMBLY',   'Montaj / demontaj',  'Mobilya sökme ve kurma',                    'FIXED',    300.00, NULL,      5),
('INSURANCE',  'Taşıma sigortası',   'Yük değeri üzerinden hasar teminatı',       'PERCENT',    2.00, NULL,      6),
('TARPAULIN',  'Branda',             'Açık kasa yükler için branda örtüsü',       'FIXED',    100.00, NULL,      7),
('STRAPPING',  'Kayış / sabitleme',  'Kırılgan ve devrilebilir yükler için',      'FIXED',     60.00, NULL,      8),
('WAITING',    'Bekleme',            'Ücretsiz süre aşıldığında dakika başı',     'PER_UNIT',   5.00, 'dakika',  9);

-- İlçe merkezleri (yaklaşık) — geçici mesafe tahmini için
INSERT INTO districts (city_code, city_name, name, slug, centroid) VALUES
('34', 'İstanbul', 'Beşiktaş', 'besiktas', ST_SetSRID(ST_MakePoint(29.0094, 41.043), 4326)::geography),
('34', 'İstanbul', 'Şişli', 'sisli', ST_SetSRID(ST_MakePoint(28.9877, 41.0602), 4326)::geography),
('34', 'İstanbul', 'Beyoğlu', 'beyoglu', ST_SetSRID(ST_MakePoint(28.977, 41.037), 4326)::geography),
('34', 'İstanbul', 'Fatih', 'fatih', ST_SetSRID(ST_MakePoint(28.9397, 41.0186), 4326)::geography),
('34', 'İstanbul', 'Bakırköy', 'bakirkoy', ST_SetSRID(ST_MakePoint(28.8772, 40.9819), 4326)::geography),
('34', 'İstanbul', 'Bahçelievler', 'bahcelievler', ST_SetSRID(ST_MakePoint(28.8592, 41.0022), 4326)::geography),
('34', 'İstanbul', 'Zeytinburnu', 'zeytinburnu', ST_SetSRID(ST_MakePoint(28.9019, 40.9946), 4326)::geography),
('34', 'İstanbul', 'Kağıthane', 'kagithane', ST_SetSRID(ST_MakePoint(28.972, 41.082), 4326)::geography),
('34', 'İstanbul', 'Sarıyer', 'sariyer', ST_SetSRID(ST_MakePoint(29.057, 41.167), 4326)::geography),
('34', 'İstanbul', 'Eyüpsultan', 'eyupsultan', ST_SetSRID(ST_MakePoint(28.934, 41.048), 4326)::geography),
('34', 'İstanbul', 'Esenyurt', 'esenyurt', ST_SetSRID(ST_MakePoint(28.68, 41.029), 4326)::geography),
('34', 'İstanbul', 'Küçükçekmece', 'kucukcekmece', ST_SetSRID(ST_MakePoint(28.78, 41.0), 4326)::geography),
('34', 'İstanbul', 'Başakşehir', 'basaksehir', ST_SetSRID(ST_MakePoint(28.802, 41.093), 4326)::geography),
('34', 'İstanbul', 'Avcılar', 'avcilar', ST_SetSRID(ST_MakePoint(28.72, 40.98), 4326)::geography),
('34', 'İstanbul', 'Beylikdüzü', 'beylikduzu', ST_SetSRID(ST_MakePoint(28.64, 41.001), 4326)::geography),
('34', 'İstanbul', 'Kadıköy', 'kadikoy', ST_SetSRID(ST_MakePoint(29.03, 40.99), 4326)::geography),
('34', 'İstanbul', 'Üsküdar', 'uskudar', ST_SetSRID(ST_MakePoint(29.015, 41.022), 4326)::geography),
('34', 'İstanbul', 'Ataşehir', 'atasehir', ST_SetSRID(ST_MakePoint(29.127, 40.992), 4326)::geography),
('34', 'İstanbul', 'Maltepe', 'maltepe', ST_SetSRID(ST_MakePoint(29.155, 40.935), 4326)::geography),
('34', 'İstanbul', 'Kartal', 'kartal', ST_SetSRID(ST_MakePoint(29.19, 40.888), 4326)::geography),
('34', 'İstanbul', 'Pendik', 'pendik', ST_SetSRID(ST_MakePoint(29.233, 40.877), 4326)::geography),
('34', 'İstanbul', 'Ümraniye', 'umraniye', ST_SetSRID(ST_MakePoint(29.124, 41.016), 4326)::geography),
('34', 'İstanbul', 'Sancaktepe', 'sancaktepe', ST_SetSRID(ST_MakePoint(29.23, 41.0), 4326)::geography),
('34', 'İstanbul', 'Tuzla', 'tuzla', ST_SetSRID(ST_MakePoint(29.3, 40.816), 4326)::geography),
('34', 'İstanbul', 'Beykoz', 'beykoz', ST_SetSRID(ST_MakePoint(29.093, 41.123), 4326)::geography),
('06', 'Ankara', 'Çankaya', 'cankaya', ST_SetSRID(ST_MakePoint(32.854, 39.908), 4326)::geography),
('06', 'Ankara', 'Keçiören', 'kecioren', ST_SetSRID(ST_MakePoint(32.869, 39.98), 4326)::geography),
('06', 'Ankara', 'Yenimahalle', 'yenimahalle', ST_SetSRID(ST_MakePoint(32.75, 39.97), 4326)::geography),
('06', 'Ankara', 'Mamak', 'mamak', ST_SetSRID(ST_MakePoint(32.91, 39.93), 4326)::geography),
('06', 'Ankara', 'Etimesgut', 'etimesgut', ST_SetSRID(ST_MakePoint(32.67, 39.95), 4326)::geography),
('06', 'Ankara', 'Sincan', 'sincan', ST_SetSRID(ST_MakePoint(32.58, 39.967), 4326)::geography),
('06', 'Ankara', 'Altındağ', 'altindag', ST_SetSRID(ST_MakePoint(32.87, 39.95), 4326)::geography),
('06', 'Ankara', 'Pursaklar', 'pursaklar', ST_SetSRID(ST_MakePoint(32.9, 40.04), 4326)::geography),
('06', 'Ankara', 'Gölbaşı', 'golbasi', ST_SetSRID(ST_MakePoint(32.81, 39.79), 4326)::geography),
('06', 'Ankara', 'Kahramankazan', 'kahramankazan', ST_SetSRID(ST_MakePoint(32.68, 40.2), 4326)::geography),
('06', 'Ankara', 'Polatlı', 'polatli', ST_SetSRID(ST_MakePoint(32.14, 39.58), 4326)::geography),
('31', 'Hatay', 'Antakya', 'antakya', ST_SetSRID(ST_MakePoint(36.16, 36.202), 4326)::geography),
('31', 'Hatay', 'Defne', 'defne', ST_SetSRID(ST_MakePoint(36.15, 36.18), 4326)::geography),
('31', 'Hatay', 'İskenderun', 'iskenderun', ST_SetSRID(ST_MakePoint(36.173, 36.587), 4326)::geography),
('31', 'Hatay', 'Samandağ', 'samandag', ST_SetSRID(ST_MakePoint(35.98, 36.085), 4326)::geography),
('31', 'Hatay', 'Dörtyol', 'dortyol', ST_SetSRID(ST_MakePoint(36.22, 36.84), 4326)::geography),
('31', 'Hatay', 'Kırıkhan', 'kirikhan', ST_SetSRID(ST_MakePoint(36.36, 36.5), 4326)::geography),
('31', 'Hatay', 'Reyhanlı', 'reyhanli', ST_SetSRID(ST_MakePoint(36.57, 36.27), 4326)::geography),
('31', 'Hatay', 'Payas', 'payas', ST_SetSRID(ST_MakePoint(36.22, 36.75), 4326)::geography),
('31', 'Hatay', 'Arsuz', 'arsuz', ST_SetSRID(ST_MakePoint(35.89, 36.41), 4326)::geography),
('31', 'Hatay', 'Belen', 'belen', ST_SetSRID(ST_MakePoint(36.19, 36.49), 4326)::geography),
('31', 'Hatay', 'Altınözü', 'altinozu', ST_SetSRID(ST_MakePoint(36.25, 36.11), 4326)::geography),
('31', 'Hatay', 'Erzin', 'erzin', ST_SetSRID(ST_MakePoint(36.2, 36.95), 4326)::geography),
('31', 'Hatay', 'Hassa', 'hassa', ST_SetSRID(ST_MakePoint(36.52, 36.8), 4326)::geography),
('31', 'Hatay', 'Kumlu', 'kumlu', ST_SetSRID(ST_MakePoint(36.48, 36.38), 4326)::geography),
('31', 'Hatay', 'Yayladağı', 'yayladagi', ST_SetSRID(ST_MakePoint(36.06, 35.9), 4326)::geography);

-- ─────────────────────────────────────────────────────────────
-- Birim fiyat kartları (şehir varsayılanı — carrier_id NULL)
-- ─────────────────────────────────────────────────────────────
-- ⚠️ GEÇİCİ DEĞERLER. Firma birim fiyat görüşmeleri sonuçlanınca değiştirilecek.
-- Şehir katsayıları: İstanbul ×1,15 (trafik) · Ankara ×1,00 · Hatay ×0,92
-- Hatay'da il içi mesafeler uzun (Antakya↔İskenderun ~60 km), bu yüzden kademeli
-- km ücreti uygulanıyor: ilk 25 km tam, 25-60 km arası %80, 60 km üstü %65.

INSERT INTO rate_cards
    (city_code, vehicle_type_code, service_model, base_fare, included_km, per_km_rate,
     per_minute_rate, minimum_fare, waiting_free_minutes, waiting_per_minute_rate, distance_tiers) VALUES
('34', 'MOTOR', 'INSTANT', 138.00, 3.00, 13.80, 1.72, 172.50, 15, 3.45, NULL),
('34', 'MOTOR', 'SCHEDULED', 138.00, 3.00, 13.80, 1.72, 172.50, 15, 3.45, NULL),
('34', 'DOBLO', 'INSTANT', 287.50, 3.00, 20.70, 2.88, 368.00, 15, 5.75, NULL),
('34', 'DOBLO', 'SCHEDULED', 287.50, 3.00, 20.70, 2.88, 368.00, 15, 5.75, NULL),
('34', 'TRANSPORTER', 'INSTANT', 402.50, 3.00, 27.60, 4.02, 517.50, 15, 8.05, NULL),
('34', 'TRANSPORTER', 'SCHEDULED', 402.50, 3.00, 27.60, 4.02, 517.50, 15, 8.05, NULL),
('34', 'TRANSIT', 'INSTANT', 517.50, 3.00, 34.50, 5.17, 690.00, 15, 10.35, NULL),
('34', 'TRANSIT', 'SCHEDULED', 517.50, 3.00, 34.50, 5.17, 690.00, 15, 10.35, NULL),
('34', 'KAMYONET', 'INSTANT', 747.50, 3.00, 46.00, 6.90, 1035.00, 15, 13.80, NULL),
('34', 'KAMYONET', 'SCHEDULED', 747.50, 3.00, 46.00, 6.90, 1035.00, 15, 13.80, NULL),
('34', 'KAMYON', 'INSTANT', 1380.00, 3.00, 74.75, 10.35, 2070.00, 15, 20.70, NULL),
('34', 'KAMYON', 'SCHEDULED', 1380.00, 3.00, 74.75, 10.35, 2070.00, 15, 20.70, NULL),
('34', 'TIR', 'INSTANT', 2875.00, 3.00, 126.50, 17.25, 4600.00, 15, 34.50, NULL),
('34', 'TIR', 'SCHEDULED', 2875.00, 3.00, 126.50, 17.25, 4600.00, 15, 34.50, NULL),
('06', 'MOTOR', 'INSTANT', 120.00, 3.00, 12.00, 1.50, 150.00, 15, 3.00, NULL),
('06', 'MOTOR', 'SCHEDULED', 120.00, 3.00, 12.00, 1.50, 150.00, 15, 3.00, NULL),
('06', 'DOBLO', 'INSTANT', 250.00, 3.00, 18.00, 2.50, 320.00, 15, 5.00, NULL),
('06', 'DOBLO', 'SCHEDULED', 250.00, 3.00, 18.00, 2.50, 320.00, 15, 5.00, NULL),
('06', 'TRANSPORTER', 'INSTANT', 350.00, 3.00, 24.00, 3.50, 450.00, 15, 7.00, NULL),
('06', 'TRANSPORTER', 'SCHEDULED', 350.00, 3.00, 24.00, 3.50, 450.00, 15, 7.00, NULL),
('06', 'TRANSIT', 'INSTANT', 450.00, 3.00, 30.00, 4.50, 600.00, 15, 9.00, NULL),
('06', 'TRANSIT', 'SCHEDULED', 450.00, 3.00, 30.00, 4.50, 600.00, 15, 9.00, NULL),
('06', 'KAMYONET', 'INSTANT', 650.00, 3.00, 40.00, 6.00, 900.00, 15, 12.00, NULL),
('06', 'KAMYONET', 'SCHEDULED', 650.00, 3.00, 40.00, 6.00, 900.00, 15, 12.00, NULL),
('06', 'KAMYON', 'INSTANT', 1200.00, 3.00, 65.00, 9.00, 1800.00, 15, 18.00, NULL),
('06', 'KAMYON', 'SCHEDULED', 1200.00, 3.00, 65.00, 9.00, 1800.00, 15, 18.00, NULL),
('06', 'TIR', 'INSTANT', 2500.00, 3.00, 110.00, 15.00, 4000.00, 15, 30.00, NULL),
('06', 'TIR', 'SCHEDULED', 2500.00, 3.00, 110.00, 15.00, 4000.00, 15, 30.00, NULL),
('31', 'MOTOR', 'INSTANT', 110.40, 3.00, 11.04, 1.38, 138.00, 15, 2.76, '[{"fromKm":0,"toKm":25,"factor":1.0},{"fromKm":25,"toKm":60,"factor":0.80},{"fromKm":60,"toKm":null,"factor":0.65}]'::jsonb),
('31', 'MOTOR', 'SCHEDULED', 110.40, 3.00, 11.04, 1.38, 138.00, 15, 2.76, '[{"fromKm":0,"toKm":25,"factor":1.0},{"fromKm":25,"toKm":60,"factor":0.80},{"fromKm":60,"toKm":null,"factor":0.65}]'::jsonb),
('31', 'DOBLO', 'INSTANT', 230.00, 3.00, 16.56, 2.30, 294.40, 15, 4.60, '[{"fromKm":0,"toKm":25,"factor":1.0},{"fromKm":25,"toKm":60,"factor":0.80},{"fromKm":60,"toKm":null,"factor":0.65}]'::jsonb),
('31', 'DOBLO', 'SCHEDULED', 230.00, 3.00, 16.56, 2.30, 294.40, 15, 4.60, '[{"fromKm":0,"toKm":25,"factor":1.0},{"fromKm":25,"toKm":60,"factor":0.80},{"fromKm":60,"toKm":null,"factor":0.65}]'::jsonb),
('31', 'TRANSPORTER', 'INSTANT', 322.00, 3.00, 22.08, 3.22, 414.00, 15, 6.44, '[{"fromKm":0,"toKm":25,"factor":1.0},{"fromKm":25,"toKm":60,"factor":0.80},{"fromKm":60,"toKm":null,"factor":0.65}]'::jsonb),
('31', 'TRANSPORTER', 'SCHEDULED', 322.00, 3.00, 22.08, 3.22, 414.00, 15, 6.44, '[{"fromKm":0,"toKm":25,"factor":1.0},{"fromKm":25,"toKm":60,"factor":0.80},{"fromKm":60,"toKm":null,"factor":0.65}]'::jsonb),
('31', 'TRANSIT', 'INSTANT', 414.00, 3.00, 27.60, 4.14, 552.00, 15, 8.28, '[{"fromKm":0,"toKm":25,"factor":1.0},{"fromKm":25,"toKm":60,"factor":0.80},{"fromKm":60,"toKm":null,"factor":0.65}]'::jsonb),
('31', 'TRANSIT', 'SCHEDULED', 414.00, 3.00, 27.60, 4.14, 552.00, 15, 8.28, '[{"fromKm":0,"toKm":25,"factor":1.0},{"fromKm":25,"toKm":60,"factor":0.80},{"fromKm":60,"toKm":null,"factor":0.65}]'::jsonb),
('31', 'KAMYONET', 'INSTANT', 598.00, 3.00, 36.80, 5.52, 828.00, 15, 11.04, '[{"fromKm":0,"toKm":25,"factor":1.0},{"fromKm":25,"toKm":60,"factor":0.80},{"fromKm":60,"toKm":null,"factor":0.65}]'::jsonb),
('31', 'KAMYONET', 'SCHEDULED', 598.00, 3.00, 36.80, 5.52, 828.00, 15, 11.04, '[{"fromKm":0,"toKm":25,"factor":1.0},{"fromKm":25,"toKm":60,"factor":0.80},{"fromKm":60,"toKm":null,"factor":0.65}]'::jsonb),
('31', 'KAMYON', 'INSTANT', 1104.00, 3.00, 59.80, 8.28, 1656.00, 15, 16.56, '[{"fromKm":0,"toKm":25,"factor":1.0},{"fromKm":25,"toKm":60,"factor":0.80},{"fromKm":60,"toKm":null,"factor":0.65}]'::jsonb),
('31', 'KAMYON', 'SCHEDULED', 1104.00, 3.00, 59.80, 8.28, 1656.00, 15, 16.56, '[{"fromKm":0,"toKm":25,"factor":1.0},{"fromKm":25,"toKm":60,"factor":0.80},{"fromKm":60,"toKm":null,"factor":0.65}]'::jsonb),
('31', 'TIR', 'INSTANT', 2300.00, 3.00, 101.20, 13.80, 3680.00, 15, 27.60, '[{"fromKm":0,"toKm":25,"factor":1.0},{"fromKm":25,"toKm":60,"factor":0.80},{"fromKm":60,"toKm":null,"factor":0.65}]'::jsonb),
('31', 'TIR', 'SCHEDULED', 2300.00, 3.00, 101.20, 13.80, 3680.00, 15, 27.60, '[{"fromKm":0,"toKm":25,"factor":1.0},{"fromKm":25,"toKm":60,"factor":0.80},{"fromKm":60,"toKm":null,"factor":0.65}]'::jsonb);
