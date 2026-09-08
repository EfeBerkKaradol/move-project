/**
 * SMS gönderim adaptörü.
 *
 * <p>Modulith'te alt paketler varsayılan olarak iç paket; burası adlandırılmış
 * arayüz olarak açılıyor ki kimlik modülü {@code shared::sms} diyerek bağımlılığını
 * deklare edebilsin. Depolama adaptörüyle aynı desen.
 *
 * <p>Bildirim modülü de ileride buraya bağlanacak: sipariş durumu ve takip linki
 * SMS ile gidecek (ANAHTARLAR #2).
 */
@org.springframework.modulith.NamedInterface("sms")
package com.tasiyoruz.api.shared.sms;
