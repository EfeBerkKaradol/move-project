-- Finans çekirdeği: değişmez hareket defteri, çift taraflı kayıt, hakediş.
--
-- Neden gerekiyor: taşıma bedeli, platform komisyonu ve taşıyıcı hakedişi tek bir
-- "tutar" alanında eriyordu. Bunlar farklı ekonomik olaylar; birbirine karıştığında
-- ne platformun geliri ne de taşıyıcıya borç doğru okunabiliyor.
--
-- ⚠️ İLKE: brüt işlem hacmi (GMV) ile platform geliri AYRI tutulur. 10.000 TL'lik bir
-- taşıma 10.000 TL olarak kaydedilir; platformun geliri o tutarın tamamı değil,
-- komisyonudur. Hiçbir kayıt "sistem sadece komisyonu bilir" biçiminde tutulmaz.
--
-- ⚠️ Hareketler SİLİNMEZ. Yanlış kayıt, ters kayıtla (reverses_transaction_id)
-- düzeltilir; geçmiş olduğu gibi kalır.

-- ── Vergi kuralları (yapılandırma) ────────────────────────────────────────
--
-- Oranlar koda yazılmıyor. Hangi oranın hangi kaleme, hangi tarihten itibaren
-- uygulanacağı mali müşavir tarafından tanımlanacak; kod yalnızca yürürlükteki
-- kuralı okur. Kod içinde "en düşük oranı seç" gibi bir davranış YOK.
CREATE TABLE tax_rules (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    code         VARCHAR(32)   NOT NULL,
    -- Verginin uygulandığı kalem: platformun komisyonu mu, taşıma bedeli mi?
    -- İkisinin vergisel niteliği aynı değil ve karıştırılmamalı.
    applies_to   VARCHAR(32)   NOT NULL,
    rate_percent NUMERIC(5,2)  NOT NULL,
    jurisdiction VARCHAR(8)    NOT NULL DEFAULT 'TR',
    valid_from   TIMESTAMPTZ   NOT NULL,
    valid_to     TIMESTAMPTZ,
    CONSTRAINT chk_tax_rate CHECK (rate_percent >= 0 AND rate_percent <= 100),
    CONSTRAINT chk_tax_applies CHECK (applies_to IN ('PLATFORM_COMMISSION', 'TRANSPORT_SERVICE'))
);

CREATE INDEX idx_tax_rule_lookup ON tax_rules (applies_to, valid_from DESC);

-- ── Taşıma başına finansal özet ───────────────────────────────────────────
--
-- İşin para tarafının tek bakışta okunabilir hâli. Hareketlerden türetilebilir
-- ama türetmek her ekranda defterin tamamını taramak demek; bu tablo o özetin
-- saklanmış hâli ve mutabakat (reconciliation) tam da bu ikisini karşılaştırıyor.
CREATE TABLE shipment_finance (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id         UUID          NOT NULL UNIQUE,
    trip_id            UUID,
    shipper_id         VARCHAR(64)   NOT NULL,
    carrier_id         VARCHAR(64)   NOT NULL,
    -- Brüt: müşteriyle taşıyıcı arasında anlaşılan taşıma bedelinin tamamı
    gross_amount       NUMERIC(12,2) NOT NULL,
    commission_rate    NUMERIC(5,2)  NOT NULL,
    commission_amount  NUMERIC(12,2) NOT NULL,
    -- Komisyon ÜZERİNDEN hesaplanan vergi; taşıma bedelinin vergisiyle karıştırılmaz
    commission_tax     NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_fee        NUMERIC(12,2) NOT NULL DEFAULT 0,
    refund_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    cancellation_fee   NUMERIC(12,2) NOT NULL DEFAULT 0,
    carrier_payout     NUMERIC(12,2) NOT NULL,
    platform_revenue   NUMERIC(12,2) NOT NULL,
    currency           VARCHAR(3)    NOT NULL DEFAULT 'TRY',
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    version            INTEGER       NOT NULL DEFAULT 0,
    CONSTRAINT chk_finance_nonneg CHECK (
        gross_amount >= 0 AND commission_amount >= 0 AND carrier_payout >= 0
        AND refund_amount >= 0 AND cancellation_fee >= 0
    )
);

