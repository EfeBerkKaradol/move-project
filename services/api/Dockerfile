# Taşıyoruz API — çok aşamalı derleme.
# Derleme katmanı Gradle'ı çalıştırır, çalışma katmanı yalnızca JRE taşır.

FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
# Bağımlılıklar önce: kaynak değiştiğinde bu katman önbellekten gelir
COPY gradlew settings.gradle.kts build.gradle.kts gradle.properties* ./
COPY gradle ./gradle
RUN ./gradlew --no-daemon dependencies -q || true
COPY src ./src
RUN ./gradlew --no-daemon clean bootJar -x test

FROM eclipse-temurin:21-jre
WORKDIR /app
# Root olmayan kullanıcı
RUN useradd -r -u 1001 tasiyoruz
COPY --from=build /src/build/libs/*.jar app.jar
USER 1001
EXPOSE 8080
# Konteyner belleğine saygılı JVM ayarı (küçük planlarda önemli)
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC"
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s \
  CMD curl -fsS http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
