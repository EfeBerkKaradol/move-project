package com.tasiyoruz.api.catalog.api;

import java.math.BigDecimal;

/**
 * Eşya kataloğu kaleminin modül dışına açılan hâli.
 *
 * <p>{@code domain.CargoItem} bir JPA varlığı ve modülün içinde kalıyor; dışarıya
 * verilseydi başka bir modül onu değiştirip kaydedebilir ya da lazy yüklemeye
 * takılabilirdi.
 */
public record CargoItemView(
        String code,
        String categoryCode,
        String displayName,
        BigDecimal volumeM3,
        int weightKg,
        int longestEdgeCm) {}
