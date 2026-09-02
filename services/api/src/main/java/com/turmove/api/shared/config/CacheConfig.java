package com.turmove.api.shared.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import java.util.List;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * Referans verisi önbelleği.
 *
 * <p>Araç tipleri, yük kategorileri, eşya kataloğu ve ilçeler çok okunup çok az
 * değişiyor. Bunları Redis'e gitmeden pod-yerel tutuyoruz; araç öneri motorunun
 * &lt;100 ms hedefi buna dayanıyor (docs/04).
 *
 * <p>Redisson'ın cache manager'ı yalnızca önceden tanımlanmış cache'leri açıyor ve
 * bilinmeyen isimde {@code IllegalArgumentException} atıyor. Bu yüzden burada
 * {@link Primary} bir Caffeine yöneticisi tanımlanıyor; cache adları da açıkça
 * listeleniyor ki yazım hatası sessizce cache'siz çalışmaya dönüşmesin.
 */
@Configuration
@EnableCaching
class CacheConfig {

    static final String VEHICLE_TYPES = "vehicleTypes";
    static final String CARGO_ITEMS = "cargoItems";
    static final String CARGO_CATEGORIES = "cargoCategories";
    static final String DISTRICTS = "districts";

    @Bean
    @Primary
    CacheManager referenceDataCacheManager() {
        var manager = new CaffeineCacheManager(
                VEHICLE_TYPES, CARGO_ITEMS, CARGO_CATEGORIES, DISTRICTS);
        manager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(500)
                .expireAfterWrite(Duration.ofMinutes(30)));
        // Operasyon panelinden katalog değiştiğinde ilgili cache invalidate edilecek;
        // 30 dakikalık süre o mekanizma gelene kadarki güvenlik ağı.
        manager.setAllowNullValues(false);
        return manager;
    }
}
