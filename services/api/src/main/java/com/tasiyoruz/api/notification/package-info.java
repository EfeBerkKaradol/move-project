/**
 * E-posta bildirimleri (docs/02 §3).
 *
 * <p>Yalnızca olay tüketiyor. Diğer modüllerden aldığı tek şey olay kayıt tipleri
 * (api paketleri); servislerini çağırmıyor, olaylar bildirimin ihtiyacı olan özeti
 * zaten taşıyor. Kimlik rehberi tek gerçek bağımlılık: alıcının e-postası Keycloak'ta.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Bildirim",
        allowedDependencies = { "identity::api", "ordering::api", "tracking::api", "fleet::api" }
)
package com.tasiyoruz.api.notification;
