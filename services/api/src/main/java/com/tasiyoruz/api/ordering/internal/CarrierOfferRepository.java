package com.tasiyoruz.api.ordering.internal;

import com.tasiyoruz.api.ordering.domain.CarrierOffer;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface CarrierOfferRepository extends JpaRepository<CarrierOffer, UUID> {
    List<CarrierOffer> findByListingIdOrderBySubmittedAtAsc(UUID listingId);
    Optional<CarrierOffer> findByListingIdAndCarrierId(UUID listingId, String carrierId);
    List<CarrierOffer> findByCarrierIdOrderBySubmittedAtDesc(String carrierId);
    int countByListingIdAndStatus(UUID listingId, com.tasiyoruz.api.ordering.api.OfferStatus status);
}
