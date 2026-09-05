package com.tasiyoruz.api.tracking.api;

import com.tasiyoruz.api.pricing.api.Money;
import java.time.Instant;
import java.util.List;

public record TripView(
        String id,
        String listingId,
        String shipperId,
        String carrierId,
        String carrierDisplayName,
        Money agreedAmount,
        TripStage stage,
        /** Taşıyıcının bir sonraki geçebileceği aşama; DELIVERED/COMPLETED'da null. */
        TripStage nextStage,
        List<Event> events,
        Pod proofOfDelivery,
        Instant startedAt,
        Instant deliveredAt,
        Instant completedAt) {

    public record Event(TripStage stage, Instant occurredAt, String source, String note) {}
    public record Pod(String receivedByName, String note, String photoKey) {}
}
