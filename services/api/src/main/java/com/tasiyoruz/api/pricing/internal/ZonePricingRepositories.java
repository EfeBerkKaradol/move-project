package com.tasiyoruz.api.pricing.internal;

import com.tasiyoruz.api.pricing.domain.PricingZone;
import com.tasiyoruz.api.pricing.domain.ZonePricingSettings;
import com.tasiyoruz.api.pricing.domain.ZoneRateCard;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Yaka bazlı tarifenin depoları tek dosyada: üçü de aynı hesabın parçası ve
 * birlikte okunuyor (bkz. compliance/Repositories).
 */
final class ZonePricingRepositories {
    private ZonePricingRepositories() {}
}

interface PricingZoneRepository extends JpaRepository<PricingZone, UUID> {
    Optional<PricingZone> findByCityCodeAndDistrictSlug(String cityCode, String districtSlug);
}

interface ZonePricingSettingsRepository extends JpaRepository<ZonePricingSettings, String> {}

interface ZoneRateCardRepository extends JpaRepository<ZoneRateCard, UUID> {

    /** Etkin kartlar senaryo başına tek — benzersiz kısmi indeks bunu garanti ediyor. */
    Optional<ZoneRateCard>
            findFirstByCityCodeAndVehicleTypeCodeAndOriginZoneAndDestinationZoneAndDistanceClassAndActiveTrueOrderByVersionDesc(
                    String cityCode, String vehicleTypeCode, String originZone,
                    String destinationZone, String distanceClass);
}
