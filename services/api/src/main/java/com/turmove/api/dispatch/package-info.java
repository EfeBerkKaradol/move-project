/**
 * Nakliyeci havuzu, aday skorlama, teklif dalgaları ve atama.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Eşleştirme",
        allowedDependencies = { "catalog", "geo", "fleet" }
)
package com.turmove.api.dispatch;
