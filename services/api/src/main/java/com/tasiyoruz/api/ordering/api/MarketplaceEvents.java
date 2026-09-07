package com.tasiyoruz.api.ordering.api;

import java.math.BigDecimal;

/**
 * Modüller arası olaylar (Modulith event registry üzerinden, docs/02 §4).
 *
 * <p>Olaylar yalnızca kimlik değil, bildirimin ihtiyacı olan özeti de taşıyor
 * (ilan numarası, rota, tutar). Bildirim modülü hiçbir modüle bağımlı olmadan yalnızca
 * olay tüketiyor; ayrıntı için geri sorgu yapması bu ilkeyi bozardı.
 */
public final class MarketplaceEvents {
    private MarketplaceEvents() {}

    public record ListingPublished(String listingId, String vehicleTypeCode, String pickupDistrictId,
                                   String dropoffDistrictId, BigDecimal estimatedAmount) {}

    public record OfferSubmitted(String listingId, String listingNumber, String route, String shipperId,
                                 String offerId, String carrierId, String carrierName, BigDecimal amount) {}

    public record ListingAwarded(String listingId, String listingNumber, String route, String offerId,
                                 String carrierId, String shipperId, BigDecimal amount) {}

    /** Teklif penceresi teklif alınmadan doldu. */
    public record ListingExpired(String listingId, String listingNumber, String route, String shipperId) {}
}
