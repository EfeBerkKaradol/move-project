package com.tasiyoruz.api.ordering.internal;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * İliştirilmemiş yük fotoğraflarını süpürür.
 *
 * <p>Fotoğraf ilandan önce yükleniyor; kullanıcı yayınlamadan vazgeçerse kayıt ve
 * dosya ortada kalıyor. Bu bir depolama sorunundan çok gizlilik borcu: kimsenin
 * göremeyeceği bir fotoğrafı süresiz saklamanın gerekçesi yok.
 *
 * <p>Saatte bir yeterli — süpürme eşiği 24 saat, birkaç saatlik gecikmenin karşılığı
 * yok. İş idempotent.
 */
@Component
class ListingPhotoSweepJob {

    private final ListingPhotoService photos;

    ListingPhotoSweepJob(ListingPhotoService photos) {
        this.photos = photos;
    }

    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT2M")
    void run() {
        photos.sweepOrphans();
    }
}
