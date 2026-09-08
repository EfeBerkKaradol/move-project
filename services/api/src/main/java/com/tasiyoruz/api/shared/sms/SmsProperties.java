package com.tasiyoruz.api.shared.sms;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * SMS sağlayıcı ayarları.
 *
 * @param provider     sağlayıcı adı (netgsm, iletimerkezi, vatansms…)
 * @param username     sağlayıcı kullanıcı adı
 * @param password     sağlayıcı parolası
 * @param senderHeader BTK onaylı gönderici başlığı
 * @param logOnly      gerçek gönderim yerine kayda yazsın mı (yerel geliştirme)
 */
@ConfigurationProperties(prefix = "tasiyoruz.sms")
public record SmsProperties(
        String provider,
        String username,
        String password,
        String senderHeader,
        boolean logOnly) {

    /** Gerçek bir sağlayıcı bağlı mı. */
    public boolean configured() {
        return provider != null && !provider.isBlank()
                && username != null && !username.isBlank()
                && password != null && !password.isBlank()
                && senderHeader != null && !senderHeader.isBlank();
    }
}
