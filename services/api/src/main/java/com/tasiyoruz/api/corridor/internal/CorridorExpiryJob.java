package com.tasiyoruz.api.corridor.internal;

import com.tasiyoruz.api.corridor.api.CorridorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Kalkış penceresi geçen koridorları kapatır.
 *
 * <p>Eşleştirme zaten {@code Corridor.matchable} ile korunuyordu, yani yanlış eşleşme
 * üretilmiyordu; eksik olan taşıyıcıya doğru durumu göstermekti — geçmiş bir koridor
 * ekranda "Yayında" görünüyordu.
 */
@Component
class CorridorExpiryJob {

    private static final Logger log = LoggerFactory.getLogger(CorridorExpiryJob.class);

    private final CorridorService corridors;

    CorridorExpiryJob(CorridorService corridors) {
        this.corridors = corridors;
    }

    @Scheduled(fixedDelayString = "PT15M", initialDelayString = "PT2M")
    void run() {
        int closed = corridors.expireOverdueCorridors();
        if (closed > 0) log.info("Süresi dolan koridor sayısı: {}", closed);
    }
}
