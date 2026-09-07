package com.tasiyoruz.api.rating.api;

import java.util.List;
import java.util.Optional;

public interface RatingService {

    /** Yük veren tamamlanan işi puanlar; iş başına bir kez. */
    RatingView rate(String shipperId, String tripId, RateTripRequest request);

    Optional<RatingView> ratingOfTrip(String tripId);

    CarrierRatingView summaryOf(String carrierId);

    List<CarrierRatingView> summariesOf(List<String> carrierIds);
}
