package tech.karinca.keycloak.mail;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import org.jboss.logging.Logger;
import org.keycloak.email.EmailException;
import org.keycloak.email.EmailSenderProvider;
import org.keycloak.models.KeycloakSession;

/**
 * Postayı sağlayıcının HTTP API'sine gönderir.
 *
 * <p>Gönderen adresi ve görünen ad realm'in Email sekmesinden geliyor; API anahtarı
 * ortam değişkeninden. Anahtar veritabanına ya da realm dışa aktarımına girmiyor.
 */
class HttpEmailSenderProvider implements EmailSenderProvider {

    private static final Logger log = Logger.getLogger(HttpEmailSenderProvider.class);
    private static final ObjectMapper JSON = new ObjectMapper();

    private final KeycloakSession session;
    private final String apiKey;
    private final String baseUrl;

    HttpEmailSenderProvider(KeycloakSession session, String apiKey, String baseUrl) {
        this.session = session;
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }

    @Override
    public void send(Map<String, String> config, String address, String subject,
                     String textBody, String htmlBody) throws EmailException {

        if (apiKey == null || apiKey.isBlank()) {
            // Anahtar yoksa davranış değişmiyor: Keycloak'ın kendi SMTP sağlayıcısı.
            // Bu eklentinin varlığı tek başına hiçbir şeyi bozmasın diye.
            session.getProvider(EmailSenderProvider.class, "default")
                    .send(config, address, subject, textBody, htmlBody);
            return;
        }

        var from = config.get("from");
        if (from == null || from.isBlank()) {
            throw new EmailException("Gönderen adresi tanımsız — Realm settings → Email → From");
        }

        ObjectNode govde = JSON.createObjectNode();
        ObjectNode gonderen = govde.putObject("sender");
        gonderen.put("email", from);
        var gorunenAd = config.get("fromDisplayName");
        if (gorunenAd != null && !gorunenAd.isBlank()) gonderen.put("name", gorunenAd);
        govde.putArray("to").addObject().put("email", address);
        govde.put("subject", subject);
        if (textBody != null) govde.put("textContent", textBody);
        if (htmlBody != null) govde.put("htmlContent", htmlBody);

        var istek = HttpRequest.newBuilder(URI.create(baseUrl + "/v3/smtp/email"))
                .header("api-key", apiKey)
                .header("content-type", "application/json")
                .timeout(Duration.ofSeconds(20))
                .POST(HttpRequest.BodyPublishers.ofString(govde.toString(), StandardCharsets.UTF_8))
                .build();

        try (var client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build()) {
            var yanit = client.send(istek, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (yanit.statusCode() / 100 != 2) {
                // Yanıt gövdesi sebebi söylüyor (doğrulanmamış gönderici, yanlış anahtar…);
                // yutulursa Keycloak'ta yalnızca "Failed to send email" görünür.
                throw new EmailException("Posta API'si reddetti: HTTP " + yanit.statusCode() + " — " + yanit.body());
            }
            log.debugf("Posta HTTP API ile gönderildi: %s", address);
        } catch (EmailException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new EmailException("Posta gönderimi kesildi", e);
        } catch (Exception e) {
            throw new EmailException("Posta API'sine ulaşılamadı: " + e.getMessage(), e);
        }
    }

    @Override
    public void close() {}
}
