/**
 * Hukuk ve uyum: sözleşme sürümleri, rıza kayıtları, işlem bazlı beyanlar,
 * uyum olayları, kullanıcı bildirimleri, denetim izi ve hesap kısıtlamaları
 * (docs/14).
 *
 * <p><strong>Hiçbir modüle bağımlı değil, bilinçli olarak.</strong> Beyan almak
 * ve olay üretmek ilan yayınlama, taşıyıcı onayı ve teklif akışlarının içinden
 * çağrılıyor; bu modül onlara bağımlı olsaydı döngü kaçınılmazdı. Buradan dışarı
 * bakan tek şey kullanıcı kimliği (Keycloak subject), o da bir katardan ibaret.
 */
@org.springframework.modulith.ApplicationModule(displayName = "Hukuk ve Uyum")
package com.tasiyoruz.api.compliance;
