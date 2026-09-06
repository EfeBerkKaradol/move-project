package com.tasiyoruz.api.corridor.api;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Koridor tanımı.
 *
 * <p>Sapma toleransı zorunlu ve üst sınırlı: sınırsız tolerans, koridoru "her ilanı
 * göster" filtresine çevirir ve özelliğin anlamını yok eder.
 */
public record CreateCorridorRequest(
        @NotBlank String vehicleTypeCode,
        @NotBlank String originDistrictId,
        @NotBlank String destinationDistrictId,
        @NotNull Instant departureFrom,
        @NotNull Instant departureTo,
        @NotNull @Min(0) @Max(500) Integer detourToleranceKm,
        @DecimalMin("0.01") BigDecimal minAmount) {}
