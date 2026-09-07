plugins {
    java
    id("org.springframework.boot") version "3.4.1"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.tasiyoruz"
version = "0.0.1-SNAPSHOT"
description = "Taşıyoruz — çekirdek API (modüler monolit)"

java {
    toolchain { languageVersion = JavaLanguageVersion.of(21) }
}

repositories { mavenCentral() }

extra["springModulithVersion"] = "1.3.1"
extra["awsSdkVersion"] = "2.29.52"
// Docker Engine 29 uyumu — Boot 3.4 varsayılanı (1.20.4) çok eski API sürümü gönderiyor
extra["testcontainers.version"] = "1.21.3"

dependencies {
    // web & doğrulama
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-websocket")

    // veri
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")

    // Katalog ve ilçe verisi: çok okunan, az değişen referans veri.
    // Redis turu yerine pod-yerel önbellek — öneri motorunun <100 ms hedefi buna dayanıyor.
    implementation("com.github.ben-manes.caffeine:caffeine")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")
    implementation("org.hibernate.orm:hibernate-spatial")

    // güvenlik
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")

    // modülerlik — modül sınırlarını derleme/test zamanında zorlar (ADR-0002)
    implementation("org.springframework.modulith:spring-modulith-starter-core")
    implementation("org.springframework.modulith:spring-modulith-starter-jpa")

    // dağıtık kilit — çift atama koruması (dispatch & pazarlık)
    implementation("org.redisson:redisson-spring-boot-starter:3.40.2")

    // gözlem
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("io.micrometer:micrometer-registry-prometheus")

    // api dokümantasyonu → OpenAPI → TS tipleri
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.7.0")

    // e-posta bildirimleri — yerelde Mailhog, üretimde gerçek SMTP (ANAHTARLAR #20)
    implementation("org.springframework.boot:spring-boot-starter-mail")

    // nesne deposu — taşıyıcı belgeleri. S3 uyumlu API: yerelde MinIO, üretimde
    // Türkiye'de barındırılan S3 uyumlu bir sağlayıcı; kod değişmiyor (docs/03).
    implementation("software.amazon.awssdk:s3")

    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.springframework.modulith:spring-modulith-starter-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:postgresql")
    testImplementation("com.redis:testcontainers-redis:2.2.2")
    testImplementation("com.tngtech.archunit:archunit-junit5:1.3.0")
    testImplementation("org.testcontainers:minio")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

dependencyManagement {
    imports {
        mavenBom("org.springframework.modulith:spring-modulith-bom:${property("springModulithVersion")}")
        mavenBom("software.amazon.awssdk:bom:${property("awsSdkVersion")}")
    }
}

tasks.withType<Test> {
    useJUnitPlatform()

    // macOS'ta Docker Desktop soketi /var/run/docker.sock yerine ~/.docker/run altında
    // duruyor ve Testcontainers onu kendiliğinden bulamıyor. CI'da (Linux runner) soket
    // standart konumda olduğu için bu blok atlanır.
    val dockerSocket = File(System.getProperty("user.home"), ".docker/run/docker.sock")
    if (dockerSocket.exists()) {
        environment("DOCKER_HOST", "unix://${dockerSocket.absolutePath}")
        environment("TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE", "/var/run/docker.sock")
    }

    // Docker Engine 29 minimum API 1.44 istiyor; docker-java varsayılanı (1.32) bunun
    // altında kalıp 400 Bad Request alıyor. docker-java bu ayarı "api.version" sistem
    // özelliğinden okur — DOCKER_API_VERSION ortam değişkenini dikkate almıyor.
    systemProperty("api.version", "1.44")

    testLogging {
        events("passed", "skipped", "failed")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.SHORT
    }
}

/*
 * Yerel geliştirme değerleri.
 *
 * Bunlar application.yml'de varsayılan olarak duruyordu; Render'da STORAGE_* verilmeyince
 * üretim localhost:9000'deki MinIO'ya bağlanmaya çalıştı ve uygulama hiç açılmadı. Yerel
 * kolaylık artık yerel çalıştırma görevinde: dağıtılan imaj bunları görmez, değişken
 * verilmediğinde ilgili işlev "yapılandırılmamış" diyerek kapalı çalışır.
 *
 * Kabuktan verilen değer üstün gelir, böylece gerçek bir sağlayıcıyla denemek mümkün.
 */
tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
    val yerel = mapOf(
        "STORAGE_ENDPOINT" to "http://localhost:9000",   // docker-compose'daki MinIO
        "STORAGE_ACCESS_KEY" to "tasiyoruz",
        "STORAGE_SECRET_KEY" to "tasiyoruz123",
        "STORAGE_CREATE_BUCKET" to "true",
        "SMTP_HOST" to "localhost",                      // Mailhog
        "SMTP_PORT" to "1025",
        "KEYCLOAK_ADMIN_CLIENT_SECRET" to "tasiyoruz-api-dev-secret",
    )
    yerel.forEach { (anahtar, deger) -> environment(anahtar, System.getenv(anahtar) ?: deger) }
}

/*
 * RenderBlueprintTest depo kökündeki render.yaml'ı okuyor. Dosya testin girdisi
 * olarak bildirilmezse Gradle görevi "güncel" sayıyor: render.yaml bozulsa bile
 * testler yeniden çalışmıyor ve guard sessizce işlevsiz kalıyor.
 */
tasks.named<Test>("test") {
    inputs.file("../../render.yaml").withPathSensitivity(PathSensitivity.RELATIVE)
}
