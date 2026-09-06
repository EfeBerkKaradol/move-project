package com.tasiyoruz.api.corridor.api;

import com.tasiyoruz.api.pricing.api.Money;
import java.time.Instant;

/** Koridorun dışa görünümü. */
public record CorridorView(
        String id,
        String vehicleTypeCode,
        Place origin,
        Place destination,
        Instant departureFrom,
        Instant departureTo,
        int detourToleranceKm,
        Money minAmount,
        CorridorStatus status,
        Instant createdAt,
        /** Bu koridorun halen bekleyen eşleşme sayısı. */
        int pendingMatchCount) {

    public record Place(String districtId, String cityName, String districtName) {}
}
