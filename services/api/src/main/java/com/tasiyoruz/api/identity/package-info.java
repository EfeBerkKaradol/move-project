/**
 * Kullanıcı, hesap, rol ve KVKK rıza kayıtları.
 *
 * <p>Kullanıcı verisi Keycloak'ta; bu modül onun yönetim API'sine açılan tek kapı.
 * Telefon numarası istisna: Keycloak'ta doğrulanmış telefon kavramı yok, numara ve
 * doğrulama durumu burada tutuluyor.
 * Filo olaylarını dinleyip rolü eşitliyor: başvuru onaylanınca DRIVER veriliyor,
 * askıya alınınca geri alınıyor. Roller elle verilseydi onaylı ama panele giremeyen
 * taşıyıcılar birikirdi.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Kimlik",
        allowedDependencies = { "fleet::api", "shared::sms" }
)
package com.tasiyoruz.api.identity;
