package com.tasiyoruz.api;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.GenericContainer;
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

    static {
        POSTGRES.start();
        REDIS.start();
    }
}
