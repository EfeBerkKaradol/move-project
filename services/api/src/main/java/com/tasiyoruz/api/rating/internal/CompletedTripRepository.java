package com.tasiyoruz.api.rating.internal;

import com.tasiyoruz.api.rating.domain.CompletedTrip;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface CompletedTripRepository extends JpaRepository<CompletedTrip, UUID> {
    long countByCarrierId(String carrierId);
}
