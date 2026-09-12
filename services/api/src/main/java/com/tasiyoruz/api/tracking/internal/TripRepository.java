package com.tasiyoruz.api.tracking.internal;

import com.tasiyoruz.api.tracking.api.TripStage;
import com.tasiyoruz.api.tracking.domain.Trip;
import java.util.List;
import java.util.Optional;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface TripRepository extends JpaRepository<Trip, UUID> {

    /** Onay bekleyip süresi dolmuş teslimatlar; otomatik kapatma işi bunları okuyor. */
    List<Trip> findByStageAndDeliveredAtBefore(TripStage stage, Instant esik);
    Optional<Trip> findByListingId(UUID listingId);
    List<Trip> findByCarrierIdOrderByStartedAtDesc(String carrierId);
    List<Trip> findByShipperIdOrderByStartedAtDesc(String shipperId);
    List<Trip> findAllByOrderByStartedAtDesc();
}
