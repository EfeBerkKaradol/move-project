package com.tasiyoruz.api.corridor.domain;

import com.tasiyoruz.api.corridor.api.CorridorStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Taşıyıcının boş dönüş rotası. Durum geçişleri yalnızca bu sınıftaki metotlarla. */
@Entity
@Table(name = "corridors")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Corridor {

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false, length = 64) private String carrierId;
    @Column(nullable = false, length = 32) private String vehicleTypeCode;
    @Column(nullable = false) private UUID originDistrictId;
    @Column(nullable = false) private UUID destinationDistrictId;
    @Column(nullable = false) private Instant departureFrom;
    @Column(nullable = false) private Instant departureTo;
    @Column(nullable = false) private int detourToleranceKm;
    @Column(precision = 12, scale = 2) private BigDecimal minAmount;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private CorridorStatus status;

    @Column(nullable = false) private Instant createdAt;

    /** Duraklat/sürdür yarışında ikinci yazan kaybetsin. */
    @Version @Column(nullable = false) private int version;

    public static Corridor open(String carrierId, String vehicleTypeCode, UUID originDistrictId,
                                UUID destinationDistrictId, Instant departureFrom, Instant departureTo,
                                int detourToleranceKm, BigDecimal minAmount, Instant now) {
        var c = new Corridor();
        c.carrierId = carrierId;
        c.vehicleTypeCode = vehicleTypeCode;
        c.originDistrictId = originDistrictId;
        c.destinationDistrictId = destinationDistrictId;
        c.departureFrom = departureFrom;
        c.departureTo = departureTo;
        c.detourToleranceKm = detourToleranceKm;
        c.minAmount = minAmount;
        c.status = CorridorStatus.ACTIVE;
        c.createdAt = now;
        return c;
    }

    /**
     * Eşleştirmeye açık mı? Kalkış penceresi geçmiş bir koridor ACTIVE görünse bile
     * aday değildir — süre dolumu ayrı bir yazma işine bırakılmadan burada da kontrol
     * edilir, böylece zamanlanmış iş gecikse de yanlış eşleşme üretilmez.
     */
    public boolean matchable(Instant now) {
        return status == CorridorStatus.ACTIVE && !departureTo.isBefore(now);
    }

    void pause() { this.status = CorridorStatus.PAUSED; }

    void resume() { this.status = CorridorStatus.ACTIVE; }

    void expire() { this.status = CorridorStatus.EXPIRED; }
}
