/**
 * Taşıma yürütme: aşama geçişleri, teslim kanıtı, teslimatta onay. Konum ingest ve
 * canlı yayın mobil uygulamayla birlikte gelecek.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Takip",
        allowedDependencies = { "geo::api", "ordering::api", "pricing::api" }
)
package com.tasiyoruz.api.tracking;
