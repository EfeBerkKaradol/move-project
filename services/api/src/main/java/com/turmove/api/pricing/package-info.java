/**
 * Birim fiyat kartları, platform komisyonu, quote hesaplama, surge ve kuponlar.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Fiyatlandırma",
        allowedDependencies = { "catalog::api", "geo::api" }
)
package com.turmove.api.pricing;
