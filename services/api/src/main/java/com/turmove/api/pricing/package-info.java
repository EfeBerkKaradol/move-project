/**
 * Birim fiyat kartları, platform komisyonu, quote hesaplama, surge ve kuponlar.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Fiyatlandırma",
        allowedDependencies = { "catalog", "geo" }
)
package com.turmove.api.pricing;
