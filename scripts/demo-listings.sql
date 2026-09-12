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

-- ─────────────────────────────────────────────────────────────
-- İstanbul içi: yaka tarifesinin üç senaryosu (V22)
--
-- Yukarıdaki ilanlar şehirlerarası; il seçilince açılan haritada gösterilecek
-- bir şey bırakmıyorlardı. Bu üçü ilçeleri ADIYLA seçiyor — yukarıdaki blok
-- "ilin ilk ilçesi" diyor ve yaka ayrımı için işe yaramaz.
--
-- Tutarlar V22 tarifesinden: Avrupa içi kısa 900 + km×55 (minimum 1.500),
-- yaka geçişli kısa 1.300 + km×55 + 400.
INSERT INTO load_listings (
    listing_number, shipper_id, service_model, vehicle_type_code,
    pickup_district_id, dropoff_district_id,
    pickup_floor, pickup_has_elevator, dropoff_floor, dropoff_has_elevator,
    extra_services, declared_items, cargo_description,
    estimate_snapshot, estimated_amount, status, published_at, expires_at)
SELECT
    'DEMO-' || d.n,
    'demo-shipper', 'SCHEDULED', d.vehicle,
    (SELECT id FROM districts WHERE city_code = '34' AND slug = d.from_slug),
    (SELECT id FROM districts WHERE city_code = '34' AND slug = d.to_slug),
    d.floor, d.elevator, 0, true,
    '[]'::jsonb,
    d.items,
    d.note,
    jsonb_build_object(
        'quoteId', gen_random_uuid()::text,
        'serviceModel', 'SCHEDULED',
        'vehicleTypeCode', d.vehicle,
        'distanceMeters', d.km * 1000,
        'durationSeconds', d.km * 150,
        'approximateDistance', true,
        'breakdown', '[]'::jsonb,
        'totalAmount', jsonb_build_object('amount', d.amount, 'currency', 'TRY'),
        'floorPrice', jsonb_build_object('amount', d.amount, 'currency', 'TRY'),
        'expiresAt', to_char(now() + interval '2 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'signature', 'demo'),
    d.amount, 'OPEN', now() - (d.n || ' hours')::interval, now() + interval '2 days'
FROM (VALUES
    -- Avrupa yakası içinde
    (12, 'besiktas', 'sisli', 'PANELVAN', 2, true, 4, 1500,
     '[{"itemCode":"KOLTUK_2LI","displayName":"İkili koltuk","quantity":1,"volumeM3":0.95,"weightKg":45},
       {"itemCode":"KOLI_STANDART","displayName":"Standart koli","quantity":8,"volumeM3":0.12,"weightKg":12}]'::jsonb,
     'Ev içi taşınma, Beşiktaş''tan Şişli''ye.'),
    -- Yaka geçişli: köprü ücreti tarifeye giriyor
    (13, 'besiktas', 'kadikoy', 'PANELVAN', 0, true, 8, 2140,
     '[{"itemCode":"BUZDOLABI_NOFROST","displayName":"Buzdolabı (no-frost)","quantity":1,"volumeM3":0.60,"weightKg":75},
       {"itemCode":"CAMASIR_MAKINESI","displayName":"Çamaşır makinesi","quantity":1,"volumeM3":0.35,"weightKg":70}]'::jsonb,
     'Boğaz geçişli, beyaz eşya.'),
    -- Anadolu yakası içinde
    (14, 'kadikoy', 'atasehir', 'PANELVAN', 1, false, 7, 1500,
     '[{"itemCode":"CALISMA_MASASI","displayName":"Çalışma masası","quantity":1,"volumeM3":0.50,"weightKg":30},
       {"itemCode":"KITAPLIK","displayName":"Kitaplık","quantity":2,"volumeM3":0.70,"weightKg":45},
       {"itemCode":"KOLI_BUYUK","displayName":"Büyük koli","quantity":5,"volumeM3":0.25,"weightKg":20}]'::jsonb,
     'Ofis taşınması, asansör yok.')
) AS d(n, from_slug, to_slug, vehicle, floor, elevator, km, amount, items, note);

