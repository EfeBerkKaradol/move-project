package com.tasiyoruz.api.rating.internal;

import com.tasiyoruz.api.rating.domain.Rating;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface RatingRepository extends JpaRepository<Rating, UUID> {
    Optional<Rating> findByTripId(UUID tripId);
    List<Rating> findByCarrierId(String carrierId);
}
