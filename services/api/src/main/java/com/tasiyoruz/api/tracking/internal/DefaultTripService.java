package com.tasiyoruz.api.tracking.internal;

import com.tasiyoruz.api.pricing.api.Money;
import com.tasiyoruz.api.tracking.api.*;
import com.tasiyoruz.api.tracking.api.TripEvents.TripCompleted;
import com.tasiyoruz.api.tracking.api.TripEvents.TripDelivered;
import com.tasiyoruz.api.tracking.api.TripEvents.TripStageChanged;
import com.tasiyoruz.api.tracking.domain.Trip;
import com.tasiyoruz.api.tracking.domain.TripAccess;
import com.tasiyoruz.api.tracking.domain.TripEvent;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Aşama makinesi. Kurallar (docs/04 §3.1): aşamalar atlanamaz; DELIVERED için teslim
 * kanıtı zorunlu; COMPLETED yalnızca müşterinin teslimatta onayıyla. Her geçiş
 * trip_events'e yazılır.
 */
@Service
@Transactional
class DefaultTripService implements TripService {

    private final TripRepository trips;
    private final TripEventRepository events;
    private final ApplicationEventPublisher publisher;
    private final Clock clock;

    DefaultTripService(TripRepository trips, TripEventRepository events, ApplicationEventPublisher publisher, Clock clock) {
        this.trips = trips; this.events = events; this.publisher = publisher; this.clock = clock;
    }

    @Override
    public TripView startFromAward(String listingId, String shipperId, String carrierId, String carrierDisplayName,
                                   BigDecimal agreedAmount) {
        var lid = UUID.fromString(listingId);
        // Olay en az bir kez teslim edilir; ikinci teslimat yeni iş açmamalı
        var existing = trips.findByListingId(lid);
        if (existing.isPresent()) return view(existing.get());

        var now = Instant.now(clock);
        var trip = trips.save(Trip.start(lid, shipperId, carrierId, carrierDisplayName, agreedAmount, now));
        events.save(TripEvent.of(trip.getId(), TripStage.DRIVER_ASSIGNED, "SYSTEM", "Teklif kabul edildi", now));
        publisher.publishEvent(new TripStageChanged(trip.getId().toString(), listingId, TripStage.DRIVER_ASSIGNED, shipperId, carrierId));
        return view(trip);
    }

    @Override @Transactional(readOnly = true)
    public Optional<TripView> trip(String userId, String tripId) {
        return parse(tripId).flatMap(trips::findById).filter(t -> canSee(t, userId)).map(this::view);
    }

    @Override @Transactional(readOnly = true)
    public Optional<TripView> tripOfListing(String userId, String listingId) {
        return parse(listingId).flatMap(trips::findByListingId).filter(t -> canSee(t, userId)).map(this::view);
    }

    @Override @Transactional(readOnly = true)
    public List<TripView> tripsOfCarrier(String carrierId) {
        return trips.findByCarrierIdOrderByStartedAtDesc(carrierId).stream().map(this::view).toList();
    }

    @Override @Transactional(readOnly = true)
    public List<TripView> tripsOfShipper(String shipperId) {
        return trips.findByShipperIdOrderByStartedAtDesc(shipperId).stream().map(this::view).toList();
    }

    @Override
    public TripView advance(String carrierId, String tripId, TripStage expectedNext) {
        var trip = ownedByCarrier(carrierId, tripId);
        var next = trip.getStage().next();
        if (!trip.getStage().driverAdvancable() || next == null) {
            throw conflict("Bu iş taşıyıcı tarafından ilerletilemez.");
        }
        if (next == TripStage.DELIVERED) {
            throw conflict("Teslim için teslim kanıtı gerekiyor.");
        }
        if (expectedNext != null && expectedNext != next) {
            // İstemcinin gördüğü aşama eskimiş: iki cihazdan ilerletme ya da çift tıklama
            throw conflict("Aşama güncel değil; sıradaki aşama " + next + ".");
        }
        var now = Instant.now(clock);
        TripAccess.moveTo(trip, next);
        events.save(TripEvent.of(trip.getId(), next, "DRIVER", null, now));
        publisher.publishEvent(new TripStageChanged(tripId, trip.getListingId().toString(), next, trip.getShipperId(), carrierId));
        return view(trip);
    }

