package com.tasiyoruz.api.rating.internal;

import com.tasiyoruz.api.rating.domain.CompletedTrip;
import com.tasiyoruz.api.tracking.api.TripEvents.TripCompleted;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/** Tamamlanan işi puanlanabilir olarak kaydeder. Olay yeniden gelirse üzerine yazar (aynı anahtar). */
@Component
class TripCompletedListener {

    private final CompletedTripRepository trips;
    private final Clock clock;

    TripCompletedListener(CompletedTripRepository trips, Clock clock) {
        this.trips = trips; this.clock = clock;
    }

    @ApplicationModuleListener
    void on(TripCompleted e) {
        trips.save(CompletedTrip.of(UUID.fromString(e.tripId()), UUID.fromString(e.listingId()),
                e.shipperId(), e.carrierId(), e.amount(), Instant.now(clock)));
    }
}
