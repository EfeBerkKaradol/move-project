/**
 * Operasyon işlemleri ve raporlama.
 *
 * <p>Kendi tablosu yok: her şeyi ilgili modülün açık arayüzünden okuyor ve oraya
 * yazıyor. Kendi sorguları olsaydı iş kuralları iki yerde yaşardı.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Yönetim",
        allowedDependencies = { "corridor::api", "fleet::api", "notification::api", "ordering::api", "pricing::api", "tracking::api" }
)
package com.tasiyoruz.api.admin;
