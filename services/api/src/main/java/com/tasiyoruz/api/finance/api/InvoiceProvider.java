package com.tasiyoruz.api.finance.api;

import com.tasiyoruz.api.pricing.api.Money;
import java.util.Optional;

/**
 * Fatura sağlayıcısının dar yüzü.
 *
 * <p>Gerçek e-Fatura/e-Arşiv entegrasyonu yok. Sahte uygulama numara üretiyor ama
 * ürettiği kayıt {@code demo} işaretli — resmî belge sanılmasın.
 *
 * <p>Hangi tarafın hangi faturayı keseceği koda gömülmedi: {@code InvoiceType} ve
 * taraflar çağıran tarafından veriliyor, model yapılandırmadan okunuyor
 * (bkz. FinanceConfig.invoiceModel).
 */
public interface InvoiceProvider {

    String name();

    /** Resmî belge üretebiliyor mu? Sahte sağlayıcıda false. */
    boolean official();

    InvoiceDocument createInvoice(InvoiceRequest request);

    Optional<InvoiceDocument> getInvoice(String invoiceNumber);

    InvoiceDocument cancelInvoice(String invoiceNumber, String reason);

    record InvoiceRequest(
            FinanceEnums.InvoiceType type,
            String issuer,
            String recipient,
            String listingId,
            Money subtotal,
            Money taxAmount) {}

    record InvoiceDocument(
            String invoiceNumber,
            FinanceEnums.InvoiceStatus status,
            Money totalAmount,
            boolean demo,
            String documentUrl) {}
}
