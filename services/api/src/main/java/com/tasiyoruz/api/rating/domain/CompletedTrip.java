package com.tasiyoruz.api.rating.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Puanlanabilir iş; taşıma modülünün TripCompleted olayından yazılır. */
@Entity
@Table(name = "completed_trips")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CompletedTrip {

    @Id private UUID tripId;
    @Column(nullable = false) private UUID listingId;
    @Column(nullable = false, length = 64) private String shipperId;
    @Column(nullable = false, length = 64) private String carrierId;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal amount;
    @Column(nullable = false) private Instant completedAt;

    public static CompletedTrip of(UUID tripId, UUID listingId, String shipperId, String carrierId,
                                   BigDecimal amount, Instant completedAt) {
        var t = new CompletedTrip();
        t.tripId = tripId; t.listingId = listingId; t.shipperId = shipperId; t.carrierId = carrierId;
        t.amount = amount; t.completedAt = completedAt;
        return t;
    }
}
