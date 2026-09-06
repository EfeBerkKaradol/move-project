package com.tasiyoruz.api.fleet.internal;

import com.tasiyoruz.api.fleet.api.CarrierStatus;
import com.tasiyoruz.api.fleet.domain.CarrierProfile;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface CarrierProfileRepository extends JpaRepository<CarrierProfile, UUID> {

    Optional<CarrierProfile> findByCarrierId(String carrierId);

    List<CarrierProfile> findByStatusOrderBySubmittedAtAsc(CarrierStatus status);
}
