package com.tasiyoruz.api.trustboard.api;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Açık bir yük ilanının herkese açık hâli.
 *
 * <p>Ziyaretçi "burada gerçekten iş var mı?" sorusunun cevabını kaydolmadan
 * görebilsin diye ilanlar tek tek yayınlanıyor. Yayınlanan şeyin sınırı dikkatle
 * çizildi: <strong>rota, araç, büyüklük ve tarife tahmini</strong> var; yükün
 * fotoğrafı, açıklaması, kat/asansör bilgisi ve yük verenin kimliği <strong>yok</strong>.
 *
 * <p>Bunlar teklif için gereken ayrıntılar ve onaylı araç sahibine açılıyor
 * (docs/09). Buradaki kart bir davet, bir dosya değil.
 *
 * @param pieceCount beyandaki toplam adet — yükün büyüklüğünü tek sayıyla anlatıyor,
 *                   kalem kalem dökmek eşya envanteri yayınlamak olurdu
 */
public record PublicListingView(
        String id,
        String fromCity,
        String fromDistrict,
        String fromDistrictId,
        String toCity,
        String toDistrict,
        String toDistrictId,
        String vehicleTypeCode,
        int distanceKm,
        int pieceCount,
        BigDecimal volumeM3,
        BigDecimal estimatedAmount,
        int offerCount,
        String serviceModel,
        Instant publishedAt,
        Instant expiresAt) {}
