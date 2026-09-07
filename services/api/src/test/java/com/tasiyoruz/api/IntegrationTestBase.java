package com.tasiyoruz.api;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.MinIOContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * Entegrasyon testleri için gerçek PostGIS ve Redis — sahte veritabanı kullanmıyoruz.
 * Coğrafi sorgular, Flyway migration'ları ve Redis tabanlı kilitler H2 veya gömülü
 * alternatiflerde doğrulanamaz.
 *
 * <p>Konteynerler statik: tüm test sınıfları arasında paylaşılır, her sınıf için
 * yeniden başlatılmaz.
 */
@SpringBootTest
@Testcontainers
@org.springframework.context.annotation.Import(TestClockConfig.class)
public abstract class IntegrationTestBase {

    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(
                    DockerImageName.parse("postgis/postgis:16-3.4")
                            .asCompatibleSubstituteFor("postgres"))
            .withDatabaseName("tasiyoruz")
            .withUsername("tasiyoruz")
            .withPassword("tasiyoruz");

    @ServiceConnection(name = "redis")
    static final GenericContainer<?> REDIS =
            new GenericContainer<>(DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);

    /**
     * Belge yükleme gerçek bir S3 sunucusuna yazıyor. Sahte bir depoyla test edilseydi
     * içerik tipi, uzunluk ve yol biçimli adresleme gibi sürücüye özgü davranışlar
     * hiç sınanmazdı — üretimdeki tek fark kova adresi olacak.
     */
    static final MinIOContainer MINIO =
            new MinIOContainer(DockerImageName.parse("minio/minio:RELEASE.2024-11-07T00-52-20Z"));

    static {
        POSTGRES.start();
        REDIS.start();
        MINIO.start();
    }

    @DynamicPropertySource
    static void storageProperties(DynamicPropertyRegistry registry) {
        registry.add("tasiyoruz.storage.endpoint", MINIO::getS3URL);
        registry.add("tasiyoruz.storage.access-key", MINIO::getUserName);
        registry.add("tasiyoruz.storage.secret-key", MINIO::getPassword);
        registry.add("tasiyoruz.storage.bucket", () -> "tasiyoruz-test");
        registry.add("tasiyoruz.storage.path-style", () -> true);
        registry.add("tasiyoruz.storage.create-bucket", () -> true);
        // Testte SMTP yok; gönderim kapalı, kayıt SKIPPED olarak tutulur. Açık kalsaydı
        // her bildirim 5 sn bağlantı zaman aşımı bekler, test süresi patlardı.
        registry.add("tasiyoruz.notification.enabled", () -> false);
        // Keycloak yönetim istemcisi de yok; rol eşitleme kapalı çalışır
        registry.add("tasiyoruz.keycloak.admin.client-secret", () -> "");
    }
}
