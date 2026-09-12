package com.tasiyoruz.api.finance.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Bir taşımanın finansal özeti. Alanların anlamı için bkz. V25 migration. */
@Entity
@Table(name = "shipment_finance")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ShipmentFinance {

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false, unique = true) private UUID listingId;
    private UUID tripId;
    @Column(nullable = false, length = 64) private String shipperId;
    @Column(nullable = false, length = 64) private String carrierId;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal grossAmount;
    @Column(nullable = false, precision = 5, scale = 2) private BigDecimal commissionRate;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal commissionAmount;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal commissionTax;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal paymentFee;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal refundAmount;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal cancellationFee;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal carrierPayout;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal platformRevenue;
    @Column(nullable = false, length = 3) private String currency;
    @Column(nullable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;
    @Version @Column(nullable = false) private int version;

    public static ShipmentFinance of(UUID listingId, String shipperId, String carrierId,
                                     BigDecimal gross, BigDecimal rate, BigDecimal commission,
                                     BigDecimal commissionTax, BigDecimal payout, Instant now) {
        var f = new ShipmentFinance();
        f.listingId = listingId;
        f.shipperId = shipperId;
        f.carrierId = carrierId;
        f.grossAmount = gross;
        f.commissionRate = rate;
        f.commissionAmount = commission;
        f.commissionTax = commissionTax;
        f.paymentFee = BigDecimal.ZERO;
        f.refundAmount = BigDecimal.ZERO;
        f.cancellationFee = BigDecimal.ZERO;
        f.carrierPayout = payout;
        // Platformun geliri komisyonun kendisi; brütün tamamı değil
        f.platformRevenue = commission;
        f.currency = "TRY";
        f.createdAt = now;
        f.updatedAt = now;
        return f;
    }

    /** Taşıma açıldıktan sonra iş kaydı oluşuyor; özet onu da tanısın. */
    public void attachTrip(UUID tripId, Instant now) {
        this.tripId = tripId;
        this.updatedAt = now;
    }

    /**
     * İade kaydedilir. Brüt DEĞİŞMEZ: iade ayrı bir olaydır ve işlem hacmini
     * geriye dönük silmek, olanı olmamış gibi göstermek olurdu.
     */
    public void recordRefund(BigDecimal amount, Instant now) {
        this.refundAmount = this.refundAmount.add(amount);
        this.updatedAt = now;
    }

    public void recordPaymentFee(BigDecimal fee, Instant now) {
        this.paymentFee = this.paymentFee.add(fee);
        this.updatedAt = now;
    }
}
