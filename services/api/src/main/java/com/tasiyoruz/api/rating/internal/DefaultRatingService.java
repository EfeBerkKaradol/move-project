package com.tasiyoruz.api.rating.internal;

import com.tasiyoruz.api.rating.api.*;
import com.tasiyoruz.api.rating.domain.Rating;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
class DefaultRatingService implements RatingService {

    private final RatingRepository ratings;
    private final CompletedTripRepository trips;
    private final Clock clock;

    DefaultRatingService(RatingRepository ratings, CompletedTripRepository trips, Clock clock) {
        this.ratings = ratings; this.trips = trips; this.clock = clock;
    }

    @Override
    public RatingView rate(String shipperId, String tripId, RateTripRequest r) {
        var id = parse(tripId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "İş bulunamadı."));
        // Tamamlanmamış iş puanlanamaz: kayıt ancak TripCompleted geldiğinde oluşuyor.
        // Olay asenkron; onaydan hemen sonra gelen istek birkaç saniye 409 alabilir.
        var trip = trips.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                "İş henüz tamamlanmadı; teslimatı onayladıysan birkaç saniye sonra tekrar dene."));
        if (!trip.getShipperId().equals(shipperId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu iş size ait değil.");
        }
        if (ratings.findByTripId(id).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu iş zaten puanlandı.");
        }
        var saved = ratings.save(Rating.of(id, shipperId, trip.getCarrierId(), r.score(),
                r.comment() == null || r.comment().isBlank() ? null : r.comment().trim(), Instant.now(clock)));
        return view(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RatingView> ratingOfTrip(String tripId) {
        return parse(tripId).flatMap(ratings::findByTripId).map(DefaultRatingService::view);
    }

    @Override
    @Transactional(readOnly = true)
    public CarrierRatingView summaryOf(String carrierId) {
        var list = ratings.findByCarrierId(carrierId);
        Double avg = list.isEmpty() ? null
                : Math.round(list.stream().mapToInt(Rating::getScore).average().orElse(0) * 10) / 10.0;
        return new CarrierRatingView(carrierId, avg, list.size(), trips.countByCarrierId(carrierId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CarrierRatingView> summariesOf(List<String> carrierIds) {
        return carrierIds.stream().distinct().map(this::summaryOf).toList();
    }

    private static RatingView view(Rating r) {
        return new RatingView(r.getId().toString(), r.getTripId().toString(), r.getCarrierId(),
                r.getScore(), r.getComment(), r.getCreatedAt());
    }

    private static Optional<UUID> parse(String id) {
        try { return Optional.of(UUID.fromString(id)); } catch (IllegalArgumentException e) { return Optional.empty(); }
    }
}
