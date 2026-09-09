-- Yaka bazlı şehir içi tarife — İstanbul.
--
-- Mevcut rate_cards modeli (taban + kademeli km + dakika) şehirlerarası taşıma
-- için kuruldu ve İstanbul içinde piyasanın altında kalıyordu: 20 km'lik bir
-- panelvan işi ~1.400 ₺ çıkıyor, piyasa aynı işe 1.500–2.000 ₺ diyor (docs/12).
-- Sebebi km ücretinin şehirlerarası uzun yola göre seçilmiş olması; İstanbul'da
-- 20 km trafikte iki saat demek.
--
-- Yeni model rotayı dört şeyden hesaplıyor: alış yakası, teslim yakası, gerçek
-- yol mesafesi ve araç. Yaka çifti ayrı bir boyut çünkü köprü geçişi İstanbul'da
-- mesafeden bağımsız bir maliyet — 8 km'lik bir Boğaz geçişi, 20 km'lik yaka içi
-- işten pahalı.
--
-- Tarifesi olmayan şehir ve araçlar eski rate_cards yolundan devam ediyor; bu
-- tablo yalnızca eşleşme bulduğunda devreye giriyor.

-- ─────────────────────────────────────────────────────────────
-- İlçe → yaka
--
-- Koordinattan türetilmiyor. Boğaz düz bir çizgi değil: Sarıyer (Avrupa, ~29,05°)
-- ile Beykoz (Anadolu, ~29,10°) boylamda yan yana, bir eşik ikisini de yanlış
-- sınıflar. Liste 39 ilçenin tamamını taşıyor — veritabanında şu an 25'i var,
-- kalanlar eklendiğinde tarife kendiliğinden çalışsın diye.
CREATE TABLE pricing_zones (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    city_code     VARCHAR(8)  NOT NULL,
    district_slug VARCHAR(64) NOT NULL,
    zone_code     VARCHAR(16) NOT NULL,
    CONSTRAINT uq_pricing_zone UNIQUE (city_code, district_slug)
);

COMMENT ON TABLE pricing_zones IS
    'İlçenin fiyatlandırma bölgesi. İstanbul için yaka (EUROPE/ASIA); başka '
    'şehirlerde merkez/çeper gibi başka bir bölünme olabilir.';

INSERT INTO pricing_zones (city_code, district_slug, zone_code) VALUES
    ('34', 'arnavutkoy',     'EUROPE'),
    ('34', 'avcilar',        'EUROPE'),
    ('34', 'bagcilar',       'EUROPE'),
    ('34', 'bahcelievler',   'EUROPE'),
    ('34', 'bakirkoy',       'EUROPE'),
    ('34', 'basaksehir',     'EUROPE'),
    ('34', 'bayrampasa',     'EUROPE'),
    ('34', 'besiktas',       'EUROPE'),
    ('34', 'beylikduzu',     'EUROPE'),
    ('34', 'beyoglu',        'EUROPE'),
    ('34', 'buyukcekmece',   'EUROPE'),
    ('34', 'catalca',        'EUROPE'),
    ('34', 'esenler',        'EUROPE'),
    ('34', 'esenyurt',       'EUROPE'),
    ('34', 'eyupsultan',     'EUROPE'),
    ('34', 'fatih',          'EUROPE'),
    ('34', 'gaziosmanpasa',  'EUROPE'),
    ('34', 'gungoren',       'EUROPE'),
    ('34', 'kagithane',      'EUROPE'),
    ('34', 'kucukcekmece',   'EUROPE'),
    ('34', 'sariyer',        'EUROPE'),
    ('34', 'silivri',        'EUROPE'),
    ('34', 'sultangazi',     'EUROPE'),
    ('34', 'sisli',          'EUROPE'),
    ('34', 'zeytinburnu',    'EUROPE'),
    ('34', 'adalar',         'ASIA'),
    ('34', 'atasehir',       'ASIA'),
    ('34', 'beykoz',         'ASIA'),
    ('34', 'cekmekoy',       'ASIA'),
    ('34', 'kadikoy',        'ASIA'),
    ('34', 'kartal',         'ASIA'),
    ('34', 'maltepe',        'ASIA'),
    ('34', 'pendik',         'ASIA'),
    ('34', 'sancaktepe',     'ASIA'),
    ('34', 'sultanbeyli',    'ASIA'),
    ('34', 'sile',           'ASIA'),
    ('34', 'tuzla',          'ASIA'),
    ('34', 'umraniye',       'ASIA'),
    ('34', 'uskudar',        'ASIA');

-- ─────────────────────────────────────────────────────────────
-- Kısa/uzun eşiği
--
-- Satır başına değil şehir başına: eşik hangi satırın seçileceğini belirliyor,
-- satırın kendisinde dursaydı satırlar birbiriyle çelişebilirdi.
CREATE TABLE zone_pricing_settings (
    city_code         VARCHAR(8)     PRIMARY KEY,
    short_distance_km NUMERIC(6, 2)  NOT NULL,
    CONSTRAINT ck_short_distance_positive CHECK (short_distance_km > 0)
);

