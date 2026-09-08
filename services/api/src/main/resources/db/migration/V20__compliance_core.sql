-- Hukuk ve uyum çekirdeği (docs/14).
--
-- Karınca aracı bir platform. Bu iddianın hukuken ayakta durması için sözleşme
-- metni yetmiyor: kimin neyi hangi sürümde kabul ettiği, hangi işlemde ne beyan
-- ettiği, şüphe halinde ne yapıldığı ve bunu kimin yaptığı kayıt altında olmalı.
-- Beyanı alıp saklamayan bir onay kutusu, ihtilafta hiçbir şey ispat etmez.

-- ─────────────────────────────────────────────────────────────
-- 1. Hukuki belge sürümleri
-- ─────────────────────────────────────────────────────────────
-- Metnin KENDİSİ burada değil, depoda (apps/web/src/content/legal/*.md).
-- Gerekçe: hukuk metni gözden geçirilerek değişir; dosyada tutulunca değişiklik
-- diff olarak okunur ve incelenir. Burada tutulan şey sürüm kaydı — hangi sürüm
-- ne zaman yürürlüğe girdi, yeniden kabul gerektiriyor mu.
--
-- Yayınlanmış bir sürümün metni DEĞİŞTİRİLMEZ; değişiklik yeni sürümdür.
-- (Aynı kural migration'lar için de geçerli, docs/CLAUDE.md.)
CREATE TABLE legal_documents (
    id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    -- USER_TERMS, SHIPPER_TERMS, CARRIER_TERMS, KVKK_NOTICE, PRIVACY_POLICY,
    -- COOKIE_POLICY, PROHIBITED_ITEMS, EXPLICIT_CONSENT, DISTANCE_CONTRACT,
    -- CANCELLATION_REFUND, COMMERCIAL_MESSAGE, UNLAWFUL_USE, COMPLAINTS
    doc_type               VARCHAR(48)   NOT NULL,
    version                VARCHAR(16)   NOT NULL,
    title                  VARCHAR(200)  NOT NULL,
    -- /legal/<slug>
    slug                   VARCHAR(64)   NOT NULL,
    effective_at           TIMESTAMPTZ   NOT NULL,
    published_at           TIMESTAMPTZ,
    -- Esaslı değişiklik: mevcut kullanıcıdan yeniden kabul isteniyor. Her yazım
    -- düzeltmesi için kullanıcıyı onay ekranına düşürmek, onayı anlamsızlaştırır.
    requires_reacceptance  BOOLEAN       NOT NULL DEFAULT FALSE,
    active                 BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_legal_doc_version UNIQUE (doc_type, version)
);

-- Bir tipin aynı anda yalnızca bir yürürlükteki sürümü olabilir; iki "aktif"
-- sürüm, hangisinin kabul edildiği sorusunu cevapsız bırakır.
CREATE UNIQUE INDEX uq_legal_doc_active ON legal_documents (doc_type) WHERE active;
CREATE UNIQUE INDEX uq_legal_doc_slug   ON legal_documents (slug)     WHERE active;

-- ─────────────────────────────────────────────────────────────
-- 2. Rıza ve kabul kayıtları
-- ─────────────────────────────────────────────────────────────
-- Aydınlatma ile açık rıza AYRI kayıtlardır (KVKK). Aydınlatma bir bilgilendirme,
-- açık rıza bir hukuki dayanak; ikisini tek onay kutusunda birleştirmek rızayı
-- sakatlar. consent_type bu ayrımı taşıyor.
CREATE TABLE consent_records (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Keycloak subject
    user_id           VARCHAR(64)   NOT NULL,
    -- TERMS_ACCEPTED, KVKK_NOTICE_SEEN, EXPLICIT_CONSENT, MARKETING_EMAIL,
    -- MARKETING_SMS, COOKIE_PREFERENCES, SHIPPER_DECLARATION, CARRIER_DECLARATION
    consent_type      VARCHAR(48)   NOT NULL,
    doc_type          VARCHAR(48),
    doc_version       VARCHAR(16),
    accepted          BOOLEAN       NOT NULL,
    -- Nerede verildi: CONSENT_GATE, LISTING_CREATE, CARRIER_ONBOARDING,
    -- ACCOUNT_SETTINGS, COOKIE_BANNER
    source            VARCHAR(32)   NOT NULL,
    -- İlgili kayıt (ilan kimliği gibi) — işlem bazlı beyanlar için
    subject_ref       VARCHAR(64),
    -- Rızanın ispatı için tutuluyor; ikisi de kişisel veri sayılır ve saklama
    -- süresi hukukçu tarafından belirlenmeli (docs/14 açık sorular).
    ip_address        VARCHAR(45),
    user_agent        VARCHAR(400),
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    -- Geri çekilebilen rızalar için (pazarlama). Sözleşme kabulü geri çekilmez;
    -- onun karşılığı hesabın kapatılmasıdır.
    withdrawn_at      TIMESTAMPTZ
);

CREATE INDEX idx_consent_user  ON consent_records (user_id, consent_type, created_at DESC);
CREATE INDEX idx_consent_subject ON consent_records (subject_ref) WHERE subject_ref IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 3. Hesap durumu
-- ─────────────────────────────────────────────────────────────
-- Keycloak kimliği tutuyor, kısıtlamanın gerekçesini ve geçmişini değil. Burada
-- tutulan şey platformun kendi kararı: neden kısıtlandı, kim karar verdi.
CREATE TABLE account_statuses (
    user_id      VARCHAR(64)   PRIMARY KEY,
    status       VARCHAR(16)   NOT NULL DEFAULT 'ACTIVE',
    reason       TEXT,
    changed_by   VARCHAR(64),
    changed_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    -- Geçici kısıtlamanın bitişi; NULL ise süresiz
    until        TIMESTAMPTZ,
    CONSTRAINT chk_account_status CHECK (status IN ('ACTIVE', 'RESTRICTED', 'SUSPENDED', 'BANNED'))
);

-- ─────────────────────────────────────────────────────────────
-- 4. Uyum olayları
-- ─────────────────────────────────────────────────────────────
-- Sistem "bu kullanıcı suçlu" demiyor; "buraya bir insan baksın" diyor. Otomatik
-- karar üretmemesi bilinçli: yanlış pozitif bir kullanıcıyı haksız yere kapatır.
CREATE TABLE compliance_events (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        VARCHAR(64),
    -- İlgili ilan/iş kimliği
    subject_ref    VARCHAR(64),
    event_type     VARCHAR(40)   NOT NULL,
    severity       VARCHAR(10)   NOT NULL,
    reason         TEXT          NOT NULL,
    -- Kararı üreten sinyaller; insan incelemesine gerekçe sunuyor
    signals        JSONB         NOT NULL DEFAULT '{}'::jsonb,
    status         VARCHAR(16)   NOT NULL DEFAULT 'OPEN',
    -- İnceleme sonucu: CLEAR, RESTRICT, SUSPEND, BAN
    decision       VARCHAR(16),
    -- Gerekçe zorunlu tutuluyor (serviste); "neden kapatıldı" sorusu cevapsız kalmasın
    decision_note  TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    resolved_at    TIMESTAMPTZ,
    resolved_by    VARCHAR(64),
    CONSTRAINT chk_compliance_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT chk_compliance_status   CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED')),
    CONSTRAINT chk_compliance_decision CHECK (decision IS NULL OR decision IN ('CLEAR', 'RESTRICT', 'SUSPEND', 'BAN')),
    -- Kapanmış bir olayın kararı ve kararı vereni olmalı
    CONSTRAINT chk_compliance_resolved CHECK (
        status NOT IN ('RESOLVED', 'DISMISSED') OR (resolved_at IS NOT NULL AND resolved_by IS NOT NULL))
);

CREATE INDEX idx_compliance_open     ON compliance_events (severity, created_at DESC) WHERE status IN ('OPEN', 'UNDER_REVIEW');
CREATE INDEX idx_compliance_user     ON compliance_events (user_id, created_at DESC);
CREATE INDEX idx_compliance_subject  ON compliance_events (subject_ref) WHERE subject_ref IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 5. Kullanıcı bildirimleri
-- ─────────────────────────────────────────────────────────────
CREATE TABLE compliance_reports (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id       VARCHAR(64)   NOT NULL,
    reported_user_id  VARCHAR(64),
    subject_ref       VARCHAR(64),
    category          VARCHAR(40)   NOT NULL,
    description       TEXT,
    status            VARCHAR(16)   NOT NULL DEFAULT 'OPEN',
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    reviewed_at       TIMESTAMPTZ,
    reviewed_by       VARCHAR(64),
    review_note       TEXT,
    CONSTRAINT chk_report_status CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED')),
    -- Aynı kullanıcı aynı ilanı iki kez bildirmesin; sayaç şişer, sıra tıkanır
    CONSTRAINT uq_report_once UNIQUE (reporter_id, subject_ref, category)
);

CREATE INDEX idx_report_open ON compliance_reports (status, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 6. Denetim izi
-- ─────────────────────────────────────────────────────────────
-- Yalnızca EKLENİR. Uyumun anlamı, geriye dönük düzeltilemeyen bir kayıttır;
-- güncellenebilir bir denetim izi denetim izi değildir.
--
-- Tablo V1'de zaten açılmıştı ama hiçbir kod ona yazmıyor ve sütunları o günün
-- tasarımına ait (aktör UUID, önce/sonra durumu). İKİNCİ bir denetim tablosu
-- açmak yerine bunu yeniden kuruyoruz: iki ayrı denetim izi, denetim izinin
-- kendisini işe yaramaz hâle getirir — "hangisine bakacağız?" sorusu her
-- incelemede yeniden sorulur.
--
-- Boş olduğu varsayımı kontrol ediliyor; veri varsa göç durur ve taşınmasını
-- ister. Sessizce veri düşürmektense göçün patlaması iyidir.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM audit_log LIMIT 1) THEN
        RAISE EXCEPTION 'audit_log boş değil: yeniden kurmadan önce mevcut kayıtları taşıyın.';
    END IF;
END $$;

DROP TABLE audit_log;

CREATE TABLE audit_log (
    id           BIGSERIAL     PRIMARY KEY,
    actor_id     VARCHAR(64),
    actor_role   VARCHAR(32),
    action       VARCHAR(64)   NOT NULL,
    subject_type VARCHAR(32),
    subject_ref  VARCHAR(64),
    detail       JSONB         NOT NULL DEFAULT '{}'::jsonb,
    ip_address   VARCHAR(45),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_subject ON audit_log (subject_type, subject_ref, created_at DESC);
CREATE INDEX idx_audit_actor   ON audit_log (actor_id, created_at DESC);
CREATE INDEX idx_audit_action  ON audit_log (action, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 7. İlgili kişi başvuruları (KVKK) ve yetkili merci talepleri
-- ─────────────────────────────────────────────────────────────
CREATE TABLE data_requests (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      VARCHAR(64)   NOT NULL,
    request_type VARCHAR(32)   NOT NULL,
    detail       TEXT,
    status       VARCHAR(16)   NOT NULL DEFAULT 'OPEN',
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    handled_at   TIMESTAMPTZ,
    handled_by   VARCHAR(64),
    response     TEXT,
    CONSTRAINT chk_data_request_type CHECK (
        request_type IN ('ACCESS', 'RECTIFICATION', 'ERASURE', 'PROCESSING_INFO', 'OTHER')),
    CONSTRAINT chk_data_request_status CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'))
);

CREATE INDEX idx_data_request_open ON data_requests (status, created_at DESC);
CREATE INDEX idx_data_request_user ON data_requests (user_id, created_at DESC);

-- Yetkili makam talepleri. Erişimi dar: bu kayıtlar hem kişisel veri hem de
-- devam eden bir sürecin parçası olabiliyor.
CREATE TABLE legal_requests (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    authority       VARCHAR(200)  NOT NULL,
    request_type    VARCHAR(40)   NOT NULL,
    legal_reference VARCHAR(200),
    requested_data  TEXT,
    received_at     TIMESTAMPTZ   NOT NULL,
    status          VARCHAR(16)   NOT NULL DEFAULT 'OPEN',
    handled_by      VARCHAR(64),
    responded_at    TIMESTAMPTZ,
    note            TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_legal_request_status CHECK (status IN ('OPEN', 'IN_PROGRESS', 'ANSWERED', 'REJECTED'))
);
