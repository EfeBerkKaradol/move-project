package com.tasiyoruz.api.tracking.domain;

import com.tasiyoruz.api.tracking.api.TripPhotoKind;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Taşıma sırasında çekilen kare. Dosya nesne deposunda; burada anahtarı duruyor. */
@Entity
@Table(name = "trip_photos")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TripPhoto {

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false) private UUID tripId;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private TripPhotoKind kind;

    @Column(nullable = false, length = 255) private String storageKey;
    @Column(nullable = false, length = 80) private String contentType;
    @Column(nullable = false) private long sizeBytes;
    @Column(nullable = false, length = 64) private String uploadedBy;
    @Column(nullable = false) private Instant uploadedAt;

    public static TripPhoto of(UUID tripId, TripPhotoKind kind, String storageKey, String contentType,
                               long sizeBytes, String uploadedBy, Instant now) {
        var p = new TripPhoto();
        p.tripId = tripId;
        p.kind = kind;
        p.storageKey = storageKey;
        p.contentType = contentType;
        p.sizeBytes = sizeBytes;
        p.uploadedBy = uploadedBy;
        p.uploadedAt = now;
        return p;
    }
}
