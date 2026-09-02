-- Katalog seed verisi (bkz. docs/08-yuk-kategorileri-ve-arac-onerisi.md)

-- ── Araç filosu — küçükten büyüğe; sort_order öneri motorunun sıralama temeli ──
INSERT INTO vehicle_types
    (code, display_name, volume_m3, payload_kg, inner_length_cm, inner_width_cm, inner_height_cm, example_loads, sort_order) VALUES
('MOTOR',       'Motor',       0.10,    25,   45,  40,  40, 'Evrak, numune, küçük paket, yemek',                   1),
('DOBLO',       'Doblo',       3.00,   600,  170, 130, 120, '3-5 koli, çamaşır makinesi, küçük mobilya',           2),
('TRANSPORTER', 'Transporter', 6.50,  1000,  260, 160, 150, 'Buzdolabı, ikili koltuk, 10-15 koli',                 3),
('TRANSIT',     'Transit',    11.00,  1500,  330, 180, 185, 'Bir oda eşyası, koltuk takımı, çift yatak',           4),
('KAMYONET',    'Kamyonet',   20.00,  2700,  430, 200, 220, '1+1 / 2+1 ev eşyası, 3-4 palet',                      5),
('KAMYON',      'Kamyon',     45.00, 10000,  720, 245, 255, '3+1 / 4+1 ev eşyası, 8-10 palet, inşaat malzemesi',   6),
('TIR',         'Tır',        90.00, 24000, 1360, 245, 270, 'Tam yük, 33 palet, depo/fabrika sevkiyatı',           7);

-- ── Yük kategorileri — panelde küçükten büyüğe sıralı ──
INSERT INTO cargo_categories
    (code, display_name, scale_hint, typical_volume_min_m3, typical_volume_max_m3, default_vehicle_type_code, default_package_item_code, detail_form_type, sort_order) VALUES
('BELGE_PAKET', 'Zarf & küçük paket',       'Sırt çantasına sığar',              0.00,  0.10, 'MOTOR',       'PAKET_KUCUK',   'PACKAGE_COUNT', 1),
('KOLI',        'Koli & orta paket',        'Tek kişi taşıyabilir',              0.10,  1.00, 'DOBLO',       'KOLI_STANDART', 'PACKAGE_COUNT', 2),
('TEKIL_ESYA',  'Tek büyük eşya',           'İki kişi taşır, arabaya sığmaz',    0.80,  3.00, 'TRANSPORTER', 'KOLI_STANDART', 'ITEM_PICKER',   3),
('ODA',         'Oda dolusu eşya',          'Öğrenci / stüdyo taşınması',        3.00, 10.00, 'TRANSIT',     'KOLI_STANDART', 'PRESET',        4),
('EV',          'Ev dolusu eşya',           '1+1''den 4+1''e',                  10.00, 45.00, 'KAMYONET',    'KOLI_STANDART', 'PRESET',        5),
('TICARI',      'Ticari yük & palet',       'Mağaza stoğu, toptan sevkiyat',     1.00, 90.00, 'KAMYONET',    'KOLI_BUYUK',    'PALLET',        6),
('INSAAT',      'İnşaat & hacimli malzeme', 'Kereste, alçıpan, demir, kum',      2.00, 45.00, 'KAMYONET',    NULL,            'MATERIAL',      7),
('OZEL',        'Özel / tarif edeceğim',    'Piyano, kasa, motosiklet, sanat',   NULL,  NULL, NULL,          NULL,            'FREE_TEXT',     8);

-- ── Eşya kataloğu ──
INSERT INTO cargo_items
    (code, category_code, display_name, volume_m3, weight_kg, longest_edge_cm, sort_order) VALUES
