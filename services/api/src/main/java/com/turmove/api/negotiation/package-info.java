/**
 * Pazarlık oturumu, teklif turları, taban/tavan politikası ve kabul.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Pazarlık",
        allowedDependencies = { "catalog", "fleet", "pricing" }
)
package com.turmove.api.negotiation;
