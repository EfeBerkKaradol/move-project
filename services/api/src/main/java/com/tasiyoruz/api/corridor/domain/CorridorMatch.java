package com.tasiyoruz.api.corridor.domain;

import com.tasiyoruz.api.corridor.api.MatchOutcome;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Bir koridora düşen ilan ve puanı. */
@Entity
@Table(name = "corridor_matches")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CorridorMatch {

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false) private UUID corridorId;
    @Column(nullable = false) private UUID listingId;
    @Column(nullable = false, length = 64) private String carrierId;
    @Column(nullable = false, precision = 6, scale = 4) private BigDecimal score;
    @Column(nullable = false, precision = 8, scale = 2) private BigDecimal detourKm;
    @Column(nullable = false) private Instant matchedAt;
    private Instant respondedAt;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private MatchOutcome outcome;

    public static CorridorMatch of(UUID corridorId, UUID listingId, String carrierId,
                                   BigDecimal score, BigDecimal detourKm, Instant now) {
        var m = new CorridorMatch();
        m.corridorId = corridorId;
        m.listingId = listingId;
        m.carrierId = carrierId;
        m.score = score;
        m.detourKm = detourKm;
        m.matchedAt = now;
        m.outcome = MatchOutcome.PENDING;
        return m;
    }

    void resolve(MatchOutcome outcome, Instant now) {
        this.outcome = outcome;
        this.respondedAt = now;
    }
}
