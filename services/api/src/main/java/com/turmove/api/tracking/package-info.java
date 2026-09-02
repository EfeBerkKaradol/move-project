/**
 * Konum ingest, canlı yayın, ETA, rota kaydı ve teslim kanıtı.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Takip",
        allowedDependencies = { "geo::api" }
)
package com.turmove.api.tracking;
