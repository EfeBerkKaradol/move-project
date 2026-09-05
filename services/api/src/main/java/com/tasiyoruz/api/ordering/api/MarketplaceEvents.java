package com.tasiyoruz.api.ordering.api;

import java.math.BigDecimal;

/**
 * Modüller arası olaylar (Modulith event registry üzerinden, docs/02 §4).
 * Bildirim ve koridor eşleştirme modülleri bunları dinleyecek.
 */
public final class MarketplaceEvents {
    private MarketplaceEvents() {}

    public record ListingPublished(String listingId, String vehicleTypeCode, String pickupDistrictId,
                                   String dropoffDistrictId, BigDecimal estimatedAmount) {}

    public record OfferSubmitted(String listingId, String offerId, String carrierId, BigDecimal amount) {}

    public record ListingAwarded(String listingId, String offerId, String carrierId, String shipperId,
                                 BigDecimal amount) {}
}