-- ── Her ilde iş olsun ─────────────────────────────────────────────────────
--
-- Harita il il tıklanabilir ve ilanı OLMAYAN il tıklanmıyor: gri bir ile basıp
-- boş sayfaya düşmek süzgeç değil çıkmaz sokak olurdu. Yukarıdaki elle yazılmış
-- ilanlar yalnızca birkaç ili dolduruyor, geri kalan yetmiş küsur il haritada
-- ölüydü.
--
-- Bu blok üretiyor: her il, kod sırasında kendinden BİR ve YEDİ sonraki ile
-- birer yük yolluyor (dairesel — son iller başa dönüyor). Eşleme keyfi ama
-- deterministik: betik yeniden çalıştığında aynı tablo çıkıyor.
--
-- Mesafe UYDURULMUYOR: ilçe centroid'leri arasındaki gerçek uzaklık, PostGIS
-- geography tipi üzerinde metre cinsinden. Tutar ise tarife motorundan gelmiyor
-- (SQL fiyat hesaplayamaz); taban + km × katsayı ile üretiliyor. Yuvarlak
-- duruyor ki demo verisi olduğu belli olsun, fiyat sayfasının çıktısıyla
-- karıştırılmasın.
WITH il_ilce AS (
    -- İl başına tek temsilci: adı ilk gelen ilçe
    SELECT DISTINCT ON (city_code) city_code, id, centroid
    FROM districts WHERE active
    ORDER BY city_code, name
),
sirali AS (
    SELECT *, row_number() OVER (ORDER BY city_code) AS n, count(*) OVER () AS toplam
    FROM il_ilce
),
rotalar AS (
    SELECT a.city_code, a.id AS from_id, b.id AS to_id, a.centroid AS f_c, b.centroid AS t_c, 1 AS k
    FROM sirali a JOIN sirali b ON b.n = (a.n % a.toplam) + 1
    UNION ALL
    SELECT a.city_code, a.id, b.id, a.centroid, b.centroid, 2
    FROM sirali a JOIN sirali b ON b.n = ((a.n + 6) % a.toplam) + 1
    UNION ALL
    /*
     * İl içi rota yalnızca gerçek ilçe listesi olan illerde kurulabiliyor:
     * İstanbul, Ankara ve Hatay. Diğer 78 ilde katalogda tek bir "Merkez" var
     * (V8'de geçici konmuş yer tutucu), yani alış ile teslim aynı noktaya
     * düşerdi. Sıfır kilometrelik bir ilan üretmektense üretmemek doğru.
     * Katalog gerçek ilçelerle dolduğunda bu satır kendiliğinden çoğalır.
     */
    SELECT d1.city_code, d1.id, d2.id, d1.centroid, d2.centroid, 3
    FROM il_ilce d1
    JOIN LATERAL (
        SELECT id, centroid FROM districts d
        WHERE d.city_code = d1.city_code AND d.id <> d1.id AND d.active
        ORDER BY d.name DESC LIMIT 1
    ) d2 ON true
)
INSERT INTO load_listings (
    listing_number, shipper_id, service_model, vehicle_type_code,
    pickup_district_id, dropoff_district_id,
    pickup_floor, pickup_has_elevator, dropoff_floor, dropoff_has_elevator,
    extra_services, declared_items, cargo_description,
    estimate_snapshot, estimated_amount, status, published_at, expires_at)
SELECT
    'DEMO-IL-' || r.city_code || '-' || r.k,
    'demo-shipper', 'SCHEDULED', v.vehicle,
    r.from_id, r.to_id,
    0, true, 0, true,
    '[]'::jsonb,
    v.items,
    v.note,
    jsonb_build_object(
        'quoteId', gen_random_uuid()::text,
        'serviceModel', 'SCHEDULED',
        'vehicleTypeCode', v.vehicle,
        'distanceMeters', m.km * 1000,
        'durationSeconds', m.km * 55,
        'approximateDistance', true,
        'breakdown', '[]'::jsonb,
        'totalAmount', jsonb_build_object('amount', v.amount, 'currency', 'TRY'),
        'floorPrice', jsonb_build_object('amount', v.amount, 'currency', 'TRY'),
        'expiresAt', to_char(now() + interval '2 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'signature', 'demo'),
    v.amount, 'OPEN',
    -- Yayın anları dağılsın: hepsi aynı saniyede görünürse liste sıralaması
    -- rastgeleleşiyor ve "en yeni" başlığı anlamsızlaşıyor
    now() - ((r.k * 7 + (('x' || substr(md5(r.city_code), 1, 4))::bit(16)::int % 40)) || ' hours')::interval,
    now() + interval '3 days'
FROM rotalar r
CROSS JOIN LATERAL (SELECT greatest(round(ST_Distance(r.f_c, r.t_c) / 1000)::int, 1) AS km) m
CROSS JOIN LATERAL (
    SELECT
        CASE r.k WHEN 1 THEN 'PANELVAN' WHEN 2 THEN 'KAMYONET' ELSE 'PANELVAN' END AS vehicle,
        CASE r.k
            -- İl içi kısa mesafe: V22'nin panelvan tabanı ve minimumuyla aynı çizgide
            WHEN 3 THEN greatest(900 + m.km * 55, 1500)
            WHEN 1 THEN 900 + m.km * 22
            ELSE 1200 + m.km * 28
        END AS amount,
        CASE r.k
            WHEN 3 THEN '[{"itemCode":"KOLI_STANDART","displayName":"Standart koli","quantity":9,"volumeM3":0.12,"weightKg":12}]'::jsonb
            WHEN 1 THEN '[{"itemCode":"KOLI_BUYUK","displayName":"Büyük koli","quantity":6,"volumeM3":0.25,"weightKg":20},
                          {"itemCode":"CALISMA_MASASI","displayName":"Çalışma masası","quantity":1,"volumeM3":0.50,"weightKg":30}]'::jsonb
            ELSE '[{"itemCode":"PALET_EURO","displayName":"Palet (120×80)","quantity":4,"volumeM3":1.44,"weightKg":600}]'::jsonb
        END AS items,
        CASE r.k
            WHEN 3 THEN 'Şehir içi taşıma.'
            WHEN 1 THEN 'Parça yük, şehirlerarası.'
            ELSE 'Paletli sevkiyat.'
        END AS note
) v;

COMMIT;

SELECT count(*) || ' demo ilan eklendi.' AS sonuc FROM load_listings WHERE shipper_id = 'demo-shipper';
