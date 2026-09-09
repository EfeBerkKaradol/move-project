package tech.karinca.keycloak.mail;

import org.keycloak.Config;
import org.keycloak.email.EmailSenderProvider;
import org.keycloak.email.EmailSenderProviderFactory;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

/**
 * Postayı SMTP yerine sağlayıcının HTTP API'si üzerinden gönderen fabrika.
 *
 * <p>Neden gerekiyor: barındırma sağlayıcıları (Render'ın ücretsiz planı dahil) giden
 * SMTP portlarını 25/465/587 kapatıyor. Keycloak yalnızca SMTP konuşuyor, dolayısıyla
 * doğrulama ve "şifremi unuttum" postaları o ortamlarda hiç gönderilemiyor. Bu eklenti
 * aynı postayı 443 üzerinden gönderiyor.
 *
 * <p>{@link #order()} varsayılandan yüksek: Keycloak açıkça bir sağlayıcı seçilmediğinde
 * en yüksek sıralamalı fabrikayı kullanıyor, böylece ek yapılandırma gerekmiyor.
 *
 * <p>Anahtar verilmediğinde davranış değişmiyor — gönderim Keycloak'ın kendi SMTP
 * sağlayıcısına devrediliyor. Eklentinin varlığı tek başına hiçbir şeyi bozmuyor.
 */
public class HttpEmailSenderProviderFactory implements EmailSenderProviderFactory {

    static final String ID = "karinca-http";

    private String apiKey;
    private String baseUrl;
    private String varsayilanGonderen;
    private String varsayilanGonderenAdi;

    @Override
    public EmailSenderProvider create(KeycloakSession session) {
        return new HttpEmailSenderProvider(session, apiKey, baseUrl, varsayilanGonderen, varsayilanGonderenAdi);
    }

    @Override
    public void init(Config.Scope scope) {
        // Ortam değişkeni API servisiyle aynı adı taşıyor; iki serviste tek anahtar.
        apiKey = ilkDolu(scope.get("apiKey"), System.getenv("TASIYORUZ_MAIL_API_KEY"));
        baseUrl = ilkDolu(scope.get("baseUrl"), System.getenv("TASIYORUZ_MAIL_BASE_URL"), "https://api.brevo.com");
        // Realm'in Email sekmesi doldurulmamışsa gönderen buradan geliyor. Dağıtım
        // realm'inde SMTP bloğu bilerek silindiği için o alan boş başlıyor; adres
        // ortam değişkeninden gelmeseydi doğrulama ilk kayıtta hata verirdi ve
        // yöneticinin panelde ek bir adım yapması gerekirdi.
        varsayilanGonderen = ilkDolu(scope.get("from"), System.getenv("NOTIFICATION_FROM"));
        varsayilanGonderenAdi = ilkDolu(scope.get("fromName"), System.getenv("NOTIFICATION_FROM_NAME"), "KARINCA");
    }

    private static String ilkDolu(String... adaylar) {
        for (String a : adaylar) {
            if (a != null && !a.isBlank()) return a.replaceAll("/+$", "");
        }
        return null;
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {}

    @Override
    public void close() {}

    @Override
    public String getId() {
        return ID;
    }

    @Override
    public int order() {
        return 100;
    }
}
