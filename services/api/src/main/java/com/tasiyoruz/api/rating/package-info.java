/**
 * Puanlama (docs/02 §3).
 *
 * <p>Tamamlanan işleri taşıma modülünün olayından öğreniyor; taşıma servisine bağımlı
 * değil. Böylece pazar yeri de teklif kartı için buraya bağımlı olabilirdi — ama
 * tracking → ordering bağımlılığı yüzünden döngü oluşurdu; puan ayrı uçtan okunuyor.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Puanlama",
        allowedDependencies = { "tracking::api" }
)
package com.tasiyoruz.api.rating;
