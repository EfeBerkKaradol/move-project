package com.tasiyoruz.api.tracking.api;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface TripService {

    /** İlan AWARDED olduğunda çağrılır (olay dinleyicisi). Aynı ilan için ikinci çağrı yok sayılır. */
    TripView startFromAward(String listingId, String shipperId, String carrierId, String carrierDisplayName,
                            BigDecimal agreedAmount);

    Optional<TripView> trip(String userId, String tripId);

    Optional<TripView> tripOfListing(String userId, String listingId);

    List<TripView> tripsOfCarrier(String carrierId);

    List<TripView> tripsOfShipper(String shipperId);

    /** Taşıyıcı bir sonraki aşamaya geçer; DELIVERED için {@link #deliver} kullanılır. */
    TripView advance(String carrierId, String tripId, TripStage expectedNext);

    TripView deliver(String carrierId, String tripId, ProofOfDeliveryRequest pod);

    /** Müşteri teslimatı onaylar → COMPLETED. */
    TripView confirmDelivery(String shipperId, String tripId);
}
