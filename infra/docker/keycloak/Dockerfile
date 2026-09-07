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
RUN python prepare-realm.py import/turmove-realm.json /w/tasiyoruz-realm.json

FROM quay.io/keycloak/keycloak:26.0.8 AS build
ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
COPY themes /opt/keycloak/themes
# Yapılandırmayı önceden derle: --optimized ile açılış birkaç kat hızlanıyor,
# ücretsiz planlarda fark ediyor.
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.0.8
COPY --from=build /opt/keycloak/ /opt/keycloak/
COPY --from=realm /w/tasiyoruz-realm.json /opt/keycloak/data/import/tasiyoruz-realm.json

# Realm yalnızca yoksa içe aktarılır; var olanın üzerine yazmaz. Panelden yaptığın
# değişiklikler (istemci sırrı, yönlendirme adresleri, SMTP) yeniden dağıtımda korunur.
ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start", "--optimized", "--import-realm"]
