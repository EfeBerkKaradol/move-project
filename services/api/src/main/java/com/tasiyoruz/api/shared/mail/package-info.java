/**
 * E-posta gönderim adaptörü.
 *
 * <p>Modulith'te alt paketler varsayılan olarak iç paket; burası adlandırılmış arayüz
 * olarak açılıyor ki bildirim modülü {@code shared::mail} diyerek bağımlılığını
 * deklare edebilsin. Depolama ve SMS adaptörleriyle aynı desen.
 */
@org.springframework.modulith.NamedInterface("mail")
package com.tasiyoruz.api.shared.mail;
