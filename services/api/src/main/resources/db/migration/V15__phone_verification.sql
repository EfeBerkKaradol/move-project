-- Telefon doğrulama (ANAHTARLAR #2, docs/01 FR-1.x).
--
-- Bugüne kadar telefon yalnızca taşıyıcı başvurusunda, doğrulanmadan duruyordu:
-- kimse numarasının gerçekten kendisine ait olduğunu kanıtlamıyordu. Nakliyede
-- yük sahibi ile sürücünün birbirine ulaşabilmesi işin merkezinde; ulaşılamayan
-- bir numara siparişi sessizce çıkmaza sokuyor.

CREATE TABLE user_phones (
    -- Keycloak subject; kullanıcı tablosu yok, kimlik bu
    user_id      VARCHAR(64)  PRIMARY KEY,
    phone        VARCHAR(32)  NOT NULL,
    verified_at  TIMESTAMPTZ  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version      INTEGER      NOT NULL DEFAULT 0
);

-- Bir numara tek hesaba ait. Kötüye kullanımı sınırlıyor: aynı numarayla sınırsız
-- hesap doğrulanamıyor. Gevşetmek sonradan kolay, mükerrer kayıt birikmişken
-- sıkılaştırmak zor — bu yüzden baştan kısıtlı.
CREATE UNIQUE INDEX uq_user_phones_phone ON user_phones (phone);

CREATE TABLE phone_verifications (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      VARCHAR(64)  NOT NULL,
    phone        VARCHAR(32)  NOT NULL,
    -- Kod düz metin saklanmıyor: veritabanını okuyabilen biri doğrulamayı
    -- geçemesin. Süre kısa ve deneme sayısı sınırlı olduğu için bcrypt yeterli.
    code_hash    VARCHAR(128) NOT NULL,
    attempts     INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL,
    expires_at   TIMESTAMPTZ  NOT NULL,
    consumed_at  TIMESTAMPTZ
);

-- Açık meydan okumayı bulmak ve saatlik istek sayısını saymak için
CREATE INDEX idx_phone_verifications_user ON phone_verifications (user_id, created_at DESC);
