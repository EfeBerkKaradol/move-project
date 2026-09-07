package com.tasiyoruz.api.notification.internal;

import com.tasiyoruz.api.tracking.api.TripEvents.TripCompleted;
import com.tasiyoruz.api.tracking.api.TripEvents.TripDelivered;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/** Taşıma olayları → e-posta. */
@Component
class TripNotifications {

    private final Mailer mailer;

    TripNotifications(Mailer mailer) {
        this.mailer = mailer;
    }

    @ApplicationModuleListener
    void on(TripDelivered e) {
        mailer.send(e.shipperId(), "DELIVERY_REPORTED",
                "Yükün teslim edildi, onayın bekleniyor",
                (e.carrierName() == null ? "Taşıyıcı" : e.carrierName()) + " teslimi bildirdi"
                + (e.receivedByName() == null ? "" : ", teslim alan: " + e.receivedByName())
                + ". Yükünü aldıysan teslimatı onayla; onay ödemeyi başlatır.\n\n"
                + "Onayla: " + mailer.siteUrl() + "/panel/ilan/" + e.listingId());
    }

    @ApplicationModuleListener
    void on(TripCompleted e) {
        mailer.send(e.carrierId(), "TRIP_COMPLETED",
                "Teslimat onaylandı: " + MarketplaceNotifications.tl(e.amount()),
                "Yük veren teslimatı onayladı, iş tamamlandı. Komisyonsuz dönemde ödemeyi doğrudan yük verenle "
                + "sonuçlandırıyorsun.\n\nİşlerin: " + mailer.siteUrl() + "/nakliyeci/isler");
        mailer.send(e.shipperId(), "RATE_CARRIER",
                "Taşıyıcını puanla",
                "İşin tamamlandı. Taşıyıcıyı puanlaman, sonraki yük verenlerin doğru seçim yapmasına yardım eder.\n\n"
                + "Puanla: " + mailer.siteUrl() + "/panel/ilan/" + e.listingId());
    }
}
