package tech.karinca.keycloak.verify;

import jakarta.ws.rs.core.MultivaluedMap;
import java.security.SecureRandom;
import java.time.Instant;
import org.jboss.logging.Logger;
import org.keycloak.authentication.RequiredActionContext;
import org.keycloak.authentication.RequiredActionProvider;
import org.keycloak.email.EmailException;
import org.keycloak.email.EmailSenderProvider;
import org.keycloak.models.UserModel;
import org.keycloak.sessions.AuthenticationSessionModel;

/**
 * Altı haneli kodla e-posta doğrulama.
 *
 * <p>Kod, kimlik doğrulama oturumunun notlarında tutuluyor: sunucu tarafında, kısa
 * ömürlü ve oturuma bağlı. Kullanıcı tablosuna yazılsaydı doğrulanmamış kodlar
 * kalıcı veriye dönüşürdü.
 *
 * <p>Kodun tek başına güvenlik değeri yok; değeri sınırlardan geliyor: süre dolumu,
 * deneme sayısı ve her yeni kod isteğinde sayacın sıfırlanmaması. Telefon
 * doğrulamasıyla aynı yaklaşım.
 */
public class VerifyEmailCodeProvider implements RequiredActionProvider {

    private static final Logger log = Logger.getLogger(VerifyEmailCodeProvider.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private static final String NOTE_CODE = "karinca.verify.code";
    private static final String NOTE_EXPIRES = "karinca.verify.expiresAt";
    private static final String NOTE_ATTEMPTS = "karinca.verify.attempts";

    private final int codeTtlSeconds;
    private final int maxAttempts;

    VerifyEmailCodeProvider(int codeTtlSeconds, int maxAttempts) {
        this.codeTtlSeconds = codeTtlSeconds;
        this.maxAttempts = maxAttempts;
    }

    @Override
    public void evaluateTriggers(RequiredActionContext context) {
        var user = context.getUser();
        if (context.getRealm().isVerifyEmail() && !user.isEmailVerified()
                && user.getEmail() != null && !user.getEmail().isBlank()) {
            user.addRequiredAction(UserModel.RequiredAction.VERIFY_EMAIL);
        }
    }

    @Override
    public void requiredActionChallenge(RequiredActionContext context) {
        var user = context.getUser();
        if (user.isEmailVerified()) {
            context.success();
            return;
        }
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            // E-posta yoksa doğrulanacak bir şey de yok; kullanıcıyı boş bir formda
            // kilitlemek yerine eylemi atlıyoruz.
            context.ignore();
            return;
        }
        kodUretVeGonder(context);
        context.challenge(form(context).createForm("login-verify-email-code.ftl"));
    }

    @Override
    public void processAction(RequiredActionContext context) {
        MultivaluedMap<String, String> alanlar = context.getHttpRequest().getDecodedFormParameters();
        var oturum = context.getAuthenticationSession();

        if (alanlar.containsKey("resend")) {
            kodUretVeGonder(context);
            context.challenge(form(context)
                    .setInfo("karincaVerifyCodeResent")
                    .createForm("login-verify-email-code.ftl"));
            return;
        }

        var beklenen = oturum.getAuthNote(NOTE_CODE);
        var sonGecerlilik = oturum.getAuthNote(NOTE_EXPIRES);
        if (beklenen == null || sonGecerlilik == null
                || Instant.now().isAfter(Instant.ofEpochSecond(Long.parseLong(sonGecerlilik)))) {
            context.challenge(form(context)
                    .setError("karincaVerifyCodeExpired")
                    .createForm("login-verify-email-code.ftl"));
            return;
        }

        int deneme = denemeSayisi(oturum) + 1;
        oturum.setAuthNote(NOTE_ATTEMPTS, String.valueOf(deneme));
        if (deneme > maxAttempts) {
            // Kod düşürülüyor: sınır dolduktan sonra doğru kod da kabul edilmemeli,
            // yoksa deneme sınırı yalnızca yavaşlatır, engellemez.
            temizle(oturum);
            context.challenge(form(context)
                    .setError("karincaVerifyCodeTooManyAttempts")
                    .createForm("login-verify-email-code.ftl"));
            return;
        }

        var girilen = alanlar.getFirst("code");
        if (girilen == null || !sabitZamandaEsit(beklenen, girilen.trim())) {
            context.challenge(form(context)
                    .setError("karincaVerifyCodeInvalid")
                    .createForm("login-verify-email-code.ftl"));
            return;
        }

        context.getUser().setEmailVerified(true);
        temizle(oturum);
        log.debugf("E-posta kodla doğrulandı: %s", context.getUser().getId());
        context.success();
    }