    @Override
    public TripView deliver(String carrierId, String tripId, ProofOfDeliveryRequest pod) {
        var trip = ownedByCarrier(carrierId, tripId);
        // Teslim, boşaltma bittikten sonra; ama teslim noktasına varınca da kabul edilir
        if (trip.getStage() != TripStage.UNLOADING && trip.getStage() != TripStage.ARRIVED_AT_DROPOFF) {
            throw conflict("Teslim kanıtı yalnızca teslim noktasında verilebilir.");
        }
        var now = Instant.now(clock);
        TripAccess.deliver(trip, pod.receivedByName(), pod.note(), pod.photoKey(), now);
        events.save(TripEvent.of(trip.getId(), TripStage.DELIVERED, "DRIVER", "Teslim alan: " + pod.receivedByName(), now));
        publisher.publishEvent(new TripDelivered(tripId, trip.getListingId().toString(), trip.getShipperId(), carrierId));
        return view(trip);
    }

    @Override
    public TripView confirmDelivery(String shipperId, String tripId) {
        var trip = parse(tripId).flatMap(trips::findById).orElseThrow(() -> notFound());
        if (!trip.getShipperId().equals(shipperId)) throw forbidden();
        if (trip.getStage() != TripStage.DELIVERED) {
            throw conflict("Onay için taşıyıcının teslimi bildirmesi gerekiyor.");
        }
        var now = Instant.now(clock);
        TripAccess.complete(trip, now);
        events.save(TripEvent.of(trip.getId(), TripStage.COMPLETED, "SHIPPER", "Teslimat onaylandı", now));
        publisher.publishEvent(new TripCompleted(tripId, trip.getListingId().toString(), shipperId, trip.getCarrierId()));
        return view(trip);
    }

    // --- yardımcılar ---

    private Trip ownedByCarrier(String carrierId, String tripId) {
        var trip = parse(tripId).flatMap(trips::findById).orElseThrow(() -> notFound());
        if (!trip.getCarrierId().equals(carrierId)) throw forbidden();
        return trip;
    }
    private static boolean canSee(Trip t, String userId) {
        return t.getShipperId().equals(userId) || t.getCarrierId().equals(userId);
    }
    private static Optional<UUID> parse(String id) {
        try { return Optional.of(UUID.fromString(id)); } catch (IllegalArgumentException e) { return Optional.empty(); }
    }
    private static ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "İş bulunamadı."); }
    private static ResponseStatusException forbidden() { return new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu iş size ait değil."); }
    private static ResponseStatusException conflict(String d) { return new ResponseStatusException(HttpStatus.CONFLICT, d); }

    private TripView view(Trip t) {
        var evs = events.findByTripIdOrderByOccurredAtAsc(t.getId()).stream()
                .map(e -> new TripView.Event(e.getStage(), e.getOccurredAt(), e.getSource(), e.getNote())).toList();
        var pod = t.getPodReceivedBy() == null ? null : new TripView.Pod(t.getPodReceivedBy(), t.getPodNote(), t.getPodPhotoKey());
        var next = t.getStage().driverAdvancable() ? t.getStage().next() : null;
        return new TripView(t.getId().toString(), t.getListingId().toString(), t.getShipperId(), t.getCarrierId(),
                t.getCarrierDisplayName(), Money.tryOf(t.getAgreedAmount()), t.getStage(), next, evs, pod,
                t.getStartedAt(), t.getDeliveredAt(), t.getCompletedAt());
    }
}
