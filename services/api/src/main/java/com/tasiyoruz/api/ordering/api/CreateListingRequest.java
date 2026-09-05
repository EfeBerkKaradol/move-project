package com.tasiyoruz.api.ordering.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

/**
 * Yük ilanı isteği. Fiyat tahmini istemciden alınmaz: sunucu aynı girdiyle tarifeyi
 * yeniden hesaplar ve ilana snapshot olarak yazar. Böylece referans fiyatı istemci
 * belirleyemez.
 */
public record CreateListingRequest(
        @NotBlank String serviceModel,
        @NotBlank String vehicleTypeCode,
        @NotNull @Valid Stop pickup,
        @NotNull @Valid Stop dropoff,
        List<String> extraServices,
        @Size(max = 1000) String cargoDescription,
        Instant pickupWindowStart,
        Instant pickupWindowEnd) {

    public record Stop(
            @NotBlank String districtId,
            @Min(0) @Max(50) Integer floor,
            Boolean hasElevator) {}

    public List<String> extraServicesOrEmpty() {
        return extraServices == null ? List.of() : extraServices;
    }
}
