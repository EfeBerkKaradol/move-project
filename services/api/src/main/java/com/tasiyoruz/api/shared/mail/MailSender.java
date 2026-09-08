package com.tasiyoruz.api.shared.mail;

/**
 * E-posta gönderimi.
 *
 * <p>Taşıma katmanı çağıran taraftan gizli: aynı posta ya SMTP ile ya sağlayıcının
 * HTTP API'siyle çıkıyor. Bu ayrım keyfi değil — barındırma sağlayıcıları ücretsiz
 * planlarda giden SMTP portlarını (25/465/587) kapatıyor, HTTP 443 açık kalıyor.
 */
public interface MailSender {

    /** Postayı gönderir. Sağlayıcı hatası {@link RuntimeException} olarak yayılır. */
    void send(MailMessage message);

    /** Gönderim yapılabilir mi; çağıran taraf akışı önden kapatabilsin diye. */
    boolean available();
}
