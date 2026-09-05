package com.tasiyoruz.api.tracking.internal;

import com.tasiyoruz.api.tracking.api.TripService;
import com.tasiyoruz.api.tracking.api.TripView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Yük veren: işi izle, teslimatı onayla. Sahiplik serviste kontrol edilir. */
@RestController
@RequestMapping("/api/v1/trips")
@Tag(name = "İşler (yük veren)")
class ShipperTripController {

    private final TripService trips;
    ShipperTripController(TripService trips) { this.trips = trips; }

    @GetMapping
    List<TripView> mine(@AuthenticationPrincipal Jwt jwt) { return trips.tripsOfShipper(jwt.getSubject()); }

    @GetMapping("/by-listing/{listingId}")
    TripView ofListing(@AuthenticationPrincipal Jwt jwt, @PathVariable String listingId) {
        return trips.tripOfListing(jwt.getSubject(), listingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bu ilan için iş yok."));
    }

    @GetMapping("/{id}")
    TripView one(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return trips.trip(jwt.getSubject(), id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "İş bulunamadı."));
    }

    @PostMapping("/{id}/confirm-delivery")
    @Operation(summary = "Teslimatta onay → COMPLETED")
    TripView confirm(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return trips.confirmDelivery(jwt.getSubject(), id);
    }
}
