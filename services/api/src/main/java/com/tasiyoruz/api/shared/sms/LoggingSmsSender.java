package com.tasiyoruz.api.shared.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Mesajı göndermek yerine kayda yazar.
 *
 * <p>Yerel geliştirmenin Mailhog karşılığı: SMS sağlayıcısı olmadan doğrulama akışı
 * baştan sona denenebiliyor, kodu günlükten okuyorsun. Üretimde asla açılmaz —
 * doğrulama kodunu günlüğe yazmak onu sunucu kaydını görebilen herkese vermektir.
 */
class LoggingSmsSender implements SmsSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingSmsSender.class);

    @Override
    public void send(String phone, String message) {
        log.info("[SMS → {}] {}", phone, message);
    }

    @Override
    public boolean available() {
        return true;
    }
}
