package com.tasiyoruz.api.ordering.api;

import com.tasiyoruz.api.pricing.api.Money;
import java.time.Instant;

/**
 * Teklifin karşılaştırma görünümü.
 *
 * <p>{@code rating} ve {@code completedJobs} henüz null: taşıyıcı profili ve puanlama
 * modülü gelmedi. Uydurma sayı yerine boş gösteriliyor.
 */
public record OfferView(
        String id,
        String listingId,
        String carrierId,
        String carrierDisplayName,
        Money amount,
        String note,
        Instant estimatedPickupAt,
        OfferStatus status,
        Double rating,
        Integer completedJobs,
        Instant submittedAt,
        Instant respondedAt) {}
