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

/** Araç sahibi tarafı: açık ilanları gör, teklif ver, geri çek. ROLE_DRIVER (SecurityConfig). */
@RestController
@RequestMapping("/api/v1/driver")
@Tag(name = "Teklifler (araç sahibi)")
class CarrierListingController {

    private final MarketplaceService marketplace;

    CarrierListingController(MarketplaceService marketplace) {
        this.marketplace = marketplace;
    }

    @GetMapping("/listings/open")
    @Operation(summary = "Açık ilanlar; araç tipi ve alış ili ile filtrelenebilir")
    List<ListingView> open(@RequestParam(required = false) String vehicleType,
                           @RequestParam(required = false) String city) {
        return marketplace.openListings(vehicleType, city);
    }

    @PostMapping("/listings/{id}/offers")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Tek turluk teklif ver")
    OfferView submit(@AuthenticationPrincipal Jwt jwt, @PathVariable String id,
                     @Valid @RequestBody SubmitOfferRequest request) {
        return marketplace.submitOffer(jwt.getSubject(), displayName(jwt), id, request);
    }

    @GetMapping("/offers")
    List<OfferView> mine(@AuthenticationPrincipal Jwt jwt) {
        return marketplace.offersOf(jwt.getSubject());
    }

    @PostMapping("/offers/{id}/withdraw")
    OfferView withdraw(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return marketplace.withdrawOffer(jwt.getSubject(), id);
    }

    private static String displayName(Jwt jwt) {
        var name = jwt.getClaimAsString("name");
        return name != null ? name : jwt.getClaimAsString("preferred_username");
    }
}
