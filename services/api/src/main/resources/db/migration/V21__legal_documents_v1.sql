-- Hukuki belgelerin ilk sürümü (v1.0).
--
-- Buraya metnin kendisi GİRMİYOR, yalnızca sürüm kaydı. Metin depoda duruyor:
-- apps/web/src/content/legal/<slug>.md
--
-- Gerekçe: hukuk metni gözden geçirilerek değişir ve değişikliğin okunabilir
-- olması gerekir. Dosyada tutulunca her düzeltme diff olarak incelenebiliyor;
-- migration'a gömülen 40 sayfalık metin ise ne okunabiliyor ne karşılaştırılabiliyor.
-- Denetlenebilirlik kaybolmuyor: rıza kaydı belgenin TİPİNİ ve SÜRÜMÜNÜ tutuyor,
-- o sürümün metni de git geçmişinde değişmez olarak duruyor.
--
-- Yayınlanmış bir sürümün metni düzeltilmez; düzeltme yeni sürümdür ve yeni
-- migration ister.

INSERT INTO legal_documents (doc_type, version, title, slug, effective_at, published_at, active) VALUES
    ('USER_TERMS',          '1.0', 'Kullanıcı Sözleşmesi',              'kullanici-sozlesmesi',       now(), now(), TRUE),
    ('SHIPPER_TERMS',       '1.0', 'Gönderici Sözleşmesi',              'gonderici-sozlesmesi',       now(), now(), TRUE),
    ('CARRIER_TERMS',       '1.0', 'Taşıyıcı Sözleşmesi',               'tasiyici-sozlesmesi',        now(), now(), TRUE),
    ('PROHIBITED_ITEMS',    '1.0', 'Yasaklı ve İzne Tabi Eşyalar',      'yasakli-esyalar',            now(), now(), TRUE),
    ('UNLAWFUL_USE',        '1.0', 'Hukuka Aykırı Kullanım Politikası', 'hukuka-aykiri-kullanim',     now(), now(), TRUE),
    ('PRIVACY_POLICY',      '1.0', 'Gizlilik Politikası',               'gizlilik',                   now(), now(), TRUE),
    ('KVKK_NOTICE',         '1.0', 'KVKK Aydınlatma Metni',             'kvkk-aydinlatma',            now(), now(), TRUE),
    ('EXPLICIT_CONSENT',    '1.0', 'Açık Rıza Metni',                   'acik-riza',                  now(), now(), TRUE),
    ('COOKIE_POLICY',       '1.0', 'Çerez Politikası',                  'cerez-politikasi',           now(), now(), TRUE),
    ('COMPLAINTS',          '1.0', 'İhlal Bildirimi ve Şikâyet Süreci', 'ihlaller-ve-sikayetler',     now(), now(), TRUE),
    ('DISTANCE_CONTRACT',   '1.0', 'Mesafeli Hizmet Sözleşmesi',        'mesafeli-hizmet-sozlesmesi', now(), now(), TRUE),
    ('CANCELLATION_REFUND', '1.0', 'İptal ve İade Koşulları',           'iptal-iade',                 now(), now(), TRUE),
    ('COMMERCIAL_MESSAGE',  '1.0', 'Ticari İleti Aydınlatması',         'ticari-ileti',               now(), now(), TRUE);
