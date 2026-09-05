package com.tasiyoruz.api.tracking.api;

import java.util.List;

/** Sıralı aşamalar; atlanamaz (docs/04 §3.1). */
public enum TripStage {
    DRIVER_ASSIGNED, EN_ROUTE_TO_PICKUP, ARRIVED_AT_PICKUP, LOADING, IN_TRANSIT,
    ARRIVED_AT_DROPOFF, UNLOADING, DELIVERED, COMPLETED;

    public static final List<TripStage> ORDER = List.of(values());

    public TripStage next() {
        int i = ordinal();
        return i + 1 < ORDER.size() ? ORDER.get(i + 1) : null;
    }

    /** Taşıyıcının ilerletebileceği son aşama DELIVERED; onun için teslim kanıtı şart. */
    public boolean driverAdvancable() {
        return this != DELIVERED && this != COMPLETED;
    }
}
