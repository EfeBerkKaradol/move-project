-- Hamaliye sabit ücretten kişi başına ücrete geçiyor.
--
-- Sabit 1.800 ₺ gerçeği anlatmıyordu: hamal yevmiyesi 2.500–3.000 ₺ ve işlerin
-- çoğu tek kişiyle yapılamıyor — koltuk, buzdolabı, çamaşır makinesi iki kişi
-- ister. Aynı ücreti hem birkaç koliye hem 3+1 ev taşımasına yazmak, küçük işi
-- pahalı, büyük işi karşılıksız bırakıyordu.
--
-- Yeni model: ücret KİŞİ BAŞINA, kişi sayısı yükün gerektirdiği araçtan
-- türetiliyor (DefaultPricingService.porterCount). Araç zaten yükten
-- hesaplanıyor; ayrı bir "kaç kişi?" sorusu sormaya gerek yok.
--
-- 1.500 ₺/kişi: yevmiyenin yarım günlük karşılığı. Taşımaların çoğu 2–4 saat
-- sürüyor; 8 saatlik tam gün iki blok olarak fiyatlanır (kişi sayısı artar).
-- Asansörsüz katlar ayrıca ücretlendiriliyor (NO_ELEVATOR), buraya girmiyor.
UPDATE extra_services SET
    pricing_type = 'PER_UNIT',
    rate = 1500.00,
    unit_label = 'kişi',
    display_name = 'Hamaliye',
    description = 'Yükleme ve boşaltmada taşıma ekibi. Kişi sayısı araç tipine göre '
                  || 'belirlenir; asansörsüz katlar ayrıca ücretlendirilir.'
WHERE code = 'PORTERAGE';