CREATE INDEX idx_shipment_finance_carrier ON shipment_finance (carrier_id);
CREATE INDEX idx_shipment_finance_shipper ON shipment_finance (shipper_id);

-- ── Değişmez hareket defteri ──────────────────────────────────────────────
CREATE TABLE financial_transactions (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id    UUID          NOT NULL,
    trip_id       UUID,
    shipper_id    VARCHAR(64),
    carrier_id    VARCHAR(64),
    type          VARCHAR(32)   NOT NULL,
    direction     VARCHAR(32)   NOT NULL,
    amount        NUMERIC(12,2) NOT NULL,
    currency      VARCHAR(3)    NOT NULL DEFAULT 'TRY',
    status        VARCHAR(24)   NOT NULL,
    -- Düzeltme: hatalı kayıt silinmez, tersi yazılır ve buradan işaret edilir
    reverses_transaction_id UUID REFERENCES financial_transactions (id),
    metadata      JSONB         NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_txn_type CHECK (type IN (
        'GROSS_SHIPMENT', 'PLATFORM_COMMISSION', 'COMMISSION_TAX',
        'PAYMENT_PROCESSING_FEE', 'CARRIER_PAYOUT', 'REFUND',
        'CANCELLATION_FEE', 'ADJUSTMENT', 'CHARGEBACK')),
    CONSTRAINT chk_txn_direction CHECK (direction IN (
        'CUSTOMER_TO_PLATFORM', 'PLATFORM_TO_CARRIER', 'PLATFORM_REVENUE',
        'TAX', 'REFUND_TO_CUSTOMER', 'FEE')),
    CONSTRAINT chk_txn_status CHECK (status IN (
        'PENDING', 'AUTHORIZED', 'CAPTURED', 'SETTLED',
        'REFUNDED', 'CANCELLED', 'FAILED'))
);

CREATE INDEX idx_txn_listing ON financial_transactions (listing_id, created_at);
CREATE INDEX idx_txn_type ON financial_transactions (type, created_at DESC);

-- ── Çift taraflı kayıt satırları ──────────────────────────────────────────
--
-- Her hareket en az iki satır üretir ve satırların borç/alacak toplamı EŞİTTİR.
-- Bu, resmî muhasebe defteri değil; platformun kendi iç tutarlılık kaydı.
-- Resmî muhasebeye aktarım ayrı bir katmanın işi.
CREATE TABLE ledger_entries (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID          NOT NULL REFERENCES financial_transactions (id),
    account        VARCHAR(32)   NOT NULL,
    debit          NUMERIC(12,2) NOT NULL DEFAULT 0,
    credit         NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_entry_account CHECK (account IN (
        'CUSTOMER_FUNDS', 'CARRIER_PAYABLE', 'PLATFORM_COMMISSION_REVENUE',
        'TAX_PAYABLE', 'PAYMENT_FEES', 'REFUNDS_PAID')),
    -- Bir satır ya borç ya alacaktır; ikisi birden dolu olamaz
    CONSTRAINT chk_entry_side CHECK ((debit = 0) <> (credit = 0) OR (debit = 0 AND credit = 0)),
    CONSTRAINT chk_entry_nonneg CHECK (debit >= 0 AND credit >= 0)
);

CREATE INDEX idx_ledger_txn ON ledger_entries (transaction_id);
CREATE INDEX idx_ledger_account ON ledger_entries (account);

