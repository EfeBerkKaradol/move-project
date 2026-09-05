package com.tasiyoruz.api.tracking.domain;

import com.tasiyoruz.api.tracking.api.TripStage;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Her aşama geçişinin kaydı; uyuşmazlıkta zaman çizelgesi buradan okunur. */
@Entity
@Table(name = "trip_events")
@Getter
@NoArgsConstructor
public class TripEvent {
    @Id @GeneratedValue private UUID id;
    @Column(nullable = false) private UUID tripId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24) private TripStage stage;
    @Column(nullable = false) private Instant occurredAt;
    @Column(nullable = false, length = 16) private String source;
    @Column(columnDefinition = "text") private String note;

    public static TripEvent of(UUID tripId, TripStage stage, String source, String note, Instant now) {
        var e = new TripEvent();
        e.tripId = tripId; e.stage = stage; e.source = source; e.note = note; e.occurredAt = now;
        return e;
    }
}
