/**
 * Taşıyıcı profili, araç bilgisi, belgeler ve onay durumu (docs/02 §3 · docs/01 §4.2).
 *
 * <p>Belge dosyaları nesne deposunda; burada yalnızca anahtar ve onay durumu tutuluyor.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Filo ve belgeler",
        allowedDependencies = { "compliance::api", "catalog::api", "shared::storage" }
)
package com.tasiyoruz.api.fleet;
