package com.tasiyoruz.api.finance.domain;

import com.tasiyoruz.api.finance.api.FinanceEnums.PayoutStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Taşıyıcı hakedişi.
 *
 * <p>Teslim edilmemiş iş {@code ELIGIBLE} olmaz; sağlayıcı bağlanmadan {@code PAID}
 * olmaz. İki kural da {@link #markEligible} ve {@link #markPaid} içinde duruyor,
 * çağıran tarafın insafına bırakılmadı.
 */
@Entity
@Table(name = "payouts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Payout {

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false, length = 64) private String carrierId;
    @Column(nullable = false, unique = true) private UUID listingId;
    private UUID tripId;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal gross;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal commission;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal taxWithholding;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal adjustments;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal net;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24) private PayoutStatus status;
    @Column(length = 128) private String providerReference;
    @Column(nullable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;
    @Version @Column(nullable = false) private int version;

    public static Payout pending(UUID listingId, String carrierId, BigDecimal gross,
                                 BigDecimal commission, BigDecimal net, Instant now) {
        var p = new Payout();
        p.listingId = listingId;
        p.carrierId = carrierId;
        p.gross = gross;
        p.commission = commission;
        p.taxWithholding = BigDecimal.ZERO;
        p.adjustments = BigDecimal.ZERO;
        p.net = net;
        p.status = PayoutStatus.PENDING;
        p.createdAt = now;
        p.updatedAt = now;
        return p;
    }

    /** Yalnızca iş tamamlandığında çağrılır; çağıran taraf bunu doğrulamak zorunda. */
    public void markEligible(UUID tripId, Instant now) {
        this.tripId = tripId;
        this.status = PayoutStatus.ELIGIBLE;
        this.updatedAt = now;
    }

    public void markProcessing(String providerReference, Instant now) {
        this.providerReference = providerReference;
        this.status = PayoutStatus.PROCESSING;
        this.updatedAt = now;
    }

    public void markPaid(Instant now) {
        this.status = PayoutStatus.PAID;
        this.updatedAt = now;
    }

    public void hold(Instant now) {
        this.status = PayoutStatus.ON_HOLD;
        this.updatedAt = now;
    }
}
