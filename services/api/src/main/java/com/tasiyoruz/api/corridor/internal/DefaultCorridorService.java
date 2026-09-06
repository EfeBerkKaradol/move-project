package com.tasiyoruz.api.corridor.internal;

import static com.tasiyoruz.api.corridor.internal.CorridorExceptions.*;

import com.tasiyoruz.api.catalog.api.FleetService;
import com.tasiyoruz.api.corridor.api.*;
import com.tasiyoruz.api.corridor.domain.Corridor;
import com.tasiyoruz.api.corridor.domain.CorridorMatch;
import com.tasiyoruz.api.corridor.domain.DomainAccess;
import com.tasiyoruz.api.geo.api.GeoService;
import com.tasiyoruz.api.ordering.api.ListingStatus;
import com.tasiyoruz.api.ordering.api.MarketplaceService;
import com.tasiyoruz.api.pricing.api.Money;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Koridor yönetimi ve eşleşme listesi. */
@Service
@Transactional
class DefaultCorridorService implements CorridorService {

    /** Bir taşıyıcının aynı anda tutabileceği koridor sayısı. */
    static final int MAX_ACTIVE_CORRIDORS = 10;

    private final CorridorRepository corridors;
    private final CorridorMatchRepository matches;
    private final CorridorMatcher matcher;
    private final GeoService geo;
    private final FleetService fleet;
    private final MarketplaceService marketplace;
    private final Clock clock;

    DefaultCorridorService(CorridorRepository corridors, CorridorMatchRepository matches, CorridorMatcher matcher,
                           GeoService geo, FleetService fleet, MarketplaceService marketplace, Clock clock) {
        this.corridors = corridors;
        this.matches = matches;
        this.matcher = matcher;
        this.geo = geo;
        this.fleet = fleet;
        this.marketplace = marketplace;
        this.clock = clock;
    }

