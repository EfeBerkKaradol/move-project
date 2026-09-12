package com.tasiyoruz.api.finance.internal;

import com.tasiyoruz.api.finance.api.FinanceService;
import com.tasiyoruz.api.ordering.api.MarketplaceEvents.ListingAwarded;
import com.tasiyoruz.api.pricing.api.Money;
import com.tasiyoruz.api.tracking.api.TripEvents.TripCompleted;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/**
 * Finansı mevcut yaşam döngüsüne bağlayan dinleyiciler.
 *
 * <p>Modüller arası doğrudan çağrı yok, olay var (ADR-0003): ordering ve tracking
 * finansı tanımıyor, finans onları dinliyor.
 */
@Component
class FinanceListeners {

    private static final Logger log = LoggerFactory.getLogger(FinanceListeners.class);

    private final FinanceService finance;

    FinanceListeners(FinanceService finance) {
        this.finance = finance;
    }

    /** İş verildi: brüt kaydediliyor, komisyon ayrılıyor, hakediş açılıyor (henüz ödenebilir değil). */
    @ApplicationModuleListener
    void on(ListingAwarded event) {
        finance.openForAward(event.listingId(), event.shipperId(), event.carrierId(),
                Money.tryOf(event.amount()));
        log.info("Finansal kayıt açıldı: ilan {}", event.listingNumber());
    }

    /** İş tamamlandı: hakediş ödenebilir hâle geliyor. Teslim olmadan bu olmuyor. */
    @ApplicationModuleListener
    void on(TripCompleted event) {
        finance.markDelivered(event.listingId(), event.tripId());
    }
}
