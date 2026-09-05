package com.tasiyoruz.api.catalog.api;

import jakarta.validation.constraints.*;
import java.util.List;

/** Kullanıcının yük beyanı — kategori paneli ve detay formundan gelir. */
public record CargoDeclarationRequest(
        @NotBlank String categoryCode,
        List<Item> items,
        String presetCode,
        @Min(0) @Max(500) Integer packageCount,
        List<Stop> stops) {

    public record Item(@NotBlank String cargoItemCode, @Min(1) @Max(99) int quantity) {}

    public record Stop(@Min(0) @Max(50) Integer floor, Boolean hasElevator) {}

    public List<Item> itemsOrEmpty() {
        return items == null ? List.of() : items;
    }

    public List<Stop> stopsOrEmpty() {
        return stops == null ? List.of() : stops;
    }
}
