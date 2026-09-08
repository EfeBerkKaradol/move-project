package com.tasiyoruz.api.shared.sms;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Sağlayıcı yokken devreye giren, açıkça reddeden gönderici. */
class UnconfiguredSmsSender implements SmsSender {

    @Override
    public void send(String phone, String message) {
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "SMS servisi yapılandırılmamış. Telefon doğrulama şu an kapalı.");
    }

    @Override
    public boolean available() {
        return false;
    }
}
