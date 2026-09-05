package com.tasiyoruz.api.pricing.api;

import jakarta.validation.constraints.*;
import java.util.List;

/** Fiyat teklifi isteği. Kimlik gerektirmez — kullanıcı kayıt olmadan fiyat görür. */
public record QuoteRequest(
        @NotBlank String serviceModel,
        @NotBlank String vehicleTypeCode,
        @NotEmpty @Size(min = 2, max = 5) List<Stop> stops,
        List<String> extraServices,
        String couponCode) {

    public record Stop(
            @NotBlank String districtId,
            @Min(0) @Max(50) Integer floor,
            Boolean hasElevator) {}

    public List<String> extraServicesOrEmpty() {
        return extraServices == null ? List.of() : extraServices;
    }
}
