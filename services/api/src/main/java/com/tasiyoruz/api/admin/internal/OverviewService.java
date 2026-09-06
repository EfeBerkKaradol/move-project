package com.tasiyoruz.api.admin.internal;

import com.tasiyoruz.api.admin.api.OverviewView;
import com.tasiyoruz.api.corridor.api.CorridorService;
import com.tasiyoruz.api.fleet.api.CarrierService;
import com.tasiyoruz.api.fleet.api.CarrierStatus;
import com.tasiyoruz.api.ordering.api.ListingStatus;
import com.tasiyoruz.api.ordering.api.MarketplaceService;
import com.tasiyoruz.api.pricing.api.Money;
import com.tasiyoruz.api.tracking.api.TripStage;
import com.tasiyoruz.api.tracking.api.TripService;
import com.tasiyoruz.api.tracking.api.TripView;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;

/** Panodaki sayıları modüllerin açık arayüzlerinden toplar. */
@Service
class OverviewService {

    private final MarketplaceService marketplace;
    private final TripService trips;
    private final CarrierService carriers;
    private final CorridorService corridors;

    OverviewService(MarketplaceService marketplace, TripService trips, CarrierService carriers,
                    CorridorService corridors) {
        this.marketplace = marketplace;
        this.trips = trips;
        this.carriers = carriers;
        this.corridors = corridors;
    }

    OverviewView overview() {
        var open = marketplace.allListings(ListingStatus.OPEN);
        var allTrips = trips.allTrips();
        var completed = allTrips.stream().filter(t -> t.stage() == TripStage.COMPLETED).toList();

        return new OverviewView(
                open.size(),
                open.stream().filter(l -> l.offerCount() == 0).count(),
                allTrips.stream().filter(t -> t.stage() != TripStage.COMPLETED).count(),
                completed.size(),
                carriers.carriers(CarrierStatus.PENDING_REVIEW).size(),
                carriers.carriers(CarrierStatus.APPROVED).size(),
                carriers.carriers(CarrierStatus.SUSPENDED).size(),
                corridors.activeCorridorCount(),
                Money.tryOf(completed.stream()
                        .map(TripView::agreedAmount)
                        .map(Money::amount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add)));
    }
}
