-- 81 il kapsamı ve şehirlerarası taşıma
--
-- Ürün şehirlerarası bir yük pazarı (docs/11 §4). Bu migration:
--   1) Eksik 78 ile birer "Merkez" ilçesi ekler — yalnızca İstanbul, Ankara ve
--      Hatay'ın ilçe verisi vardı.
--   2) Tarifesi olmayan iller için ulusal varsayılan tarife (city_code '00') kurar.
--
-- ⚠️ "Merkez" satırları GEÇİCİ: koordinat il merkezinin yaklaşık noktası, ilçe adı
-- büyükşehirlerde gerçek bir ilçe değil (Konya'da Selçuklu/Meram/Karatay gibi).
-- Google Geocoding devreye girince gerçek adres koordinatları bunların yerini
-- alacak (ANAHTARLAR.md #1); il bazlı ilçe listesi de ayrı bir işle doldurulacak.

INSERT INTO districts (city_code, city_name, name, slug, centroid) VALUES
('01', 'Adana', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(35.3213, 37.0), 4326)::geography),
('02', 'Adıyaman', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(38.2786, 37.7648), 4326)::geography),
('03', 'Afyonkarahisar', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(30.5567, 38.7507), 4326)::geography),
('04', 'Ağrı', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(43.0503, 39.7191), 4326)::geography),
('05', 'Amasya', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(35.8353, 40.6499), 4326)::geography),
('07', 'Antalya', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(30.7133, 36.8969), 4326)::geography),
('08', 'Artvin', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(41.8183, 41.1828), 4326)::geography),
('09', 'Aydın', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(27.8416, 37.856), 4326)::geography),
('10', 'Balıkesir', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(27.8826, 39.6484), 4326)::geography),
('11', 'Bilecik', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(29.9798, 40.1451), 4326)::geography),
('12', 'Bingöl', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(40.4983, 38.8854), 4326)::geography),
('13', 'Bitlis', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(42.1095, 38.4006), 4326)::geography),
('14', 'Bolu', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(31.6089, 40.7392), 4326)::geography),
('15', 'Burdur', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(30.2908, 37.7203), 4326)::geography),
('16', 'Bursa', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(29.0665, 40.1826), 4326)::geography),
('17', 'Çanakkale', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(26.4142, 40.1553), 4326)::geography),
('18', 'Çankırı', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(33.6134, 40.6013), 4326)::geography),
('19', 'Çorum', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(34.9556, 40.5506), 4326)::geography),
('20', 'Denizli', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(29.0864, 37.7765), 4326)::geography),
('21', 'Diyarbakır', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(40.2306, 37.9144), 4326)::geography),
('22', 'Edirne', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(26.5623, 41.6818), 4326)::geography),
('23', 'Elazığ', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(39.2264, 38.681), 4326)::geography),
('24', 'Erzincan', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(39.5, 39.75), 4326)::geography),
('25', 'Erzurum', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(41.27, 39.9), 4326)::geography),
('26', 'Eskişehir', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(30.5206, 39.7767), 4326)::geography),
('27', 'Gaziantep', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(37.3833, 37.0662), 4326)::geography),
('28', 'Giresun', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(38.3895, 40.9128), 4326)::geography),
('29', 'Gümüşhane', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(39.5086, 40.4386), 4326)::geography),
('30', 'Hakkari', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(43.7408, 37.5744), 4326)::geography),
('32', 'Isparta', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(30.5566, 37.7648), 4326)::geography),
('33', 'Mersin', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(34.6333, 36.8), 4326)::geography),
('35', 'İzmir', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(27.1287, 38.4192), 4326)::geography),
('36', 'Kars', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(43.0975, 40.6013), 4326)::geography),
('37', 'Kastamonu', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(33.7827, 41.3887), 4326)::geography),
('38', 'Kayseri', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(35.4787, 38.7312), 4326)::geography),
('39', 'Kırklareli', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(27.2167, 41.7333), 4326)::geography),
('40', 'Kırşehir', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(34.1709, 39.1425), 4326)::geography),
('41', 'Kocaeli', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(29.8815, 40.8533), 4326)::geography),
('42', 'Konya', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(32.4833, 37.8667), 4326)::geography),
('43', 'Kütahya', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(29.9833, 39.4167), 4326)::geography),
('44', 'Malatya', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(38.3095, 38.3552), 4326)::geography),
('45', 'Manisa', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(27.4289, 38.6191), 4326)::geography),
('46', 'Kahramanmaraş', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(36.9371, 37.5858), 4326)::geography),
('47', 'Mardin', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(40.7245, 37.3212), 4326)::geography),
('48', 'Muğla', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(28.3636, 37.2153), 4326)::geography),
('49', 'Muş', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(41.7539, 38.9462), 4326)::geography),
('50', 'Nevşehir', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(34.6857, 38.6939), 4326)::geography),
('51', 'Niğde', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(34.6833, 37.9667), 4326)::geography),
('52', 'Ordu', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(37.8764, 40.9839), 4326)::geography),
('53', 'Rize', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(40.5234, 41.0201), 4326)::geography),
('54', 'Sakarya', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(30.3781, 40.7569), 4326)::geography),
('55', 'Samsun', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(36.33, 41.2867), 4326)::geography),
('56', 'Siirt', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(41.95, 37.9333), 4326)::geography),
('57', 'Sinop', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(35.1531, 42.0231), 4326)::geography),
('58', 'Sivas', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(37.0179, 39.7477), 4326)::geography),
('59', 'Tekirdağ', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(27.5167, 40.9833), 4326)::geography),
('60', 'Tokat', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(36.55, 40.3167), 4326)::geography),
('61', 'Trabzon', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(39.7178, 41.0015), 4326)::geography),
('62', 'Tunceli', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(39.5401, 39.1079), 4326)::geography),
('63', 'Şanlıurfa', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(38.7969, 37.1591), 4326)::geography),
('64', 'Uşak', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(29.4082, 38.6823), 4326)::geography),
('65', 'Van', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(43.4089, 38.4891), 4326)::geography),
('66', 'Yozgat', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(34.8147, 39.8181), 4326)::geography),
('67', 'Zonguldak', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(31.7987, 41.4564), 4326)::geography),
('68', 'Aksaray', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(34.037, 38.3687), 4326)::geography),
('69', 'Bayburt', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(40.2249, 40.2552), 4326)::geography),
('70', 'Karaman', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(33.2287, 37.1759), 4326)::geography),
('71', 'Kırıkkale', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(33.5153, 39.8468), 4326)::geography),
('72', 'Batman', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(41.1351, 37.8812), 4326)::geography),
('73', 'Şırnak', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(42.4918, 37.4187), 4326)::geography),
('74', 'Bartın', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(32.461, 41.5811), 4326)::geography),
('75', 'Ardahan', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(42.7022, 41.1105), 4326)::geography),
('76', 'Iğdır', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(44.0048, 39.888), 4326)::geography),
('77', 'Yalova', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(29.2667, 40.65), 4326)::geography),
('78', 'Karabük', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(32.6204, 41.2061), 4326)::geography),
('79', 'Kilis', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(37.1212, 36.7184), 4326)::geography),
('80', 'Osmaniye', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(36.2478, 37.0742), 4326)::geography),
('81', 'Düzce', 'Merkez', 'merkez', ST_SetSRID(ST_MakePoint(31.1565, 40.8438), 4326)::geography);

-- Ulusal varsayılan tarife: tarifesi tanımlı olmayan illerde kullanılır.
-- Ankara (çarpan 1,00) kartlarının kopyası; il çarpanı yalnızca büyükşehirlerde
-- anlamlı (docs/11 §4). Firma görüşmeleri sonuçlanınca il il ayrışacak.
INSERT INTO rate_cards
    (city_code, vehicle_type_code, service_model, base_fare, included_km, per_km_rate,
     per_minute_rate, minimum_fare, waiting_free_minutes, waiting_per_minute_rate,
     distance_tiers, version)
SELECT
    '00', vehicle_type_code, service_model, base_fare, included_km, per_km_rate,
    per_minute_rate, minimum_fare, waiting_free_minutes, waiting_per_minute_rate,
    distance_tiers, version
FROM rate_cards r
WHERE r.city_code = '06' AND r.carrier_id IS NULL AND r.active
  AND r.version = (SELECT max(version) FROM rate_cards x
                   WHERE x.city_code = '06' AND x.vehicle_type_code = r.vehicle_type_code
                     AND x.service_model = r.service_model AND x.carrier_id IS NULL AND x.active);
