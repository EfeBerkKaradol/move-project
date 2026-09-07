package com.tasiyoruz.api.tracking.api;

import java.math.BigDecimal;

/** Taşıma olayları. Bildirim için ilan numarası ve tutar da taşınıyor (bkz. MarketplaceEvents). */
public final class TripEvents {
    private TripEvents() {}
    public record TripStageChanged(String tripId, String listingId, TripStage stage, String shipperId, String carrierId) {}
    public record TripDelivered(String tripId, String listingId, String shipperId, String carrierId,
                                String carrierName, String receivedByName, BigDecimal amount) {}
    public record TripCompleted(String tripId, String listingId, String shipperId, String carrierId,
                                BigDecimal amount) {}
}
