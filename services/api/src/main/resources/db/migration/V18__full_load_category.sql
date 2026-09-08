-- Komple yük kategorisi: tam araç işleri için ayrı tarif akışı.
--
-- Mevcut kategoriler eşya sayısını soruyor ("kaç koli?", "hangi eşyalar?").
-- Kamyon ve tır işlerinde soru bu değil: NE yükleniyor — palet mi, tomruk mu,
-- dökme mi, konteyner mi. Aynı forma "80 koli" yazdırmak hem kullanıcıyı
-- zorluyor hem öneri motoruna anlamsız veri veriyordu.
--
-- Form tipi ITEM_PICKER olarak bırakıldı: yük tipleri adet seçilebilen kalemler
-- olarak modellendi, böylece öneri motoru hacim/ağırlık/en uzun kenar hesabını
-- aynı yoldan yapıyor. Yeni bir form tipi eklemek, aynı işi yapan ikinci bir
-- kod yolu demekti.
--
-- Kalemlerin ölçüleri tek birim içindir; adet kullanıcıdan geliyor.
--
-- 20 ft konteyner bilerek YOK: 21 tonluk tek parça, hizmetteki hiçbir araca
-- sığmıyor (kamyon 10 t) ve tır henüz açık değil. Her seçildiğinde "uygun araç
-- yok" dönecek bir seçeneği menüde tutmak, olmayan bir hizmeti vaat etmek olur.
-- Tır hizmete açıldığında bu kalem de eklenecek.

INSERT INTO cargo_categories
    (code, display_name, scale_hint, typical_volume_min_m3, typical_volume_max_m3,
     default_vehicle_type_code, default_package_item_code, detail_form_type, sort_order) VALUES
('KOMPLE', 'Komple yük / tam araç', 'Kamyon ya da tır dolusu',
 20.00, 90.00, 'KAMYON', NULL, 'ITEM_PICKER', 9);

INSERT INTO cargo_items
    (code, category_code, display_name, volume_m3, weight_kg, longest_edge_cm, sort_order) VALUES
-- Standart Euro palet 120×80, ~150 cm yüklü yükseklik
('PALET_EURO',      'KOMPLE', 'Palet (120×80)',            1.44,   600, 120, 1),
('PALET_SANAYI',    'KOMPLE', 'Sanayi paleti (120×100)',   1.80,   800, 120, 2),
('TOMRUK',          'KOMPLE', 'Tomruk / kereste (1 ton)',  1.60,  1000, 600, 3),
('DOKME_BIGBAG',    'KOMPLE', 'Big-bag / çuval (1 ton)',   1.10,  1000, 120, 4),
('MAKINE_EKIPMAN',  'KOMPLE', 'Makine / ekipman',          8.00,  4000, 400, 5),
('KARISIK_KARGO',   'KOMPLE', 'Karışık kargo (1 ton)',     4.00,  1000, 200, 7);
