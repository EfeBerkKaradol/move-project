package com.tasiyoruz.api.finance.api;

/** Finans modülünün ortak sözlüğü; veritabanı CHECK kısıtlarıyla birebir. */
public final class FinanceEnums {

    private FinanceEnums() {}

    /** Bir para hareketinin ne olduğu. */
    public enum TransactionType {
        /** Müşteriyle taşıyıcı arasında anlaşılan taşıma bedelinin tamamı. */
        GROSS_SHIPMENT,
        /** Platformun aracılık geliri — brütün tamamı DEĞİL. */
        PLATFORM_COMMISSION,
        /** Komisyon üzerinden hesaplanan vergi. */
        COMMISSION_TAX,
        PAYMENT_PROCESSING_FEE,
        CARRIER_PAYOUT,
        REFUND,
        CANCELLATION_FEE,
        /** Düzeltme; hatalı kayıt silinmez, tersi yazılır. */
        ADJUSTMENT,
        CHARGEBACK
    }

    public enum TransactionDirection {
        CUSTOMER_TO_PLATFORM, PLATFORM_TO_CARRIER, PLATFORM_REVENUE, TAX, REFUND_TO_CUSTOMER, FEE
    }

    public enum TransactionStatus {
        PENDING, AUTHORIZED, CAPTURED, SETTLED, REFUNDED, CANCELLED, FAILED
    }

    /**
     * Hakediş durumu.
     *
     * <p>Teslim edilmemiş iş {@code ELIGIBLE} olmaz; sağlayıcı bağlanmadan da
     * {@code PAID} olmaz.
     */
    public enum PayoutStatus { PENDING, ELIGIBLE, PROCESSING, PAID, FAILED, ON_HOLD }

    /** İç defterin hesapları. Resmî muhasebe hesap planı değil. */
    public enum LedgerAccount {
        CUSTOMER_FUNDS, CARRIER_PAYABLE, PLATFORM_COMMISSION_REVENUE,
        TAX_PAYABLE, PAYMENT_FEES, REFUNDS_PAID
    }

    /** Verginin uygulandığı kalem; ikisinin niteliği aynı değil. */
    public enum TaxBase { PLATFORM_COMMISSION, TRANSPORT_SERVICE }

    public enum InvoiceType { PLATFORM_COMMISSION, TRANSPORTATION, REFUND, CANCELLATION, OTHER }

    public enum InvoiceStatus { DRAFT, ISSUED, CANCELLED, REFUNDED }
}
