-- Filo yeniden tanımlandı: kırkayak çıktı, van sınıfı üçe ayrıldı.
--
-- V5'teki filo tek bir "panelvan" basamağı ile 30 kg'dan 3,5 tona atlıyordu; aradaki
-- işlerin çoğu (birkaç koli, tek beyaz eşya, öğrenci taşınması) bu boşluğa düşüyor ve
-- kullanıcı hep bir üst aracın parasını ödüyordu. Van sınıfı üçe bölündü:
--   mini panelvan (Fiorino/Courier) → panelvan (Doblo/Connect) → minivan (Transporter/Transit)
--
-- Kırkayak kaldırıldı: 18 tonluk araç için ne arz verisi ne fiyat kaynağı vardı
-- (docs/12 §2, "Kırkayak için doğrudan veri yok"). Kamyon 10 t ile TIR 24 t arasındaki
-- boşluk, TIR hizmete açılınca yeniden değerlendirilir.
--
-- MOTOKURYE kodu MOTOR'a döndü: motokurye hizmetin adı, motor aracın adı. V2'deki
-- özgün kod da MOTOR'du.

-- ── 1) Yeni araçlar ────────────────────────────────────────────────────────
INSERT INTO vehicle_types
    (code, display_name, volume_m3, payload_kg, inner_length_cm, example_loads, sort_order, active) VALUES
('MOTOR',         'Motor',         0.10,   30,   45, 'Zarf, evrak, küçük koli',            1, TRUE),
('MINI_PANELVAN', 'Mini panelvan', 2.50,  600,  150, '5-6 koli, çamaşır makinesi',         2, TRUE),
('MINIVAN',       'Minivan',       8.00, 1300,  330, 'Oda dolusu eşya, yaklaşık 15 koli',  4, TRUE);

-- ── 2) Panelvan orta basamağa çekildi, sıralamalar kaydı ──────────────────
UPDATE vehicle_types SET
    volume_m3 = 5.00, payload_kg = 1000, inner_length_cm = 250,
    example_loads = '10-12 koli, buzdolabı, çift yatak', sort_order = 3
WHERE code = 'PANELVAN';

UPDATE vehicle_types SET sort_order = 5 WHERE code = 'KAMYONET';
UPDATE vehicle_types SET sort_order = 6 WHERE code = 'KAMYON';
UPDATE vehicle_types SET sort_order = 7 WHERE code = 'TIR';   -- active = FALSE, "Yakında"

-- ── 3) Kaldırılan araçlara bağlı referanslar ──────────────────────────────
UPDATE cargo_categories SET default_vehicle_type_code = 'MOTOR'   WHERE default_vehicle_type_code = 'MOTOKURYE';
UPDATE cargo_categories SET default_vehicle_type_code = 'KAMYON'  WHERE default_vehicle_type_code = 'KIRKAYAK';
-- "Oda dolusu eşya" 3-10 m³; kamyonetin 18 m³'ü fazlaydı, minivan tam karşılığı
UPDATE cargo_categories SET default_vehicle_type_code = 'MINIVAN' WHERE code = 'ODA';

-- Tarife kartları vehicle_types(code) FK'sı taşıyor; araç silinmeden önce temizlenir.
-- Geçmiş teklifleri etkilemez: fiyat anlık görüntüsü siparişe kopyalanıyor (CLAUDE.md).
DELETE FROM rate_cards WHERE vehicle_type_code IN ('MOTOKURYE', 'KIRKAYAK');
DELETE FROM vehicle_types WHERE code IN ('MOTOKURYE', 'KIRKAYAK');

-- ── 4) Tarife: V6 yapısı korunur, yeni filoya göre yeniden kurulur ────────
-- Mini panelvan ve panelvan, docs/12'deki "hafif ticari 900-1.200 ₺" bandına;
-- minivan eski panelvan değerlerini devralıyor ("panelvan 1.200-2.500 ₺" bandı).
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
    3
FROM (VALUES
    --  araç             taban   dahil  km     dk    minimum  bekleme: ücretsiz dk, ₺/dk
    ('MOTOR',           125.0,  2.00, 11.0,  1.00,   195.0,   5,  9.0),
    ('MINI_PANELVAN',   480.0,  3.00, 15.0,  1.40,   720.0,  30,  3.0),
    ('PANELVAN',        640.0,  3.00, 19.0,  1.70,   950.0,  30,  3.6),
    ('MINIVAN',         900.0,  3.00, 24.0,  2.20,  1300.0,  30,  4.4),
    ('KAMYONET',       2300.0,  3.00, 34.0,  3.50,  3300.0,  30,  7.0),
    ('KAMYON',         3500.0,  3.00, 46.0,  5.00,  5600.0,  30, 10.0),
    ('TIR',            5900.0,  3.00, 70.0,  7.00,  9600.0,  30, 14.0)
) AS v(code, base, incl, per_km, per_min, minimum, wait_free, wait_rate)
CROSS JOIN (VALUES ('34', 1.08), ('06', 1.00), ('31', 0.95)) AS c(code, mult)
CROSS JOIN (VALUES ('INSTANT'), ('SCHEDULED')) AS m(model);
