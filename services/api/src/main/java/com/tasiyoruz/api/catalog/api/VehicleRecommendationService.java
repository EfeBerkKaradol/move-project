package com.tasiyoruz.api.catalog.api;

/**
 * Yük beyanından araç önerisi üretir. Modülün dışa açık tek davranışsal arayüzü.
 *
 * <p>Kural tabanlı ve deterministik — her öneri gerekçesiyle birlikte döner
 * (bkz. docs/adr/0007-arac-oneri-motoru.md).
 */
public interface VehicleRecommendationService {

    VehicleRecommendation recommend(CargoDeclarationRequest request);
}
