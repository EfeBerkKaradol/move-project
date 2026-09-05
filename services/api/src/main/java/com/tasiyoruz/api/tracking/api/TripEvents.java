package com.tasiyoruz.api.tracking.api;

public final class TripEvents {
    private TripEvents() {}
    public record TripStageChanged(String tripId, String listingId, TripStage stage, String shipperId, String carrierId) {}
    public record TripDelivered(String tripId, String listingId, String shipperId, String carrierId) {}
    public record TripCompleted(String tripId, String listingId, String shipperId, String carrierId) {}
}
