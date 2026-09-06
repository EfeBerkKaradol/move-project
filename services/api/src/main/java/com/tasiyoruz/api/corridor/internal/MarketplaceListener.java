package com.tasiyoruz.api.corridor.internal;

import com.tasiyoruz.api.corridor.api.MatchOutcome;
import com.tasiyoruz.api.ordering.api.MarketplaceEvents.ListingAwarded;
import com.tasiyoruz.api.ordering.api.MarketplaceEvents.ListingExpired;
import com.tasiyoruz.api.ordering.api.MarketplaceEvents.ListingPublished;
import com.tasiyoruz.api.ordering.api.MarketplaceEvents.OfferSubmitted;
import com.tasiyoruz.api.ordering.api.MarketplaceService;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/**
 * Pazar yeri olaylarını koridorlara yansıtır.
 *
 * <p>Olaylar commit sonrası, ayrı transaction'da ve async işlenir; event_publication
 * tablosuna yazıldıkları için dinleyici düşse bile kaybolmaz ve yeniden denenir.
 * Bu yüzden eşleştirme idempotent yazılmak zorunda (uq_corridor_match).
 */
@Component
class MarketplaceListener {

    private static final Logger log = LoggerFactory.getLogger(MarketplaceListener.class);

    private final CorridorMatcher matcher;
    private final MarketplaceService marketplace;

    MarketplaceListener(CorridorMatcher matcher, MarketplaceService marketplace) {
        this.matcher = matcher;
        this.marketplace = marketplace;
    }

    @ApplicationModuleListener
    void on(ListingPublished event) {
        marketplace.listing(event.listingId()).ifPresent(listing -> {
            int created = matcher.matchListing(listing);
            if (created > 0) {
                log.info("İlan {} {} koridorla eşleşti", listing.listingNumber(), created);
            }
        });
    }

    /** Teklif verilen eşleşme bekleyen listede kalmasın. */
    @ApplicationModuleListener
    void on(OfferSubmitted event) {
        matcher.markOffered(event.carrierId(), UUID.fromString(event.listingId()));
    }

    /** İlan başkasına verildiğinde diğer taşıyıcıların eşleşmeleri kapanır. */
    @ApplicationModuleListener
    void on(ListingAwarded event) {
        matcher.closeMatchesFor(UUID.fromString(event.listingId()), MatchOutcome.EXPIRED);
    }

    /** Teklif penceresi dolan ilan taşıyıcının listesinde asılı kalmasın. */
    @ApplicationModuleListener
    void on(ListingExpired event) {
        matcher.closeMatchesFor(UUID.fromString(event.listingId()), MatchOutcome.EXPIRED);
    }
}
