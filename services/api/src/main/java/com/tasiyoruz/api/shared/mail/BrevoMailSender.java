package com.tasiyoruz.api.shared.mail;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

/**
 * Brevo'nun işlem e-postası API'si üzerinden gönderim.
 *
 * <p>SMTP yerine HTTP kullanmasının sebebi barındırma: Render ücretsiz planda giden
 * 25/465/587 portlarını kapatıyor, 443 açık. Aynı posta aynı sağlayıcıdan çıkıyor,
 * yalnızca taşıma değişiyor.
 *
 * <p>Anahtar SMTP anahtarı DEĞİL, hesabın API anahtarı (Brevo panelinde ayrı sekme).
 * İkisi karıştırıldığında sunucu 401 döner.
 */
class BrevoMailSender implements MailSender {

    private static final Logger log = LoggerFactory.getLogger(BrevoMailSender.class);

    private final RestClient http;

    BrevoMailSender(MailProperties props) {
        this.http = RestClient.builder()
                .baseUrl(props.baseUrl())
                .defaultHeader("api-key", props.apiKey())
                .build();
    }

    private record Address(String email, String name) {}

    private record Request(Address sender, List<Address> to, String subject, String textContent) {}

    @Override
    public void send(MailMessage message) {
        var body = new Request(
                new Address(message.from(), message.fromName()),
                List.of(new Address(message.to(), null)),
                message.subject(),
                message.body());
        http.post().uri("/v3/smtp/email")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toBodilessEntity();
        log.debug("Posta HTTP API ile gönderildi → {}", message.to());
    }

    @Override
    public boolean available() {
        return true;
    }
}
