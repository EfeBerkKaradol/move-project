package com.tasiyoruz.api.rating.internal;

import com.tasiyoruz.api.rating.api.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Puanlama")
class RatingController {

    private final RatingService ratings;

    RatingController(RatingService ratings) {
        this.ratings = ratings;
    }

    @PostMapping("/trips/{id}/rating")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Tamamlanan işi puanla (yük veren, iş başına bir kez)")
    RatingView rate(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @Valid @RequestBody RateTripRequest r) {
        return ratings.rate(jwt.getSubject(), id, r);
    }

    @GetMapping("/trips/{id}/rating")
    RatingView ratingOfTrip(@PathVariable String id) {
        return ratings.ratingOfTrip(id).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Puan yok."));
    }

    @GetMapping("/carriers/{id}/rating")
    @Operation(summary = "Taşıyıcının puan özeti")
    CarrierRatingView summary(@PathVariable String id) {
        return ratings.summaryOf(id);
    }

    @GetMapping("/carriers/ratings")
    @Operation(summary = "Birden çok taşıyıcının puan özeti (teklif karşılaştırma ekranı)")
    List<CarrierRatingView> summaries(@RequestParam List<String> ids) {
        return ratings.summariesOf(ids.stream().limit(50).toList());
    }
}
