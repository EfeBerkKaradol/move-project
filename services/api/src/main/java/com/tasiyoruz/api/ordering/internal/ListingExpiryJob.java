package com.tasiyoruz.api.ordering.internal;

import com.tasiyoruz.api.ordering.api.MarketplaceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Teklif penceresi dolan ilanları kapatır.
 *
 * <p>Bu iş olmadan ilan yalnızca sorgu filtresiyle "görünmez" oluyordu: taşıyıcının
 * listesinden düşüyor ama yük verenin panelinde sonsuza kadar "teklif topluyor"
 * görünüyordu. Kabul zaten engelleniyordu, eksik olan durumun kaydedilmesiydi.
 *
 * <p>Sık çalışıyor çünkü anlık ilanın penceresi 6 saat; günlük tarama, ilanı yarım gün
 * yanlış durumda bırakırdı. İş idempotent, ikinci kez çalışması bir şey değiştirmiyor.
 */
@Component
class ListingExpiryJob {

    private static final Logger log = LoggerFactory.getLogger(ListingExpiryJob.class);

    private final MarketplaceService marketplace;

    ListingExpiryJob(MarketplaceService marketplace) {
        this.marketplace = marketplace;
    }

    @Scheduled(fixedDelayString = "PT5M", initialDelayString = "PT1M")
    void run() {
        int closed = marketplace.expireOverdueListings();
        if (closed > 0) log.info("Süresi dolan ilan sayısı: {}", closed);
    }
}
