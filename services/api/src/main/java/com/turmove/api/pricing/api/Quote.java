package com.turmove.api.pricing.api;

import java.time.Instant;
import java.util.List;

/**
 * Fiyat teklifi. {@code breakdown} kalemleri kullanıcıya olduğu gibi gösterilir —
 * gizli kalem yoktur (FR-5.5).
 *
 * @param approximateDistance mesafe gerçek yol ağından değil takribî hesaplandıysa true
 * @param floorPrice          pazarlıkta müşterinin inebileceği en düşük tutar (docs/10)
 */
public record Quote(
        String quoteId,
        String serviceModel,
        String vehicleTypeCode,
        int distanceMeters,
        int durationSeconds,
        boolean approximateDistance,
        List<BreakdownLine> breakdown,
        Money totalAmount,
        Money floorPrice,
        Instant expiresAt,
        String signature) {

    /**
     * @param note kullanıcıya gösterilecek ek açıklama (komisyonsuz dönem, takribî mesafe…)
     */
    public record BreakdownLine(String code, String label, Money amount, String note) {}
}
