package com.tasiyoruz.api.tracking.api;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * Sürücünün konum bildirimi.
 *
 * <p>Sınırlar dünya koordinatı; Türkiye kutusuna daraltılmadı çünkü sınır hattında
 * çalışan bir araç geçici olarak dışarı çıkabiliyor ve bunu hata saymak izi
 * koparırdı.
 *
 * @param accuracyM cihazın bildirdiği yatay doğruluk (metre); bilinmiyorsa boş
 */
public record LocationPingRequest(
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
        @PositiveOrZero Double accuracyM) {}
