package com.tasiyoruz.api.catalog.internal;

import com.tasiyoruz.api.catalog.api.VehicleRecommendation;

/** Filodaki hiçbir araç yükü taşıyamıyor — çoklu sefer veya operasyon desteği gerekir. */
class NoSuitableVehicleException extends RuntimeException {

    NoSuitableVehicleException(VehicleRecommendation.Estimate estimate) {
        super("Yük filodaki hiçbir araca sığmıyor: %s m³ / %d kg / %d cm"
                .formatted(estimate.volumeM3(), estimate.weightKg(), estimate.longestEdgeCm()));
    }
}
