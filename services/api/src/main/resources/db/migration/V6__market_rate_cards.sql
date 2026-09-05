-- Tarife, Eylül 2026 pazar araştırmasına göre yeniden kuruldu (docs/12).
--
-- V5'teki değerler "GEÇİCİ" işaretliydi ve piyasanın 3-5 kat altındaydı
-- (ör. şehir içi panelvan ~850 ₺; piyasa 1.200-2.500 ₺). Yeni değerler nakliye
-- firmalarının yayınladığı 2026 tarifeleri, yük pazarı spot fiyatları ve platform
-- (Armut) iş kayıtlarından türetildi; hedef, firma tam-hizmet fiyatı ile pazar spot
-- fiyatının ortası — çünkü Taşıyoruz'da kesin fiyatı araç sahibi teklifle veriyor,
-- tarife yalnızca tahmini aralığın çapası.
--
-- Fiyat motoru formülü (DefaultPricingService):
--   taban + kademeli km (dahil km düşülür) + dakika × süre + ek hizmetler; minimum kontrolü; komisyon.
-- Kademeler: 0-25 km tam, 25-150 km %70, 150+ km %38 — şehirlerarası uzun yolda
-- birim km ucuzlar, aksi hâlde 455 km İstanbul-Ankara piyasa üstüne çıkıyor.
--
-- Yayınlanmış V5 düzenlenmedi: eski kartlar pasife alınır, yeni sürüm eklenir.
-- Fiyat anlık görüntüsü kuralı (CLAUDE.md) gereği geçmiş teklifler etkilenmez.

UPDATE rate_cards
   SET active = FALSE, valid_to = now()
 WHERE carrier_id IS NULL AND active;

INSERT INTO rate_cards
    (city_code, vehicle_type_code, service_model, base_fare, included_km, per_km_rate,
     per_minute_rate, minimum_fare, waiting_free_minutes, waiting_per_minute_rate,
     distance_tiers, version)
SELECT
    c.code, v.code, m.model,
    ROUND((v.base     * c.mult)::numeric, 2),
    v.incl,
    ROUND((v.per_km   * c.mult)::numeric, 2),
    ROUND((v.per_min  * c.mult)::numeric, 2),
    ROUND((v.minimum  * c.mult)::numeric, 2),
    v.wait_free,
    ROUND((v.wait_rate * c.mult)::numeric, 2),
    '[{"fromKm":0,"toKm":25,"factor":1.0},
      {"fromKm":25,"toKm":150,"factor":0.70},
      {"fromKm":150,"toKm":null,"factor":0.38}]'::jsonb,
    2
FROM (VALUES
    --  araç         taban   dahil  km     dk    minimum  bekleme: ücretsiz dk, ₺/dk
    ('MOTOKURYE',   125.0,  2.00, 11.0,  1.00,   195.0,   5,  9.0),
    ('PANELVAN',    900.0,  3.00, 24.0,  2.20,  1300.0,  30,  4.4),
    ('KAMYONET',   2300.0,  3.00, 34.0,  3.50,  3300.0,  30,  7.0),
    ('KAMYON',     3500.0,  3.00, 46.0,  5.00,  5600.0,  30, 10.0),
    ('KIRKAYAK',   4700.0,  3.00, 56.0,  6.00,  7600.0,  30, 12.0),
    ('TIR',        5900.0,  3.00, 70.0,  7.00,  9600.0,  30, 14.0)
) AS v(code, base, incl, per_km, per_min, minimum, wait_free, wait_rate)
-- Şehir katsayısı: İstanbul trafik ve köprü/otoyol maliyeti; Hatay daha düşük işçilik
CROSS JOIN (VALUES ('34', 1.08), ('06', 1.00), ('31', 0.95)) AS c(code, mult)
-- Planlı taşıma şimdilik anlıkla aynı; talep verisi gelince indirim düşünülür
CROSS JOIN (VALUES ('INSTANT'), ('SCHEDULED')) AS m(model);

-- Ek hizmetler: V4 değerleri 2026 işçiliğinin çok altındaydı (hamaliye 150 ₺).
UPDATE extra_services SET rate = 1800.00, description = 'Yükleme ve boşaltmada 2 kişilik ekip' WHERE code = 'PORTERAGE';
UPDATE extra_services SET rate =  120.00 WHERE code = 'NO_ELEVATOR';
UPDATE extra_services SET rate =  350.00 WHERE code = 'EXTRA_STOP';
UPDATE extra_services SET rate = 1500.00 WHERE code = 'PACKAGING';
UPDATE extra_services SET rate = 1200.00 WHERE code = 'ASSEMBLY';
UPDATE extra_services SET rate =  350.00 WHERE code = 'TARPAULIN';
UPDATE extra_services SET rate =  250.00 WHERE code = 'STRAPPING';
UPDATE extra_services SET rate =    9.00 WHERE code = 'WAITING';

-- Ev taşımada yaygın, listede yoktu: dış cephe taşıma asansörü (piyasa 2.000-4.000 ₺/gün)
INSERT INTO extra_services (code, display_name, description, pricing_type, rate, unit_label, sort_order) VALUES
('MOVING_LIFT', 'Taşıma asansörü', 'Dış cepheden eşya indirme ve çıkarma için mobil asansör', 'FIXED', 3000.00, NULL, 10);