('BUZDOLABI_NOFROST',  'TEKIL_ESYA', 'Buzdolabı (no-frost)',      0.80,  90, 180,  1),
('CAMASIR_MAKINESI',   'TEKIL_ESYA', 'Çamaşır makinesi',          0.35,  70,  85,  2),
('BULASIK_MAKINESI',   'TEKIL_ESYA', 'Bulaşık makinesi',          0.32,  50,  85,  3),
('FIRIN_OCAK',         'TEKIL_ESYA', 'Fırın / ocak',              0.30,  40,  85,  4),
('KLIMA',              'TEKIL_ESYA', 'Klima (iç + dış ünite)',    0.20,  35, 110,  5),
('TELEVIZYON_55',      'TEKIL_ESYA', 'Televizyon (55")',          0.15,  20, 130,  6),
('KOLTUK_2LI',         'TEKIL_ESYA', 'İkili koltuk',              0.90,  45, 160,  7),
('KOLTUK_3LU',         'TEKIL_ESYA', 'Üçlü koltuk',               1.30,  60, 220,  8),
('KOLTUK_TAKIMI',      'TEKIL_ESYA', 'Koltuk takımı (3+1+1)',     3.20, 150, 220,  9),
('KANEPE_CEKYAT',      'TEKIL_ESYA', 'Kanepe / çekyat',           1.00,  50, 200, 10),
('YATAK_TEK',          'TEKIL_ESYA', 'Tek kişilik yatak',         0.45,  30, 200, 11),
('YATAK_CIFT',         'TEKIL_ESYA', 'Çift kişilik yatak',        0.90,  55, 200, 12),
('BAZA_CIFT',          'TEKIL_ESYA', 'Baza (çift)',               0.90,  60, 200, 13),
('GARDIROP_2KAPI',     'TEKIL_ESYA', 'Gardırop (2 kapılı)',       1.20,  80, 200, 14),
('GARDIROP_4KAPI',     'TEKIL_ESYA', 'Gardırop (4 kapılı)',       2.40, 150, 240, 15),
('YEMEK_MASASI',       'TEKIL_ESYA', 'Yemek masası',              0.80,  40, 180, 16),
('SANDALYE',           'TEKIL_ESYA', 'Sandalye',                  0.15,   6,  95, 17),
('CALISMA_MASASI',     'TEKIL_ESYA', 'Çalışma masası',            0.50,  30, 140, 18),
('KITAPLIK',           'TEKIL_ESYA', 'Kitaplık',                  0.70,  45, 180, 19),
('BISIKLET',           'TEKIL_ESYA', 'Bisiklet',                  0.35,  15, 180, 20),
('PIYANO_DUVAR',       'TEKIL_ESYA', 'Piyano (duvar tipi)',       1.10, 250, 150, 21),
-- Paket kalemleri: "kaç paket?" cevabının hacim karşılığı
('PAKET_KUCUK',        'BELGE_PAKET','Küçük paket / zarf',        0.02,   2,  35, 30),
('KOLI_STANDART',      'KOLI',       'Standart koli',             0.12,  12,  60, 31),
('KOLI_BUYUK',         'KOLI',       'Büyük koli',                0.25,  20,  80, 32);

-- ── Kategori bazlı sabit tahminler — kullanıcıya 40 eşyayı tek tek saydırmıyoruz ──
INSERT INTO cargo_presets
    (code, category_code, display_name, estimated_volume_m3, estimated_weight_kg, estimated_longest_edge_cm, sort_order) VALUES
('STUDYO_AZ',   'ODA',    'Stüdyo, az eşya',       5.00,   400, 200, 1),
('STUDYO_ORTA', 'ODA',    'Stüdyo, orta',          7.00,   600, 200, 2),
('ODA_TEK',     'ODA',    'Tek oda eşyası',        9.00,   800, 220, 3),
('EV_1A1',      'EV',     '1+1, orta',            12.00,  1100, 220, 1),
('EV_2A1_ORTA', 'EV',     '2+1, orta',            18.00,  1800, 240, 2),
('EV_2A1_COK',  'EV',     '2+1, çok eşyalı',      24.00,  2400, 240, 3),
('EV_3A1_ORTA', 'EV',     '3+1, orta',            28.00,  2900, 240, 4),
('EV_3A1_COK',  'EV',     '3+1, çok eşyalı',      36.00,  3800, 240, 5),
('EV_4A1_ORTA', 'EV',     '4+1, orta',            40.00,  4200, 240, 6),
('PALET_1',     'TICARI', 'Standart palet (1 adet)', 1.80,  400, 120, 1);

-- ── Platform komisyonu: komisyonsuz dönem, 2027 ilk çeyreğine kadar ──
INSERT INTO platform_commission (city_code, percent, version, valid_from, valid_to)
VALUES (NULL, 0.00, 1, now(), TIMESTAMPTZ '2027-03-31 23:59:59+03');
