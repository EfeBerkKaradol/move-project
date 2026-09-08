package com.tasiyoruz.api.shared.mail;

/**
 * Sağlayıcı yokken devreye giren gönderici.
 *
 * <p>{@link #available()} false döndüğü için çağıran taraf gönderimi hiç denemiyor,
 * bildirimi SKIPPED olarak kaydediyor. Yine de çağrılırsa sessizce başarılı dönmek
 * yerine hata veriyor — sessiz başarı, gitmeyen postayı gitmiş göstermek olurdu.
 */
class UnconfiguredMailSender implements MailSender {

    @Override
    public void send(MailMessage message) {
        throw new IllegalStateException("Posta sağlayıcısı yapılandırılmamış");
    }

    @Override
    public boolean available() {
        return false;
    }
}
