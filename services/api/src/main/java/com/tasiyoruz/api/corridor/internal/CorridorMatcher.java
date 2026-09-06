package com.tasiyoruz.api.corridor.internal;

import com.tasiyoruz.api.catalog.api.FleetService;
import com.tasiyoruz.api.corridor.api.CorridorStatus;
import com.tasiyoruz.api.corridor.api.MatchOutcome;
import com.tasiyoruz.api.corridor.domain.Corridor;
import com.tasiyoruz.api.corridor.domain.DomainAccess;
import com.tasiyoruz.api.fleet.api.CarrierDirectory;
import com.tasiyoruz.api.geo.api.District;
import com.tasiyoruz.api.geo.api.GeoService;
import com.tasiyoruz.api.ordering.api.ListingView;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bir ilanı açık koridorlarla eşleştirir (docs/11 §3).
 *
 * <p>Tarama koridor sayısıyla doğrusal ve her aday için iki rota çağrısı yapıyor.
 * Bugünkü hacimde sorun değil; koridor sayısı büyüdüğünde ilk elemeyi coğrafi bir
 * ön filtreye (kalkış ili + varış ili kutusu) taşımak gerekecek.
 */
@Service
class CorridorMatcher {

    private static final Logger log = LoggerFactory.getLogger(CorridorMatcher.class);

    private final CorridorRepository corridors;
    private final CorridorMatchRepository matches;
    private final DetourCalculator detours;
    private final GeoService geo;
    private final FleetService fleet;
    private final CarrierDirectory carriers;
    private final Clock clock;

    CorridorMatcher(CorridorRepository corridors, CorridorMatchRepository matches, DetourCalculator detours,
                    GeoService geo, FleetService fleet, CarrierDirectory carriers, Clock clock) {
        this.corridors = corridors;
        this.matches = matches;
        this.detours = detours;
        this.geo = geo;
        this.fleet = fleet;
        this.carriers = carriers;
        this.clock = clock;
    }

    /** @return üretilen yeni eşleşme sayısı */
    @Transactional
    int matchListing(ListingView listing) {
        var now = Instant.now(clock);
        var pickup = geo.district(listing.pickup().districtId()).orElse(null);
        var dropoff = geo.district(listing.dropoff().districtId()).orElse(null);
        if (pickup == null || dropoff == null) {
            log.warn("İlan {} için ilçe çözülemedi, koridor eşleştirmesi atlandı", listing.id());
            return 0;
        }

        int required = fleet.capacityRank(listing.vehicleTypeCode()).orElse(Integer.MAX_VALUE);
        var listingId = UUID.fromString(listing.id());
        int created = 0;

        for (var corridor : corridors.findMatchable(CorridorStatus.ACTIVE, now)) {
            if (!corridor.matchable(now)) continue;
            // Onaysız ya da askıya alınmış taşıyıcıya iş getirmenin anlamı yok:
            // teklif verdiğinde zaten reddedilir
            if (!carriers.canTakeWork(corridor.getCarrierId())) continue;
            if (!capacityCovers(corridor, required)) continue;
            if (belowMinimum(corridor, listing)) continue;

            double timeFit = MatchScoring.timeFit(windowStart(listing), windowEnd(listing),
                    corridor.getDepartureFrom(), corridor.getDepartureTo());
            if (timeFit <= 0) continue; // pencereler kesişmiyor

            var origin = geo.district(corridor.getOriginDistrictId().toString()).orElse(null);
            var destination = geo.district(corridor.getDestinationDistrictId().toString()).orElse(null);
            if (origin == null || destination == null) continue;

            double detourKm = detours.detourKm(origin, destination, pickup, dropoff);
            if (detourKm > corridor.getDetourToleranceKm()) continue;

            double score = MatchScoring.score(
                    MatchScoring.detourFit(detourKm, corridor.getDetourToleranceKm()),
                    timeFit,
                    MatchScoring.valueFit(listing.estimatedAmount().amount(), detourKm));

            // Yazma çakışmaya dayanıklı: olay yeniden teslim edilse ya da tarama
            // dinleyiciyle aynı anda çalışsa bile ikinci kayıt oluşmaz
            created += matches.insertIfAbsent(corridor.getId(), listingId, corridor.getCarrierId(),
                    BigDecimal.valueOf(score).setScale(4, RoundingMode.HALF_UP),
                    BigDecimal.valueOf(detourKm).setScale(2, RoundingMode.HALF_UP), now);
        }
        return created;
    }

    /** İlan kapandığında bekleyen eşleşmeler taşıyıcının listesinde asılı kalmasın. */
    @Transactional
    void closeMatchesFor(UUID listingId, MatchOutcome outcome) {
        var now = Instant.now(clock);
        for (var match : matches.findByListingId(listingId)) {
            if (match.getOutcome() == MatchOutcome.PENDING) {
                DomainAccess.resolve(match, outcome, now);
            }
        }
    }

    /** Koridor kapandığında bekleyen eşleşmeleri düşürür. */
    @Transactional
    void closeMatchesForCorridor(UUID corridorId) {
        var now = Instant.now(clock);
        for (var match : matches.findByCorridorIdAndOutcome(corridorId, MatchOutcome.PENDING)) {
            DomainAccess.resolve(match, MatchOutcome.EXPIRED, now);
        }
    }

    /** Taşıyıcı eşleşen ilana teklif verdiyse eşleşme sonucu OFFERED olur. */
    @Transactional
    void markOffered(String carrierId, UUID listingId) {
        var now = Instant.now(clock);
        for (var match : matches.findByCarrierIdAndListingId(carrierId, listingId)) {
            if (match.getOutcome() == MatchOutcome.PENDING) {
                DomainAccess.resolve(match, MatchOutcome.OFFERED, now);
            }
        }
    }

    private boolean capacityCovers(Corridor corridor, int requiredRank) {
        return fleet.capacityRank(corridor.getVehicleTypeCode())
                .stream().anyMatch(rank -> rank >= requiredRank);
    }

    private static boolean belowMinimum(Corridor corridor, ListingView listing) {
        return corridor.getMinAmount() != null
                && listing.estimatedAmount().amount().compareTo(corridor.getMinAmount()) < 0;
    }

    /**
     * İlanın zaman penceresi. Anlık ilanda alış penceresi boş olabilir; o zaman
     * yayın ile son geçerlilik arası kullanılır — ilan zaten o aralıkta canlıdır.
     */
    private static Instant windowStart(ListingView l) {
        return l.pickupWindowStart() != null ? l.pickupWindowStart() : l.publishedAt();
    }

    private static Instant windowEnd(ListingView l) {
        return l.pickupWindowEnd() != null ? l.pickupWindowEnd() : l.expiresAt();
    }
}
