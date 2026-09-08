-- Otomobil eklendi, minivan kaldırıldı.
--
-- MİNİVAN NEDEN KALKIYOR: Türkçe'de panelvan yük sınıfı, minivan yolcu sınıfı.
-- Panelvanın arka bölümü camsız metal panel ve yük için tasarlanmış; minivan
-- koltuk konforuna göre kurgulanmış, koltuklar katlanınca yük de alabiliyor.
-- İkisini ayrı basamak olarak listelemek, kullanıcıya olmayan bir seçim
-- sorduruyordu. Panelvan minivanın kapasitesini devralıyor (1,3 t / 8 m³).
--
-- OTOMOBİL NEDEN GELİYOR: motor ile mini panelvan arasında gerçek bir boşluk
-- vardı. Kurye pratiğinde motorun sınırı ~20 kg / 20 desi; bunun üstündeki
-- küçük işler "araçlı kurye" ile taşınıyor ve bugüne kadar mini panelvan
-- fiyatına biniyordu.

INSERT INTO vehicle_types
    (code, display_name, volume_m3, payload_kg, inner_length_cm, example_loads, sort_order, active) VALUES
('OTOMOBIL', 'Otomobil', 0.60, 150, 120, '3-5 koli, valiz, küçük eşya', 2, TRUE);

UPDATE vehicle_types SET sort_order = 3 WHERE code = 'MINI_PANELVAN';

-- Panelvan minivanın yerini alıyor
UPDATE vehicle_types SET
    volume_m3 = 8.00, payload_kg = 1300, inner_length_cm = 330,
    example_loads = 'Oda dolusu eşya, yaklaşık 15 koli', sort_order = 4
WHERE code = 'PANELVAN';

UPDATE cargo_categories SET default_vehicle_type_code = 'PANELVAN'
 WHERE default_vehicle_type_code = 'MINIVAN';

-- Tarife kartları vehicle_types(code) FK'sı taşıyor; araç silinmeden temizlenir.
-- Geçmiş teklifleri etkilemez: fiyat anlık görüntüsü siparişe kopyalanıyor.
DELETE FROM rate_cards WHERE vehicle_type_code = 'MINIVAN';
DELETE FROM vehicle_types WHERE code = 'MINIVAN';

-- ── Tarife: V7 yapısı korunur, yeni filoya göre yeniden kurulur ──────────
-- Otomobil motor ile mini panelvan arasına yerleşiyor. Panelvan minivanın
-- değerlerini devralıyor — kapasitesini de devraldığı için fiyatı da onunki.
UPDATE rate_cards
   SET active = FALSE, valid_to = now()
 WHERE carrier_id IS NULL AND active;

INSERT INTO rate_cards
    (city_code, vehicle_type_code, service_model, base_fare, included_km, per_km_rate,
     per_minute_rate, minimum_fare, waiting_free_minutes, waiting_per_minute_rate,
     distance_tiers, version)
SELECT
    c.code, v.code, m.model,
    ROUND((v.base      * c.mult)::numeric, 2),
    v.incl,
    ROUND((v.per_km    * c.mult)::numeric, 2),
    ROUND((v.per_min   * c.mult)::numeric, 2),
    ROUND((v.minimum   * c.mult)::numeric, 2),
    v.wait_free,
    ROUND((v.wait_rate * c.mult)::numeric, 2),
    '[{"fromKm":0,"toKm":25,"factor":1.0},
      {"fromKm":25,"toKm":150,"factor":0.70},
      {"fromKm":150,"toKm":null,"factor":0.38}]'::jsonb,
    4
FROM (VALUES
    --  araç             taban   dahil  km     dk    minimum  bekleme: ücretsiz dk, ₺/dk
    ('MOTOR',           125.0,  2.00, 11.0,  1.00,   195.0,   5,  9.0),
    ('OTOMOBIL',        260.0,  2.00, 13.0,  1.20,   400.0,  10,  9.0),
    ('MINI_PANELVAN',   480.0,  3.00, 15.0,  1.40,   720.0,  30,  3.0),
    ('PANELVAN',        900.0,  3.00, 24.0,  2.20,  1300.0,  30,  4.4),
    ('KAMYONET',       2300.0,  3.00, 34.0,  3.50,  3300.0,  30,  7.0),
    ('KAMYON',         3500.0,  3.00, 46.0,  5.00,  5600.0,  30, 10.0),
    ('TIR',            5900.0,  3.00, 70.0,  7.00,  9600.0,  30, 14.0)
) AS v(code, base, incl, per_km, per_min, minimum, wait_free, wait_rate)
-- '00' ulusal varsayılan: tarifesi tanımlı olmayan 78 il bunu kullanıyor (V8).
-- Tarife yenilenirken atlanırsa o iller fiyat alamıyor.
CROSS JOIN (VALUES ('00', 1.00), ('34', 1.08), ('06', 1.00), ('31', 0.95)) AS c(code, mult)
CROSS JOIN (VALUES ('INSTANT'), ('SCHEDULED')) AS m(model);
