package com.tasiyoruz.api.ordering.domain;

import com.tasiyoruz.api.ordering.api.OfferStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Araç sahibinin tek turluk teklifi; (listing, carrier) başına bir kayıt. */
@Entity
@Table(name = "carrier_offers")
@Getter
@Setter(AccessLevel.PACKAGE)
@NoArgsConstructor
public class CarrierOffer {

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false) private UUID listingId;
    @Column(nullable = false, length = 64) private String carrierId;
    @Column(length = 120) private String carrierDisplayName;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal amount;
    @Column(columnDefinition = "text") private String note;
    private Instant estimatedPickupAt;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private OfferStatus status;

    @Column(nullable = false) private Instant submittedAt;
    private Instant respondedAt;

    public static CarrierOffer submit(UUID listingId, String carrierId, String carrierDisplayName,
                                      BigDecimal amount, String note, Instant estimatedPickupAt, Instant now) {
        var o = new CarrierOffer();
        o.listingId = listingId;
        o.carrierId = carrierId;
        o.carrierDisplayName = carrierDisplayName;
        o.amount = amount;
        o.note = note;
        o.estimatedPickupAt = estimatedPickupAt;
        o.status = OfferStatus.SUBMITTED;
        o.submittedAt = now;
        return o;
    }

    /** Geri çekilmiş teklif aynı kayıt üzerinden yeniden verilir; tek-tur kısıtı bozulmaz. */
    void resubmit(BigDecimal amount, String note, Instant estimatedPickupAt, Instant now) {
        this.amount = amount;
        this.note = note;
        this.estimatedPickupAt = estimatedPickupAt;
        this.status = OfferStatus.SUBMITTED;
        this.submittedAt = now;
        this.respondedAt = null;
    }

    void respond(OfferStatus outcome, Instant now) {
        this.status = outcome;
        this.respondedAt = now;
    }
}
