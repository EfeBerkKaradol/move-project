package com.tasiyoruz.api.shared.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Sağlayıcıya giden isteğin biçimini sabitler.
 *
 * <p>Gövde ya da başlık yanlış olsaydı hata yalnızca üretimde, gerçek bir bildirim
 * gönderilmeye çalışıldığında görülürdü. Sahte bir sunucu, sağlayıcı hesabına ve ağa
 * ihtiyaç duymadan isteğin tamamını okumayı sağlıyor.
 */
class BrevoMailSenderTest {

    private HttpServer server;
    private final AtomicReference<String> govde = new AtomicReference<>();
    private final AtomicReference<String> anahtarBasligi = new AtomicReference<>();
    private final AtomicReference<String> yol = new AtomicReference<>();
    private volatile int yanitKodu = 201;

    @BeforeEach
    void sunucuyuBaslat() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            yol.set(exchange.getRequestURI().getPath());
            anahtarBasligi.set(exchange.getRequestHeaders().getFirst("api-key"));
            govde.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            var cevap = yanitKodu == 201 ? "{\"messageId\":\"<abc@brevo>\"}" : "{\"message\":\"unauthorized\"}";
            exchange.sendResponseHeaders(yanitKodu, cevap.length());
            exchange.getResponseBody().write(cevap.getBytes(StandardCharsets.UTF_8));
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void sunucuyuDurdur() {
        server.stop(0);
    }

    private MailSender gonderici() {
        var adres = "http://127.0.0.1:" + server.getAddress().getPort();
        return new BrevoMailSender(new MailProperties("test-api-anahtari", adres));
    }

    @Test
    void istek_sozlesmedekiBicimdeGonderilir() throws Exception {
        gonderici().send(new MailMessage(
                "bildirim@karinca.tech", "KARINCA", "alici@ornek.com", "Teklif geldi", "Merhaba,\n\nyeni teklif."));

        assertThat(yol.get()).isEqualTo("/v3/smtp/email");
        assertThat(anahtarBasligi.get())
                .as("kimlik doğrulama api-key başlığıyla yapılıyor, Bearer ile değil")
                .isEqualTo("test-api-anahtari");

        var json = new ObjectMapper().readTree(govde.get());
        assertThat(json.at("/sender/email").asText()).isEqualTo("bildirim@karinca.tech");
        assertThat(json.at("/sender/name").asText()).isEqualTo("KARINCA");
        assertThat(json.at("/to/0/email").asText()).isEqualTo("alici@ornek.com");
        assertThat(json.at("/subject").asText()).isEqualTo("Teklif geldi");
        assertThat(json.at("/textContent").asText()).isEqualTo("Merhaba,\n\nyeni teklif.");
    }

    /**
     * Sağlayıcı reddederse hata yayılmalı: Mailer bunu yakalayıp bildirimi FAILED
     * olarak kaydediyor. Sessizce yutulsaydı gitmeyen posta gitmiş görünürdü.
     */
    @Test
    void sagayiciReddederse_hataYayilir() {
        yanitKodu = 401;
        var gonderici = gonderici();
        var mesaj = new MailMessage("a@b.com", "KARINCA", "c@d.com", "konu", "gövde");

        assertThatThrownBy(() -> gonderici.send(mesaj)).isInstanceOf(RuntimeException.class);
    }

    @Test
    void temelAdresinSonundakiEgikCizgi_yolaSizmaz() {
        var props = new MailProperties("k", "https://api.brevo.com///");
        assertThat(props.baseUrl()).isEqualTo("https://api.brevo.com");
    }
}
