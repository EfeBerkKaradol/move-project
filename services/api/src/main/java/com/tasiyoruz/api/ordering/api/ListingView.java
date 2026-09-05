package com.tasiyoruz.api.ordering.api;

import com.tasiyoruz.api.pricing.api.Money;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * İlanın dışa görünümü. {@code shipperId} taşıyıcıya gösterilmez; taşıyıcı akışı bu
 * kaydın {@link #forCarrier()} hâlini alır.
 */
public record ListingView(
        String id,
        String listingNumber,
        String shipperId,
        String serviceModel,
        String vehicleTypeCode,
        Place pickup,
        Place dropoff,
        List<String> extraServices,
        String cargoDescription,
        Instant pickupWindowStart,
        Instant pickupWindowEnd,
        Money estimatedAmount,
        Map<String, Object> estimate,
        ListingStatus status,
        String awardedOfferId,
        int offerCount,
        Instant publishedAt,
        Instant expiresAt) {

    /** İlçe düzeyi; adres taşıyıcıya atama sonrasında açılır. */
    public record Place(String districtId, String cityName, String districtName,
                        Integer floor, Boolean hasElevator) {}

    public ListingView forCarrier() {
        return new ListingView(id, listingNumber, null, serviceModel, vehicleTypeCode, pickup, dropoff,
                extraServices, cargoDescription, pickupWindowStart, pickupWindowEnd, estimatedAmount,
                estimate, status, awardedOfferId, offerCount, publishedAt, expiresAt);
    }
}
