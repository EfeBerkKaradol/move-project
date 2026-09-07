package com.tasiyoruz.api.fleet.internal;

import com.tasiyoruz.api.fleet.api.CarrierService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Süresi dolan belgeleri işaretler ve taşıyıcıyı askıya alır (docs/01 FR-2.4).
 *
 * <p>Her gece çalışıyor. Tek örnekli çalıştığı varsayılmıyor: iş idempotent, aynı
 * belgeyi ikinci kez işaretlemek bir şeyi değiştirmiyor.
 */
@Component
class DocumentExpiryJob {

    private static final Logger log = LoggerFactory.getLogger(DocumentExpiryJob.class);

    private final CarrierService carriers;

    DocumentExpiryJob(CarrierService carriers) {
        this.carriers = carriers;
    }

    @Scheduled(cron = "0 15 3 * * *", zone = "Europe/Istanbul")
    void run() {
        int expired = carriers.expireOverdueDocuments();
        if (expired > 0) log.info("Süresi dolan belge sayısı: {}", expired);
        int warned = carriers.warnExpiringDocuments();
        if (warned > 0) log.info("Süre uyarısı gönderilen belge sayısı: {}", warned);
    }
}
