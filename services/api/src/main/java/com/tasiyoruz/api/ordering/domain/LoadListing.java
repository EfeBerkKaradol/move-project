package com.tasiyoruz.api.ordering.domain;

import com.tasiyoruz.api.ordering.api.ListingStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Yük ilanı. Durum geçişleri yalnızca bu sınıftaki metotlarla yapılır. */
@Entity
@Table(name = "load_listings")
@Getter
@Setter(AccessLevel.PACKAGE)
@NoArgsConstructor
public class LoadListing {

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false, unique = true, length = 20) private String listingNumber;
    @Column(nullable = false, length = 64) private String shipperId;
    @Column(nullable = false, length = 16) private String serviceModel;
    @Column(nullable = false, length = 32) private String vehicleTypeCode;
    @Column(nullable = false) private UUID pickupDistrictId;
    @Column(nullable = false) private UUID dropoffDistrictId;
    private Integer pickupFloor;
    private Boolean pickupHasElevator;
    private Integer dropoffFloor;
    private Boolean dropoffHasElevator;

    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb")
    private List<String> extraServices;

    @Column(columnDefinition = "text") private String cargoDescription;
    private Instant pickupWindowStart;
    private Instant pickupWindowEnd;

    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> estimateSnapshot;

    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal estimatedAmount;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private ListingStatus status;

    private UUID awardedOfferId;
    @Column(nullable = false) private Instant publishedAt;
    @Column(nullable = false) private Instant expiresAt;
    private Instant cancelledAt;
    @Column(columnDefinition = "text") private String cancelReason;

    /** Kabul ve iptal yarışında ikinci yazan kaybetsin (docs/02 çift atama koruması). */
    @Version @Column(nullable = false) private int version;

    public static LoadListing publish(String listingNumber, String shipperId, String serviceModel,
                                      String vehicleTypeCode, UUID pickupDistrictId, UUID dropoffDistrictId,
                                      Integer pickupFloor, Boolean pickupHasElevator,
                                      Integer dropoffFloor, Boolean dropoffHasElevator,
                                      List<String> extraServices, String cargoDescription,
                                      Instant pickupWindowStart, Instant pickupWindowEnd,
                                      Map<String, Object> estimateSnapshot, BigDecimal estimatedAmount,
                                      Instant now, Instant expiresAt) {
        var l = new LoadListing();
        l.listingNumber = listingNumber;
        l.shipperId = shipperId;
        l.serviceModel = serviceModel;
        l.vehicleTypeCode = vehicleTypeCode;
        l.pickupDistrictId = pickupDistrictId;
        l.dropoffDistrictId = dropoffDistrictId;
        l.pickupFloor = pickupFloor;
        l.pickupHasElevator = pickupHasElevator;
        l.dropoffFloor = dropoffFloor;
        l.dropoffHasElevator = dropoffHasElevator;
        l.extraServices = List.copyOf(extraServices);
        l.cargoDescription = cargoDescription;
        l.pickupWindowStart = pickupWindowStart;
        l.pickupWindowEnd = pickupWindowEnd;
        l.estimateSnapshot = estimateSnapshot;
        l.estimatedAmount = estimatedAmount;
        l.status = ListingStatus.OPEN;
        l.publishedAt = now;
        l.expiresAt = expiresAt;
        return l;
    }

    public boolean isOpen(Instant now) {
        return status == ListingStatus.OPEN && expiresAt.isAfter(now);
    }

    public boolean isOwnedBy(String userId) {
        return shipperId.equals(userId);
    }

    void award(UUID offerId) {
        this.status = ListingStatus.AWARDED;
        this.awardedOfferId = offerId;
    }

    void cancel(String reason, Instant now) {
        this.status = ListingStatus.CANCELLED;
        this.cancelReason = reason;
        this.cancelledAt = now;
    }
}
