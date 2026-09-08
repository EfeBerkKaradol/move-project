package com.tasiyoruz.api.trustboard.internal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.tasiyoruz.api.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Herkese açık uçların önbellekleri birbirine karışmamalı.
 *
 * <p>Üçü de {@code @Cacheable(cacheNames = "publicStats")} kullanıyordu ve ikisi
 * parametresizdi; Spring parametresiz metotlar için aynı anahtarı (SimpleKey.EMPTY)
 * üretiyor. Sonuç: hangi uç önce çağrılırsa önbelleği o dolduruyor, diğeri yanlış
 * tipte nesne alıp ClassCastException atıyordu. Spring Security bunu boş gövdeli
 * 401'e çeviriyor, yani hata "yetki sorunu" gibi görünüyordu.
 *
 * <p>Üretimde ana sayfa önce koridorları çağırdığı için {@code /public/stats} 401
 * dönüyordu; yerelde sıra tersine dönünce arıza {@code /public/corridors}'a geçiyordu.
 * Sıraya bağlı olduğu için tek uca bakan bir test bunu kaçırırdı — üçü de aynı
 * bağlamda, arka arkaya çağrılıyor.
 */
class PublicCacheIsolationTest extends IntegrationTestBase {

    @Autowired PublicStatsController stats;
    @Autowired PublicCorridorsController corridors;
    @Autowired PublicListingsController listings;

    @Test
    void herUcKendiOnbelleginiKullanir_sirayaBakilmaksizin() {
        // Önce sayaçlar: önbellek bu noktada PublicStatsView tutuyor
        assertThat(stats.stats()).isNotNull();

        assertThatCode(() -> corridors.corridors())
                .as("koridorlar, sayaçların önbelleğinden okumamalı")
                .doesNotThrowAnyException();
        assertThatCode(() -> listings.listings(null, null))
                .as("ilanlar, sayaçların önbelleğinden okumamalı")
                .doesNotThrowAnyException();

        // Ters sırada da: ikinci tur artık önbellekten geliyor, tip korunmalı
        assertThat(corridors.corridors()).isNotNull();
        assertThat(listings.listings(null, null)).isNotNull();
        assertThat(stats.stats()).isNotNull();
    }
}
