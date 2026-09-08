-- Yerel geliştirme için örnek açık ilanlar.
--
-- Migration DEĞİL: repoda dursun ama şemaya karışmasın diye elle çalıştırılıyor
-- (pnpm demo:listings). Üretim veritabanında bu satırların işi yok.
--
-- Neden gerekiyor: ana sayfadaki "açık koridorlar", araç sahibinin ilan listesi ve
-- haritası, hepsi gerçek ilana bakıyor. Sıfırdan kurulan bir ortamda hiç ilan
-- olmadığı için bu ekranlar boş görünüyor ve çalışmıyor sanılıyor.
--
-- Fotoğraf yok: dosyalar nesne deposunda duruyor ve SQL oraya yazamıyor. Fotoğraflı
-- bir ilan görmek için panelden bir tane yayınlamak gerekiyor.

BEGIN;

-- Tekrar çalıştırılabilir olsun: önceki demo satırları gidiyor
DELETE FROM load_listings WHERE shipper_id = 'demo-shipper';

INSERT INTO load_listings (
    listing_number, shipper_id, service_model, vehicle_type_code,
    pickup_district_id, dropoff_district_id,
    pickup_floor, pickup_has_elevator, dropoff_floor, dropoff_has_elevator,
    extra_services, declared_items, cargo_description,
    estimate_snapshot, estimated_amount, status, published_at, expires_at)
