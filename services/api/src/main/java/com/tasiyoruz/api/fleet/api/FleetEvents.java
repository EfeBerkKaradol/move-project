package com.tasiyoruz.api.fleet.api;

/** Modüller arası olaylar (docs/02 §3). */
public final class FleetEvents {
    private FleetEvents() {}

    public record CarrierApproved(String carrierId, String displayName, String vehicleTypeCode, String plate) {}

    /** Askıya alma sebebi: belge süresi doldu ya da operasyon kararı. */
    public record CarrierSuspended(String carrierId, String reason) {}
}
