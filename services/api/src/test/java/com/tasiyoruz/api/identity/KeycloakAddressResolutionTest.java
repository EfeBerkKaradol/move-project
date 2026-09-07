package com.tasiyoruz.api.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.tasiyoruz.api.ApplicationYaml;
import java.io.IOException;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Keycloak adresinin ortam değişkenlerinden doğru kurulduğunu sabitler.
 *
 * <p>Render servis adresini şemasız veriyor ("x.onrender.com"). İlk denemede adres
 * doğrudan kullanılmıştı; ortaya {@code x.onrender.com:443/realms/tasiyoruz} gibi
 * şemasız bir değer çıkıyordu. Spring bunu açılışta çözemez, API hiç kalkmaz ve hata
 * yalnızca dağıtımda görülür.
 *
 * <p>Bağlam açmadan doğrudan dosya okunuyor; nedeni {@link ApplicationYaml}.
 */
class KeycloakAddressResolutionTest {

    @Test
    void uretimde_semaVeHostBirlestirilipTamAdresUretilir() throws IOException {
        var env = ApplicationYaml.resolvedWith(Map.of(
                "KEYCLOAK_SCHEME", "https",
                "KEYCLOAK_HOST", "tasiyoruz-keycloak.onrender.com"));

        assertThat(env.getProperty("spring.security.oauth2.resourceserver.jwt.issuer-uri"))
                .isEqualTo("https://tasiyoruz-keycloak.onrender.com/realms/tasiyoruz");
        assertThat(env.getProperty("tasiyoruz.keycloak.admin.base-url"))
                .isEqualTo("https://tasiyoruz-keycloak.onrender.com");
    }

    @Test
    void tamAdresElleVerilirse_semaVeHostYokSayilir() throws IOException {
        var env = ApplicationYaml.resolvedWith(Map.of(
                "KEYCLOAK_ISSUER_URI", "https://kimlik.tasiyoruz.com",
                "KEYCLOAK_SCHEME", "http",
                "KEYCLOAK_HOST", "yok-sayilmali"));

        assertThat(env.getProperty("spring.security.oauth2.resourceserver.jwt.issuer-uri"))
                .isEqualTo("https://kimlik.tasiyoruz.com/realms/tasiyoruz");
    }

    @Test
    void yerelde_varsayilanLocalhostKalir() throws IOException {
        var env = ApplicationYaml.resolvedWith(Map.of());

        assertThat(env.getProperty("spring.security.oauth2.resourceserver.jwt.issuer-uri"))
                .isEqualTo("http://localhost:8081/realms/tasiyoruz");
        assertThat(env.getProperty("spring.data.redis.url")).isEqualTo("redis://localhost:6379");
        assertThat(env.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://localhost:5432/tasiyoruz");
    }
}
