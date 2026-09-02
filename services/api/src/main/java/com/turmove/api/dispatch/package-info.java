/**
 * Nakliyeci havuzu, aday skorlama, teklif dalgaları ve atama.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Eşleştirme",
        allowedDependencies = { "catalog::api", "geo::api", "fleet" }
)
package com.turmove.api.dispatch;
