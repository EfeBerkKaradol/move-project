package com.tasiyoruz.api.identity.api;

import java.util.Optional;

/**
 * Kullanıcı rehberi.
 *
 * <p>Diğer modüller kullanıcıyı yalnızca Keycloak subject'iyle tanıyor; e-posta ve ad
 * burada çözülüyor. Bildirim modülü alıcı adresini buradan alıyor.
 */
public interface UserDirectory {

    Optional<UserSummary> user(String subject);

    /** Yönetim API'si yapılandırılmış mı? Değilse rol eşitleme ve e-posta çözümleme kapalı. */
    boolean available();

    record UserSummary(String subject, String email, String firstName, String lastName, boolean emailVerified) {
        public String displayName() {
            var full = ((firstName == null ? "" : firstName) + " " + (lastName == null ? "" : lastName)).trim();
            return full.isEmpty() ? email : full;
        }
    }
}
