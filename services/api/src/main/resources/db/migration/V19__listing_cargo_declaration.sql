-- Yük beyanı: ilanda ne taşınacağı ve fotoğrafı.
--
-- Serbest metin ("buzdolabı, çamaşır makinesi ve 8 koli") teklif için yeterli bilgi
-- vermiyordu: araç sahibi kaç m³ olduğunu, kaç kişi gerektiğini ve asansöre sığıp
-- sığmayacağını tahmin etmek zorunda kalıyor, tahmin tutmayınca iş kapıda bozuluyordu.
-- Artık yük hem kalem kalem seçiliyor hem de fotoğraflanıyor.

-- ─────────────────────────────────────────────────────────────
-- 1. Eksik koltuk tipleri
-- ─────────────────────────────────────────────────────────────
-- Katalogda ikili, üçlü ve takım vardı; tekli (berjer) ile L (köşe) yoktu. İkisi de
-- sık: tek kişilik ev taşımasında çoğu zaman yalnızca bir berjer var, köşe koltuk ise
-- en uzun kenarı yüzünden araç seçimini tek başına belirliyor.

-- Araya kalem eklenebilmesi için sıra numaraları seyreltiliyor; yoksa her yeni eşya
-- kategorinin tamamını yeniden numaralandırmayı gerektirir.
UPDATE cargo_items SET sort_order = sort_order * 10 WHERE category_code = 'TEKIL_ESYA';

INSERT INTO cargo_items (code, category_code, display_name, volume_m3, weight_kg, longest_edge_cm, sort_order) VALUES
    -- Tekli koltuktan önce gelsin: kullanıcı küçükten büyüğe okuyor
    ('KOLTUK_TEKLI', 'TEKIL_ESYA', 'Tekli koltuk / berjer',  0.55,  25, 100,  65),
    -- 290 cm: hiçbir panelvana girmiyor, öneri motoru bunu tek başına yakalıyor
    ('KOLTUK_L',     'TEKIL_ESYA', 'L (köşe) koltuk',        2.60, 120, 290,  85),
    -- Çıkış kapısı: beyan zorunlu olduğu için katalogda karşılığı olmayan bir eşya
    -- kullanıcıyı kilitlemesin. Orta boy sayılıyor, tarifi metin alanına yazılıyor.
    ('DIGER_ESYA',   'TEKIL_ESYA', 'Diğer (listede yok)',    0.50,  25, 120, 220);

-- ─────────────────────────────────────────────────────────────
-- 2. İlana yazılan beyan
-- ─────────────────────────────────────────────────────────────
-- Katalog kaydına yabancı anahtar değil, anlık görüntü: kalemin hacmi ya da adı
-- sonradan güncellenirse yayınlanmış ilanın beyanı değişmemeli (fiyat snapshot'ı
-- ile aynı gerekçe, docs/04). Sütun adı tabloyla karışmasın diye declared_items.
ALTER TABLE load_listings ADD COLUMN declared_items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ─────────────────────────────────────────────────────────────
-- 3. Yük fotoğrafları
-- ─────────────────────────────────────────────────────────────
-- listing_id başlangıçta NULL: fotoğraf ilandan ÖNCE yükleniyor. Kullanıcı kareleri
-- seçerken görsün, yanlışını silsin, sonra yayınlasın istiyoruz; ilan ise ancak
-- geçerli bir beyanla oluşuyor. Tek atomik yayın isteğine hepsini sığdırmak
-- (multipart) önizlemeyi ve tek tek silmeyi imkânsız kılardı.
--
-- Dosyanın kendisi nesne deposunda; burada yalnızca anahtar duruyor (trip_photos ile
-- aynı gerekçe).
CREATE TABLE listing_photos (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id   UUID          REFERENCES load_listings(id) ON DELETE CASCADE,
    -- Keycloak subject. İliştirilmemiş fotoğrafı yalnızca yükleyen görebilir ve silebilir
    owner_id     VARCHAR(64)   NOT NULL,
    storage_key  VARCHAR(255)  NOT NULL,
    content_type VARCHAR(80)   NOT NULL,
    size_bytes   BIGINT        NOT NULL,
    uploaded_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    attached_at  TIMESTAMPTZ,
    CONSTRAINT chk_listing_photo_size CHECK (size_bytes > 0),
    -- İliştirilmiş olmak ile ilana bağlı olmak aynı şey; ikisi ayrışırsa fotoğraf ya
    -- görünmez olur ya da sahipsiz kalır
    CONSTRAINT chk_listing_photo_attach CHECK ((listing_id IS NULL) = (attached_at IS NULL))
);

CREATE INDEX idx_listing_photos_listing ON listing_photos (listing_id, uploaded_at);
-- Yayınlanmadan bırakılan yüklemelerin süpürülmesi
CREATE INDEX idx_listing_photos_orphan  ON listing_photos (uploaded_at) WHERE listing_id IS NULL;
