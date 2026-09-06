package com.tasiyoruz.api.corridor.api;

import com.tasiyoruz.api.ordering.api.ListingView;
import java.time.Instant;

/**
 * Eşleşen ilan ve neden eşleştiği.
 *
 * <p>{@code detourKm} kullanıcıya gösterilir: taşıyıcı "bu iş rotamı ne kadar uzatıyor"
 * sorusunun cevabını görmeden teklif veremez.
 */
public record CorridorMatchView(
        String id,
        String corridorId,
        double score,
        double detourKm,
        MatchOutcome outcome,
        Instant matchedAt,
        ListingView listing) {}