INSERT INTO zone_pricing_settings (city_code, short_distance_km) VALUES ('34', 25.00);

-- ─────────────────────────────────────────────────────────────
-- Yaka çiftine ve mesafe sınıfına göre tarife
CREATE TABLE zone_rate_cards (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    city_code         VARCHAR(8)     NOT NULL,
    vehicle_type_code VARCHAR(32)    NOT NULL,
    origin_zone       VARCHAR(16)    NOT NULL,
    destination_zone  VARCHAR(16)    NOT NULL,
    distance_class    VARCHAR(8)     NOT NULL,
    base_fare         NUMERIC(10, 2) NOT NULL,
    per_km_rate       NUMERIC(10, 2) NOT NULL,
    minimum_fare      NUMERIC(10, 2) NOT NULL,
    -- Yaka değiştiren rotada köprü/otoyol karşılığı. Rota servisi gerçek geçiş
    -- ücretini döndürebildiğinde bu sabit onun yerini bırakacak.
    crossing_fee      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    version           INTEGER        NOT NULL DEFAULT 1,
    active            BOOLEAN        NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_zone_distance_class CHECK (distance_class IN ('SHORT', 'LONG')),
    CONSTRAINT ck_zone_rates_nonneg CHECK (
        base_fare >= 0 AND per_km_rate >= 0 AND minimum_fare >= 0 AND crossing_fee >= 0)
);

-- Aynı senaryo için tek etkin sürüm; ikisi birden etkin olsaydı hangisinin
-- uygulandığı sorgunun sırasına kalırdı
CREATE UNIQUE INDEX uq_zone_rate_card_active ON zone_rate_cards
    (city_code, vehicle_type_code, origin_zone, destination_zone, distance_class)
    WHERE active;

-- Yaka içi rotalar simetrik (Avrupa→Avrupa ile Anadolu→Anadolu aynı), yaka
-- değiştirenler de öyle. Satırlar yine de açık açık yazılıyor: yarın Anadolu
-- yakası ayrı fiyatlanmak istendiğinde tek satır değiştirilebilsin.
INSERT INTO zone_rate_cards
    (city_code, vehicle_type_code, origin_zone, destination_zone, distance_class,
     base_fare, per_km_rate, minimum_fare, crossing_fee)
VALUES
    ('34', 'PANELVAN', 'EUROPE', 'EUROPE', 'SHORT',  900.00, 55.00, 1500.00,   0.00),
    ('34', 'PANELVAN', 'EUROPE', 'EUROPE', 'LONG',  1200.00, 50.00, 1500.00,   0.00),
    ('34', 'PANELVAN', 'ASIA',   'ASIA',   'SHORT',  900.00, 55.00, 1500.00,   0.00),
    ('34', 'PANELVAN', 'ASIA',   'ASIA',   'LONG',  1200.00, 50.00, 1500.00,   0.00),
    ('34', 'PANELVAN', 'EUROPE', 'ASIA',   'SHORT', 1300.00, 55.00, 1500.00, 400.00),
    ('34', 'PANELVAN', 'EUROPE', 'ASIA',   'LONG',  1600.00, 50.00, 1500.00, 400.00),
    ('34', 'PANELVAN', 'ASIA',   'EUROPE', 'SHORT', 1300.00, 55.00, 1500.00, 400.00),
    ('34', 'PANELVAN', 'ASIA',   'EUROPE', 'LONG',  1600.00, 50.00, 1500.00, 400.00),

    ('34', 'KAMYON',   'EUROPE', 'EUROPE', 'SHORT', 1800.00, 85.00, 3000.00,   0.00),
    ('34', 'KAMYON',   'EUROPE', 'EUROPE', 'LONG',  2500.00, 75.00, 3000.00,   0.00),
    ('34', 'KAMYON',   'ASIA',   'ASIA',   'SHORT', 1800.00, 85.00, 3000.00,   0.00),
    ('34', 'KAMYON',   'ASIA',   'ASIA',   'LONG',  2500.00, 75.00, 3000.00,   0.00),
    ('34', 'KAMYON',   'EUROPE', 'ASIA',   'SHORT', 2300.00, 85.00, 3000.00, 400.00),
    ('34', 'KAMYON',   'EUROPE', 'ASIA',   'LONG',  3000.00, 75.00, 3000.00, 400.00),
    ('34', 'KAMYON',   'ASIA',   'EUROPE', 'SHORT', 2300.00, 85.00, 3000.00, 400.00),
    ('34', 'KAMYON',   'ASIA',   'EUROPE', 'LONG',  3000.00, 75.00, 3000.00, 400.00);
