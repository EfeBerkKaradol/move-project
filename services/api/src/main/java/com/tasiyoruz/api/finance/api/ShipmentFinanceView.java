package com.tasiyoruz.api.finance.api;

import com.tasiyoruz.api.pricing.api.Money;
import java.math.BigDecimal;

/**
 * Bir taşımanın finansal özeti.
 *
 * <p>Alanlar bilerek ayrı: {@code grossAmount} platformun geliri değil, işlem
 * hacmidir. Platformun geliri {@code platformRevenue}. Bu ikisini tek bir "tutar"
 * alanında birleştirmek, ciro ile geliri karıştırmak olurdu.
 *
 * @param commissionRate yüzde olarak, kayıt anındaki oran — sonradan oran
 *                       değişse bile geçmiş iş kendi oranıyla kalır
 */
public record ShipmentFinanceView(
        String listingId,
        String tripId,
        String shipperId,
        String carrierId,
        Money grossAmount,
        BigDecimal commissionRate,
        Money commissionAmount,
        Money commissionTax,
        Money paymentFee,
        Money refundAmount,
        Money cancellationFee,
        Money carrierPayout,
        Money platformRevenue) {

    /** Müşterinin ödeyeceği toplam; iade ve iptal bedeli hesaba katılmış hâli. */
    public Money customerTotal() {
        return Money.tryOf(grossAmount.amount()
                .subtract(refundAmount.amount())
                .add(cancellationFee.amount()));
    }
}
