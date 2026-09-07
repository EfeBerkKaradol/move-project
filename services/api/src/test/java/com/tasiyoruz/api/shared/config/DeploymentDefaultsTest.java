package com.tasiyoruz.api.shared.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.tasiyoruz.api.ApplicationYaml;
import java.io.IOException;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Yerel geliştirme kolaylıklarının dağıtıma sızmadığını sabitler.
 *
 * <p>MinIO, Mailhog ve Keycloak geliştirme değerleri {@code application.yml}'de
 * varsayılan olarak duruyordu. Render'da {@code STORAGE_*} verilmediğinde üretim bu
 * varsayılanları devraldı, S3 istemcisi açılışta localhost:9000'e bağlanmayı denedi ve
 * uygulama hiç açılmadı — üstelik sonuç "belge deposu yok" değil, tüm API'nin ölümüydü.
 *
 * <p>Kural: değişken verilmeyen bir ortam "yapılandırılmamış" saymalı. İlgili işlev
 * kapalı çalışır, uygulama ayakta kalır. Yerel değerler {@code build.gradle.kts}
 * içindeki bootRun görevinde.
 */
class DeploymentDefaultsTest {

    @Test
    void degiskenYokken_nesneDeposuYapilandirilmamisSayilir() throws IOException {
        var env = ApplicationYaml.resolvedWith(Map.of());

        assertThat(env.getProperty("tasiyoruz.storage.access-key")).isEmpty();
        assertThat(env.getProperty("tasiyoruz.storage.secret-key")).isEmpty();
        assertThat(env.getProperty("tasiyoruz.storage.endpoint")).isEmpty();
        // Kova oluşturma yalnızca yerel kolaylık; üretimde kova önceden açılır.
        assertThat(env.getProperty("tasiyoruz.storage.create-bucket")).isEqualTo("false");
    }

    @Test
    void degiskenYokken_smtpVeKeycloakYonetimiKapaliSayilir() throws IOException {
        var env = ApplicationYaml.resolvedWith(Map.of());

        assertThat(env.getProperty("spring.mail.host")).isEmpty();
        assertThat(env.getProperty("tasiyoruz.keycloak.admin.client-secret")).isEmpty();
    }

    /**
     * SMTP yokken posta göstergesi genel sağlığı DOWN yapıyordu. Render sağlık ucuna
     * bakıp servisi düşürdüğü için, açılan bir API yine dağıtımdan atılırdı.
     */
    @Test
    void postaGostergesi_saglikUcunuDusurmez() throws IOException {
        var env = ApplicationYaml.resolvedWith(Map.of());

        assertThat(env.getProperty("management.health.mail.enabled")).isEqualTo("false");
    }

    @Test
    void degiskenVerilirse_uretimDegerleriGecerli() throws IOException {
        var env = ApplicationYaml.resolvedWith(Map.of(
                "STORAGE_ENDPOINT", "https://s3.saglayici.com.tr",
                "STORAGE_ACCESS_KEY", "anahtar",
                "STORAGE_SECRET_KEY", "gizli",
                "SMTP_HOST", "smtp.saglayici.com"));

        assertThat(env.getProperty("tasiyoruz.storage.endpoint")).isEqualTo("https://s3.saglayici.com.tr");
        assertThat(env.getProperty("tasiyoruz.storage.access-key")).isEqualTo("anahtar");
        assertThat(env.getProperty("spring.mail.host")).isEqualTo("smtp.saglayici.com");
    }
}
