package com.tasiyoruz.api.shared.config;

import java.net.URI;
import org.redisson.spring.starter.RedissonAutoConfigurationCustomizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Redisson'ı TLS'li (yönetilen) Redis'e bağlar.
 *
 * <p>Redisson'ın Spring Boot başlatıcısı {@code spring.data.redis.url} içindeki
 * {@code rediss://} şemasını görmezden geliyor ve düz {@code redis://} ile bağlanmaya
 * çalışıyor. Upstash gibi yalnızca TLS kabul eden sağlayıcılarda bu, AUTH komutunda
 * zaman aşımıyla sonuçlanıyor ve uygulama hiç açılmıyor — hata mesajı da "Unable to
 * connect" diyor, TLS'ten söz etmiyor. Adresi Redisson'a burada elle veriyoruz.
 *
 * <p>Yerel {@code redis://} adreslerinde bu sınıf hiçbir şey yapmıyor; başlatıcının
 * kendi yapılandırması geçerli kalıyor.
 */
@Configuration
class RedisConfig {

    private static final Logger log = LoggerFactory.getLogger(RedisConfig.class);

    /** Yönetilen Redis'te bağlantı sayısı ücretlendirmeye girebiliyor; varsayılan 24 fazla. */
    private static final int TLS_CONNECTION_POOL_SIZE = 8;
    private static final int TLS_MIN_IDLE = 2;

    @Bean
    RedissonAutoConfigurationCustomizer redissonTlsCustomizer(
            @Value("${spring.data.redis.url:}") String url) {
        return config -> {
            if (!url.startsWith("rediss://")) return;

            var uri = URI.create(url);
            var server = config.useSingleServer()
                    .setAddress("rediss://" + uri.getHost() + ":" + (uri.getPort() < 0 ? 6379 : uri.getPort()))
                    .setConnectionPoolSize(TLS_CONNECTION_POOL_SIZE)
                    .setConnectionMinimumIdleSize(TLS_MIN_IDLE);

            var userInfo = uri.getUserInfo();
            if (userInfo != null) {
                int sep = userInfo.indexOf(':');
                var user = sep < 0 ? userInfo : userInfo.substring(0, sep);
                var password = sep < 0 ? null : userInfo.substring(sep + 1);
                // Upstash kullanıcı adını "default" veriyor; Redisson'da bu ACL kullanıcısı
                // demek ve boş bırakılırsa parola tek başına yeterli olmuyor
                if (!user.isBlank()) server.setUsername(user);
                if (password != null && !password.isBlank()) server.setPassword(password);
            }
            log.info("Redisson TLS ile yapılandırıldı: {}:{}", uri.getHost(), uri.getPort());
        };
    }
}
