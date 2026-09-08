package com.tasiyoruz.api.shared.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * SMS sürücüsünü seçer.
 *
 * <p>Depolama adaptörüyle aynı desen: sağlayıcı yoksa uygulama açılıyor, telefon
 * doğrulama "servis yapılandırılmamış" diyerek açıkça reddediyor. Sessizce başarılı
 * dönüp kullanıcıyı hiç gelmeyecek bir kodu beklemeye bırakmak en kötü seçenek olurdu.
 */
@Configuration
@EnableConfigurationProperties(SmsProperties.class)
class SmsConfig {

    private static final Logger log = LoggerFactory.getLogger(SmsConfig.class);

    @Bean
    SmsSender smsSender(SmsProperties props) {
        if (props.logOnly()) {
            log.warn("SMS kayda yazma kipinde — doğrulama kodları günlüğe düşüyor. "
                    + "Bu yalnızca yerel geliştirme içindir, üretimde ASLA açık kalmamalı.");
            return new LoggingSmsSender();
        }
        if (!props.configured()) {
            log.warn("SMS sağlayıcısı yok — telefon doğrulama kapalı (ANAHTARLAR.md #2)");
            return new UnconfiguredSmsSender();
        }
        // Gerçek sağlayıcı adaptörü buraya gelecek. Hesap açılıp BTK gönderici başlığı
        // onaylanmadan yazılan entegrasyon denenemez; o yüzden bilerek boş bırakıldı.
        log.error("SMS sağlayıcısı '{}' için adaptör henüz yazılmadı — doğrulama kapalı çalışıyor",
                props.provider());
        return new UnconfiguredSmsSender();
    }
}
