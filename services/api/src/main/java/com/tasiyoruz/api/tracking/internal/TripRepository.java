package com.tasiyoruz.api.tracking.internal;

import com.tasiyoruz.api.tracking.domain.Trip;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface TripRepository extends JpaRepository<Trip, UUID> {
    Optional<Trip> findByListingId(UUID listingId);
    List<Trip> findByCarrierIdOrderByStartedAtDesc(String carrierId);
    List<Trip> findByShipperIdOrderByStartedAtDesc(String shipperId);
}
