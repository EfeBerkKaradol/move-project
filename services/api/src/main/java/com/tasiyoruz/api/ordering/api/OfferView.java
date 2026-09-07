package com.tasiyoruz.api.ordering.api;

import com.tasiyoruz.api.pricing.api.Money;
import java.time.Instant;

/**
 * Teklifin karşılaştırma görünümü.
 *
 * <p>Ad, araç ve plaka doğrulanmış taşıyıcı profilinden geliyor; {@code verified}
 * profilin onaylı olduğunu söylüyor. Puan ve tamamlanan iş sayısı burada değil:
 * puanlama modülü ayrı uçtan okunuyor (/carriers/{id}/rating), çünkü pazar yeri
 * puanlamaya bağımlı olsaydı modüller arasında döngü oluşurdu.
 */
public record OfferView(
        String id,
        String listingId,
        String carrierId,
        String carrierDisplayName,
        String vehicleTypeCode,
        String plate,
        boolean verified,
        Money amount,
        String note,
        Instant estimatedPickupAt,
        OfferStatus status,
        Instant submittedAt,
        Instant respondedAt) {}
