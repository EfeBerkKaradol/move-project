package com.tasiyoruz.api.tracking.internal;

import com.tasiyoruz.api.tracking.api.TripService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Yük sahibinden ses çıkmayan teslimatları kapatır.
 *
 * <p>Teslim kanıtı (fotoğraf) zaten alınmış oluyor; eksik olan tek şey müşterinin
 * "aldım" demesi. Cevap vermeyen tek bir müşteri taşıyıcının hakedişini belirsiz
 * süre askıda tutuyordu — sessizlik itiraz değil.
 *
 * <p>İtirazı olan müşteri süre dolmadan operasyona başvuruyor; orada iş elle
 * karara bağlanıyor. Bu iş yalnızca <em>sessiz</em> olanları topluyor.
 */
@Component
class DeliveryAutoConfirmJob {

    private static final Logger log = LoggerFactory.getLogger(DeliveryAutoConfirmJob.class);

    private final TripService trips;

    DeliveryAutoConfirmJob(TripService trips) {
        this.trips = trips;
    }

    // Saatte bir yeterli: eşik yirmi dört saat, dakikalık hassasiyetin kimseye faydası yok
    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT3M")
    void run() {
        int kapanan = trips.autoConfirmStaleDeliveries();
        if (kapanan > 0) log.info("Otomatik onaylanan teslimat sayısı: {}", kapanan);
    }
}
