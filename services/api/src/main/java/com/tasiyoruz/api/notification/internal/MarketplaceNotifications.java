package com.tasiyoruz.api.notification.internal;

import com.tasiyoruz.api.ordering.api.MarketplaceEvents.ListingAwarded;
import com.tasiyoruz.api.ordering.api.MarketplaceEvents.ListingExpired;
import com.tasiyoruz.api.ordering.api.MarketplaceEvents.OfferSubmitted;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/** Pazar yeri olayları → e-posta. Metinler kısa: konu satırı ne olduğunu söylüyor, gövde nereye gidileceğini. */
@Component
class MarketplaceNotifications {

    private final Mailer mailer;

    MarketplaceNotifications(Mailer mailer) {
        this.mailer = mailer;
    }

    static String tl(BigDecimal amount) {
        return NumberFormat.getCurrencyInstance(Locale.forLanguageTag("tr-TR")).format(amount);
    }

    @ApplicationModuleListener
    void on(OfferSubmitted e) {
        mailer.send(e.shipperId(), "OFFER_RECEIVED",
                e.listingNumber() + " ilanına yeni teklif: " + tl(e.amount()),
                e.route() + " ilanına " + e.carrierName() + " " + tl(e.amount()) + " teklif verdi.\n\n"
                + "Teklifleri karşılaştırıp seçmek için: " + mailer.siteUrl() + "/panel/ilan/" + e.listingId());
    }

    @ApplicationModuleListener
    void on(ListingAwarded e) {
        mailer.send(e.carrierId(), "OFFER_ACCEPTED",
                "Teklifin kabul edildi: " + e.listingNumber(),
                e.route() + " ilanı için " + tl(e.amount()) + " tutarındaki teklifin kabul edildi. İş açıldı.\n\n"
                + "Aşamaları buradan ilerlet: " + mailer.siteUrl() + "/nakliyeci/isler");
        mailer.send(e.shipperId(), "CARRIER_ASSIGNED",
                "Taşıyıcı seçildi: " + e.listingNumber(),
                e.route() + " ilanın için taşıyıcı atandı. Teslimatta yükünü kontrol edip onaylayacaksın.\n\n"
                + "İşi izle: " + mailer.siteUrl() + "/panel/ilan/" + e.listingId());
    }

    @ApplicationModuleListener
    void on(ListingExpired e) {
        mailer.send(e.shipperId(), "LISTING_EXPIRED",
                "İlanının süresi doldu: " + e.listingNumber(),
                e.route() + " ilanı teklif almadan kapandı.\n\n"
                + "İstersen aynı rotayla yeniden yayınla: " + mailer.siteUrl() + "/fiyat-hesapla");
    }
}
