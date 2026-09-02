package com.turmove.api.pricing.internal;

import com.turmove.api.pricing.domain.RateCard;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface RateCardRepository extends JpaRepository<RateCard, UUID> {

    /** Firmaya özel kart yoksa şehir varsayılanı (carrier_id NULL) kullanılır. */
    Optional<RateCard> findFirstByCityCodeAndVehicleTypeCodeAndServiceModelAndCarrierIdIsNullAndActiveTrueOrderByVersionDesc(
            String cityCode, String vehicleTypeCode, String serviceModel);
}