    @Override
    public void close() {}

    private org.keycloak.forms.login.LoginFormsProvider form(RequiredActionContext context) {
        return context.form().setAttribute("karincaEmail", maskele(context.getUser().getEmail()));
    }

    private void kodUretVeGonder(RequiredActionContext context) {
        var kod = String.format("%06d", RANDOM.nextInt(1_000_000));
        var oturum = context.getAuthenticationSession();
        oturum.setAuthNote(NOTE_CODE, kod);
        oturum.setAuthNote(NOTE_EXPIRES, String.valueOf(Instant.now().plusSeconds(codeTtlSeconds).getEpochSecond()));
        // Deneme sayacı yeni kodla SIFIRLANMIYOR: sıfırlansaydı sınırsız deneme için
        // sürekli yeni kod istemek yeterli olurdu.

        var dakika = Math.max(1, codeTtlSeconds / 60);
        var konu = "KARINCA doğrulama kodun: " + kod;
        var metin = "Merhaba,\n\nKARINCA hesabını doğrulamak için kodun: " + kod
                + "\n\nKod " + dakika + " dakika geçerli. Bu isteği sen yapmadıysan görmezden gel.\n\n—\nKARINCA";
        var html = "<div style=\"font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.6\">"
                + "<p>Merhaba,</p><p>KARINCA hesabını doğrulamak için kodun:</p>"
                + "<p style=\"font-size:32px;font-weight:800;letter-spacing:.2em;margin:24px 0\">" + kod + "</p>"
                + "<p style=\"color:#666\">Kod " + dakika + " dakika geçerli. Bu isteği sen yapmadıysan görmezden gel.</p>"
                + "<p style=\"color:#666\">—<br>KARINCA</p></div>";

        try {
            context.getSession().getProvider(EmailSenderProvider.class)
                    .send(context.getRealm().getSmtpConfig(), context.getUser().getEmail(), konu, metin, html);
        } catch (EmailException e) {
            // Yutulmuyor: kullanıcı gelmeyecek bir kodu beklemesin.
            log.error("Doğrulama kodu gönderilemedi", e);
            throw new RuntimeException("E-posta gönderilemedi", e);
        }
    }

    private int denemeSayisi(AuthenticationSessionModel oturum) {
        var ham = oturum.getAuthNote(NOTE_ATTEMPTS);
        try {
            return ham == null ? 0 : Integer.parseInt(ham);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private void temizle(AuthenticationSessionModel oturum) {
        oturum.removeAuthNote(NOTE_CODE);
        oturum.removeAuthNote(NOTE_EXPIRES);
    }

    /** Uzunluk farkı da dahil, karşılaştırma süresinden kod sızmasın. */
    private static boolean sabitZamandaEsit(String a, String b) {
        if (a == null || b == null) return false;
        int fark = a.length() ^ b.length();
        for (int i = 0; i < a.length() && i < b.length(); i++) fark |= a.charAt(i) ^ b.charAt(i);
        return fark == 0;
    }

    /** Formda tam adres gösterilmiyor: omuz üstünden bakan biri adresi öğrenmesin. */
    private static String maskele(String eposta) {
        if (eposta == null) return "";
        int at = eposta.indexOf('@');
        if (at <= 1) return eposta;
        return eposta.charAt(0) + "***" + eposta.substring(at - 1);
    }
}
