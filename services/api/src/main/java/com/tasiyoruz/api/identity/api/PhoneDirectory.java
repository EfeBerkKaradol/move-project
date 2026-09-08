package com.tasiyoruz.api.identity.api;

import java.util.Optional;

/**
 * Doğrulanmış telefon numarasına erişim.
 *
 * <p>Diğer modüllerin kimlik modülünden okuduğu dar arayüz: teslimat iletişimi ve
 * SMS bildirimleri doğrulanmamış bir numaraya gitmemeli. Doğrulanmamış numara bu
 * arayüzden hiç görünmüyor — çağıran tarafın ayrıca kontrol etmesi gerekmesin diye.
 */
public interface PhoneDirectory {

    /** Kullanıcının doğrulanmış numarası; doğrulanmamışsa boş. */
    Optional<String> verifiedPhone(String userId);
}
