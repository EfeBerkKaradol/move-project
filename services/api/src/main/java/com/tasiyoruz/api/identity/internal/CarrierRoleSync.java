package com.tasiyoruz.api.identity.internal;

import com.tasiyoruz.api.fleet.api.CarrierDirectory;
import com.tasiyoruz.api.fleet.api.FleetEvents.CarrierApproved;
import com.tasiyoruz.api.fleet.api.FleetEvents.CarrierSuspended;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/**
 * Başvuru kararını Keycloak rolüne yansıtır.
 *
 * <p>Olay yalnızca tetikleyici; ne yapılacağına olayın türü değil taşıyıcının <em>şu
 * anki</em> durumu karar veriyor. Sebep: tamamlanmamış olaylar yeniden başlatmada
 * paralel yayınlanıyor ve "onay" ile "askı" aynı anda koşunca sıra garantisi yok —
 * ilk denemede askı onaydan önce işlendi ve askıdaki kullanıcı DRIVER ile kaldı.
 * Duruma göre eşitleme her sırada aynı sonuca varıyor.
 *
 * <p>Keycloak'a ulaşılamazsa istisna yukarı çıkıyor; Modulith olayı tamamlanmamış
 * bırakıyor ve açılışta yeniden deniyor. Rol JWT'ye bir sonraki token yenilemesinde
 * düşüyor (en geç 5 dakika); ekranda "çıkış yapıp tekrar gir" deniyor.
 */
@Component
class CarrierRoleSync {

    private static final Logger log = LoggerFactory.getLogger(CarrierRoleSync.class);

    private final KeycloakAdminClient keycloak;
    private final KeycloakAdminProperties props;
    private final CarrierDirectory carriers;

    CarrierRoleSync(KeycloakAdminClient keycloak, KeycloakAdminProperties props, CarrierDirectory carriers) {
        this.keycloak = keycloak;
        this.props = props;
        this.carriers = carriers;
    }

    @ApplicationModuleListener
    void on(CarrierApproved event) {
        sync(event.carrierId(), "onay");
    }

    @ApplicationModuleListener
    void on(CarrierSuspended event) {
        sync(event.carrierId(), "askı: " + event.reason());
    }

    private void sync(String carrierId, String trigger) {
        if (!keycloak.available()) {
            log.error("Rol eşitlenemedi, Keycloak yönetim istemcisi yok ({}): {}", trigger, carrierId);
            return;
        }
        boolean shouldHaveRole = carriers.canTakeWork(carrierId);
        if (shouldHaveRole) {
            keycloak.grantRealmRole(carrierId, props.driverRole());
            log.info("Rol verildi ({}): {} → {}", trigger, carrierId, props.driverRole());
        } else {
            keycloak.revokeRealmRole(carrierId, props.driverRole());
            log.info("Rol geri alındı ({}): {} ← {}", trigger, carrierId, props.driverRole());
        }
    }
}
