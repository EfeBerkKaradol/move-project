package com.tasiyoruz.api.shared.sms;

/**
 * SMS gönderimi.
 *
 * <p>Sağlayıcıdan bağımsız: Türkiye'de gönderici başlığı BTK onayı gerektiriyor ve
 * sağlayıcı değiştirmek gerçek bir olasılık. Arayüz dar tutuldu; çağıran taraf
 * hangi sağlayıcının kullanıldığını bilmiyor.
 */
public interface SmsSender {

    /**
     * Mesajı gönderir.
     *
     * @param phone   E.164 biçiminde numara (+905321234567)
     * @param message gövde; gönderici başlığı sağlayıcı ayarından geliyor
     * @throws org.springframework.web.server.ResponseStatusException sağlayıcı
     *         yapılandırılmamışsa 503 — sessizce yutmak, kullanıcının hiç gelmeyecek
     *         bir kodu beklemesi demek olurdu
     */
    void send(String phone, String message);

    /** Sağlayıcı bağlı mı; çağıran taraf akışı önden kapatabilsin diye. */
    boolean available();
}
