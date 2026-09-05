package com.tasiyoruz.api.tracking.domain;

import com.tasiyoruz.api.tracking.api.TripStage;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "trips")
@Getter
@Setter(AccessLevel.PACKAGE)
@NoArgsConstructor
public class Trip {

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false, unique = true) private UUID listingId;
    @Column(nullable = false, length = 64) private String shipperId;
    @Column(nullable = false, length = 64) private String carrierId;
    @Column(length = 120) private String carrierDisplayName;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal agreedAmount;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24) private TripStage stage;
    @Column(nullable = false) private Instant startedAt;
    private Instant deliveredAt;
    private Instant completedAt;
    @Column(length = 120) private String podReceivedBy;
    @Column(columnDefinition = "text") private String podNote;
    @Column(length = 255) private String podPhotoKey;
    /** Aynı anda iki aşama geçişi / geçiş + onay yarışında ikinci yazan 409 alır. */
    @Version @Column(nullable = false) private int version;

    public static Trip start(UUID listingId, String shipperId, String carrierId, String carrierDisplayName,
                             BigDecimal agreedAmount, Instant now) {
        var t = new Trip();
        t.listingId = listingId; t.shipperId = shipperId; t.carrierId = carrierId;
        t.carrierDisplayName = carrierDisplayName; t.agreedAmount = agreedAmount;
        t.stage = TripStage.DRIVER_ASSIGNED; t.startedAt = now;
        return t;
    }

    void moveTo(TripStage next) { this.stage = next; }
    void deliver(String receivedBy, String note, String photoKey, Instant now) {
        this.stage = TripStage.DELIVERED; this.deliveredAt = now;
        this.podReceivedBy = receivedBy; this.podNote = note; this.podPhotoKey = photoKey;
    }
    void complete(Instant now) { this.stage = TripStage.COMPLETED; this.completedAt = now; }
}
