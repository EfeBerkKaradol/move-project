package com.tasiyoruz.api.identity.api;

import java.time.Instant;

/**
 * Kullanıcının telefon durumu.
 *
 * @param phone      doğrulanmış numara; yoksa null
 * @param verifiedAt doğrulama anı; yoksa null
 * @param available  SMS servisi bağlı mı — arayüz "şu an kapalı" diyebilsin diye
 */
public record PhoneView(String phone, Instant verifiedAt, boolean available) {

    public static PhoneView none(boolean available) {
        return new PhoneView(null, null, available);
    }
}
