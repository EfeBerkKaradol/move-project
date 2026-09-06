package com.tasiyoruz.api.tracking.internal;

import com.tasiyoruz.api.tracking.api.TripPhotoKind;
import com.tasiyoruz.api.tracking.domain.TripPhoto;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface TripPhotoRepository extends JpaRepository<TripPhoto, UUID> {

    List<TripPhoto> findByTripIdOrderByUploadedAtAsc(UUID tripId);

    int countByTripIdAndKind(UUID tripId, TripPhotoKind kind);

    boolean existsByTripIdAndKind(UUID tripId, TripPhotoKind kind);
}
