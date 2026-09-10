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

    /**
     * Doğrulanmış numaranın maskelenmiş hâli: {@code +90 5** *** ** 34}.
     *
     * <p>Ayrı bir uç, çünkü maskeleme çağıran tarafa bırakılırsa er ya da geç
     * biri unutur. Numarayı ekranda göstermesi gereken ama tamamına ihtiyacı
     * olmayan taraf — teklif aşamasındaki araç sahibi gibi — ham numarayı hiç
     * görmüyor: sızdıramayacağı bir veriyi korumak zorunda değil.
     */
    Optional<String> maskedVerifiedPhone(String userId);
}
