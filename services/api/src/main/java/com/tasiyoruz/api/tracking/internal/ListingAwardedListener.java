package com.tasiyoruz.api.tracking.internal;

import com.tasiyoruz.api.ordering.api.MarketplaceEvents.ListingAwarded;
import com.tasiyoruz.api.ordering.api.MarketplaceService;
import com.tasiyoruz.api.tracking.api.TripService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/**
 * İlan AWARDED olunca iş açılır. Olay commit sonrası, ayrı transaction'da ve async
 * işlenir; event_publication'a yazıldığı için dinleyici düşse bile kaybolmaz.
 */
@Component
class ListingAwardedListener {

    private static final Logger log = LoggerFactory.getLogger(ListingAwardedListener.class);
    private final TripService trips;
    private final MarketplaceService marketplace;

    ListingAwardedListener(TripService trips, MarketplaceService marketplace) {
        this.trips = trips; this.marketplace = marketplace;
    }

    @ApplicationModuleListener
    void on(ListingAwarded event) {
        // Taşıyıcının görünen adı teklif kaydında; ilan sahibi olarak teklifleri okuyabiliriz
        var name = marketplace.offersForListing(event.shipperId(), event.listingId()).stream()
                .filter(o -> o.id().equals(event.offerId())).map(o -> o.carrierDisplayName()).findFirst().orElse(null);
        var trip = trips.startFromAward(event.listingId(), event.shipperId(), event.carrierId(), name, event.amount());
        log.info("İş açıldı: trip={} listing={} carrier={}", trip.id(), event.listingId(), event.carrierId());
    }
}
