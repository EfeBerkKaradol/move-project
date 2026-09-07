package com.tasiyoruz.api.notification.internal;

import com.tasiyoruz.api.fleet.api.FleetEvents.CarrierApplicationRejected;
import com.tasiyoruz.api.fleet.api.FleetEvents.CarrierApproved;
import com.tasiyoruz.api.fleet.api.FleetEvents.CarrierSuspended;
import com.tasiyoruz.api.fleet.api.FleetEvents.DocumentExpiringSoon;
import com.tasiyoruz.api.fleet.api.FleetEvents.DocumentRejected;
import java.time.format.DateTimeFormatter;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/** Başvuru ve belge olayları → e-posta. */
@Component
class FleetNotifications {

    private static final DateTimeFormatter TR_DATE = DateTimeFormatter.ofPattern("d MMMM yyyy", java.util.Locale.forLanguageTag("tr-TR"));

    private final Mailer mailer;

    FleetNotifications(Mailer mailer) {
        this.mailer = mailer;
    }

    @ApplicationModuleListener
    void on(CarrierApproved e) {
        mailer.send(e.carrierId(), "CARRIER_APPROVED",
                "Başvurun onaylandı, iş alabilirsin",
                "Belgelerin doğrulandı; " + e.vehicleTypeCode() + " · " + e.plate() + " ile artık teklif verebilirsin. "
                + "Panelin açılmadıysa çıkış yapıp tekrar gir.\n\n"
                + "Açık ilanlar: " + mailer.siteUrl() + "/nakliyeci\n"
                + "Dönüş rotanı kaydet, koridoruna düşen yükler sana gelsin: " + mailer.siteUrl() + "/nakliyeci/koridor");
    }

    @ApplicationModuleListener
    void on(CarrierApplicationRejected e) {
        mailer.send(e.carrierId(), "CARRIER_REJECTED",
                "Başvurun reddedildi",
                "Gerekçe: " + e.reason() + "\n\nDüzeltip yeniden gönderebilirsin: " + mailer.siteUrl() + "/sofor-ol");
    }

    @ApplicationModuleListener
    void on(DocumentRejected e) {
        mailer.send(e.carrierId(), "DOCUMENT_REJECTED",
                e.documentDisplayName() + " belgen reddedildi",
                "Gerekçe: " + e.reason() + "\n\nYeni bir kare yükle: " + mailer.siteUrl() + "/sofor-ol");
    }

    @ApplicationModuleListener
    void on(CarrierSuspended e) {
        mailer.send(e.carrierId(), "CARRIER_SUSPENDED",
                "Hesabın askıya alındı",
                "Sebep: " + e.reason() + "\n\nAskı kalkana kadar teklif veremezsin. Belgeni yenileyip yükle: "
                + mailer.siteUrl() + "/sofor-ol");
    }

    @ApplicationModuleListener
    void on(DocumentExpiringSoon e) {
        var when = e.daysLeft() <= 1 ? "yarın" : e.daysLeft() + " gün içinde";
        mailer.send(e.carrierId(), "DOCUMENT_EXPIRING",
                e.documentDisplayName() + " belgenin süresi " + when + " doluyor",
                e.documentDisplayName() + " belgenin geçerliliği " + TR_DATE.format(e.expiresOn()) + " tarihinde bitiyor. "
                + "Süresi dolduğunda hesabın otomatik askıya alınır ve iş alamazsın.\n\n"
                + "Yenisini şimdi yükle: " + mailer.siteUrl() + "/sofor-ol");
    }
}
