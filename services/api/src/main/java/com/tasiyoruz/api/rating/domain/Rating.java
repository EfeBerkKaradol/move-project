package com.tasiyoruz.api.rating.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ratings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Rating {

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false, unique = true) private UUID tripId;
    @Column(nullable = false, length = 64) private String shipperId;
    @Column(nullable = false, length = 64) private String carrierId;
    @Column(nullable = false) private short score;
    @Column(length = 500) private String comment;
    @Column(nullable = false) private Instant createdAt;

    public static Rating of(UUID tripId, String shipperId, String carrierId, int score, String comment, Instant now) {
        var r = new Rating();
        r.tripId = tripId; r.shipperId = shipperId; r.carrierId = carrierId;
        r.score = (short) score; r.comment = comment; r.createdAt = now;
        return r;
    }
}
