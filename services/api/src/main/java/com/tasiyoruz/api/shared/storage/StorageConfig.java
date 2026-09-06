package com.tasiyoruz.api.shared.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Depo sürücüsünü seçer.
 *
 * <p>Anahtar verilmemişse S3 istemcisi kurulmuyor ve {@link UnconfiguredObjectStorage}
 * devreye giriyor: uygulama açılıyor, belge yükleme "depo yapılandırılmamış" diyerek
 * açıkça reddediyor. Sessizce kabul edip dosyayı kaybetmek en kötü seçenek olurdu.
 */
@Configuration
@EnableConfigurationProperties(StorageProperties.class)
class StorageConfig {

    private static final Logger log = LoggerFactory.getLogger(StorageConfig.class);

    @Bean
    ObjectStorage objectStorage(StorageProperties props) {
        if (!props.configured()) {
            log.warn("Nesne deposu anahtarları yok — belge yükleme kapalı (ANAHTARLAR.md #18)");
            return new UnconfiguredObjectStorage();
        }
        log.info("Nesne deposu: {} kova={}", props.endpoint() == null ? "AWS" : props.endpoint(), props.bucket());
        return new S3ObjectStorage(props);
    }
}
