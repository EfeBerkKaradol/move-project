package com.tasiyoruz.api.catalog.internal;

import com.tasiyoruz.api.catalog.api.FleetService;
import com.tasiyoruz.api.catalog.api.FleetVehicle;
import java.util.List;
import java.util.OptionalInt;
import org.springframework.stereotype.Service;

/** Filo sırasını önbellekten okur; katalog salt okunur olduğu için ek sorgu yapmaz. */
@Service
class DefaultFleetService implements FleetService {

    private final CatalogCache cache;

    DefaultFleetService(CatalogCache cache) {
        this.cache = cache;
    }

    @Override
    public List<FleetVehicle> activeFleet() {
        return cache.activeFleet().stream()
                .map(v -> new FleetVehicle(v.getCode(), v.getDisplayName(), v.getSortOrder()))
                .toList();
    }

    @Override
    public OptionalInt capacityRank(String vehicleTypeCode) {
        return cache.activeFleet().stream()
                .filter(v -> v.getCode().equals(vehicleTypeCode))
                .mapToInt(v -> v.getSortOrder())
                .findFirst();
    }
}
