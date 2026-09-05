/**
 * Pazarlık oturumu, teklif turları, taban/tavan politikası ve kabul.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Pazarlık",
        allowedDependencies = { "catalog::api", "fleet", "pricing::api" }
)
package com.tasiyoruz.api.negotiation;
