package com.tasiyoruz.api.catalog.api;

import java.math.BigDecimal;

/**
 * Kategori bazlı hazır tahmin ("2+1, orta"). Kullanıcıya 40 eşyayı tek tek
 * saydırmak yerine bunu seçtiriyoruz.
 */
public record CargoPresetView(
        String code,
        String categoryCode,
        String displayName,
        BigDecimal estimatedVolumeM3,
        int estimatedWeightKg,
        int sortOrder) {}
