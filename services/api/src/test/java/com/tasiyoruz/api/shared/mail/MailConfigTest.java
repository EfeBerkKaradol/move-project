package com.tasiyoruz.api.shared.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;

/**
 * Taşıma seçimi.
 *
 * <p>Sıra önemli: HTTP anahtarı varsa SMTP'ye düşülmemeli. Barındırma sağlayıcıları
 * ücretsiz planlarda giden SMTP portlarını kapattığı için SMTP orada sessizce zaman
 * aşımına uğruyor — yanlış sırayla seçim yapan bir yapılandırma, çalışıyor görünüp
 * hiç posta göndermez.
 */
class MailConfigTest {

    private final MailConfig config = new MailConfig();

    @SuppressWarnings("unchecked")
    private static ObjectProvider<JavaMailSender> smtpVar() {
        var provider = (ObjectProvider<JavaMailSender>) mock(ObjectProvider.class);
        org.mockito.Mockito.when(provider.getIfAvailable()).thenReturn(mock(JavaMailSender.class));
        return provider;
    }

    @SuppressWarnings("unchecked")
    private static ObjectProvider<JavaMailSender> smtpYok() {
        var provider = (ObjectProvider<JavaMailSender>) mock(ObjectProvider.class);
        org.mockito.Mockito.when(provider.getIfAvailable()).thenReturn(null);
        return provider;
    }

    @Test
    void apiAnahtariVarsa_httpSecilir_smtpVarsaBile() {
        var sender = config.applicationMailSender(new MailProperties("anahtar", null), smtpVar(), "smtp.saglayici.com");

        assertThat(sender).isInstanceOf(BrevoMailSender.class);
        assertThat(sender.available()).isTrue();
    }

    @Test
    void apiAnahtariYokAmaSmtpVarsa_smtpSecilir() {
        var sender = config.applicationMailSender(new MailProperties(null, null), smtpVar(), "smtp.saglayici.com");

        assertThat(sender).isInstanceOf(SmtpMailSender.class);
    }

    /**
     * Spring, {@code spring.mail.host} boş dizeyle tanımlıysa da gönderici üretiyor.
     * Adres boşken SMTP seçilseydi her bildirim localhost'a bağlanmayı deneyip
     * FAILED olurdu; doğrusu baştan "yapılandırılmamış" demek.
     */
    @Test
    void adresBossa_smtpBeaniVarsaBileYapilandirilmamisSayilir() {
        var sender = config.applicationMailSender(new MailProperties(null, null), smtpVar(), "");

        assertThat(sender).isInstanceOf(UnconfiguredMailSender.class);
        assertThat(sender.available()).isFalse();
    }

    @Test
    void hicbiriYoksa_uygulamaAcilir_gonderimKapaliCalisir() {
        var sender = config.applicationMailSender(new MailProperties(null, null), smtpYok(), null);

        assertThat(sender.available()).isFalse();
    }
}
