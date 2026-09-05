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

    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.springframework.modulith:spring-modulith-starter-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:postgresql")
    testImplementation("com.redis:testcontainers-redis:2.2.4")
    testImplementation("com.tngtech.archunit:archunit-junit5:1.5.0")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

dependencyManagement {
    imports {
        mavenBom("org.springframework.modulith:spring-modulith-bom:${property("springModulithVersion")}")
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
