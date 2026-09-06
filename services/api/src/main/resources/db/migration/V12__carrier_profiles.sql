-- Taşıyıcı başvurusu ve belge doğrulama (docs/01 FR-2.1 … FR-2.4, docs/11 §5 #7).
--
-- Bugüne kadar taşıyıcı kimliği yalnızca Keycloak subject'iydi; kim olduğu, hangi
-- aracı sürdüğü ve belgelerinin geçerli olup olmadığı hiçbir yerde tutulmuyordu.
-- Teklif ekranındaki "puan · tamamlanan iş" alanlarının null dönmesinin sebebi buydu.

CREATE TABLE carrier_profiles (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Keycloak subject; kullanıcı tablosu gelene kadar kimlik bu
    carrier_id         VARCHAR(64)   NOT NULL UNIQUE,
    display_name       VARCHAR(120)  NOT NULL,
    phone              VARCHAR(32),
    -- Kurumsal başvuruda dolu, şahıs başvurusunda boş
    company_name       VARCHAR(160),
    tax_id             VARCHAR(20),
    vehicle_type_code  VARCHAR(32)   NOT NULL REFERENCES vehicle_types(code),
    plate              VARCHAR(16)   NOT NULL,
    status             VARCHAR(24)   NOT NULL,
    submitted_at       TIMESTAMPTZ,
    reviewed_at        TIMESTAMPTZ,
    review_note        TEXT,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    version            INTEGER       NOT NULL DEFAULT 0,
    CONSTRAINT chk_profile_status CHECK (
        status IN ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    -- Kurumsal başvuruda vergi numarası zorunlu; unvan yazıp numarayı boş bırakmak
    -- doğrulanamayan bir kayıt üretirdi
    CONSTRAINT chk_profile_company CHECK (company_name IS NULL OR tax_id IS NOT NULL)
);

-- Operasyon onay kuyruğu (FR-2.3) bu sırayla okuyor
CREATE INDEX idx_profile_review ON carrier_profiles (submitted_at)
    WHERE status = 'PENDING_REVIEW';

CREATE TABLE carrier_documents (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_profile_id  UUID          NOT NULL REFERENCES carrier_profiles(id) ON DELETE CASCADE,
    kind                VARCHAR(32)   NOT NULL,
    -- Nesne deposu anahtarı; dosyanın kendisi burada değil (bkz. ObjectStorage)
    storage_key         VARCHAR(255)  NOT NULL,
    content_type        VARCHAR(80)   NOT NULL,
    size_bytes          BIGINT        NOT NULL,
    original_filename   VARCHAR(255),
    -- FR-2.4 son kullanma takibi; süresiz belgelerde boş
    expires_on          DATE,
    status              VARCHAR(16)   NOT NULL,
    rejection_reason    TEXT,
    uploaded_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    reviewed_at         TIMESTAMPTZ,
    CONSTRAINT chk_document_kind CHECK (kind IN (
        'DRIVING_LICENCE', 'VEHICLE_REGISTRATION', 'SRC', 'K_DOCUMENT',
        'TRAFFIC_INSURANCE', 'CRIMINAL_RECORD', 'TAX_PLATE')),
    CONSTRAINT chk_document_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
    CONSTRAINT chk_document_size   CHECK (size_bytes > 0),
    -- Reddedilen belge red gerekçesiz kaydedilemez; taşıyıcı neyi düzelteceğini bilmeli
    CONSTRAINT chk_document_reason CHECK (status <> 'REJECTED' OR rejection_reason IS NOT NULL),
    -- Her türden tek belge; yeniden yükleme mevcut kaydın üzerine yazar
    CONSTRAINT uq_document_kind UNIQUE (carrier_profile_id, kind)
);

CREATE INDEX idx_document_profile ON carrier_documents (carrier_profile_id);
-- Süre dolumu taraması (FR-2.4): yaklaşan ve geçmiş son kullanma tarihleri
CREATE INDEX idx_document_expiry  ON carrier_documents (expires_on)
    WHERE expires_on IS NOT NULL AND status = 'APPROVED';
