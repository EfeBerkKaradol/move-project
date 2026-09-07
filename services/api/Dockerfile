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
# Konteyner belleğine ve CPU'suna saygılı JVM ayarı (küçük planlarda önemli).
#
# TieredStopAtLevel=1 yalnızca C1 derleyicisini kullanır. Zayıf CPU'da JIT'in
# açılışta harcadığı zaman baskın kalem: 0.2 CPU / 512 MB ile ölçüldüğünde açılış
# 194s'den 103s'ye indi. Render'ın port taraması bu kadar beklemiyordu ve çalışan
# uygulama "no open ports" denip dağıtımdan atılıyordu.
#
# Bedeli tepe verim: sıcak kod yolları C2 ile derlenmediği için daha yavaş çalışır.
# Ücretsiz planda CPU zaten darboğaz, açılışın tamamlanması daha değerli. Daha güçlü
# bir plana geçilince bu bayrak JAVA_OPTS ortam değişkeni ezilerek kaldırılabilir.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -XX:TieredStopAtLevel=1"
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s \
  CMD curl -fsS http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