SELECT
    'DEMO-' || d.n,
    'demo-shipper', 'SCHEDULED', d.vehicle,
    (SELECT id FROM districts WHERE city_code = d.from_city ORDER BY name LIMIT 1),
    (SELECT id FROM districts WHERE city_code = d.to_city   ORDER BY name LIMIT 1),
    d.floor, d.elevator, 0, true,
    '[]'::jsonb,
    d.items,
    d.note,
    jsonb_build_object(
        'quoteId', gen_random_uuid()::text,
        'serviceModel', 'SCHEDULED',
        'vehicleTypeCode', d.vehicle,
        'distanceMeters', d.km * 1000,
        'durationSeconds', d.km * 55,
        'approximateDistance', true,
        'breakdown', '[]'::jsonb,
        'totalAmount', jsonb_build_object('amount', d.amount, 'currency', 'TRY'),
        'floorPrice', jsonb_build_object('amount', d.amount, 'currency', 'TRY'),
        'expiresAt', to_char(now() + interval '2 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'signature', 'demo'),
    d.amount, 'OPEN', now() - (d.n || ' hours')::interval, now() + interval '2 days'
FROM (VALUES
    -- İstanbul → İzmir
    (1, '34', '35', 'KAMYONET', 3, false, 480, 18500,
     '[{"itemCode":"KOLTUK_3LU","displayName":"Üçlü koltuk","quantity":1,"volumeM3":1.30,"weightKg":60},
       {"itemCode":"KOLI_STANDART","displayName":"Standart koli","quantity":14,"volumeM3":0.12,"weightKg":12}]'::jsonb,
     'Öğrenci evi taşınması. Asansör yok, üçüncü kat.'),
    (2, '34', '35', 'PANELVAN', 0, true, 480, 12200,
     '[{"itemCode":"CAMASIR_MAKINESI","displayName":"Çamaşır makinesi","quantity":1,"volumeM3":0.35,"weightKg":70},
       {"itemCode":"KOLI_STANDART","displayName":"Standart koli","quantity":6,"volumeM3":0.12,"weightKg":12}]'::jsonb,
     null),
    -- İstanbul → Ankara
    (3, '34', '06', 'KAMYON', 0, true, 450, 31000,
     '[{"itemCode":"PALET_EURO","displayName":"Palet (120×80)","quantity":8,"volumeM3":1.44,"weightKg":600}]'::jsonb,
     'Paletli sevkiyat, forklift alışta var.'),
    (4, '34', '06', 'KAMYONET', 2, true, 450, 16800,
     '[{"itemCode":"GARDIROP_2KAPI","displayName":"Gardırop (2 kapılı)","quantity":1,"volumeM3":1.20,"weightKg":80},
       {"itemCode":"YATAK_CIFT","displayName":"Çift kişilik yatak","quantity":1,"volumeM3":0.90,"weightKg":55},
       {"itemCode":"KOLI_STANDART","displayName":"Standart koli","quantity":9,"volumeM3":0.12,"weightKg":12}]'::jsonb,
     null),
    -- Ankara → İstanbul (boş dönüş koridoru)
    (5, '06', '34', 'PANELVAN', 0, true, 450, 11400,
     '[{"itemCode":"KOLI_BUYUK","displayName":"Büyük koli","quantity":12,"volumeM3":0.25,"weightKg":20}]'::jsonb,
     'Ofis dosyaları ve ekipman.'),
    (6, '06', '34', 'KAMYONET', 1, false, 450, 17600,
     '[{"itemCode":"KOLTUK_L","displayName":"L (köşe) koltuk","quantity":1,"volumeM3":2.60,"weightKg":120},
       {"itemCode":"TELEVIZYON_55","displayName":"Televizyon (55\")","quantity":1,"volumeM3":0.15,"weightKg":20}]'::jsonb,
     null),
    -- Bursa → İstanbul: tek ilan. Ana sayfada GÖRÜNMEMELİ — koridor eşiği iki ilan
    (7, '16', '34', 'MOTOR', 0, true, 155, 1450,
     '[{"itemCode":"PAKET_KUCUK","displayName":"Küçük paket / zarf","quantity":1,"volumeM3":0.02,"weightKg":2}]'::jsonb,
     'Evrak.'),
    -- Filonun tamamı temsil edilsin: ilanlar sayfasındaki araç süzgeci, karşılığı
    -- olmayan bir çipe basan kullanıcıyı boş sayfaya düşürüyordu.
    (8, '35', '34', 'OTOMOBIL', 0, true, 480, 3900,
     '[{"itemCode":"KOLI_STANDART","displayName":"Standart koli","quantity":4,"volumeM3":0.12,"weightKg":12}]'::jsonb,
     'Öğrenci dönüşü, dört koli.'),
    (9, '34', '16', 'OTOMOBIL', 2, true, 155, 2450,
     '[{"itemCode":"TELEVIZYON_55","displayName":"Televizyon (55\")","quantity":1,"volumeM3":0.15,"weightKg":20},
       {"itemCode":"KOLI_STANDART","displayName":"Standart koli","quantity":2,"volumeM3":0.12,"weightKg":12}]'::jsonb,
     null),
    (10, '06', '42', 'MINI_PANELVAN', 1, false, 260, 7300,
     '[{"itemCode":"CAMASIR_MAKINESI","displayName":"Çamaşır makinesi","quantity":1,"volumeM3":0.35,"weightKg":70},
       {"itemCode":"KOLTUK_TEKLI","displayName":"Tekli koltuk / berjer","quantity":2,"volumeM3":0.55,"weightKg":25},
       {"itemCode":"KOLI_STANDART","displayName":"Standart koli","quantity":5,"volumeM3":0.12,"weightKg":12}]'::jsonb,
     'Asansör yok, birinci kat.'),
    (11, '34', '06', 'MINI_PANELVAN', 0, true, 450, 9800,
     '[{"itemCode":"CALISMA_MASASI","displayName":"Çalışma masası","quantity":1,"volumeM3":0.50,"weightKg":30},
       {"itemCode":"KITAPLIK","displayName":"Kitaplık","quantity":1,"volumeM3":0.70,"weightKg":45},
       {"itemCode":"KOLI_BUYUK","displayName":"Büyük koli","quantity":3,"volumeM3":0.25,"weightKg":20}]'::jsonb,
     null)
) AS d(n, from_city, to_city, vehicle, floor, elevator, km, amount, items, note);

COMMIT;

SELECT count(*) || ' demo ilan eklendi.' AS sonuc FROM load_listings WHERE shipper_id = 'demo-shipper';
