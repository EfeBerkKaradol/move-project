package tech.karinca.keycloak.verify;

import org.keycloak.Config;
import org.keycloak.authentication.RequiredActionFactory;
import org.keycloak.authentication.RequiredActionProvider;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

/**
 * E-posta doğrulamayı bağlantı yerine altı haneli kodla yapar.
 *
 * <p>Keycloak'ın kendi {@code VERIFY_EMAIL} eylemi kullanıcıya bir bağlantı yolluyor.
 * Kayıt akışında bu, kullanıcıyı siteden koparıyor: postayı başka bir cihazda açan
 * kişi oturumunu kaybediyor, mobilde uygulama-tarayıcı geçişi kayıt oranını düşürüyor.
 * Kod, kayıt sekmesinden ayrılmadan girilebiliyor.
 *
 * <p>Kimlik bilerek {@code VERIFY_EMAIL}: aynı kimlikle daha yüksek {@link #order()}
 * veren fabrika kazanıyor, böylece realm ayarındaki "Verify email" anahtarı ve mevcut
 * akışlar olduğu gibi çalışmaya devam ediyor. Ayrı bir kimlik verilseydi yöneticinin
 * yerleşik eylemi kapatıp yenisini açması gerekirdi; unutulduğunda iki doğrulama
 * arka arkaya sorulurdu.
 */
public class VerifyEmailCodeFactory implements RequiredActionFactory {

    private int codeTtlSeconds;
    private int maxAttempts;

    @Override
    public RequiredActionProvider create(KeycloakSession session) {
        return new VerifyEmailCodeProvider(codeTtlSeconds, maxAttempts);
    }

    @Override
    public void init(Config.Scope scope) {
        codeTtlSeconds = scope.getInt("codeTtlSeconds", 600);
        maxAttempts = scope.getInt("maxAttempts", 5);
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {}

    @Override
    public void close() {}

    @Override
    public String getId() {
        return "VERIFY_EMAIL";
    }

    @Override
    public String getDisplayText() {
        return "E-postayı doğrula (kod ile)";
    }

    @Override
    public boolean isOneTimeAction() {
        return true;
    }

    @Override
    public int order() {
        return 100;
    }
}
