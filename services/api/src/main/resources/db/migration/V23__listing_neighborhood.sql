-- İlanda semt bilgisi.
--
-- Adres hiç toplanmıyordu: ilan yalnızca ilçe düzeyinde duruyordu ve teklif veren
-- araç sahibi "Kadıköy" görüp yolun ne kadarını çıkacağını bilemiyordu. Kullanıcı
-- zaten adres alanına mahalleyi yazıyor ("İstanbul, Kadıköy - Caferağa"); o bilgi
-- ilçeye çevrilirken atılıyordu.
--
-- Tam adres ve kapı numarası HÂLÂ toplanmıyor. Semt, teklifin isabetli olması için
-- yeterli; tam adres iş verildikten sonra taraflar arasında paylaşılıyor. Teklif
-- veren herkesin tam adresi görmesi, iş almadan da müşteri adresi toplayabilmek
-- demekti.
ALTER TABLE load_listings
    ADD COLUMN pickup_neighborhood  VARCHAR(96),
    ADD COLUMN dropoff_neighborhood VARCHAR(96);

COMMENT ON COLUMN load_listings.pickup_neighborhood IS
    'Kullanıcının seçtiği mahalle/semt adı; ilçeden daha dar, adresten daha geniş.';
