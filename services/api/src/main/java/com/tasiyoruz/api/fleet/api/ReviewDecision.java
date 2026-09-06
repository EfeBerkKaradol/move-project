package com.tasiyoruz.api.fleet.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Operasyonun tek bir belge ya da başvuru için kararı (docs/01 FR-2.3).
 *
 * @param approved false ise gerekçe zorunlu — taşıyıcı neyi düzelteceğini bilmeden
 *                 reddedilirse başvuru döngüsü kilitlenir
 */
public record ReviewDecision(@NotNull Boolean approved, @Size(max = 500) String reason) {

    public boolean rejectedWithoutReason() {
        return Boolean.FALSE.equals(approved) && (reason == null || reason.isBlank());
    }
}
