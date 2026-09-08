package com.tasiyoruz.api.shared.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;

/**
 * Posta taşımasını seçer.
 *
 * <p>Sıra bilinçli: HTTP API anahtarı verilmişse o kazanıyor. Barındırma sağlayıcıları
 * ücretsiz planlarda giden SMTP portlarını kapattığı için SMTP birçok ortamda sessizce
 * zaman aşımına uğruyor; HTTP her yerde çalışıyor.
 *
 * <p>Hiçbiri yoksa uygulama yine açılıyor, bildirimler SKIPPED olarak kaydediliyor.
 */
@Configuration
@EnableConfigurationProperties(MailProperties.class)
class MailConfig {

    private static final Logger log = LoggerFactory.getLogger(MailConfig.class);

    @Bean
    MailSender mailSender(MailProperties props,
                          ObjectProvider<JavaMailSender> smtp,
                          @Value("${spring.mail.host:}") String smtpHost) {
        if (props.httpConfigured()) {
            log.info("Posta gönderimi HTTP API üzerinden: {}", props.baseUrl());
            return new BrevoMailSender(props);
        }
        var javaMail = smtpHost == null || smtpHost.isBlank() ? null : smtp.getIfAvailable();
        if (javaMail != null) {
            log.info("Posta gönderimi SMTP üzerinden: {}", smtpHost);
            log.warn("Barındırma sağlayıcın giden SMTP portlarını kapatıyorsa gönderim "
                    + "zaman aşımına uğrar; o durumda TASIYORUZ_MAIL_API_KEY ver (ANAHTARLAR #20)");
            return new SmtpMailSender(javaMail);
        }
        log.warn("Posta sağlayıcısı yok — bildirimler yalnızca kayda yazılır (ANAHTARLAR.md #20)");
        return new UnconfiguredMailSender();
    }
}
