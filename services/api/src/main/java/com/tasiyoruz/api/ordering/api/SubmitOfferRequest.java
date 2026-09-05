package com.tasiyoruz.api.ordering.api;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;

/** Araç sahibinin tek turluk teklifi. */
public record SubmitOfferRequest(
        @NotNull @DecimalMin(value = "1.00") @Digits(integer = 10, fraction = 2) BigDecimal amount,
        @Size(max = 500) String note,
        Instant estimatedPickupAt) {}