-- ── Taşıyıcı hakedişi ─────────────────────────────────────────────────────
--
-- Teslim edilmemiş iş ÖDENEBİLİR olmaz. Ödeme sağlayıcısı bağlanana kadar
-- hakediş PENDING/ELIGIBLE'da durur; "ödendi" demek olmayan bir şeyi olmuş gibi
-- göstermek olurdu.
CREATE TABLE payouts (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id         VARCHAR(64)   NOT NULL,
    listing_id         UUID          NOT NULL UNIQUE,
    trip_id            UUID,
    gross              NUMERIC(12,2) NOT NULL,
    commission         NUMERIC(12,2) NOT NULL,
    tax_withholding    NUMERIC(12,2) NOT NULL DEFAULT 0,
    adjustments        NUMERIC(12,2) NOT NULL DEFAULT 0,
    net                NUMERIC(12,2) NOT NULL,
    status             VARCHAR(24)   NOT NULL,
    -- Sağlayıcı tarafındaki kaydın kimliği; bizde kart/hesap bilgisi tutulmaz
    provider_reference VARCHAR(128),
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    version            INTEGER       NOT NULL DEFAULT 0,
    CONSTRAINT chk_payout_status CHECK (status IN (
        'PENDING', 'ELIGIBLE', 'PROCESSING', 'PAID', 'FAILED', 'ON_HOLD')),
    -- Negatif hakediş bir hesap hatasıdır, veritabanına girmemeli
    CONSTRAINT chk_payout_net CHECK (net >= 0)
);

CREATE INDEX idx_payout_carrier ON payouts (carrier_id, status);

-- ── Faturalar ─────────────────────────────────────────────────────────────
--
-- Gerçek e-Fatura/e-Arşiv entegrasyonu YOK. Bu tablo belgenin kendisini değil,
-- hangi işlem için hangi tür belgenin gerektiğini tutuyor. `demo` alanı,
-- sağlayıcı bağlanana kadar üretilen kayıtların resmî belge sanılmasını
-- engelliyor.
CREATE TABLE invoices (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(32)   NOT NULL UNIQUE,
    type           VARCHAR(32)   NOT NULL,
    issuer         VARCHAR(64)   NOT NULL,
    recipient      VARCHAR(64)   NOT NULL,
    listing_id     UUID,
    subtotal       NUMERIC(12,2) NOT NULL,
    tax_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount   NUMERIC(12,2) NOT NULL,
    currency       VARCHAR(3)    NOT NULL DEFAULT 'TRY',
    status         VARCHAR(16)   NOT NULL,
    demo           BOOLEAN       NOT NULL DEFAULT TRUE,
    issued_at      TIMESTAMPTZ,
    document_url   TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_invoice_type CHECK (type IN (
        'PLATFORM_COMMISSION', 'TRANSPORTATION', 'REFUND', 'CANCELLATION', 'OTHER')),
    CONSTRAINT chk_invoice_status CHECK (status IN ('DRAFT', 'ISSUED', 'CANCELLED', 'REFUNDED'))
);

-- ── Finansal denetim kaydı ────────────────────────────────────────────────
--
-- Komisyon oranı, iade, hakediş durumu ve fatura iptali sessizce değişemez.
CREATE TABLE finance_audit_log (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor       VARCHAR(64) NOT NULL,
    action      VARCHAR(48) NOT NULL,
    entity      VARCHAR(48) NOT NULL,
    entity_id   VARCHAR(64) NOT NULL,
    old_value   JSONB,
    new_value   JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_finance_audit_entity ON finance_audit_log (entity, entity_id, occurred_at DESC);

-- Yürürlükteki KDV oranı yalnızca PLATFORM KOMİSYONU için tanımlanıyor.
-- Taşıma bedelinin vergisel niteliği taşıyıcının kendi mükellefiyetine bağlı ve
-- platform onu varsayamaz; o satır mali müşavir tanımlayınca eklenecek.
INSERT INTO tax_rules (code, applies_to, rate_percent, jurisdiction, valid_from)
VALUES ('KDV_20', 'PLATFORM_COMMISSION', 20.00, 'TR', now());
