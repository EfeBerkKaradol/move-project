-- Araç filosu Taşıyoruz tasarımına göre yeniden tanımlandı.
--
-- Önceki filo şehir içi taşımaya göreydi (Doblo, Transporter, Transit). Yeni ürün
-- şehirlerarası bir yük pazarı olduğu için filo da o dile geçiyor: motokuryeden
-- kırkayağa. Kapasite tonaj yerine gerçek örneklerle anlatılıyor — kimse yükünün
-- kaç m³ olduğunu bilmiyor, ama "1+1 ev eşyası"nı herkes biliyor.
--
-- Yük kataloğu (kategori/eşya/preset) KORUNUYOR: tasarımdaki "fotoğraf çekin,
-- sistem araç tipini önersin" akışı aynı öneri motoruna dayanıyor. Yalnızca
-- kategorilerin varsayılan araçları yeni filoya eşleniyor.

-- 1) Yeni araç tipleri
INSERT INTO vehicle_types
    (code, display_name, volume_m3, payload_kg, inner_length_cm, example_loads, sort_order, active) VALUES
('MOTOKURYE', 'Motokurye',  0.10,    30,   45, 'Zarf, evrak, küçük koli',       1, TRUE),
('PANELVAN',  'Panelvan',   8.00,  1500,  330, 'Yaklaşık 15 koli, beyaz eşya',  2, TRUE),
('KIRKAYAK',  'Kırkayak',  70.00, 18000, 1000, 'Yaklaşık 16 palet, komple yük', 5, TRUE);

-- Mevcut kodlar korunanlar: KAMYONET, KAMYON, TIR — ölçüleri ve metinleri güncellenir.
-- TIR henüz hizmete açılmadı; arayüzde "Yakında" olarak gösteriliyor.
UPDATE vehicle_types SET
    display_name = 'Kamyonet', payload_kg = 3500, volume_m3 = 18.00,
    inner_length_cm = 430, example_loads = '1+1 ev eşyası, tek daire',
    sort_order = 3, active = TRUE
WHERE code = 'KAMYONET';

UPDATE vehicle_types SET
    display_name = 'Kamyon', payload_kg = 10000, volume_m3 = 45.00,
    inner_length_cm = 720, example_loads = 'Yaklaşık 10 palet, 3+1 ev',
    sort_order = 4, active = TRUE
WHERE code = 'KAMYON';

UPDATE vehicle_types SET
    display_name = 'TIR', payload_kg = 24000, volume_m3 = 90.00,
    inner_length_cm = 1360, example_loads = 'Komple yük, uluslararası',
    sort_order = 6, active = FALSE
WHERE code = 'TIR';

-- 2) Kategorilerin varsayılan araçlarını yeni filoya eşle
UPDATE cargo_categories SET default_vehicle_type_code = 'MOTOKURYE' WHERE default_vehicle_type_code = 'MOTOR';
UPDATE cargo_categories SET default_vehicle_type_code = 'PANELVAN'  WHERE default_vehicle_type_code IN ('DOBLO', 'TRANSPORTER');
UPDATE cargo_categories SET default_vehicle_type_code = 'KAMYONET'  WHERE default_vehicle_type_code = 'TRANSIT';

-- 3) Tarifeler yeni kodlarla yeniden kurulur (eski kodlara bağlı olanlar silinir)
DELETE FROM rate_cards;

-- 4) Artık kullanılmayan araç tipleri
DELETE FROM vehicle_types WHERE code IN ('MOTOR', 'DOBLO', 'TRANSPORTER', 'TRANSIT');

-- 5) Yeni tarifeler
-- ⚠️ GEÇİCİ DEĞERLER — firma birim fiyat görüşmeleri sonuçlanınca değişecek.
-- Şehirlerarası mesafeler uzun olduğu için kademeli km ücreti tüm şehirlerde açık:
-- ilk 25 km tam, 25-150 km arası %75, 150 km üstü %55.
INSERT INTO rate_cards
    (city_code, vehicle_type_code, service_model, base_fare, included_km, per_km_rate,
     per_minute_rate, minimum_fare, waiting_free_minutes, waiting_per_minute_rate, distance_tiers)
SELECT
    c.code, v.code, m.model,
    ROUND((v.base * c.mult)::numeric, 2),
    3.00,
    ROUND((v.per_km * c.mult)::numeric, 2),
    ROUND((v.per_min * c.mult)::numeric, 2),
    ROUND((v.minimum * c.mult)::numeric, 2),
    15,
    ROUND((v.per_min * c.mult * 2)::numeric, 2),
    '[{"fromKm":0,"toKm":25,"factor":1.0},
      {"fromKm":25,"toKm":150,"factor":0.75},
      {"fromKm":150,"toKm":null,"factor":0.55}]'::jsonb
FROM (VALUES
        ('MOTOKURYE',  140.0,  13.0,  1.6,  170.0),
        ('PANELVAN',   420.0,  28.0,  4.2,  560.0),
        ('KAMYONET',   680.0,  42.0,  6.2,  940.0),
        ('KAMYON',    1250.0,  68.0,  9.4, 1850.0),
        ('KIRKAYAK',  1900.0,  92.0, 12.5, 2900.0),
        ('TIR',       2600.0, 115.0, 15.5, 4100.0)
     ) AS v(code, base, per_km, per_min, minimum)
CROSS JOIN (VALUES ('34', 1.15), ('06', 1.00), ('31', 0.92)) AS c(code, mult)
CROSS JOIN (VALUES ('INSTANT'), ('SCHEDULED')) AS m(model);