    @Override
    public CorridorView create(String carrierId, CreateCorridorRequest r) {
        var origin = geo.district(r.originDistrictId()).orElseThrow(() -> badRequest("Kalkış ilçesi tanınmadı."));
        var destination = geo.district(r.destinationDistrictId())
                .orElseThrow(() -> badRequest("Varış ilçesi tanınmadı."));
        if (origin.id().equals(destination.id())) {
            throw badRequest("Kalkış ve varış aynı olamaz.");
        }
        if (fleet.capacityRank(r.vehicleTypeCode()).isEmpty()) {
            throw badRequest("Araç tipi tanınmadı.");
        }
        if (r.departureTo().isBefore(r.departureFrom())) {
            throw badRequest("Kalkış penceresinin bitişi başlangıçtan önce olamaz.");
        }
        var now = Instant.now(clock);
        if (r.departureTo().isBefore(now)) {
            throw badRequest("Kalkış penceresi geçmişte olamaz.");
        }
        long active = corridors.findByCarrierIdOrderByCreatedAtDesc(carrierId).stream()
                .filter(c -> c.getStatus() != CorridorStatus.EXPIRED).count();
        if (active >= MAX_ACTIVE_CORRIDORS) {
            throw badRequest("En fazla " + MAX_ACTIVE_CORRIDORS + " koridor tanımlayabilirsiniz.");
        }

        var corridor = corridors.save(Corridor.open(carrierId, r.vehicleTypeCode(),
                UUID.fromString(origin.id()), UUID.fromString(destination.id()),
                r.departureFrom(), r.departureTo(), r.detourToleranceKm(), r.minAmount(), now));

        // Yeni koridor, hâlihazırda açık olan ilanları da görsün — aksi hâlde taşıyıcı
        // koridoru kurar kurmaz boş bir liste görür ve özelliği çalışmıyor sanır.
        backfillOpenListings();
        return view(corridor);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CorridorView> corridorsOf(String carrierId) {
        return corridors.findByCarrierIdOrderByCreatedAtDesc(carrierId).stream().map(this::view).toList();
    }

    @Override
    public CorridorView setPaused(String carrierId, String corridorId, boolean paused) {
        var corridor = owned(carrierId, corridorId);
        if (corridor.getStatus() == CorridorStatus.EXPIRED) {
            throw badRequest("Süresi dolmuş koridor değiştirilemez.");
        }
        if (paused) DomainAccess.pause(corridor); else DomainAccess.resume(corridor);
        return view(corridor);
    }

    @Override
    public void delete(String carrierId, String corridorId) {
        var corridor = owned(carrierId, corridorId);
        matches.deleteByCorridorId(corridor.getId());
        corridors.delete(corridor);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CorridorMatchView> matchesOf(String carrierId) {
        return matches.findByCarrierIdAndOutcomeOrderByScoreDesc(carrierId, MatchOutcome.PENDING).stream()
                .flatMap(m -> matchView(m).stream())
                .toList();
    }

    @Override
    public void ignore(String carrierId, String matchId) {
        var match = matches.findById(parse(matchId).orElseThrow(() -> notFound("Eşleşme")))
                .orElseThrow(() -> notFound("Eşleşme"));
        if (!match.getCarrierId().equals(carrierId)) throw forbidden();
        DomainAccess.resolve(match, MatchOutcome.IGNORED, Instant.now(clock));
    }

    @Override
    @Transactional(readOnly = true)
    public long activeCorridorCount() {
        return corridors.countByStatus(CorridorStatus.ACTIVE);
    }

    @Override
    public int expireOverdueCorridors() {
        var overdue = corridors.findByStatusAndDepartureToBefore(CorridorStatus.ACTIVE, Instant.now(clock));
        for (var corridor : overdue) {
            DomainAccess.expire(corridor);
            // Kapanan koridorun bekleyen eşleşmeleri de düşsün; taşıyıcı artık
            // gitmeyeceği bir rota için ilan listesi görmemeli
            matcher.closeMatchesForCorridor(corridor.getId());
        }
        return overdue.size();
    }

    /**
     * Koridor kurulduğunda açık ilanları tarar. Eşleştirici zaten tüm koridorlara
     * bakıyor ve yazılmış eşleşmeyi atlıyor, bu yüzden tarama yeni koridorla sınırlı
     * değil; açık ilan sayısı büyürse bunu yalnızca yeni koridora daraltmak gerekecek.
     */
    private void backfillOpenListings() {
        for (var listing : marketplace.openListings(null, null)) {
            matcher.matchListing(listing);
        }
    }

    private Corridor owned(String carrierId, String corridorId) {
        var corridor = corridors.findById(parse(corridorId).orElseThrow(() -> notFound("Koridor")))
                .orElseThrow(() -> notFound("Koridor"));
        if (!corridor.getCarrierId().equals(carrierId)) throw forbidden();
        return corridor;
    }

    private static Optional<UUID> parse(String id) {
        try {
            return Optional.of(UUID.fromString(id));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    /** İlan artık açık değilse eşleşme gösterilmez; kapanışı dinleyici temizler. */
    private Optional<CorridorMatchView> matchView(CorridorMatch m) {
        return marketplace.listing(m.getListingId().toString())
                .filter(l -> l.status() == ListingStatus.OPEN)
                .map(l -> new CorridorMatchView(m.getId().toString(), m.getCorridorId().toString(),
                        m.getScore().doubleValue(), m.getDetourKm().doubleValue(),
                        m.getOutcome(), m.getMatchedAt(), l.forCarrier()));
    }

    private CorridorView view(Corridor c) {
        return new CorridorView(
                c.getId().toString(),
                c.getVehicleTypeCode(),
                place(c.getOriginDistrictId()),
                place(c.getDestinationDistrictId()),
                c.getDepartureFrom(),
                c.getDepartureTo(),
                c.getDetourToleranceKm(),
                c.getMinAmount() == null ? null : Money.tryOf(c.getMinAmount()),
                c.getStatus(),
                c.getCreatedAt(),
                matches.countByCorridorIdAndOutcome(c.getId(), MatchOutcome.PENDING));
    }

    private CorridorView.Place place(UUID districtId) {
        return geo.district(districtId.toString())
                .map(d -> new CorridorView.Place(d.id(), d.cityName(), d.name()))
                .orElseGet(() -> new CorridorView.Place(districtId.toString(), null, null));
    }
}
