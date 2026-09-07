package com.tasiyoruz.api.fleet.api;

import java.time.LocalDate;

/** Modüller arası olaylar (docs/02 §3). Bildirim modülü bunları e-postaya çeviriyor. */
public final class FleetEvents {
    private FleetEvents() {}

    public record CarrierApproved(String carrierId, String displayName, String vehicleTypeCode, String plate) {}

    /** Askıya alma sebebi: belge süresi doldu ya da operasyon kararı. */
    public record CarrierSuspended(String carrierId, String reason) {}

    public record CarrierApplicationRejected(String carrierId, String reason) {}

    public record DocumentRejected(String carrierId, String documentDisplayName, String reason) {}

    /** Süre dolmadan 30, 7 ve 1 gün kala bir kez (FR-2.4). */
    public record DocumentExpiringSoon(String carrierId, String documentDisplayName, LocalDate expiresOn, long daysLeft) {}
}
