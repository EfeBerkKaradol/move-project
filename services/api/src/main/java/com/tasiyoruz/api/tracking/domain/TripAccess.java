package com.tasiyoruz.api.tracking.domain;

import com.tasiyoruz.api.tracking.api.TripStage;
import java.time.Instant;

/** Durum geçişlerini yalnızca servis katmanına açar. */
public final class TripAccess {
    private TripAccess() {}
    public static void moveTo(Trip t, TripStage s) { t.moveTo(s); }
    public static void deliver(Trip t, String by, String note, String photo, Instant now) { t.deliver(by, note, photo, now); }
    public static void complete(Trip t, Instant now) { t.complete(now); }
}
