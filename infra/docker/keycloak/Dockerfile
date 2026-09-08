# Taşıyoruz Keycloak — tema ve realm gömülü dağıtım imajı.
#
# Render gibi ortamlarda kalıcı disk yok; temayı ve realm'i imaja gömüyoruz.
# Yerel geliştirme bu imajı KULLANMIYOR — docker-compose ham import klasörünü
# bağlıyor. Buradaki realm, prepare-realm.py ile geliştirme kolaylıklarından
# arındırılmış hâli (test kullanıcıları, istemci sırları, Mailhog ayarı).

FROM python:3.12-alpine AS realm
WORKDIR /w
COPY import/ ./import/
COPY prepare-realm.py .
RUN python prepare-realm.py import/tasiyoruz-realm.json /w/tasiyoruz-realm.json

# Postayı HTTP API üzerinden gönderen eklenti. Keycloak yalnızca SMTP konuşuyor,
# barındırma sağlayıcıları ise ücretsiz planlarda giden SMTP portlarını kapatıyor.
#
# Derleme, Keycloak imajının kendi kütüphanelerine karşı yapılıyor: sürüm uyuşmazlığı
# olmuyor ve dışarıdan bağımlılık indirilmiyor. Sürüm yükseltilince kütüphaneler
# imajdan geldiği için burada değişecek bir şey yok.
FROM quay.io/keycloak/keycloak:26.0.8 AS kclibs

FROM eclipse-temurin:21-jdk AS provider
WORKDIR /p
COPY --from=kclibs /opt/keycloak/lib/lib/main/ ./libs/
# jboss-logging main'de değil boot'ta duruyor; Keycloak'ın kendi günlük arayüzü o.
COPY --from=kclibs /opt/keycloak/lib/lib/boot/ ./libs/
COPY provider/src ./src
RUN javac -nowarn -cp "libs/*" -d out $(find src -name '*.java') \
 && cp -r src/META-INF out/ \
 && jar cf karinca-mail.jar -C out .

FROM quay.io/keycloak/keycloak:26.0.8 AS build
ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true
# Metrikleri kimse toplamıyor; micrometer yığını 512 MB'lık örnekte boşuna yer
# kaplıyordu. Toplamaya başlandığında true yapılıp imaj yeniden derlenir.
ENV KC_METRICS_ENABLED=false
COPY themes /opt/keycloak/themes
# Eklenti kc.sh build'den ÖNCE yerinde olmalı: derleme adımı sağlayıcıları tarayıp
# yapılandırmaya işliyor, sonradan eklenen jar --optimized çalıştırmada görülmüyor.
COPY --from=provider /p/karinca-mail.jar /opt/keycloak/providers/karinca-mail.jar
# Yapılandırmayı önceden derle: --optimized ile açılış birkaç kat hızlanıyor,
# ücretsiz planlarda fark ediyor.
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.0.8
COPY --from=build /opt/keycloak/ /opt/keycloak/
COPY --from=realm /w/tasiyoruz-realm.json /opt/keycloak/data/import/tasiyoruz-realm.json

# Tek örnek çalışıyoruz; kümelenme kapalı.
#
# Üretim kipinde varsayılan 'ispn' önbelleği JGroups'u ayağa kaldırıyor: UDP ile
# küme arkadaşı arıyor, Render'ın ağında JGroups olmayan bir şeye çarpıp 5 saniyede
# bir hata basıyor ve onlarca MB'lık alım tamponları ayırıyor. 512 MB'lık örnek bu
# yüzden "Out of memory" ile düşüyordu.
#
# `cache` bir ÇALIŞMA ZAMANI seçeneği (start --help-all'da var, build'de yok), bu
# yüzden derleme katmanına değil buraya konuyor; --optimized ile birlikte okunuyor.
ENV KC_CACHE=local

# Realm yalnızca yoksa içe aktarılır; var olanın üzerine yazmaz. Panelden yaptığın
# değişiklikler (istemci sırrı, yönlendirme adresleri, SMTP) yeniden dağıtımda korunur.
ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start", "--optimized", "--import-realm"]
