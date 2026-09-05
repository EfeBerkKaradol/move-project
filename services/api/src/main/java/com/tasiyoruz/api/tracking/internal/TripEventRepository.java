package com.tasiyoruz.api.tracking.internal;

import com.tasiyoruz.api.tracking.domain.TripEvent;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface TripEventRepository extends JpaRepository<TripEvent, UUID> {
    List<TripEvent> findByTripIdOrderByOccurredAtAsc(UUID tripId);
}
