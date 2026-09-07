package com.tasiyoruz.api.rating.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RateTripRequest(@NotNull @Min(1) @Max(5) Integer score, @Size(max = 500) String comment) {}
