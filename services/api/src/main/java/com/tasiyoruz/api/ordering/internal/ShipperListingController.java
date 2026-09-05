package com.tasiyoruz.api.ordering.internal;

import com.tasiyoruz.api.ordering.api.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/** Yük veren tarafı: ilan yayınla, tekliflere bak, birini seç. */
@RestController
@RequestMapping("/api/v1/listings")
@Tag(name = "İlanlar (yük veren)")
class ShipperListingController {

    private final MarketplaceService marketplace;

    ShipperListingController(MarketplaceService marketplace) {
        this.marketplace = marketplace;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "İlan yayınla — tarife tahmini sunucuda hesaplanıp snapshot'lanır")
    ListingView publish(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateListingRequest request) {
        return marketplace.publish(jwt.getSubject(), request);
    }

    @GetMapping
    @Operation(summary = "İlanlarım")
    List<ListingView> mine(@AuthenticationPrincipal Jwt jwt) {
        return marketplace.listingsOf(jwt.getSubject());
    }

    @GetMapping("/{id}")
    ListingView one(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        var l = marketplace.listing(id).orElseThrow(() -> MarketplaceExceptions.notFound("İlan"));
        if (!jwt.getSubject().equals(l.shipperId())) throw MarketplaceExceptions.forbidden();
        return l;
    }

    @PostMapping("/{id}/cancel")
    ListingView cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable String id,
                       @RequestBody(required = false) CancelRequest body) {
        return marketplace.cancel(jwt.getSubject(), id, body == null ? null : body.reason());
    }

    @GetMapping("/{id}/offers")
    @Operation(summary = "İlana gelen teklifler — yalnızca ilan sahibi")
    List<OfferView> offers(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return marketplace.offersForListing(jwt.getSubject(), id);
    }

    @PostMapping("/{id}/offers/{offerId}/accept")
    @Operation(summary = "Teklifi kabul et — diğerleri reddedilir, ilan AWARDED olur")
    ListingView accept(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @PathVariable String offerId) {
        return marketplace.acceptOffer(jwt.getSubject(), id, offerId);
    }

    record CancelRequest(String reason) {}
}
